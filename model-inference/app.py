import spaces  # must be imported before torch (ZeroGPU patches torch.cuda)

import os
import subprocess

import gradio as gr
import numpy as np
from peft import PeftModel
from transformers import WhisperForConditionalGeneration, WhisperProcessor, pipeline

BASE_MODEL = "openai/whisper-base"
ADAPTER = "Tiberiw/whisper-base-lora-finetuned-custom-v1"
SAMPLE_RATE = 16000

# The adapter repo is gated, so downloading it needs a read token (a Space secret).
HF_TOKEN = os.environ.get("HF_TOKEN")

# whisper-base is small enough to run on CPU. Keeping it off the GPU means
# requests never use ZeroGPU quota, so callers can't hit "quota exceeded".
processor = WhisperProcessor.from_pretrained(ADAPTER, token=HF_TOKEN)
base_model = WhisperForConditionalGeneration.from_pretrained(BASE_MODEL)
# torch_device="cpu": on ZeroGPU torch.cuda.is_available() is True, so peft would
# otherwise load the adapter onto a GPU that isn't attached.
model = PeftModel.from_pretrained(base_model, ADAPTER, token=HF_TOKEN, torch_device="cpu").merge_and_unload()
model.eval()

transcriber = pipeline(
    "automatic-speech-recognition",
    model=model,
    tokenizer=processor.tokenizer,
    feature_extractor=processor.feature_extractor,
    device="cpu",
)
print("Model loaded.")


@spaces.GPU(duration=1)
def _noop():
    """ZeroGPU refuses to start without one GPU function. It is never called."""


def decode_audio(path: str) -> np.ndarray:
    """Decode any ffmpeg-readable file (webm, wav, mp3, ...) to 16 kHz mono float32."""
    result = subprocess.run(
        ["ffmpeg", "-nostdin", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SAMPLE_RATE), "-"],
        capture_output=True,
    )
    if result.returncode != 0:
        raise gr.Error("Could not read the audio file.")
    return np.frombuffer(result.stdout, dtype=np.float32)


def transcribe(audio_path: str) -> str:
    """Transcribe a speech recording to text.

    Args:
        audio_path: Path to an audio file (webm, wav, mp3, flac, ...).

    Returns:
        The transcribed text.
    """
    if not audio_path:
        raise gr.Error("No audio received.")
    audio = decode_audio(audio_path)
    if audio.size == 0:
        raise gr.Error("The audio file is empty.")
    result = transcriber({"raw": audio, "sampling_rate": SAMPLE_RATE}, return_timestamps=True)
    return result["text"].strip()


with gr.Blocks(title="Whisper ASR") as demo:
    gr.Markdown("# Whisper ASR\nWhisper-base with a LoRA adapter fine-tuned for the thesis project.")
    audio_input = gr.Audio(sources=["upload", "microphone"], type="filepath", label="Audio")
    button = gr.Button("Transcribe", variant="primary")
    output = gr.Textbox(label="Transcription")
    button.click(transcribe, inputs=audio_input, outputs=output, api_name="transcribe")

demo.queue(default_concurrency_limit=2)

if __name__ == "__main__":
    demo.launch(max_file_size="50mb")
