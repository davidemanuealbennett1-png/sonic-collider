import urllib.request
import os
from collider import collide, save_wav, save_mp3

# Download two free test sounds
print("Downloading test sounds...")

sound_a_url = "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
sound_b_url = "https://www.soundjay.com/nature/sounds/rain-01.wav"

# Fallback: generate simple test tones if download fails
def generate_test_tone(frequency, duration, output_path):
    import numpy as np
    import soundfile as sf
    sr = 22050
    t = np.linspace(0, duration, int(sr * duration))
    y = 0.5 * np.sin(2 * np.pi * frequency * t)
    sf.write(output_path, y.astype(np.float32), sr)
    print(f"Generated test tone: {frequency}Hz -> {output_path}")

try:
    urllib.request.urlretrieve(sound_a_url, "test_a.wav")
    print("Downloaded sound A")
except:
    print("Download failed, generating test tone A (440Hz)")
    generate_test_tone(440, 2.0, "test_a.wav")

try:
    urllib.request.urlretrieve(sound_b_url, "test_b.wav")
    print("Downloaded sound B")
except:
    print("Download failed, generating test tone B (660Hz)")
    generate_test_tone(660, 2.0, "test_b.wav")

# Test all four modes
modes = ["intersect", "multiply", "xor", "blend"]

for mode in modes:
    print(f"\nTesting mode: {mode}...")
    try:
        y_out, sr = collide(
            "test_a.wav",
            "test_b.wav",
            mode=mode,
            blend_amount=0.5,
            duration_seconds=3
        )
        output_wav = f"output_{mode}.wav"
        save_wav(y_out, sr, output_wav)
        print(f"  WAV saved: {output_wav}")

        output_mp3 = f"output_{mode}.mp3"
        save_mp3(output_wav, output_mp3)
        print(f"  MP3 saved: {output_mp3}")

    except Exception as e:
        print(f"  ERROR in {mode}: {e}")

print("\nDone! Check the backend folder for output files.")
print("Listen to each output_*.wav or output_*.mp3 to hear the results.")