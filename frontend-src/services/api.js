import axios from 'axios';

// 1. Apuntamos al backend local donde corre FastAPI
const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// ==========================================
// FUNCIONES DE PROYECTOS Y ANÁLISIS (NUESTRAS)
// ==========================================
export const obtenerProyectos = async () => {
  try {
    const response = await apiClient.get('/analisis/proyectos');
    return response.data;
  } catch (error) {
    console.error("Error al obtener la lista de proyectos:", error);
    throw error;
  }
};

export const crearProyecto = async (nombre, descripcion = '') => {
  try {
    const response = await apiClient.post('/analisis/proyectos', { nombre, descripcion });
    return response.data;
  } catch (error) {
    console.error("Error al crear el proyecto:", error);
    throw error;
  }
};

export const actualizarNombreProyecto = async (idProyecto, nuevoNombre) => {
  try {
    const response = await apiClient.put(`/analisis/proyectos/${idProyecto}`, {
      nombre: nuevoNombre,
    });
    return response.data;
  } catch (error) {
    console.error("Error al actualizar el nombre del proyecto:", error);
    throw error;
  }
};

export const eliminarProyectoPorId = async (idProyecto) => {
  try {
    const response = await apiClient.delete(`/analisis/proyectos/${idProyecto}`);
    return response.data;
  } catch (error) {
    console.error("Error al eliminar el proyecto:", error);
    throw error;
  }
};

export const subirProyectoZIP = async (archivoZip, idProyecto = null) => {
  const formData = new FormData();
  formData.append('file', archivoZip);
  if (idProyecto !== null && idProyecto !== undefined) {
    formData.append('id_proyecto', idProyecto);
  }

  try {
    const response = await apiClient.post('/analisis/ejecutar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error al subir el archivo ZIP:", error);
    throw error;
  }
};

export const generarRecomendacionesIA = async (idAnalisis) => {
  try {
    const response = await apiClient.post(`/analisis/${idAnalisis}/generar-recomendaciones`);
    return response.data;
  } catch (error) {
    console.error("Error al generar recomendaciones con la IA:", error);
    throw error;
  }
};

// ==========================================
// FUNCIONES DE AUTENTICACIÓN (DE CAMILO)
// ==========================================
export const registrarUsuario = async (datosUsuario) => {
  try {
    const response = await apiClient.post('/auth/registrar', datosUsuario);
    return response.data;
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    throw error;
  }
};

export const iniciarSesion = async (credenciales) => {
  try {
    const response = await apiClient.post('/auth/login', credenciales);
    return response.data;
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    throw error;
  }
};

export const obtenerResultadosDashboard = async (idAnalisis) => {
  try {
    const response = await apiClient.get(`/analisis/${idAnalisis}/resultados`);
    return response.data;
  } catch (error) {
    console.error("Error al obtener los datos del Dashboard:", error);
    throw error;
  }
};

export const obtenerHistorialAnalisis = async () => {
  try {
    const response = await apiClient.get('/analisis/historial');
    return response.data;
  } catch (error) {
    console.error("Error al obtener el historial de proyectos:", error);
    throw error;
  }
};

export const eliminarAnalisisPorId = async (idAnalisis) => {
  try {
    const response = await apiClient.delete(`/analisis/${idAnalisis}`);
    return response.data;
  } catch (error) {
    console.error("Error al eliminar el análisis:", error);
    throw error;
  }
};

export default apiClient;