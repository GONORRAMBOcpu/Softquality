import axios from 'axios';

// Apuntamos al backend local donde corre FastAPI (se puede cambiar con VITE_API_URL en frontend/.env)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// ==========================================
// SESIÓN (token JWT guardado en localStorage)
// ==========================================
const TOKEN_KEY = 'sq_token';
const USUARIO_KEY = 'sq_usuario';

export const obtenerToken = () => localStorage.getItem(TOKEN_KEY);

export const obtenerUsuarioGuardado = () => {
  try {
    return JSON.parse(localStorage.getItem(USUARIO_KEY));
  } catch {
    return null;
  }
};

const guardarSesion = (token, usuario) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
};

export const limpiarSesion = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
};

// Antes de CADA petición: si hay token, se envía en la cabecera Authorization.
apiClient.interceptors.request.use((config) => {
  const token = obtenerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el backend responde 401 (token vencido o inválido) se cierra la sesión local
// y se manda al login. El 401 del propio login (clave incorrecta) NO cuenta.
apiClient.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.includes('/auth/login')) {
      limpiarSesion();
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

// Convierte un error de axios en un texto legible para mostrar en pantalla.
export const mensajeError = (error, porDefecto = 'Ocurrió un error inesperado. Inténtalo de nuevo.') => {
  if (!error?.response) {
    return 'No se pudo conectar con el servidor. Verifica que el backend esté encendido.';
  }
  const detalle = error.response.data?.detail;
  if (typeof detalle === 'string') return detalle;
  if (Array.isArray(detalle)) {
    // Errores de validación (422) de FastAPI/Pydantic
    return detalle
      .map((d) => {
        const campo = d.loc?.[d.loc.length - 1];
        if (campo === 'email') return 'Escribe un correo válido.';
        if (campo === 'password') return 'La contraseña debe tener entre 8 y 72 caracteres.';
        if (campo === 'nombre') return 'El nombre debe tener al menos 2 caracteres.';
        return d.msg;
      })
      .join(' ');
  }
  return porDefecto;
};

// ==========================================
// FUNCIONES DE AUTENTICACIÓN
// ==========================================
export const registrarUsuario = async (datosUsuario) => {
  const response = await apiClient.post('/auth/registrarse', datosUsuario);
  return response.data;
};

export const iniciarSesion = async (credenciales) => {
  const response = await apiClient.post('/auth/login', credenciales);
  // El backend responde { access_token, token_type, usuario }
  guardarSesion(response.data.access_token, response.data.usuario);
  return response.data;
};

export const obtenerPerfil = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

// ==========================================
// FUNCIONES DE ANÁLISIS (requieren sesión)
// ==========================================
export const subirProyectoZIP = async (archivoZip, idProyecto = null) => {
  const formData = new FormData();
  formData.append('file', archivoZip);
  if (idProyecto !== null && idProyecto !== undefined) {
    formData.append('id_proyecto', idProyecto);
  }
  const response = await apiClient.post('/analisis/ejecutar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const generarRecomendacionesIA = async (idAnalisis) => {
  try {
    const response = await apiClient.post(`/analisis/${idAnalisis}/generar-recomendaciones`);
    return response.data;
  } catch (error) {
    console.error('Error al generar recomendaciones con la IA:', error);
    throw error;
  }
};

/**
 * Función para obtener los resultados de un análisis y graficarlos en el Dashboard.
 * @param {number} idAnalisis - El ID del análisis que queremos consultar.
 */
export const obtenerResultadosDashboard = async (idAnalisis) => {
  try {
    const response = await apiClient.get(`/analisis/${idAnalisis}/resultados`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener los datos del Dashboard:', error);
    throw error;
  }
};


// ==========================================
// FUNCIONES DE PROYECTOS Y VERSIONES
// ==========================================
export const obtenerProyectos = async () => {
  const response = await apiClient.get('/analisis/proyectos');
  return response.data;
};

export const crearProyecto = async (nombre, descripcion = '') => {
  const response = await apiClient.post('/analisis/proyectos', { nombre, descripcion });
  return response.data;
};

export const actualizarNombreProyecto = async (idProyecto, nuevoNombre) => {
  const response = await apiClient.put(`/analisis/proyectos/${idProyecto}`, {
    nombre: nuevoNombre,
  });
  return response.data;
};

export const eliminarProyectoPorId = async (idProyecto) => {
  const response = await apiClient.delete(`/analisis/proyectos/${idProyecto}`);
  return response.data;
};

export const obtenerHistorialAnalisis = async () => {
  const response = await apiClient.get('/analisis/historial');
  return response.data;
};

export const eliminarAnalisisPorId = async (idAnalisis) => {
  const response = await apiClient.delete(`/analisis/${idAnalisis}`);
  return response.data;
};

export default apiClient;
