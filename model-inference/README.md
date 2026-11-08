---
title: Thesis ASR
emoji: 🎙️
colorFrom: blue
colorTo: indigo
sdk: gradio
sdk_version: 6.31.0
python_version: "3.12"
app_file: app.py
pinned: false
license: mit
short_description: Whisper-base + LoRA speech-to-text API
---

# Thesis ASR

Speech-to-text service for the thesis app: `openai/whisper-base` with the LoRA adapter
`Tiberiw/whisper-base-lora-finetuned-custom-v1`. Deployed as a Gradio Space on free
ZeroGPU hardware, but the model runs on CPU, so requests use no GPU quota.

The back-end calls the `transcribe` endpoint through Gradio's HTTP API
(`/gradio_api/upload`, then `/gradio_api/call/transcribe`).

## Run locally

Needs `ffmpeg` on the PATH and `HF_TOKEN` set (the adapter repo is gated).

```
pip install gradio spaces torch -r requirements.txt
python app.py
```

It serves on `http://localhost:7860`. Point the back-end's `ASR_URL` at that address.

## Deploy

```
hf upload Tiberiw/thesis-asr . --type space --exclude ".env" --exclude "__pycache__/*"
```
