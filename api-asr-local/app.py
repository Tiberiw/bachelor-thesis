import os
import tempfile
import torch
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transformers import WhisperProcessor, WhisperForConditionalGeneration, pipeline
from peft import PeftModel
import librosa
from pydub import AudioSegment
from dotenv import load_dotenv

transcriber = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global transcriber
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    torch_dtype = torch.float16 if device == "cuda:0" else torch.float32
    print("Before load_dotenv, HF_TOKEN:", os.getenv("HF_TOKEN"))
    load_dotenv(over)
    print("After load_dotenv, HF_TOKEN:", os.getenv("HF_TOKEN"))

    hf_token = os.getenv("HF_TOKEN")
    print("Using HF_TOKEN:", hf_token)

# Add a check to ensure the token is provided
    if hf_token is None:
        raise ValueError("Hugging Face token not found. Please set the HUGGING_FACE_TOKEN environment variable.")

    BASE_MODEL_PATH = "openai/whisper-base"
    # BASE_MODEL_PATH = "openai/whisper-large-v3-turbo"
    ADAPTER_AND_PROCESSOR_PATH = "Tiberiw/whisper-base-lora-finetuned-custom-v1"
    # ADAPTER_AND_PROCESSOR_PATH = "Tiberiw/whisper-large-turbo-lora-finetuned-v3"
    processor = WhisperProcessor.from_pretrained(ADAPTER_AND_PROCESSOR_PATH, token=hf_token)
    base_model = WhisperForConditionalGeneration.from_pretrained(BASE_MODEL_PATH, torch_dtype=torch_dtype)
    final_model = PeftModel.from_pretrained(base_model, ADAPTER_AND_PROCESSOR_PATH, token=hf_token)
    transcriber = pipeline(
        "automatic-speech-recognition",
        model=final_model,
        torch_dtype=torch_dtype,
        device=device,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor,
    )
    print("Model loaded successfully!")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_audio(path: str):
    try:
        audio_array, _ = librosa.load(path, sr=16000, mono=True)
        return audio_array
    except Exception as e:
        import traceback
        msg = f"Error processing audio failed to load audio: {str(e)}\n{traceback.format_exc()}"
        if any(err in str(e) for err in ["NoBackendError", "SoundFileNotOpen", "Unsupported format", "AudioreadError"]):
            raise HTTPException(status_code=415, detail=msg + "\nSupported formats: ( WEBM, WAV, MP3, FLAC)")
        raise HTTPException(status_code=500, detail=msg)




@app.post("/api/transcription")
async def transcribe_pipeline(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid file content type.")

    print(f"Received file: {file.filename}, Content-Type: {file.content_type}")

    original_temp_path = None  # Path to the originally uploaded file
    input_for_librosa_path = None    # Path to the file librosa will load (either original or converted)
    

    try:
        # 1. Save the uploaded file to a temporary location first.
        # This gives us a file path to work with, which is often easier for external tools like FFmpeg via pydub.
        file_suffix = ".unknown"
        if file.filename:
            _, ext = os.path.splitext(file.filename)
            if ext:
                file_suffix = ext
        print(f"Saving uploaded file to temporary location with suffix '{file_suffix}'")
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_suffix) as temp_orig_file:
            content = await file.read()
            temp_orig_file.write(content)
            original_temp_path = temp_orig_file.name
        
        # It's good practice to close the UploadFile object after reading its content
        await file.close()

        if file.content_type.startswith("audio/webm"):
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
                err_msg = f"Audio conversion failed: {str(e)}\n{traceback.format_exc()}"
                if "ffmpeg" in str(e).lower():
                        err_msg += "\nEnsure FFmpeg is installed and in PATH."
                raise HTTPException(status_code=500, detail=err_msg)
        else:
            input_for_librosa_path = original_temp_path
            original_temp_path = None


        audio_array = load_audio(input_for_librosa_path)
        result = transcriber(audio_array.copy(), return_timestamps=True)
        return {"transcription": result["text"]}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Unexpected error : {str(e)}\n{traceback.format_exc()}")
    finally:
        for f in (original_temp_path, input_for_librosa_path):
            if f and os.path.exists(f):
                os.unlink(f)

# if __name__ == "__main__":
#     import uvicorn
#     # Note: Uvicorn run string should be "main:app" if your file is main.py and app instance is 'app'
#     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)