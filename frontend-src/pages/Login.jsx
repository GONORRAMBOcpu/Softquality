import React, { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { mensajeError } from "../services/api";
import { TarjetaAuth, Campo, MensajeError, BotonPrincipal, BLUE, INK_SOFT } from "../components/AuthUI";

export default function Login() {
  const { usuario, login } = useAuth();
  const location = useLocation();
  const destino = location.state?.desde || "/subir";

  const [form, setForm] = useState({ email: "", password: "" });
  const [estado, setEstado] = useState({ cargando: false, error: null });

  // Si ya hay sesión (o el login acaba de funcionar) se va directo a la página de destino
  if (usuario) return <Navigate to={destino} replace />;

  async function enviarFormulario(e) {
    e.preventDefault();
    setEstado({ cargando: true, error: null });
    try {
      await login({ email: form.email.trim(), password: form.password });
    } catch (err) {
      setEstado({ cargando: false, error: mensajeError(err) });
    }
  }

  return (
    <TarjetaAuth titulo="Iniciar sesión" subtitulo="Entra para analizar la calidad de tus proyectos.">
      <form onSubmit={enviarFormulario} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Campo
          label="Correo"
          tipo="email"
          autoComplete="email"
          valor={form.email}
          onChange={(v) => setForm((p) => ({ ...p, email: v }))}
          placeholder="usuario@correo.edu.co"
        />
        <Campo
          label="Contraseña"
          tipo="password"
          autoComplete="current-password"
          valor={form.password}
          onChange={(v) => setForm((p) => ({ ...p, password: v }))}
          placeholder="Tu contraseña"
        />

        {estado.error && <MensajeError>{estado.error}</MensajeError>}

        <BotonPrincipal cargando={estado.cargando} textoCargando="Entrando…">
          Iniciar sesión
        </BotonPrincipal>
      </form>

      <p style={{ fontSize: 13, color: INK_SOFT, margin: "18px 0 0" }}>
        ¿No tienes cuenta?{" "}
        <Link to="/registrarse" className="sq-enlace" style={{ color: BLUE, fontWeight: 600 }}>
          Crear cuenta
        </Link>
      </p>
    </TarjetaAuth>
  );
}
