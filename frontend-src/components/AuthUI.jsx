import React, { useState } from "react";
import { ShieldCheck, AlertCircle, Eye, EyeOff, ArrowRight } from "lucide-react";

// Paleta Azul Futurista (Dark Theme) alineada con tu Dashboard
export const INK = "#f8fafc"; // Textos principales (Slate 50)
export const INK_SOFT = "#94a3b8"; // Textos secundarios (Slate 400)
export const PAPER = "#131722"; // Fondo principal oscuro
export const CARD_BG = "#1e2330"; // Fondo de la tarjeta
export const LINE = "#334155"; // Bordes (Slate 700)
export const BLUE = "#38bdf8"; // Acento azul neón
export const RED = "#f87171"; // Error
export const GREEN = "#34d399"; // Éxito
export const PURPLE = "#8b5cf6"; // Botón principal

export function TarjetaAuth({ titulo, subtitulo, children }) {
  return (
    <div style={{
      fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
      background: PAPER, color: INK, minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <style>{`
        .sq-input { 
          transition: all 0.2s ease; 
          background: ${PAPER};
          color: ${INK};
          border: 1px solid ${LINE};
        }
        .sq-input:focus { 
          outline: none; 
          border-color: ${BLUE}; 
          box-shadow: 0 0 0 1px ${BLUE}; 
        }
        .sq-input::placeholder { color: #475569; }
        .sq-submit {
          transition: all 0.2s ease;
          background: ${PURPLE};
          box-shadow: 0 4px 14px rgba(139, 92, 246, 0.3);
        }
        .sq-submit:hover:not(:disabled) { 
          background: #7c3aed; 
        }
        .sq-submit:disabled { 
          background: #334155; 
          color: #94a3b8;
          box-shadow: none;
          cursor: not-allowed; 
        }
        .sq-enlace { transition: color 0.2s; }
        .sq-enlace:hover { color: #7dd3fc !important; }
      `}</style>

      <div style={{ 
        width: "100%", maxWidth: 420, 
        border: `1px solid ${LINE}`, 
        borderRadius: 12, 
        background: CARD_BG, 
        padding: "40px 32px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32, textAlign: "center" }}>
          <div style={{ 
            width: 48, height: 48, 
            background: "rgba(56, 189, 248, 0.1)",
            border: `1px solid rgba(56, 189, 248, 0.2)`, 
            borderRadius: 12, 
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16
          }}>
            <ShieldCheck size={24} color={BLUE} strokeWidth={2} />
          </div>
          <p style={{ color: BLUE, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 8px" }}>
            Acceso al Sistema
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>{titulo}</h1>
          <p style={{ fontSize: 14, color: INK_SOFT, margin: 0, lineHeight: 1.5 }}>{subtitulo}</p>
        </div>
        
        {children}
      </div>
    </div>
  );
}

export function Campo({ label, tipo = "text", valor, onChange, placeholder, autoComplete, minLength }) {
  const [visible, setVisible] = useState(false);
  const esPassword = tipo === "password";

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, fontWeight: 500, color: "#cbd5e1" }}>
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
            borderRadius: 8,
            padding: esPassword ? "12px 40px 12px 16px" : "12px 16px",
            fontSize: 14, fontFamily: "inherit",
          }}
        />
        {esPassword && (
          <button
            type="button"
            className="sq-ojo"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            style={{ 
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", 
              background: "none", border: "none", padding: 6, cursor: "pointer", 
              display: "flex", color: INK_SOFT 
            }}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </label>
  );
}

export function MensajeError({ children }) {
  return (
    <div role="alert" style={{ 
      display: "flex", gap: 10, alignItems: "center", 
      fontSize: 13, color: RED, 
      background: "#451a20", border: `1px solid ${RED}40`,
      padding: "10px 14px", borderRadius: 8, marginTop: 4 
    }}>
      <AlertCircle size={16} style={{ flexShrink: 0 }} />
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
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        color: "#fff", border: "none", borderRadius: 8,
        padding: "14px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 12,
      }}
    >
      {cargando ? (
        <>
          <svg className="animate-spin" style={{ height: 18, width: 18 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {textoCargando}
        </>
      ) : (
        <>
          {children}
          <ArrowRight size={16} />
        </>
      )}
    </button>
  );
}