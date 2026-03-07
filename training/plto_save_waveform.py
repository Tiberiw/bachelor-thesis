import librosa
import matplotlib.pyplot as plt
import numpy as np

def plot_and_save_waveform(audio_path, output_path, sr=16000):
    """
    Loads an audio file, plots its waveform, and saves the plot.
    :param audio_path: Path to the audio file.
    :param output_path: Path to save the waveform image (e.g., 'waveform.png').
    :param sr: Sampling rate for loading audio.
    """
    y, sr = librosa.load(audio_path, sr=sr)
    plt.figure(figsize=(14, 5))
    librosa.display.waveshow(y, sr=sr)
    plt.title('Waveform')
    plt.xlabel('Time (s)')
    plt.ylabel('Amplitude')
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()
    print(f"Waveform saved to {output_path}")


    dft_input = y[:4096]

    # calculate the DFT
    window = np.hanning(len(dft_input))
    windowed_input = dft_input * window
    dft = np.fft.rfft(windowed_input)

    # get the amplitude spectrum in decibels
    amplitude = np.abs(dft)
    amplitude_db = librosa.amplitude_to_db(amplitude, ref=np.max)

    # get the frequency bins
    frequency = librosa.fft_frequencies(sr=sr, n_fft=len(dft_input))

    plt.figure().set_figwidth(12)
    plt.plot(frequency, amplitude_db)
    plt.xlabel("Frequency (Hz)")
    plt.ylabel("Amplitude (dB)")
    plt.xscale("log")
    plt.savefig('freq' + output_path, dpi=150)
    plt.close()

plot_and_save_waveform('./dataset/drug-brand-en-us-female-0a0ea613-634d-48af-b85f-91adff2ae6c1.mp3', 'waveform.png')