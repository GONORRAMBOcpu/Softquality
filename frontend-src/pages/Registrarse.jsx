import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { registrarUsuario, mensajeError } from "../services/api";
import { TarjetaAuth, Campo, MensajeError, BotonPrincipal, BLUE, GREEN, INK_SOFT } from "../components/AuthUI";

export default function Registrarse() {
  const { usuario } = useAuth();
  const [form, setForm] = useState({ nombre: "", email: "", password: "" });
  const [estado, setEstado] = useState({ cargando: false, error: null, exito: false });

  if (usuario) return <Navigate to="/subir" replace />;

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function enviarFormulario(e) {
    e.preventDefault();
    setEstado({ cargando: true, error: null, exito: false });
    try {
      await registrarUsuario({ ...form, nombre: form.nombre.trim(), email: form.email.trim() });
      setEstado({ cargando: false, error: null, exito: true });
    } catch (err) {
      setEstado({ cargando: false, error: mensajeError(err), exito: false });
    }
  }

  if (estado.exito) {
    return (
      <TarjetaAuth titulo="Cuenta creada" subtitulo="Ya puedes iniciar sesión para registrar tu primer proyecto.">
        <CheckCircle2 size={28} color={GREEN} style={{ marginBottom: 14 }} />
        <Link
          to="/login"
          className="sq-enlace"
          style={{ display: "inline-block", background: "#1B2430", color: "#fff", borderRadius: 6, padding: "10px 18px", fontSize: 13.5, fontWeight: 600, textDecoration: "none" }}
        >
          Ir a iniciar sesión
        </Link>
      </TarjetaAuth>
    );
  }

  return (
    <TarjetaAuth titulo="Crear cuenta" subtitulo="Regístrate para evaluar tus proyectos con ISO/IEC 25010.">
      <form onSubmit={enviarFormulario} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Campo
          label="Nombre completo"
          autoComplete="name"
          minLength={2}
          valor={form.nombre}
          onChange={(v) => actualizarCampo("nombre", v)}
          placeholder="Juan Camilo Solarte"
        />
        <Campo
          label="Correo institucional"
          tipo="email"
          autoComplete="email"
          valor={form.email}
          onChange={(v) => actualizarCampo("email", v)}
          placeholder="usuario@correo.edu.co"
        />
        <Campo
          label="Contraseña"
          tipo="password"
          autoComplete="new-password"
          minLength={8}
          valor={form.password}
          onChange={(v) => actualizarCampo("password", v)}
          placeholder="Mínimo 8 caracteres"
        />

        {estado.error && <MensajeError>{estado.error}</MensajeError>}

        <BotonPrincipal cargando={estado.cargando} textoCargando="Creando cuenta…">
          Crear cuenta
        </BotonPrincipal>
      </form>

      <p style={{ fontSize: 13, color: INK_SOFT, margin: "18px 0 0" }}>
        ¿Ya tienes cuenta?{" "}
        <Link to="/login" className="sq-enlace" style={{ color: BLUE, fontWeight: 600 }}>
          Iniciar sesión
        </Link>
      </p>
    </TarjetaAuth>
  );
}
