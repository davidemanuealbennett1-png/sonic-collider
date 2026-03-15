"""
Generates preset sound files for Sonic Collider.
Run this once to create the preset WAV files.
Output goes to frontend/public/presets/
"""
import numpy as np
import soundfile as sf
import os

SR = 22050
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'presets')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def save(name, y):
    path = os.path.join(OUTPUT_DIR, f'{name}.wav')
    sf.write(path, y.astype(np.float32), SR)
    print(f'Created: {name}.wav')

def fade(y, in_ms=50, out_ms=200):
    fi = int(SR * in_ms / 1000)
    fo = int(SR * out_ms / 1000)
    y = y.copy()
    y[:fi] *= np.linspace(0, 1, fi)
    y[-fo:] *= np.linspace(1, 0, fo)
    return y

def normalize(y, peak=0.8):
    m = np.max(np.abs(y))
    return y / m * peak if m > 0 else y

# 1. Bell — decaying sine with harmonics
def make_bell(duration=3.0):
    t = np.linspace(0, duration, int(SR * duration))
    env = np.exp(-3 * t)
    y = env * (
        0.6 * np.sin(2 * np.pi * 880 * t) +
        0.3 * np.sin(2 * np.pi * 1760 * t) +
        0.1 * np.sin(2 * np.pi * 2640 * t)
    )
    return normalize(fade(y))

# 2. Rain — filtered noise with randomness
def make_rain(duration=3.0):
    n = int(SR * duration)
    noise = np.random.randn(n)
    # Simple low-pass by averaging
    kernel = np.ones(8) / 8
    from numpy import convolve
    y = convolve(noise, kernel, mode='same') * 0.5
    # Add some drip transients
    for _ in range(40):
        pos = np.random.randint(0, n - 500)
        drip_len = np.random.randint(200, 500)
        t = np.linspace(0, 1, drip_len)
        drip = np.exp(-8 * t) * np.sin(2 * np.pi * np.random.uniform(800, 2000) * t) * 0.3
        y[pos:pos + drip_len] += drip
    return normalize(fade(y))

# 3. Thunder — low rumble burst
def make_thunder(duration=3.0):
    n = int(SR * duration)
    noise = np.random.randn(n)
    # Heavy low-pass
    kernel = np.ones(200) / 200
    from numpy import convolve
    y = convolve(noise, kernel, mode='same')
    # Envelope: sharp attack, long decay
    env = np.zeros(n)
    attack = int(SR * 0.05)
    env[:attack] = np.linspace(0, 1, attack)
    env[attack:] = np.exp(-2 * np.linspace(0, 1, n - attack) * 3)
    y = y * env
    return normalize(fade(y, in_ms=10, out_ms=500))

# 4. Guitar strum — harmonic series with decay
def make_guitar(duration=3.0):
    t = np.linspace(0, duration, int(SR * duration))
    fundamental = 196  # G3
    harmonics = [1, 2, 3, 4, 5, 6]
    weights = [1.0, 0.6, 0.4, 0.25, 0.15, 0.08]
    y = np.zeros_like(t)
    for h, w in zip(harmonics, weights):
        decay = np.exp(-1.5 * t * h)
        # Slight detuning for richness
        detune = np.random.uniform(0.998, 1.002)
        y += w * decay * np.sin(2 * np.pi * fundamental * h * detune * t)
    return normalize(fade(y))

# 5. Typewriter — percussive clicks
def make_typewriter(duration=3.0):
    n = int(SR * duration)
    y = np.zeros(n)
    # Random click pattern
    click_times = sorted(np.random.uniform(0.05, duration - 0.1, 20))
    for ct in click_times:
        pos = int(ct * SR)
        click_len = int(SR * 0.02)
        if pos + click_len < n:
            t = np.linspace(0, 1, click_len)
            click = np.exp(-30 * t) * np.sin(2 * np.pi * 3000 * t) * 0.7
            y[pos:pos + click_len] += click
    return normalize(fade(y))

# 6. Ocean waves — slow modulated noise
def make_waves(duration=4.0):
    n = int(SR * duration)
    noise = np.random.randn(n)
    kernel = np.ones(400) / 400
    from numpy import convolve
    y = convolve(noise, kernel, mode='same')
    # Slow amplitude modulation for wave rhythm
    t = np.linspace(0, duration, n)
    mod = 0.5 + 0.5 * np.sin(2 * np.pi * 0.3 * t)
    y = y * mod
    return normalize(fade(y, in_ms=500, out_ms=500))

# 7. Piano note — harmonic with hammer transient
def make_piano(duration=3.0):
    t = np.linspace(0, duration, int(SR * duration))
    fundamental = 261.63  # C4
    y = np.zeros_like(t)
    for h in range(1, 8):
        decay_rate = 1.5 + h * 0.5
        amp = 1.0 / h
        y += amp * np.exp(-decay_rate * t) * np.sin(2 * np.pi * fundamental * h * t)
    # Add hammer transient
    transient_len = int(SR * 0.01)
    y[:transient_len] += np.random.randn(transient_len) * 0.3 * np.linspace(1, 0, transient_len)
    return normalize(fade(y))

# 8. Clap — noise burst
def make_clap(duration=2.0):
    n = int(SR * duration)
    y = np.zeros(n)
    # Main clap body
    clap_len = int(SR * 0.08)
    noise = np.random.randn(clap_len)
    env = np.exp(-20 * np.linspace(0, 1, clap_len))
    clap = noise * env * 0.8
    y[:clap_len] = clap
    # Small echo
    echo_pos = int(SR * 0.12)
    y[echo_pos:echo_pos + clap_len] += clap * 0.3
    return normalize(fade(y, in_ms=5, out_ms=300))

# Generate all presets
save('bell', make_bell())
save('rain', make_rain())
save('thunder', make_thunder())
save('guitar', make_guitar())
save('typewriter', make_typewriter())
save('waves', make_waves())
save('piano', make_piano())
save('clap', make_clap())

print('\nAll presets generated successfully!')
print(f'Files saved to: {os.path.abspath(OUTPUT_DIR)}')