const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function registrarUsuario({ nombre, email, password }) {
  const respuesta = await fetch(`${API_BASE_URL}/auth/registrarse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, email, password }),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    // FastAPI devuelve { detail: "mensaje" } en errores (409, 422, etc.)
    throw new Error(datos.detail || "No se pudo completar el registro.");
  }

  return datos;
}
