import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Envuelve las páginas que exigen sesión. Si no hay usuario, manda a /login
// y recuerda a dónde quería ir para volver ahí después de entrar.
export default function RutaProtegida({ children }) {
  const { usuario, verificando } = useAuth();
  const location = useLocation();

  if (verificando) {
    return <div style={{ padding: 32, color: "#5B6472" }}>Verificando sesión…</div>;
  }
  if (!usuario) {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  }
  return children;
}
