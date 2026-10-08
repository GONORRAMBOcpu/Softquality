import React, { useState } from 'react';
import apiClient from '../services/api';

const preguntasCMMI = [
  { id: 'reqm', texto: '¿El equipo documentó, revisó y aprobó los requisitos antes de programar?' },
  { id: 'pp', texto: '¿Se definieron roles, tareas estimadas y un cronograma de entregas?' },
  { id: 'pmc', texto: '¿Se realizaron reuniones periódicas para evaluar el progreso y corregir el rumbo?' },
  { id: 'cm', texto: '¿Se utilizó control de versiones (Git) con políticas claras para ramas y fusiones?' },
  { id: 'ver', texto: '¿Se ejecutaron pruebas o revisiones de código antes de integrar nuevas funcionalidades?' }
];

const FormularioCMMI = ({ idAnalisis, alCerrar, alCompletar }) => {
  // Inicializamos todas las respuestas en "false" (No) por defecto
  const [respuestas, setRespuestas] = useState({
    reqm: false, pp: false, pmc: false, cm: false, ver: false
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const manejarCambio = (idPregunta) => {
    setRespuestas({
      ...respuestas,
      [idPregunta]: !respuestas[idPregunta]
    });
  };

  const enviarEvaluacion = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');

    try {
      const response = await apiClient.post(`/analisis/${idAnalisis}/cmmi`, {
        respuestas_checklist: respuestas
      });
      
      // Enviamos tanto el nivel CMMI como las nuevas recomendaciones de IA al Dashboard
      alCompletar(
        response.data.nivel_madurez_referencial,
        response.data.recomendaciones_ia
      );
    } catch (err) {
      console.error("Error al guardar CMMI:", err);
      setError('Hubo un error al guardar la evaluación. Verifica que el backend esté activo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ marginTop: 0, color: '#004080' }}>Evaluación de Madurez (CMMI)</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Responde con honestidad sobre los procesos que siguió tu equipo. Gemini actualizará el diagnóstico cualitativo integrando tus prácticas de proceso con las métricas ISO/IEC 25010.
        </p>

        <form onSubmit={enviarEvaluacion}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {preguntasCMMI.map((preg) => (
              <label key={preg.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '5px' }}>
                <input 
                  type="checkbox" 
                  checked={respuestas[preg.id]} 
                  onChange={() => manejarCambio(preg.id)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '0.95rem' }}>{preg.texto}</span>
              </label>
            ))}
          </div>

          {error && <p style={{ color: '#cc0000', fontSize: '0.85rem' }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" onClick={alCerrar} disabled={cargando} style={btnCancelarStyle}>
              Cancelar
            </button>
            <button type="submit" disabled={cargando} style={btnGuardarStyle}>
              {cargando ? 'Actualizando diagnóstico con IA...' : 'Guardar Evaluación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};
const modalStyle = {
  backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '600px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
};
const btnCancelarStyle = {
  padding: '10px 15px', backgroundColor: '#e0e0e0', color: '#333', border: 'none', borderRadius: '5px', cursor: 'pointer'
};
const btnGuardarStyle = {
  padding: '10px 15px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'
};

export default FormularioCMMI;