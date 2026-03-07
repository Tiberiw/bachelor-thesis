FROM pytorch/pytorch:2.1.2-cuda12.1-cudnn8-runtime

WORKDIR /code

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.9 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY ./requirements.txt /code/requirements.txt

RUN python3 -m pip install --no-cache-dir --upgrade pip && \
    python3 -m pip install --no-cache-dir -r /code/requirements.txt --extra-index-url https://download.pytorch.org/whl/cu121


COPY ./app.py /code/app.py

# RUN useradd user

# USER user

# ENV HOME=/home/user \
#     PATH=/home/user/.local/bin:$PATH

# WORKDIR $HOME/app

# COPY --chown=user . $HOME/app

ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]