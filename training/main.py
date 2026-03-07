import os
import tempfile
from dotenv import load_dotenv

import torch
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transformers import WhisperProcessor, WhisperForConditionalGeneration
from transformers import pipeline # Import the pipeline
from peft import PeftModel # LoraConfig, LoraModel, get_peft_model are not directly used by name here
import librosa
from huggingface_hub import login
from pydub import AudioSegment

token= os.getenv("HF_TOKEN")

try:
    if torch.cuda.is_available():
        device = "cuda:0"
        torch_dtype = torch.float16
    else:   
        device = "cpu"
        torch_dtype = torch.float32

    MODEL_NAME = "Tiberiw/whisper-base-lora-finetuned-custom-v1"
    base_model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-base", token=token)

    transcriber = pipeline(
        "automatic-speech-recognition",
        model=final_model,
        torch_dtype=torch_dtype,
        device=device,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor
    )
except Exception as e:
    print(f"Error loading transcription pipeline: {e}")
    transcriber = None

app = FastAPI(title="Whisper Transcription API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TARGET_SAMPLING_RATE = 16000

@app.post("/api/transcription")
async def transcribe_pipeline(file: UploadFile = File(...)):
    if not transcriber:
        raise HTTPException(
            status_code=503,
            detail="Transcription service is not available due to model loading issues."
        )

    if not file.content_type or not file.content_type.startswith("audio/"):
        # Also check if file.filename exists for determining suffix, though content_type is primary
        detail_msg = f"File must be an audio file. Got: {file.content_type}"
        if not file.content_type and file.filename:
            detail_msg = f"Could not determine file content type for {file.filename}. Please ensure it's a valid audio file."
        elif not file.content_type and not file.filename:
            detail_msg = "File must be an audio file. Received an unknown file without content type or filename."

        raise HTTPException(
            status_code=400,
            detail=detail_msg
        )

    print(f"Received file: {file.filename}, Content-Type: {file.content_type}")

    original_temp_path = None  # Path to the originally uploaded file
    input_for_librosa_path = None    # Path to the file librosa will load (either original or converted)
    
    # Determine if conversion from WebM to MP3 is needed
    # Checking for "audio/webm" and specifically "codecs=opus" if possible
    # pydub generally handles webm container with opus audio if ffmpeg supports it.
    conversion_needed = file.content_type.startswith("audio/webm")

    try:
        # 1. Save the uploaded file to a temporary location first.
        # This gives us a file path to work with, which is often easier for external tools like FFmpeg via pydub.
        file_suffix = ".unknown"
        if file.filename:
            name, ext = os.path.splitext(file.filename)
            if ext:
                file_suffix = ext

        with tempfile.NamedTemporaryFile(delete=False, suffix=file_suffix) as temp_orig_file:
            content = await file.read()
            temp_orig_file.write(content)
            original_temp_path = temp_orig_file.name
        
        # It's good practice to close the UploadFile object after reading its content
        await file.close()

        if conversion_needed:
            print(f"Conversion needed for '{original_temp_path}' (ContentType: {file.content_type}) to MP3.")
            # Define a path for the converted MP3 file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_conv_file:
                input_for_librosa_path = temp_conv_file.name
            
            try:
                # Load the WebM audio from the original temporary file using pydub
                # pydub's from_file can often infer the format, or you can specify format="webm" or format="opus"
                audio = AudioSegment.from_file(original_temp_path) # pydub will use FFmpeg here
                
                # Export as MP3 to the new temporary file path
                audio.export(input_for_librosa_path, format="mp3")
                print(f"Successfully converted '{original_temp_path}' to MP3: '{input_for_librosa_path}'")
            except Exception as e:
                import traceback
                err_msg = f"Error during audio conversion from WebM to MP3: {str(e)}\n{traceback.format_exc()}"
                print(err_msg)
                # Include FFmpeg not found error hint
                if "FileNotFoundError" in str(e) and "ffmpeg" in str(e).lower():
                     err_msg += "\nEnsure FFmpeg is installed and in your system's PATH."
                raise HTTPException(
                    status_code=500, # Internal Server Error for conversion failure
                    detail=err_msg
                )
        else:
            # No conversion needed, use the original temporary file for librosa
            input_for_librosa_path = original_temp_path
            # To prevent double deletion in finally, mark original_temp_path as "moved" or handled
            original_temp_path = None 
            print(f"No conversion needed. Using original file for Librosa: '{input_for_librosa_path}'")

        # 2. Process the audio file (original or converted MP3) with Librosa
        print(f"Loading with Librosa: '{input_for_librosa_path}'")
        try:
            audio_array, sampling_rate = librosa.load(input_for_librosa_path, sr=TARGET_SAMPLING_RATE, mono=True)
            print(f"Librosa loaded audio. Array shape: {audio_array.shape}, Sampling rate: {sampling_rate}")
            
            # Proceed with transcription
            result = transcriber(
                audio_array.copy(), # Send a copy
                return_timestamps=True,
            )
            return {"text": result["text"]}

        except Exception as e: # Errors during librosa loading or transcription
            import traceback
            err_msg = f"Error processing audio with librosa/pipeline: {str(e)}\n{traceback.format_exc()}"
            print(err_msg)
            # Check for common librosa loading errors (e.g., unsupported format even after conversion)
            if "NoBackendError" in str(e) or "SoundFileNotOpen" in str(e) or "Unsupported format" in str(e) or "AudioreadError" in str(e):
                 raise HTTPException(
                    status_code=415, # Unsupported Media Type
                    detail=f"Could not decode audio file ('{os.path.basename(input_for_librosa_path)}'). Ensure it's a valid audio format. Librosa/Backend error: {str(e)}"
                )
            raise HTTPException(
                status_code=500,
                detail=err_msg
            )

    except HTTPException: # Re-raise HTTPExceptions from above blocks
        raise
    except Exception as e: # Catch-all for other unexpected errors (e.g., file saving)
        import traceback
        err_msg = f"An unexpected error occurred in transcribe_pipeline: {str(e)}\n{traceback.format_exc()}"
        print(err_msg)
        raise HTTPException(
            status_code=500,
            detail=err_msg
        )
    finally:
        # 3. Cleanup all temporary files
        if input_for_librosa_path and os.path.exists(input_for_librosa_path):
            print(f"Deleting temp file used by Librosa: '{input_for_librosa_path}'")
            os.unlink(input_for_librosa_path)
        if original_temp_path and os.path.exists(original_temp_path):
            # This deletes the original uploaded file if conversion happened and it's a different file
            print(f"Deleting original uploaded temp file: '{original_temp_path}'")
            os.unlink(original_temp_path)
        print("Cleanup complete.")

if __name__ == "__main__":
    import uvicorn
    # Note: Uvicorn run string should be "main:app" if your file is main.py and app instance is 'app'
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)