import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis 
} from 'recharts';

import { obtenerResultadosDashboard } from '../services/api';
import FormularioCMMI from '../components/FormularioCMMI';

// Configuración visual adaptada al nuevo Dark Theme (colores neón)
const CONFIG_CARACTERISTICAS_ISO = [
  {
    key: 'Mantenibilidad',
    icono: '🔧',
    colorBorde: '#8b5cf6', // Morado
    colorFondoBadge: '#2e1065',
    colorTextoBadge: '#c4b5fd',
  },
  {
    key: 'Seguridad',
    icono: '🛡️',
    colorBorde: '#06b6d4', // Cyan
    colorFondoBadge: '#164e63',
    colorTextoBadge: '#67e8f9',
  },
  {
    key: 'Flexibilidad',
    icono: '🧩',
    colorBorde: '#fbbf24', // Amarillo
    colorFondoBadge: '#78350f',
    colorTextoBadge: '#fde68a',
  },
  {
    key: 'Fiabilidad',
    icono: '✅',
    colorBorde: '#34d399', // Verde menta
    colorFondoBadge: '#064e3b',
    colorTextoBadge: '#6ee7b7',
  },
];

const Dashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const idAnalisisActual = Number(id || localStorage.getItem('ultimoIdAnalisis') || 1);

  const [datosEvolucion, setDatosEvolucion] = useState([]);
  const [etiquetaVista, setEtiquetaVista] = useState(`Análisis #${idAnalisisActual}`);
  const [nombreProyecto, setNombreProyecto] = useState('');
  const [numeroVersionActual, setNumeroVersionActual] = useState('');
  const [analisisISO, setAnalisisISO] = useState("Cargando diagnóstico técnico ISO/IEC 25010...");
  const [analisisCMMI, setAnalisisCMMI] = useState(null);
  const [cargando, setCargando] = useState(true);
  
  // Estado para controlar el menú desplegable de versiones
  const [menuVersionesAbierto, setMenuVersionesAbierto] = useState(false);

  // Estados del CMMI
  const [mostrarModalCMMI, setMostrarModalCMMI] = useState(false);
  const [nivelMadurez, setNivelMadurez] = useState("Pendiente de evaluación");

  const calcularVariacion = (nombreMetrica, valorActual) => {
    if (!datosEvolucion || datosEvolucion.length < 2 || valorActual === null) return null;
    let indiceActual = datosEvolucion.findIndex(d => d.version === numeroVersionActual);
    if (indiceActual === -1) indiceActual = datosEvolucion.length - 1; 
    if (indiceActual <= 0) return null;

    const valorAnterior = datosEvolucion[indiceActual - 1][nombreMetrica];
    if (valorAnterior === undefined || valorAnterior === null) return null;

    const diferencia = Number(valorActual) - Number(valorAnterior);

    if (diferencia > 0) {
      return <span style={{ color: '#34d399', marginLeft: '6px' }}>▲ +{diferencia.toFixed(1)}</span>;
    } else if (diferencia < 0) {
      return <span style={{ color: '#f87171', marginLeft: '6px' }}>▼ {diferencia.toFixed(1)}</span>;
    } else {
      return <span style={{ color: '#94a3b8', marginLeft: '6px' }}>➖</span>;
    }
  };

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
    const textoCompleto = typeof iaData === 'string' ? iaData : (iaData.mensaje_general || JSON.stringify(iaData));
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
    if (id) localStorage.setItem('ultimoIdAnalisis', id);
    const cargarDatosReales = async () => {
      setCargando(true);
      try {
        const datosBackend = await obtenerResultadosDashboard(idAnalisisActual);
        setDatosEvolucion(datosBackend.metricas_historicas || []);
        setEtiquetaVista(datosBackend.etiqueta_vista || `Análisis #${idAnalisisActual}`);
        setNombreProyecto(datosBackend.nombre_proyecto || '');
        setNumeroVersionActual(datosBackend.numero_version || '');
        procesarRecomendacionesIA(datosBackend.recomendaciones_ia);
        setNivelMadurez(datosBackend.nivel_cmmi || "Pendiente de evaluación");
      } catch (error) {
        console.error("No se pudo conectar", error);
        setAnalisisISO("Error de conexión. Verifica que el backend esté encendido.");
        setAnalisisCMMI(null);
      } finally {
        setCargando(false);
      }
    };
    cargarDatosReales();
  }, [id, idAnalisisActual]);

  useEffect(() => {
    const handleClickOutside = () => setMenuVersionesAbierto(false);
    if (menuVersionesAbierto) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [menuVersionesAbierto]);

  const desglosarAnalisisISO = () => {
    const puntoVersion = datosEvolucion.find((item) => item.version === numeroVersionActual) || datosEvolucion[datosEvolucion.length - 1] || {};
    let textoOriginal = String(analisisISO || '').trim();
    
    const mapaDetalles = {};
    const ordenNombres = ['Mantenibilidad', 'Seguridad', 'Flexibilidad', 'Fiabilidad'];
    let indices = [];
    let recomendacionGeneral = '';

    ordenNombres.forEach(nombre => {
      const regex = new RegExp(`(?:-|\\*)?\\s*\\*\\*?${nombre}(?:\\s*\\([\\d\\.]+\\/100\\))?\\*\\*?\\s*:?`, 'i');
      const match = textoOriginal.match(regex);
      if (match) {
        indices.push({ nombre, index: match.index, length: match[0].length });
      }
    });

    if (indices.length > 0) {
      indices.sort((a, b) => a.index - b.index);
      let intro = textoOriginal.substring(0, indices[0].index).trim();
      let conclusion = "";

      for (let i = 0; i < indices.length; i++) {
        const actual = indices[i];
        const inicio = actual.index + actual.length;
        const fin = (i + 1 < indices.length) ? indices[i + 1].index : textoOriginal.length;
        
        let fragmento = textoOriginal.substring(inicio, fin).trim().replace(/\s*-\s*$/, '').trim();

        if (i === indices.length - 1) {
           const separar = fragmento.split(/(?=\n\n|\r\n\r\n|Si corriges estas líneas|Te sugiero|Para preparar|En resumen)/i);
           if (separar.length > 1) {
               fragmento = separar[0].trim();
               conclusion = separar.slice(1).join(" ").trim();
           }
        }
        mapaDetalles[actual.nombre] = { evidencia: fragmento };
      }
      recomendacionGeneral = [intro, conclusion].filter(Boolean).join("\n\n");
    } else {
      recomendacionGeneral = textoOriginal;
    }

    const tarjetas = CONFIG_CARACTERISTICAS_ISO.map((cfg) => {
      const info = mapaDetalles[cfg.key] || {};
      const valorNumerico = puntoVersion[cfg.key] !== undefined ? Number(puntoVersion[cfg.key]) : null;
      return { 
        ...cfg, 
        puntaje: valorNumerico !== null && !Number.isNaN(valorNumerico) ? valorNumerico : null, 
        evidencia: info.evidencia || 'Métrica evaluada en escala de 0 a 100.' 
      };
    });

    return { tarjetas, recomendacionGeneral };
  };

  const { tarjetas: tarjetasISO, recomendacionGeneral } = desglosarAnalisisISO();

  const cambiarVersion = (versionSeleccionada) => {
    // Intentamos extraer el ID si viene en algún formato, o usamos un fallback.
    // Lo ideal es que tu backend (analisis.py) agregue "id_analisis": item.id_analisis
    // dentro de los diccionarios que envía en metricas_historicas.
    const idDestino = versionSeleccionada.id_analisis || versionSeleccionada.id; 
    
    if (idDestino) {
      navigate(`/dashboard/${idDestino}`);
      setMenuVersionesAbierto(false); // Cerramos el menú
    } else {
      // Si el backend definitivamente no envía el ID, mantenemos la advertencia
      // pero te sugiero ir a analisis.py y asegurarte de que lo envíe.
      alert('Para que este menú funcione, debes asegurarte de que tu backend envíe el campo "id_analisis" junto con el nombre de la versión.');
    }
  };
  const estilosImpresion = `
    @media print {
      body { background-color: white !important; }
      nav, .no-print { display: none !important; }
      .dashboard-container { box-shadow: none !important; margin: 0 !important; padding: 0 !important; background-color: white !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color: black !important; }
    }
  `;

  return (
    <div className="dashboard-container" style={{ padding: '2.5rem', backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <style>{estilosImpresion}</style>

      {/* Título de sección */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: '#06b6d4', fontSize: '0.8rem', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: '600' }}>
          Inteligencia de Software / Análisis #{idAnalisisActual}
        </p>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '2.2rem', fontWeight: 'bold' }}>Dashboard de análisis</h2>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '1rem' }}>
              Diagnóstico del producto y evolución de la calidad de tu software.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }} className="no-print">
            <button 
              onClick={() => window.print()}
              style={{ backgroundColor: 'transparent', color: '#f8fafc', border: '1px solid #334155', padding: '0.75rem 1.5rem', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#1e293b'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              📥 Exportar informe PDF
            </button>
            <button 
              onClick={() => setMostrarModalCMMI(true)}
              style={{ backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px 0 rgba(139, 92, 246, 0.39)' }}
            >
              📋 Responder checklist CMMI
            </button>
          </div>
        </header>
      </div>

      {/* Barra de Proyecto Analizado con Desplegable */}
      <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '8px', backgroundColor: '#334155', borderRadius: '6px' }}>📁</div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Proyecto Analizado</span>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#f8fafc', marginTop: '2px' }}>
              {nombreProyecto || 'Cargando proyecto...'}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
          <div style={{ position: 'relative' }}>
            <div 
              onClick={(e) => { e.stopPropagation(); setMenuVersionesAbierto(!menuVersionesAbierto); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #334155', borderRadius: '6px', backgroundColor: '#0f172a', cursor: 'pointer', userSelect: 'none' }}
            >
              <span>{numeroVersionActual || 'Versión -'}</span> <span style={{ fontSize: '0.7rem' }}>{menuVersionesAbierto ? '▲' : '▼'}</span>
            </div>
            
            {menuVersionesAbierto && datosEvolucion.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', width: '100%', minWidth: '120px', zIndex: 50, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
                {datosEvolucion.map((ver, idx) => (
                  <div 
                    key={idx}
                    onClick={() => cambiarVersion(ver)}
                    style={{ padding: '8px 12px', cursor: 'pointer', backgroundColor: ver.version === numeroVersionActual ? '#1e293b' : 'transparent', color: ver.version === numeroVersionActual ? '#f8fafc' : '#cbd5e1', fontSize: '0.85rem' }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#1e293b'}
                    onMouseOut={(e) => e.target.style.backgroundColor = ver.version === numeroVersionActual ? '#1e293b' : 'transparent'}
                  >
                    {ver.version}
                  </div>
                ))}
              </div>
            )}
          </div>
          <span style={{ padding: '4px 10px', backgroundColor: '#164e63', color: '#67e8f9', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' }}>
            Análisis #{idAnalisisActual}
          </span>
          <span style={{ color: '#94a3b8' }}>ISO/IEC 25010</span>
        </div>
      </div>

      {/* 4 Tarjetas de Métricas Superiores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {tarjetasISO.map((item) => (
          <div key={item.key} style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: '#cbd5e1', fontSize: '0.95rem' }}>
              <span>{item.icono}</span> {item.key}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f8fafc' }}>
                {item.puntaje !== null ? Math.round(item.puntaje) : '--'}
              </span>
              <span style={{ fontSize: '1rem', color: '#64748b' }}>/100</span>
              {item.puntaje !== null && calcularVariacion(item.key, item.puntaje)}
            </div>

            <div style={{ width: '100%', backgroundColor: '#334155', height: '6px', borderRadius: '4px', marginBottom: '1rem', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${item.puntaje !== null ? Math.min(100, Math.max(0, item.puntaje)) : 0}%`,
                  backgroundColor: item.colorBorde,
                  height: '100%',
                  boxShadow: `0 0 10px ${item.colorBorde}80`
                }}
              />
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Calculado por el motor estático</p>
          </div>
        ))}
      </div>

      {/* Gráfico y Tarjeta CMMI */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', fontWeight: '600' }}>Evolución por versiones</h3>
            <span style={{ backgroundColor: '#334155', color: '#cbd5e1', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', fontWeight: '500' }}>
              {datosEvolucion.length} versiones
            </span>
          </div>
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            {nombreProyecto || 'Proyecto'} · Escala de 0 a 100
          </p>

          <div style={{ flexGrow: 1, minHeight: '300px', width: '100%', marginBottom: '1rem' }}>
            {cargando ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>Consultando base de datos...</div>
            ) : datosEvolucion.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={datosEvolucion} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="version" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} dy={10} />
                  <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }} itemStyle={{ fontWeight: '500' }} />
                  <Legend iconType="plainline" wrapperStyle={{ paddingTop: '15px', fontSize: '0.85rem', color: '#cbd5e1' }} />
                  <Line type="monotone" dataKey="Mantenibilidad" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#1e293b' }} activeDot={{ r: 6, fill: '#8b5cf6' }} />
                  <Line type="monotone" dataKey="Seguridad" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#1e293b' }} activeDot={{ r: 6, fill: '#06b6d4' }} />
                  <Line type="monotone" dataKey="Flexibilidad" stroke="#fbbf24" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#1e293b' }} activeDot={{ r: 6, fill: '#fbbf24' }} />
                  <Line type="monotone" dataKey="Fiabilidad" stroke="#34d399" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#1e293b' }} activeDot={{ r: 6, fill: '#34d399' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#ef4444' }}>No se encontraron métricas.</div>
            )}
          </div>
          <div style={{ paddingTop: '1rem', borderTop: '1px solid #334155', fontSize: '0.8rem', color: '#64748b' }}>
            Estás consultando {numeroVersionActual || 'esta versión'}. El gráfico muestra el historial completo del proyecto.
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div style={{ color: '#06b6d4', fontSize: '1.5rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><path d="M16 4h4v4"/><path d="M4 20h4v-4"/><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>
            </div>
            <span style={{ backgroundColor: '#164e63', color: '#67e8f9', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
              Modelo CMMI
            </span>
          </div>
          
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', color: '#f8fafc', fontWeight: '600' }}>Madurez del proceso</h3>
          
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{ backgroundColor: nivelMadurez.includes('Pendiente') ? '#78350f' : '#064e3b', color: nivelMadurez.includes('Pendiente') ? '#fde68a' : '#6ee7b7', padding: '6px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: '500', display: 'inline-block' }}>
              {nivelMadurez}
            </span>
          </div>
          
          <div style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6', flexGrow: 1 }}>
            {analisisCMMI ? <p style={{ margin: 0 }}>{analisisCMMI}</p> : <p style={{ margin: 0 }}>Aún no se han evaluado los procesos del equipo en esta versión.</p>}
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #334155' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase' }}>5 ÁREAS DE PROCESO</p>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.8rem', color: '#94a3b8', letterSpacing: '1.5px', fontFamily: 'monospace' }}>REQM · PP · PMC · CM · VER/VAL</p>
            {!analisisCMMI && (
              <button 
                onClick={() => setMostrarModalCMMI(true)}
                style={{ width: '100%', backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '0.875rem', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'background 0.2s', boxShadow: '0 4px 14px 0 rgba(139, 92, 246, 0.2)' }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#7c3aed'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#8b5cf6'}
              >
                📋 Responder checklist CMMI
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Análisis Cualitativo 2x2 */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ✨ Análisis cualitativo y recomendaciones
            </h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
              Hallazgos del código organizados por atributo. Las puntuaciones corresponden exclusivamente a la versión actual.
            </p>
          </div>
          <span style={{ backgroundColor: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '16px', fontWeight: '500' }}>
            IA · {numeroVersionActual || 'Versión Actual'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {tarjetasISO.map((item) => (
            <div key={`cualitativo-${item.key}`} style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.5rem', borderLeft: `4px solid ${item.colorBorde}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc' }}>{item.key}</h4>
                <span style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: item.colorBorde, fontSize: '0.8rem', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
                  {item.puntaje !== null ? `${Math.round(item.puntaje)}/100` : 'N/A'}
                </span>
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6' }}>
                <p style={{ margin: 0 }}>{item.evidencia}</p>
              </div>
            </div>
          ))}
        </div>

        {recomendacionGeneral && (
          <div style={{ marginTop: '1.5rem', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#8b5cf6' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              </span>
              <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>Prepara tu siguiente versión</h4>
            </div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>{recomendacionGeneral}</p>
            <div style={{ marginTop: '0.5rem' }}>
              <button 
                onClick={() => window.location.href='/subir'} 
                style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '0.6rem 1rem', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#334155'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#0f172a'}
              >
                <span style={{ fontSize: '1.1rem' }}>+</span> Subir nueva versión
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #334155', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', color: '#64748b', fontSize: '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <span>La IA interpreta las métricas ya calculadas; no calcula ni inventa métricas y no reemplaza la evaluación.</span>
        </div>
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '1.2rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>Diagnóstico académico referencial de calidad y mejora continua. Las referencias a ISO/IEC 25010 y CMMI no representan una certificación oficial ISO ni CMMI.</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #334155', marginTop: '2.5rem', paddingTop: '1.5rem', color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
        <span>SoftQuality / Inteligencia de Software</span>
        <span>Diagnóstico académico · Mejora continua</span>
      </div>

      {/* Ventana Modal de Evaluación CMMI con color de texto oscuro forzado */}
      {mostrarModalCMMI && (
        <div style={{ color: '#0f172a' }}>
          <FormularioCMMI 
            idAnalisis={idAnalisisActual}
            alCerrar={() => setMostrarModalCMMI(false)}
            alCompletar={(nivelGenerado, nuevasRecomendaciones) => {
              setNivelMadurez(nivelGenerado);
              if (nuevasRecomendaciones) {
                procesarRecomendacionesIA(nuevasRecomendaciones);
              }
              setMostrarModalCMMI(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;