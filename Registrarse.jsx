import React, { useState } from "react";
import { ShieldCheck, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { registrarUsuario } from "../services/api";

// Mismos tokens de diseño usados en el dashboard, para mantener consistencia visual.
const INK = "#1B2430";
const INK_SOFT = "#5B6472";
const PAPER = "#FBFAF7";
const LINE = "#DCD9D0";
const BLUE = "#1E4B8C";
const RED = "#AA3B33";
const GREEN = "#3A7D5C";

export default function Registrarse() {
  const [form, setForm] = useState({ nombre: "", email: "", password: "" });
  const [estado, setEstado] = useState({ cargando: false, error: null, exito: false });

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function enviarFormulario(e) {
    e.preventDefault();
    setEstado({ cargando: true, error: null, exito: false });
    try {
      await registrarUsuario(form);
      setEstado({ cargando: false, error: null, exito: true });
    } catch (err) {
      setEstado({ cargando: false, error: err.message, exito: false });
    }
  }

  return (
    <div style={{
      fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui",
      background: PAPER, color: INK, minHeight: 640,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .sq-input { transition: border-color 0.15s ease; }
        .sq-input:focus { outline: none; border-color: ${BLUE}; }
        .sq-submit:hover { opacity: 0.9; }
        .sq-submit:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div style={{ width: 380, border: `1px solid ${LINE}`, borderRadius: 8, background: "#fff", padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 26, height: 26, border: `2px solid ${INK}`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={15} color={INK} strokeWidth={2.2} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>SoftQuality</span>
        </div>
        <div style={{ fontSize: 11.5, color: INK_SOFT, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 18 }}>
          CASO DE USO · REGISTRARSE
        </div>

        {estado.exito ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, padding: "16px 0" }}>
            <CheckCircle2 size={28} color={GREEN} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>Cuenta creada</div>
            <div style={{ fontSize: 13, color: INK_SOFT, lineHeight: 1.5 }}>
              Ya puedes iniciar sesión para registrar tu primer proyecto.
            </div>
          </div>
        ) : (
          <form onSubmit={enviarFormulario} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Campo
              label="Nombre completo"
              tipo="text"
              valor={form.nombre}
              onChange={(v) => actualizarCampo("nombre", v)}
              placeholder="Juan Camilo Solarte"
            />
            <Campo
              label="Correo institucional"
              tipo="email"
              valor={form.email}
              onChange={(v) => actualizarCampo("email", v)}
              placeholder="usuario@correo.edu.co"
            />
            <Campo
              label="Contraseña"
              tipo="password"
              valor={form.password}
              onChange={(v) => actualizarCampo("password", v)}
              placeholder="Mínimo 8 caracteres"
            />

            {estado.error && (
              <div style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 12.5, color: RED, background: "#FBEAE8", padding: "8px 10px", borderRadius: 6 }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {estado.error}
              </div>
            )}

            <button
              type="submit"
              className="sq-submit"
              disabled={estado.cargando}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: INK, color: "#fff", border: "none", borderRadius: 6,
                padding: "10px 0", fontSize: 13.5, fontWeight: 600, cursor: "pointer", marginTop: 4,
              }}
            >
              {estado.cargando ? "Creando cuenta…" : "Crear cuenta"}
              {!estado.cargando && <ArrowRight size={15} />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Campo({ label, tipo, valor, onChange, placeholder }) {
  const INK_SOFT_LOCAL = "#5B6472";
  const LINE_LOCAL = "#DCD9D0";
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12.5, color: INK_SOFT_LOCAL }}>
      {label}
      <input
        className="sq-input"
        type={tipo}
        required
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: `1px solid ${LINE_LOCAL}`, borderRadius: 6, padding: "9px 10px",
          fontSize: 13.5, fontFamily: "'IBM Plex Sans', sans-serif", color: "#1B2430",
        }}
      />
    </label>
  );
}
