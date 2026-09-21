import React, { useState } from 'react';
import { subirProyectoZIP, generarRecomendacionesIA } from '../services/api';

const SubirProyecto = () => {
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Maneja la selección del archivo
  const manejarSeleccion = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.zip')) {
      setArchivo(file);
      setMensaje({ tipo: '', texto: '' });
    } else {
      setArchivo(null);
      setMensaje({ tipo: 'error', texto: 'Por favor, selecciona únicamente un archivo .zip' });
    }
  };

  // Maneja el envío al backend
  const manejarEnvio = async (e) => {
    e.preventDefault();
    if (!archivo) {
      setMensaje({ tipo: 'error', texto: 'Debes seleccionar un archivo primero.' });
      return;
    }

    setCargando(true);
    setMensaje({ tipo: 'info', texto: 'Subiendo y ejecutando motor de análisis... Esto puede tardar unos segundos.' });

    try {
      // 1. Enviamos el ZIP al backend de FastAPI
      const respuestaAnalisis = await subirProyectoZIP(archivo);

      console.log("Esto respondió FastAPI:", respuestaAnalisis);
      
      setMensaje({ tipo: 'info', texto: 'Análisis estático terminado. Generando recomendaciones con IA...' });

      // 2. Llamamos a Gemini para que interprete los resultados
      await generarRecomendacionesIA(respuestaAnalisis.id_analisis);

      setMensaje({ tipo: 'exito', texto: '¡Análisis completo! Ya puedes ver los resultados en el Dashboard.' });
      setArchivo(null);
      
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Hubo un error procesando el proyecto. Verifica que el backend esté encendido.' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>Analizar Proyecto (SoftQuality)</h2>
      
      <div style={{ backgroundColor: '#f0f8ff', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
        <h3>⚠️ Instrucciones Importantes</h3>
        <p>Tu archivo <strong>.zip</strong> debe contener obligatoriamente:</p>
        <ul>
          <li>Tus archivos de código fuente (<strong>.py</strong>).</li>
          <li>El listado de dependencias (<strong>requirements.txt</strong>).</li>
          <li>El reporte de pruebas unitarias (<strong>coverage.xml</strong>).</li>
        </ul>
        <p><small>Nota: El motor ignorará automáticamente imágenes, PDFs o archivos HTML.</small></p>
      </div>

      <form onSubmit={manejarEnvio} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input 
          type="file" 
          accept=".zip" 
          onChange={manejarSeleccion}
          disabled={cargando}
          style={{ padding: '1rem', border: '2px dashed #ccc', borderRadius: '8px', cursor: 'pointer' }}
        />
        
        {archivo && <p>Archivo seleccionado: <strong>{archivo.name}</strong></p>}

        <button 
          type="submit" 
          disabled={!archivo || cargando}
          style={{ 
            padding: '10px', 
            backgroundColor: cargando ? '#ccc' : '#0056b3', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '5px',
            cursor: cargando ? 'not-allowed' : 'pointer'
          }}
        >
          {cargando ? 'Procesando...' : 'Subir y Analizar'}
        </button>
      </form>

      {/* Mensajes de retroalimentación para el usuario */}
      {mensaje.texto && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          borderRadius: '5px',
          backgroundColor: mensaje.tipo === 'error' ? '#ffe6e6' : mensaje.tipo === 'exito' ? '#e6ffe6' : '#e6f2ff',
          color: mensaje.tipo === 'error' ? '#cc0000' : mensaje.tipo === 'exito' ? '#006600' : '#004080'
        }}>
          {mensaje.texto}
        </div>
      )}
    </div>
  );
};

export default SubirProyecto;