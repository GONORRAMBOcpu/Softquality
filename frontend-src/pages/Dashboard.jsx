import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line 
} from 'recharts';

// Los imports siempre van en la parte superior, fuera del componente
import { obtenerResultadosDashboard } from '../services/api';

const Dashboard = () => {
  // Usaremos un ID de prueba (ej. 1) por ahora, luego lo enlazaremos dinámicamente con la subida del archivo
  const idAnalisisActual = 1; 

  const [datosEvolucion, setDatosEvolucion] = useState([]);
  const [recomendacionesIA, setRecomendacionesIA] = useState("Cargando análisis de Gemini...");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatosReales = async () => {
      try {
        // Llamamos al backend a través del puente que acabamos de crear
        const datosBackend = await obtenerResultadosDashboard(idAnalisisActual);
        
        // Asumiendo que el backend nos devuelve un array de métricas históricas
        setDatosEvolucion(datosBackend.metricas_historicas || []);
        
        // Leemos las recomendaciones que Gemini guardó en la tabla ANALISIS
        if (datosBackend.recomendaciones_ia) {
          // Extraemos el texto dependiendo de cómo lo haya devuelto tu backend
          setRecomendacionesIA(datosBackend.recomendaciones_ia.mensaje_general || JSON.stringify(datosBackend.recomendaciones_ia));
        } else {
          setRecomendacionesIA("No hay recomendaciones generadas por la IA para este análisis.");
        }
      } catch (error) {
        console.error("No se pudo conectar con la base de datos", error);
        setRecomendacionesIA("Error de conexión. Verifica que el backend de FastAPI esté encendido y que el endpoint exista.");
      } finally {
        setCargando(false);
      }
    };

    cargarDatosReales();
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, color: '#004080' }}>Dashboard de Calidad - SoftQuality</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>Basado en ISO/IEC 25010</p>
        </div>
        
        <button style={{
          backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'
        }}>
          📝 Responder Checklist CMMI
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        
        {/* Columna Izquierda: Gráficos Cuantitativos */}
        <section>
          <h3>📈 Evolución por Versiones (ISO/IEC 25010)</h3>
          <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', height: '400px' }}>
            {cargando ? (
              <p style={{ textAlign: 'center', marginTop: '100px' }}>Consultando base de datos...</p>
            ) : datosEvolucion.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={datosEvolucion} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="version" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Mantenibilidad" stroke="#8884d8" strokeWidth={3} />
                  <Line type="monotone" dataKey="Seguridad" stroke="#82ca9d" strokeWidth={3} />
                  <Line type="monotone" dataKey="Flexibilidad" stroke="#ffc658" strokeWidth={3} />
                  <Line type="monotone" dataKey="Fiabilidad" stroke="#ff7300" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ textAlign: 'center', marginTop: '100px', color: '#cc0000' }}>No se encontraron métricas.</p>
            )}
          </div>
        </section>

        {/* Columna Derecha: IA y Cualitativo */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ backgroundColor: '#f4f1fa', padding: '1.5rem', borderRadius: '8px', borderLeft: '5px solid #6b21a8' }}>
            <h3 style={{ marginTop: 0, color: '#6b21a8' }}>🧠 Análisis Cualitativo (IA)</h3>
            <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#333' }}>
              {recomendacionesIA}
            </p>
            <small style={{ color: '#888' }}>* La IA interpreta los datos obtenidos, no calcula las métricas.</small>
          </div>

          <div style={{ backgroundColor: '#e6f4ea', padding: '1.5rem', borderRadius: '8px', borderLeft: '5px solid #28a745' }}>
            <h3 style={{ marginTop: 0, color: '#1e7e34' }}>🏆 Madurez del Proceso (CMMI)</h3>
            <p><strong>Nivel Actual:</strong> Pendiente de evaluación.</p>
            <p style={{ fontSize: '0.85rem', color: '#555' }}>
              Completa el checklist en la parte superior para evaluar las prácticas de tu equipo de desarrollo.
            </p>
          </div>

        </section>
      </div>
    </div>
  );
};

export default Dashboard;