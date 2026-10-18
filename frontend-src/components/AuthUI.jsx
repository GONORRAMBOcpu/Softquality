import React, { useState } from "react";
import { ShieldCheck, AlertCircle, Eye, EyeOff, ArrowRight } from "lucide-react";

// Tokens de diseño compartidos por Login y Registrarse (mismos del dashboard).
export const INK = "#1B2430";
export const INK_SOFT = "#5B6472";
export const PAPER = "#FBFAF7";
export const LINE = "#DCD9D0";
export const BLUE = "#1E4B8C";
export const RED = "#AA3B33";
export const GREEN = "#3A7D5C";

export function TarjetaAuth({ titulo, subtitulo, children }) {
  return (
    <div style={{
      fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui",
      background: PAPER, color: INK, minHeight: "calc(100vh - 60px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
        .sq-input { transition: border-color 0.15s ease; }
        .sq-input:focus { outline: none; border-color: ${BLUE}; box-shadow: 0 0 0 3px ${BLUE}22; }
        .sq-submit:hover { opacity: 0.9; }
        .sq-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .sq-submit:focus-visible, .sq-ojo:focus-visible, .sq-enlace:focus-visible { outline: 2px solid ${BLUE}; outline-offset: 2px; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 380, border: `1px solid ${LINE}`, borderRadius: 8, background: "#fff", padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <div style={{ width: 26, height: 26, border: `2px solid ${INK}`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={15} color={INK} strokeWidth={2.2} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>SoftQuality</span>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px" }}>{titulo}</h1>
        <p style={{ fontSize: 13, color: INK_SOFT, margin: "0 0 20px", lineHeight: 1.5 }}>{subtitulo}</p>
        {children}
      </div>
    </div>
  );
}

export function Campo({ label, tipo = "text", valor, onChange, placeholder, autoComplete, minLength }) {
  const [visible, setVisible] = useState(false);
  const esPassword = tipo === "password";

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12.5, color: INK_SOFT }}>
      {label}
      <div style={{ position: "relative" }}>
        <input
          className="sq-input"
          type={esPassword && visible ? "text" : tipo}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          value={valor}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box",
            border: `1px solid ${LINE}`, borderRadius: 6,
            padding: esPassword ? "9px 38px 9px 10px" : "9px 10px",
            fontSize: 13.5, fontFamily: "'IBM Plex Sans', sans-serif", color: INK,
          }}
        />
        {esPassword && (
          <button
            type="button"
            className="sq-ojo"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 4, cursor: "pointer", display: "flex", color: INK_SOFT }}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </label>
  );
}

export function MensajeError({ children }) {
  return (
    <div role="alert" style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 12.5, color: RED, background: "#FBEAE8", padding: "8px 10px", borderRadius: 6 }}>
      <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
      {children}
    </div>
  );
}

export function BotonPrincipal({ cargando, textoCargando, children }) {
  return (
    <button
      type="submit"
      className="sq-submit"
      disabled={cargando}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        background: INK, color: "#fff", border: "none", borderRadius: 6,
        padding: "10px 0", fontSize: 13.5, fontWeight: 600, cursor: "pointer", marginTop: 4,
      }}
    >
      {cargando ? textoCargando : children}
      {!cargando && <ArrowRight size={15} />}
    </button>
  );
}
