import { useState, useRef, useCallback } from "react";
import { supabase } from "./supabase";

const API_URL = "https://sonic-collider-production.up.railway.app";

const PRESETS = [
  { id: "bell", label: "🔔 Bell" },
  { id: "rain", label: "🌧 Rain" },
  { id: "thunder", label: "⚡ Thunder" },
  { id: "guitar", label: "🎸 Guitar" },
  { id: "typewriter", label: "⌨️ Typewriter" },
  { id: "waves", label: "🌊 Waves" },
  { id: "piano", label: "🎹 Piano" },
  { id: "clap", label: "👏 Clap" },
];

function WaveformDisplay({ audioUrl }) {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const drawWaveform = useCallback(async (url) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const W = canvasRef.current.width;
    const H = canvasRef.current.height;

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioCtx = new AudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const data = audioBuffer.getChannelData(0);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, H);

    const step = Math.ceil(data.length / W);
    ctx.strokeStyle = "#00d4ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let i = 0; i < W; i++) {
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) {
        const val = data[i * step + j] || 0;
        if (val < min) min = val;
        if (val > max) max = val;
      }
      const yLow = ((1 + min) / 2) * H;
      const yHigh = ((1 + max) / 2) * H;
      if (i === 0) ctx.moveTo(i, yLow);
      ctx.lineTo(i, yHigh);
    }
    ctx.stroke();
    await audioCtx.close();
  }, []);

  useState(() => {
    if (audioUrl) drawWaveform(audioUrl);
  });

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div style={{ width: "100%" }}>
      {audioUrl && (
        <>
          <canvas
            ref={canvasRef}
            width={300}
            height={60}
            style={{ width: "100%", borderRadius: 6, display: "block", cursor: "pointer" }}
            onClick={() => drawWaveform(audioUrl)}
          />
          <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
          <button onClick={togglePlay} style={styles.playBtn}>
            {isPlaying ? "⏹ Stop" : "▶ Play"}
          </button>
        </>
      )}
    </div>
  );
}

