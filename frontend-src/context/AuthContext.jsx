import React, { createContext, useContext, useEffect, useState } from "react";
import {
  iniciarSesion,
  limpiarSesion,
  obtenerPerfil,
  obtenerToken,
  obtenerUsuarioGuardado,
} from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => (obtenerToken() ? obtenerUsuarioGuardado() : null));
  // Mientras hay token guardado se confirma con el backend que sigue siendo válido
  const [verificando, setVerificando] = useState(Boolean(obtenerToken()));

  useEffect(() => {
    if (!obtenerToken()) return;
    obtenerPerfil()
      .then(setUsuario)
      .catch(() => {
        limpiarSesion();
        setUsuario(null);
      })
      .finally(() => setVerificando(false));
  }, []);

  async function login(credenciales) {
    const datos = await iniciarSesion(credenciales);
    setUsuario(datos.usuario);
    return datos.usuario;
  }

  function logout() {
    limpiarSesion();
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, verificando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
