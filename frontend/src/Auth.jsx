import { useState } from "react";
import { supabase } from "./supabase";

export default function Auth() {
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("Check your email for a confirmation link!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <h1 style={styles.title}>
          SONIC<span style={{ color: "#00d4ff" }}>COLLIDER</span>
        </h1>
        <p style={styles.subtitle}>Turn any two sounds into something new.</p>

        <button onClick={handleGoogle} style={styles.googleBtn}>
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: 8 }}>
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.038l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

        <form onSubmit={handleEmailAuth}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />

          {error && <div style={styles.error}>{error}</div>}
          {message && <div style={styles.success}>{message}</div>}

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? "..." : mode === "login" ? "Log In" : "Sign Up"}
          </button>
        </form>

        <p style={styles.switchText}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <span
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); setMessage(null); }}
            style={styles.switchLink}
          >
            {mode === "login" ? "Sign Up" : "Log In"}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0a0a0a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "#111",
    border: "1px solid #222",
    borderRadius: 16,
    padding: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: 4,
    color: "#fff",
    textAlign: "center",
    margin: "0 0 8px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  subtitle: {
    color: "#555",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 28,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  googleBtn: {
    width: "100%",
    padding: "12px 16px",
    background: "#fff",
    color: "#333",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "#222",
  },
  dividerText: {
    color: "#555",
    fontSize: 12,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    background: "#0a0a0a",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
    marginBottom: 12,
    outline: "none",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    boxSizing: "border-box",
  },
  error: {
    background: "rgba(255,60,60,0.1)",
    border: "1px solid rgba(255,60,60,0.3)",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#ff6060",
    fontSize: 13,
    marginBottom: 12,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  success: {
    background: "rgba(0,212,100,0.1)",
    border: "1px solid rgba(0,212,100,0.3)",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#00d464",
    fontSize: 13,
    marginBottom: 12,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  submitBtn: {
    width: "100%",
    padding: "13px",
    background: "linear-gradient(135deg, #00d4ff, #0066ff)",
    color: "#000",
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    marginBottom: 16,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  switchText: {
    color: "#555",
    fontSize: 13,
    textAlign: "center",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  switchLink: {
    color: "#00d4ff",
    cursor: "pointer",
  },
};