import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis 
} from 'recharts';

import { obtenerResultadosDashboard } from '../services/api';
import FormularioCMMI from '../components/FormularioCMMI';

// Configuración visual de las 4 características ISO/IEC 25010 alineada con los colores de Recharts
const CONFIG_CARACTERISTICAS_ISO = [
  {
    key: 'Mantenibilidad',
    icono: '🛠️',
    colorBorde: '#8884d8',
    colorFondoBadge: '#ede9fe',
    colorTextoBadge: '#5b21b6',
  },
  {
    key: 'Seguridad',
    icono: '🛡️',
    colorBorde: '#10b981',
    colorFondoBadge: '#d1fae5',
    colorTextoBadge: '#065f46',
  },
  {
    key: 'Flexibilidad',
    icono: '🧩',
    colorBorde: '#f59e0b',
    colorFondoBadge: '#fef3c7',
    colorTextoBadge: '#92400e',
  },
  {
    key: 'Fiabilidad',
    icono: '✅',
    colorBorde: '#ff7300',
    colorFondoBadge: '#ffedd5',
    colorTextoBadge: '#9a3412',
  },
];

const Dashboard = () => {
  // 1. Extraemos el ID si viene en la URL (/dashboard/:id)
  const { id } = useParams();

  // 2. Resolvemos dinámicamente el ID: URL -> localStorage -> 1 (respaldo)
  const idAnalisisActual = Number(id || localStorage.getItem('ultimoIdAnalisis') || 1);

  const [datosEvolucion, setDatosEvolucion] = useState([]);
  const [etiquetaVista, setEtiquetaVista] = useState(`Análisis #${idAnalisisActual}`);
  const [nombreProyecto, setNombreProyecto] = useState('');
  const [numeroVersionActual, setNumeroVersionActual] = useState('');
  const [analisisISO, setAnalisisISO] = useState("Cargando diagnóstico técnico ISO/IEC 25010...");
  const [analisisCMMI, setAnalisisCMMI] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Estados para controlar el Modal y el Nivel de Madurez CMMI
  const [mostrarModalCMMI, setMostrarModalCMMI] = useState(false);
  const [nivelMadurez, setNivelMadurez] = useState("Pendiente de evaluación");

  // Función que separa limpiamente la parte ISO 25010 de la parte CMMI
  const procesarRecomendacionesIA = (iaData) => {
    if (!iaData) {
      setAnalisisISO("No hay recomendaciones generadas por la IA para este análisis.");
      setAnalisisCMMI(null);
      return;
    }

    if (typeof iaData === 'object' && (iaData.analisis_iso || iaData.analisis_cmmi)) {
      setAnalisisISO(iaData.analisis_iso || "Sin observaciones técnicas registradas.");
      setAnalisisCMMI(iaData.analisis_cmmi || null);
      return;
    }

    const textoCompleto = typeof iaData === 'string' 
      ? iaData 
      : (iaData.mensaje_general || JSON.stringify(iaData));

    if (textoCompleto.includes("Diagnóstico de Procesos (CMMI")) {
      const partes = textoCompleto.split("Diagnóstico de Procesos (CMMI");
      setAnalisisISO(partes[0].replace("Auditoría Técnica (ISO/IEC 25010):", "").trim());
      setAnalisisCMMI("Diagnóstico de Procesos (CMMI" + partes[1]);
    } else {
      setAnalisisISO(textoCompleto.replace("Auditoría Técnica (ISO/IEC 25010):", "").trim());
      setAnalisisCMMI(null);
    }
  };

  useEffect(() => {
    if (id) {
      localStorage.setItem('ultimoIdAnalisis', id);
    }

    const cargarDatosReales = async () => {
      setCargando(true);
      try {
        const datosBackend = await obtenerResultadosDashboard(idAnalisisActual);
        
        setDatosEvolucion(datosBackend.metricas_historicas || []);
        setEtiquetaVista(datosBackend.etiqueta_vista || `Análisis #${idAnalisisActual}`);
        setNombreProyecto(datosBackend.nombre_proyecto || '');
        setNumeroVersionActual(datosBackend.numero_version || '');
        procesarRecomendacionesIA(datosBackend.recomendaciones_ia);

        if (datosBackend.nivel_cmmi) {
          setNivelMadurez(datosBackend.nivel_cmmi);
        } else {
          setNivelMadurez("Pendiente de evaluación");
        }
      } catch (error) {
        console.error("No se pudo conectar con la base de datos", error);
        setAnalisisISO("Error de conexión. Verifica que el backend de FastAPI esté encendido.");
        setAnalisisCMMI(null);
      } finally {
        setCargando(false);
      }
    };

    cargarDatosReales();
  }, [id, idAnalisisActual]);

  // Extrae y organiza las 4 características ISO/IEC 25010 + la recomendación final
  const desglosarAnalisisISO = () => {
    const puntoVersion =
      datosEvolucion.find((item) => item.version === numeroVersionActual) ||
      datosEvolucion[datosEvolucion.length - 1] ||
      {};

    let textoOriginal = String(analisisISO || '').trim();
    let recomendacionGeneral = '';

    // 1. Separar la recomendación final si viene después del bloque de métricas
    const marcadoresRecomendacion = [
      'Para elevar los puntajes hacia 100/100',
      'Las 4 características evaluadas presentan',
      'Para consolidar la Fiabilidad y Seguridad',
    ];

    for (const marcador of marcadoresRecomendacion) {
      const idx = textoOriginal.indexOf(marcador);
      if (idx !== -1) {
        recomendacionGeneral = textoOriginal.slice(idx).trim();
        textoOriginal = textoOriginal.slice(0, idx).trim();
        break;
      }
    }

    // Limpiar prefijo general y punto final del bloque de métricas
    let bloqueMetricas = textoOriginal
      .replace(/^Diagnóstico técnico ISO\/IEC 25010 \(escala 0 a 100\):\s*/i, '')
      .replace(/\.\s*$/, '')
      .trim();

    // 2. Extraer el detalle individual de cada una de las 4 características
    const ordenNombres = ['Mantenibilidad', 'Seguridad', 'Flexibilidad', 'Fiabilidad'];
    const posiciones = ordenNombres
      .map((nombre) => ({
        nombre,
        index: bloqueMetricas.indexOf(`${nombre}:`),
      }))
      .filter((item) => item.index !== -1)
      .sort((a, b) => a.index - b.index);

    const mapaDetalles = {};

    if (posiciones.length > 0) {
      for (let i = 0; i < posiciones.length; i++) {
        const actual = posiciones[i];
        const siguiente = posiciones[i + 1];
        const inicio = actual.index + actual.nombre.length + 1;
        const fin = siguiente ? siguiente.index : bloqueMetricas.length;

        let fragmento = bloqueMetricas
          .slice(inicio, fin)
          .trim()
          .replace(/^\|\s*/, '')
          .replace(/\s*\|\s*$/, '')
          .trim();

        // Extraer puntaje (ej. 96.87/100) y limpiar paréntesis externos de la evidencia
        let puntajeExtraido = puntoVersion[actual.nombre];
        const matchPuntaje = fragmento.match(/^(\d+(?:\.\d+)?)\s*\/\s*100\s*(.*)$/);
        if (matchPuntaje) {
          if (puntajeExtraido === undefined) {
            puntajeExtraido = Number(matchPuntaje[1]);
          }
          fragmento = matchPuntaje[2].trim();
        }

        if (fragmento.startsWith('(') && fragmento.endsWith(')')) {
          fragmento = fragmento.slice(1, -1).trim();
        }

        mapaDetalles[actual.nombre] = {
          puntaje: puntajeExtraido,
          evidencia: fragmento || 'Métrica evaluada por análisis estático.',
        };
      }
    } else if (!recomendacionGeneral) {
      // Si Gemini redactó un párrafo libre, lo mostramos en el bloque de síntesis y usamos los puntajes de la gráfica
      recomendacionGeneral = analisisISO;
    }

    const tarjetas = CONFIG_CARACTERISTICAS_ISO.map((cfg) => {
      const info = mapaDetalles[cfg.key] || {};
      const valorNumerico =
        info.puntaje !== undefined
          ? Number(info.puntaje)
          : puntoVersion[cfg.key] !== undefined
          ? Number(puntoVersion[cfg.key])
          : null;

      return {
        ...cfg,
        puntaje: valorNumerico !== null && !Number.isNaN(valorNumerico) ? valorNumerico : null,
        evidencia: info.evidencia || 'Evaluado en escala de 0 a 100 por el motor estático.',
      };
    });

    return { tarjetas, recomendacionGeneral };
  };

  const { tarjetas: tarjetasISO, recomendacionGeneral } = desglosarAnalisisISO();

  // Construcción limpia de la gráfica Recharts sin errores de atributos
  const renderGraficaEvolucion = () => {
    return React.createElement(
      ResponsiveContainer,
      { width: '100%', height: '100%' },
      React.createElement(
        LineChart,
        { data: datosEvolucion, margin: { top: 20, right: 30, left: 0, bottom: 0 } },
        React.createElement(CartesianGrid, { strokeDasharray: '3 3' }),
        React.createElement(XAxis, { dataKey: 'version' }),
        React.createElement(YAxis, { domain: [0, 100] }),
        React.createElement(Tooltip, null),
        React.createElement(Legend, null),
        React.createElement(Line, { type: 'monotone', dataKey: 'Mantenibilidad', stroke: '#8884d8', strokeWidth: 3 }),
        React.createElement(Line, { type: 'monotone', dataKey: 'Seguridad', stroke: '#82ca9d', strokeWidth: 3 }),
        React.createElement(Line, { type: 'monotone', dataKey: 'Flexibilidad', stroke: '#ffc658', strokeWidth: 3 }),
        React.createElement(Line, { type: 'monotone', dataKey: 'Fiabilidad', stroke: '#ff7300', strokeWidth: 3 })
      )
    );
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1250px', margin: '0 auto' }}>
      
      {/* Encabezado con indicador de la Versión y el Proyecto activo */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, color: '#004080' }}>
            Dashboard de Calidad - SoftQuality
          </h1>
          <p style={{ margin: '6px 0 0 0', color: '#475569', fontSize: '1.02rem' }}>
            Basado en ISO/IEC 25010 y CMMI |{' '}
            <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold' }}>
              Viendo: {etiquetaVista}
            </span>
          </p>
        </div>
        
        <button 
          onClick={() => setMostrarModalCMMI(true)}
          style={{
            backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '10px 20px', 
            borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          📝 Responder Checklist CMMI
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1.55fr', gap: '2rem', marginTop: '2rem' }}>
        
        {/* Columna Izquierda: Gráficos Cuantitativos (ISO/IEC 25010) */}
        <section>
          <h3>
            📈 Evolución por Versiones — {nombreProyecto ? `Proyecto ${nombreProyecto}` : 'ISO/IEC 25010'}
          </h3>
          <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', height: '420px' }}>
            {cargando ? (
              <p style={{ textAlign: 'center', marginTop: '100px' }}>Consultando base de datos...</p>
            ) : datosEvolucion.length > 0 ? (
              renderGraficaEvolucion()
            ) : (
              <p style={{ textAlign: 'center', marginTop: '100px', color: '#cc0000' }}>No se encontraron métricas.</p>
            )}
          </div>
        </section>

        {/* Columna Derecha: IA Estructurada (ISO con 4 tarjetas + CMMI) y Nivel de Madurez */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Contenedor Principal del Análisis Cualitativo IA */}
          <div style={{ backgroundColor: '#f4f1fa', padding: '1.35rem', borderRadius: '10px', borderLeft: '5px solid #6b21a8', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🧠 Análisis Cualitativo (IA) — {etiquetaVista}
            </h3>

            {/* Sub-bloque 1: ISO/IEC 25010 desglosado en las 4 características */}
            <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #3b82f6', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <span style={{ fontWeight: 'bold', color: '#1d4ed8', fontSize: '0.95rem' }}>
                  📦 Calidad del Producto (Código)
                </span>
                <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '0.75rem', fontWeight: 'bold', padding: '3px 8px', borderRadius: '12px' }}>
                  ISO/IEC 25010
                </span>
              </div>

              {/* Cuadrícula de 2x2 con las 4 características ISO separadas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: recomendacionGeneral ? '0.85rem' : 0 }}>
                {tarjetasISO.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderLeft: `4px solid ${item.colorBorde}`,
                      borderRadius: '7px',
                      padding: '0.65rem 0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.84rem', color: '#1e293b' }}>
                        {item.icono} {item.key}
                      </span>
                      <span
                        style={{
                          backgroundColor: item.colorFondoBadge,
                          color: item.colorTextoBadge,
                          fontWeight: 'bold',
                          fontSize: '0.76rem',
                          padding: '2px 7px',
                          borderRadius: '10px',
                        }}
                      >
                        {item.puntaje !== null ? `${item.puntaje}/100` : 'N/A'}
                      </span>
                    </div>

                    {/* Mini barra visual de puntaje (0 a 100) */}
                    {item.puntaje !== null && (
                      <div style={{ width: '100%', backgroundColor: '#e2e8f0', height: '5px', borderRadius: '4px', marginBottom: '0.45rem', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(100, Math.max(0, item.puntaje))}%`,
                            backgroundColor: item.colorBorde,
                            height: '100%',
                          }}
                        />
                      </div>
                    )}

                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: '1.4' }}>
                      {item.evidencia}
                    </p>
                  </div>
                ))}
              </div>

              {/* Recuadro inferior para la recomendación general de mejora ISO 25010 */}
              {recomendacionGeneral && (
                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '0.65rem 0.8rem' }}>
                  <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: '1.45', color: '#1e3a8a' }}>
                    <strong>💡 Recomendación técnica:</strong> {recomendacionGeneral}
                  </p>
                </div>
              )}
            </div>

            {/* Sub-bloque 2: CMMI (Madurez de Procesos del Equipo) */}
            <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #10b981', marginBottom: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', color: '#047857', fontSize: '0.95rem' }}>
                  ⚙️ Mejora de Procesos (Equipo)
                </span>
                <span style={{ backgroundColor: '#d1fae5', color: '#065f46', fontSize: '0.75rem', fontWeight: 'bold', padding: '3px 8px', borderRadius: '12px' }}>
                  Modelo CMMI
                </span>
              </div>
              {analisisCMMI ? (
                <p style={{ fontSize: '0.88rem', lineHeight: '1.55', color: '#334155', margin: 0 }}>
                  {analisisCMMI}
                </p>
              ) : (
                <p style={{ fontSize: '0.86rem', lineHeight: '1.5', color: '#64748b', fontStyle: 'italic', margin: 0 }}>
                  Aún no se han evaluado los procesos del equipo en esta versión. Haz clic en el botón verde <strong>"📝 Responder Checklist CMMI"</strong> arriba a la derecha para que la IA genere recomendaciones sobre tu flujo de trabajo.
                </p>
              )}
            </div>

            <small style={{ color: '#6b7280', display: 'block', marginTop: '0.5rem' }}>
              * La IA interpreta los datos obtenidos de forma independiente; no calcula ni inventa métricas.
            </small>
          </div>

          {/* Tarjeta Resumen del Nivel CMMI */}
          <div style={{ backgroundColor: '#e6f4ea', padding: '1.25rem 1.5rem', borderRadius: '10px', borderLeft: '5px solid #28a745', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ marginTop: 0, color: '#1e7e34' }}>🏆 Madurez del Proceso (CMMI)</h3>
            <p style={{ fontSize: '1rem', margin: '0.5rem 0' }}>
              <strong>Nivel Actual:</strong> {nivelMadurez}
            </p>
            <p style={{ fontSize: '0.85rem', color: '#555', margin: 0 }}>
              Diagnóstico académico referencial basado en las 5 áreas de proceso evaluadas (REQM, PP, PMC, CM y VER/VAL).
            </p>
          </div>

        </section>
      </div>

      {/* Ventana Modal de Evaluación CMMI */}
      {mostrarModalCMMI && React.createElement(FormularioCMMI, {
        idAnalisis: idAnalisisActual,
        alCerrar: () => setMostrarModalCMMI(false),
        alCompletar: (nivelGenerado, nuevasRecomendaciones) => {
          setNivelMadurez(nivelGenerado);
          if (nuevasRecomendaciones) {
            procesarRecomendacionesIA(nuevasRecomendaciones);
          }
          setMostrarModalCMMI(false);
        }
      })}

    </div>
  );
};

export default Dashboard;