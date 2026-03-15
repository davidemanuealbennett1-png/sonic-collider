import librosa
import numpy as np
import soundfile as sf
from scipy.signal import fftconvolve
import tempfile
import os

TARGET_SR = 22050

def load_and_normalize(path, target_length=None):
    y, sr = librosa.load(path, sr=TARGET_SR, mono=True)
    if target_length is not None:
        if len(y) > target_length:
            y = y[:target_length]
        elif len(y) < target_length:
            y = np.pad(y, (0, target_length - len(y)))
    return y

def apply_postprocess(y, duration_seconds=3):
    target_len = int(TARGET_SR * duration_seconds)
    if len(y) > target_len:
        y = y[:target_len]
    elif len(y) < target_len:
        y = np.pad(y, (0, target_len - len(y)))

    # Fade in (50ms) and fade out (200ms)
    fade_in_len = int(TARGET_SR * 0.05)
    fade_out_len = int(TARGET_SR * 0.2)
    y[:fade_in_len] *= np.linspace(0, 1, fade_in_len)
    y[-fade_out_len:] *= np.linspace(1, 0, fade_out_len)

    # Simple reverb using delay
    reverb_delay = int(TARGET_SR * 0.03)
    reverb_signal = np.zeros_like(y)
    if len(y) > reverb_delay:
        reverb_signal[reverb_delay:] = y[:-reverb_delay] * 0.3
    y = y + reverb_signal

    # Normalize to -3dB peak
    peak = np.max(np.abs(y))
    if peak > 0:
        y = y / peak * 0.708

    return y.astype(np.float32)

def collide(path_a, path_b, mode="multiply", blend_amount=0.5, duration_seconds=3):
    # Load both sounds, match length to shorter one
    y_a_raw, _ = librosa.load(path_a, sr=TARGET_SR, mono=True)
    y_b_raw, _ = librosa.load(path_b, sr=TARGET_SR, mono=True)

    target_len = min(len(y_a_raw), len(y_b_raw))
    # Use at least 1 second worth of samples
    target_len = max(target_len, TARGET_SR)

    y_a = load_and_normalize(path_a, target_len)
    y_b = load_and_normalize(path_b, target_len)

    # Compute STFTs
    n_fft = 2048
    hop_length = 512

    stft_a = librosa.stft(y_a, n_fft=n_fft, hop_length=hop_length)
    stft_b = librosa.stft(y_b, n_fft=n_fft, hop_length=hop_length)

    mag_a = np.abs(stft_a)
    mag_b = np.abs(stft_b)
    phase_a = np.angle(stft_a)
    phase_b = np.angle(stft_b)

    if mode == "intersect":
        # Keep frequencies where BOTH sounds have energy
        new_mag = np.minimum(mag_a, mag_b)
        dominant = (mag_a >= mag_b).astype(float)
        new_phase = phase_a * dominant + phase_b * (1 - dominant)

    elif mode == "multiply":
        # Normalize each to 0-1, multiply together
        norm_a = mag_a / (np.max(mag_a) + 1e-8)
        norm_b = mag_b / (np.max(mag_b) + 1e-8)
        new_mag = norm_a * norm_b
        new_mag = new_mag / (np.max(new_mag) + 1e-8) * np.max(mag_a)
        new_phase = (phase_a + phase_b) / 2

    elif mode == "xor":
        # Keep frequencies where sounds DIFFER most
        new_mag = np.abs(mag_a - mag_b)
        new_phase = phase_a * (mag_a > mag_b) + phase_b * (mag_b >= mag_a)

    elif mode == "blend":
        # Smooth interpolation between A and B
        t = float(blend_amount)
        new_mag = (1 - t) * mag_a + t * mag_b
        new_phase = (1 - t) * phase_a + t * phase_b

    else:
        raise ValueError(f"Unknown mode: {mode}")

    # Reconstruct audio from new magnitude + phase
    new_stft = new_mag * np.exp(1j * new_phase)
    y_out = librosa.istft(new_stft, hop_length=hop_length)

    # Post-process
    y_out = apply_postprocess(y_out, duration_seconds)

    return y_out, TARGET_SR


def save_wav(y, sr, output_path):
    sf.write(output_path, y, sr, subtype='PCM_16')


def save_mp3(wav_path, mp3_path):
    from pydub import AudioSegment
    audio = AudioSegment.from_wav(wav_path)
    audio.export(mp3_path, format="mp3", bitrate="192k")