function UploadZone({ label, file, onFile }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  const handleChange = (e) => {
    const f = e.target.files[0];
    if (f) onFile(f);
  };

  const handlePreset = async (preset) => {
    const res = await fetch(`/presets/${preset.id}.wav`);
    const blob = await res.blob();
    const f = new File([blob], `${preset.id}.wav`, { type: "audio/wav" });
    onFile(f);
  };

  const audioUrl = file ? URL.createObjectURL(file) : null;

  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <div
        onClick={() => !file && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          ...styles.uploadZone,
          borderColor: dragging ? "#00d4ff" : file ? "#00d4ff" : "#333",
          cursor: file ? "default" : "pointer",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".wav,.mp3,.ogg,.m4a,.flac"
          style={{ display: "none" }}
          onChange={handleChange}
        />
        {!file ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎵</div>
            <div style={{ color: "#888", fontSize: 14 }}>{label}</div>
            <div style={{ color: "#555", fontSize: 12, marginTop: 4 }}>WAV, MP3, OGG, M4A, FLAC</div>
          </div>
        ) : (
          <div style={{ width: "100%" }}>
            <div style={{ color: "#00d4ff", fontSize: 13, marginBottom: 8, wordBreak: "break-all" }}>
              ✓ {file.name}
            </div>
            <WaveformDisplay audioUrl={audioUrl} />
            <button
              onClick={(e) => { e.stopPropagation(); onFile(null); }}
              style={styles.removeBtn}
            >
              ✕ Remove
            </button>
          </div>
        )}
      </div>

      {!file && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: 1, marginBottom: 6 }}>OR PICK A PRESET</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePreset(p)}
                style={styles.presetBtn}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App({ session }) {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [mode, setMode] = useState("multiply");
  const [blendAmount, setBlendAmount] = useState(0.5);
  const [duration, setDuration] = useState(3);
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const [error, setError] = useState(null);

  const modes = [
    { id: "intersect", label: "Intersect", desc: "Only shared frequencies" },
    { id: "multiply", label: "Multiply", desc: "Amplify common energy" },
    { id: "xor", label: "XOR", desc: "Maximum contrast" },
    { id: "blend", label: "Blend", desc: "Smooth morph" },
  ];

  const handleCollide = async () => {
    if (!fileA || !fileB) return;
    setLoading(true);
    setError(null);
    setResultUrl(null);

    const formData = new FormData();
    formData.append("sound_a", fileA);
    formData.append("sound_b", fileB);
    formData.append("mode", mode);
    formData.append("blend_amount", blendAmount);
    formData.append("duration", duration);

    try {
      const res = await fetch(`${API_URL}/collide`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Processing failed");
      }

      const blob = await res.blob();
      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadWav = () => {
    if (!resultBlob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(resultBlob);
    a.download = `sonic_collision_${mode}.wav`;
    a.click();
  };

  return (
    <div style={styles.root}>
      <div style={styles.container}>

        <div style={styles.header}>
          <h1 style={styles.title}>SONIC<span style={{ color: "#00d4ff" }}>COLLIDER</span></h1>
          <p style={styles.subtitle}>Upload two sounds. Collide them into something new.</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 8 }}>
            <span style={{ color: "#555", fontSize: 13 }}>{session.user.email}</span>
            <button
              onClick={() => supabase.auth.signOut()}
              style={{ padding: "4px 12px", background: "transparent", color: "#555", border: "1px solid #2a2a2a", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
            >
              Log out
            </button>
          </div>
        </div>

        <div style={styles.uploadRow}>
          <UploadZone label="Drop Sound A here" file={fileA} onFile={setFileA} />
          <div style={styles.plusSign}>+</div>
          <UploadZone label="Drop Sound B here" file={fileB} onFile={setFileB} />
        </div>

        <div style={styles.section}>
          <div style={styles.sectionLabel}>COLLISION MODE</div>
          <div style={styles.modeRow}>
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  ...styles.modeBtn,
                  borderColor: mode === m.id ? "#00d4ff" : "#333",
                  color: mode === m.id ? "#00d4ff" : "#888",
                  background: mode === m.id ? "rgba(0,212,255,0.08)" : "transparent",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>{m.label}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>{m.desc}</div>
              </button>
            ))}
          </div>

          {mode === "blend" && (
            <div style={styles.sliderRow}>
              <span style={styles.sliderLabel}>Sound A</span>
              <input
                type="range"
                min={0} max={1} step={0.01}
                value={blendAmount}
                onChange={(e) => setBlendAmount(parseFloat(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.sliderLabel}>Sound B</span>
            </div>
          )}
        </div>

        <div style={styles.section}>
          <div style={styles.sectionLabel}>DURATION: {duration}s</div>
          <input
            type="range"
            min={1} max={300} step={1}
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            style={{ ...styles.slider, width: "100%" }}
          />
        </div>

        <button
          onClick={handleCollide}
          disabled={!fileA || !fileB || loading}
          style={{
            ...styles.collideBtn,
            opacity: (!fileA || !fileB || loading) ? 0.4 : 1,
            cursor: (!fileA || !fileB || loading) ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "COLLIDING..." : "⚡ COLLIDE"}
        </button>

        {error && <div style={styles.error}>⚠ {error}</div>}

        {resultUrl && (
          <div style={styles.result}>
            <div style={styles.sectionLabel}>COLLISION RESULT</div>
            <WaveformDisplay audioUrl={resultUrl} />
            <div style={styles.downloadRow}>
              <button onClick={downloadWav} style={styles.downloadBtn}>
                ↓ Download WAV
              </button>
              <button
                onClick={() => { setResultUrl(null); setResultBlob(null); }}
                style={styles.tryAgainBtn}
              >
                ↺ Try Again
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#fff",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "20px 16px",
  },
  container: {
    maxWidth: 680,
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: 800,
    letterSpacing: 4,
    margin: 0,
    color: "#fff",
  },
  subtitle: {
    color: "#666",
    fontSize: 15,
    marginTop: 8,
  },
  uploadRow: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    marginBottom: 32,
    flexWrap: "wrap",
  },
  uploadZone: {
    flex: 1,
    minWidth: 200,
    minHeight: 140,
    border: "2px dashed #333",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    transition: "border-color 0.2s",
  },
  plusSign: {
    fontSize: 28,
    color: "#444",
    flexShrink: 0,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: "#555",
    marginBottom: 10,
  },
  modeRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  modeBtn: {
    flex: 1,
    minWidth: 100,
    padding: "10px 8px",
    border: "1px solid #333",
    borderRadius: 8,
    background: "transparent",
    cursor: "pointer",
    transition: "all 0.15s",
    textAlign: "center",
  },
  sliderRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  sliderLabel: {
    fontSize: 12,
    color: "#666",
    flexShrink: 0,
  },
  slider: {
    flex: 1,
    accentColor: "#00d4ff",
  },
  collideBtn: {
    width: "100%",
    padding: "18px",
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 3,
    background: "linear-gradient(135deg, #00d4ff, #0066ff)",
    color: "#000",
    border: "none",
    borderRadius: 12,
    marginBottom: 24,
    transition: "opacity 0.2s",
  },
  error: {
    background: "rgba(255,60,60,0.1)",
    border: "1px solid rgba(255,60,60,0.3)",
    borderRadius: 8,
    padding: "12px 16px",
    color: "#ff6060",
    fontSize: 14,
    marginBottom: 16,
  },
  result: {
    background: "#111",
    border: "1px solid #222",
    borderRadius: 12,
    padding: 20,
  },
  downloadRow: {
    display: "flex",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap",
  },
  downloadBtn: {
    flex: 1,
    padding: "10px 16px",
    background: "#00d4ff",
    color: "#000",
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 14,
  },
  tryAgainBtn: {
    flex: 1,
    padding: "10px 16px",
    background: "transparent",
    color: "#888",
    border: "1px solid #333",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
  },
  playBtn: {
    marginTop: 8,
    padding: "6px 14px",
    background: "transparent",
    color: "#00d4ff",
    border: "1px solid #00d4ff",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
  },
  removeBtn: {
    marginTop: 8,
    padding: "4px 10px",
    background: "transparent",
    color: "#666",
    border: "1px solid #333",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
  },
  presetBtn: {
    padding: "5px 10px",
    background: "transparent",
    color: "#666",
    border: "1px solid #2a2a2a",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
  },
};