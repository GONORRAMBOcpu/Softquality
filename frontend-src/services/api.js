import axios from 'axios';

// 1. Apuntamos al backend local donde corre FastAPI
const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// ==========================================
// FUNCIONES DE ANÁLISIS (NUESTRAS)
// ==========================================
export const subirProyectoZIP = async (archivoZip) => {
  const formData = new FormData();
  formData.append('file', archivoZip); 

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
    // Ajusta esta ruta si Camilo usó una diferente en FastAPI
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
/**
 * Función para obtener los resultados de un análisis y graficarlos en el Dashboard.
 * @param {number} idAnalisis - El ID del análisis que queremos consultar.
 */
export const obtenerResultadosDashboard = async (idAnalisis) => {
  try {
    // Hacemos una petición GET al backend para traer los resultados de las métricas y la IA
    const response = await apiClient.get(`/analisis/${idAnalisis}/resultados`);
    return response.data;
  } catch (error) {
    console.error("Error al obtener los datos del Dashboard:", error);
    throw error;
  }
};


export default apiClient;