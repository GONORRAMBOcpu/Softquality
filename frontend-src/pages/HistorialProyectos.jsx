import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  obtenerProyectos,
  actualizarNombreProyecto,
  eliminarProyectoPorId,
  eliminarAnalisisPorId,
} from '../services/api';

const HistorialProyectos = () => {
  // === 1. ESTADOS ORIGINALES MANTENIDOS ===
  const [proyectos, setProyectos] = useState([]);
  const [proyectoAbiertoId, setProyectoAbiertoId] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  
  // Nuevo estado para la barra de búsqueda del nuevo diseño
  const [busqueda, setBusqueda] = useState('');

  const navigate = useNavigate();

  // === 2. LÓGICA ORIGINAL MANTENIDA ===
  const cargarProyectos = async () => {
    setCargando(true);
    try {
      const data = await obtenerProyectos();
      setProyectos(data);
    } catch (error) {
      console.error("Error cargando proyectos:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarProyectos();
  }, []);

  const proyectoSeleccionado = proyectos.find(
    (p) => p.id_proyecto === proyectoAbiertoId
  );

  const mostrarAvisoTemporal = (texto) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 3500);
  };

  const iniciarEdicion = (proy, e) => {
    if (e) e.stopPropagation();
    setEditandoId(proy.id_proyecto);
    setNuevoNombre(proy.nombre);
  };

  const guardarNombreProyecto = async (idProyecto, e) => {
    if (e) e.stopPropagation();
    if (!nuevoNombre.trim()) return;

    try {
      const res = await actualizarNombreProyecto(idProyecto, nuevoNombre.trim());
      setEditandoId(null);
      await cargarProyectos();
      mostrarAvisoTemporal(`✏️ Proyecto renombrado a "${res.nombre}".`);
    } catch (error) {
      const detalle = error.response?.data?.detail || "No se pudo cambiar el nombre del proyecto.";
      alert(detalle);
    }
  };

  const manejarEliminarProyecto = async (proy, e) => {
    if (e) e.stopPropagation();
    const confirmar = window.confirm(
      `¿Estás seguro de que deseas eliminar el proyecto "${proy.nombre}" y sus ${proy.total_versiones} versiones? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    try {
      await eliminarProyectoPorId(proy.id_proyecto);
      if (proyectoAbiertoId === proy.id_proyecto) {
        setProyectoAbiertoId(null);
      }
      await cargarProyectos();
      mostrarAvisoTemporal(`🗑️ Proyecto "${proy.nombre}" eliminado correctamente.`);
    } catch (error) {
      alert("No se pudo eliminar el proyecto. Verifica que el backend esté activo.");
    }
  };

  const verVersionEnDashboard = (idAnalisis, idProyecto) => {
    localStorage.setItem('ultimoIdAnalisis', idAnalisis);
    if (idProyecto) {
      localStorage.setItem('ultimoIdProyecto', idProyecto);
    }
    navigate(`/dashboard/${idAnalisis}`);
  };

  const irASubirNuevaVersion = (idProyecto, e) => {
    if (e) e.stopPropagation();
    if (idProyecto) {
      localStorage.setItem('ultimoIdProyecto', idProyecto);
    }
    navigate('/subir');
  };

  const manejarEliminarVersion = async (ver) => {
    const confirmar = window.confirm(
      `¿Estás seguro de que deseas eliminar la "${ver.etiqueta_completa}"? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    try {
      await eliminarAnalisisPorId(ver.id_analisis);
      await cargarProyectos();
      mostrarAvisoTemporal(`✅ ${ver.etiqueta_completa} eliminada correctamente.`);
    } catch (error) {
      alert("No se pudo eliminar la versión.");
    }
  };

  // Filtrar proyectos según la barra de búsqueda para la vista principal
  const proyectosFiltrados = proyectos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // === 3. INTERFAZ GRÁFICA (IDENTIDAD VISUAL DARK THEME) ===
  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc', padding: '2.5rem', fontFamily: 'Inter, sans-serif' }}>
      
      {/* --- ENCABEZADO SUPERIOR --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <p style={{ color: '#06b6d4', fontSize: '0.75rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.6rem', fontWeight: '600' }}>
            ESPACIO DE TRABAJO / BIBLIOTECA
          </p>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.4rem', fontWeight: 'bold', color: '#f8fafc' }}>
            {proyectoSeleccionado ? `Versiones de ${proyectoSeleccionado.nombre}` : 'Mirar proyectos'}
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '1rem' }}>
            {proyectoSeleccionado 
              ? 'Administra las entregas, abre los reportes en el Dashboard o elimina versiones antiguas.'
              : 'Consulta las versiones analizadas, edita los nombres y administra tus entregas.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {proyectoSeleccionado && (
            <button
              onClick={() => setProyectoAbiertoId(null)}
              style={{
                backgroundColor: 'transparent', color: '#cbd5e1', border: '1px solid #334155', padding: '0.8rem 1.5rem',
                borderRadius: '6px', cursor: 'pointer', fontWeight: '500', transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#1e293b'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              ⬅ Volver a Proyectos
            </button>
          )}

          <button
            onClick={(e) => proyectoSeleccionado ? irASubirNuevaVersion(proyectoSeleccionado.id_proyecto, e) : irASubirNuevaVersion(null, e)}
            style={{
              backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '0.8rem 1.5rem',
              borderRadius: '6px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 14px 0 rgba(139, 92, 246, 0.39)', transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#7c3aed'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#8b5cf6'}
          >
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> 
            {proyectoSeleccionado ? 'Subir nueva versión' : 'Subir proyecto / Nueva versión'}
          </button>
        </div>
      </div>

      {/* --- ALERTAS TEMPORALES --- */}
      {mensaje && (
        <div style={{ backgroundColor: '#064e3b', color: '#34d399', padding: '12px 16px', borderRadius: '6px', marginBottom: '1.5rem', fontWeight: '500', border: '1px solid #059669' }}>
          {mensaje}
        </div>
      )}

      {/* --- BANNER DE ESTADÍSTICAS --- */}
      {!proyectoSeleccionado && (
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '3rem', fontWeight: '300', color: '#f8fafc', lineHeight: 1 }}>
              {proyectos.length.toString().padStart(2, '0')}
            </span>
            <div style={{ borderLeft: '1px solid #334155', paddingLeft: '1.5rem' }}>
              <div style={{ fontWeight: '600', fontSize: '1rem', color: '#f8fafc', marginBottom: '4px' }}>Proyectos en tu espacio</div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Todas tus entregas, organizadas.</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#06b6d4', fontSize: '0.85rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M6 9v3a3 3 0 0 0 3 3h6v-3"/></svg>
              <span style={{ color: '#94a3b8' }}>Cada proyecto conserva su propio historial de versiones y análisis.</span>
            </div>
            <button style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#06b6d4', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '500', marginLeft: '1rem' }}>
              Vista de proyectos
            </button>
          </div>
        </div>
      )}

{/* =========================================================
          CONTENIDO DINÁMICO: PROYECTOS (Nivel 1) O VERSIONES (Nivel 2)
          ========================================================= */}
      
      {cargando ? (
        <p style={{ textAlign: 'center', marginTop: '3rem', color: '#94a3b8' }}>
          Cargando datos desde PostgreSQL...
        </p>
      ) : proyectos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px dashed #334155' }}>
          <h3 style={{ color: '#f8fafc', fontWeight: '500' }}>No hay proyectos registrados todavía</h3>
          <p style={{ color: '#94a3b8' }}>Ve a la opción "Subir Proyecto / Nueva versión" para crear tu primer proyecto y analizar su Versión 1.</p>
        </div>
      ) : !proyectoSeleccionado ? (
        
        /* --- NIVEL 1: VISTA DE TABLA DE PROYECTOS (Diseño Captura 1 y 2) --- */
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
          
          {/* Barra de Búsqueda y Ordenamiento */}
          <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
            <div style={{ position: 'relative', width: '40%' }}>
              <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input 
                type="text" 
                placeholder="Buscar por nombre de proyecto..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#94a3b8', fontSize: '0.9rem' }}>
              <span>Ordenar por</span>
              <button style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '0.6rem 1rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.7rem' }}>▼</span> Última entrega
              </button>
            </div>
          </div>

          {/* Encabezados de Tabla */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '600' }}>
            <div>PROYECTO</div>
            <div>VERSIONES</div>
            <div>ÚLTIMA ENTREGA</div>
            <div style={{ textAlign: 'right' }}>GESTIÓN</div>
          </div>

          {/* Lista de Filas de Proyectos */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {proyectosFiltrados.map((proy, index) => (
              <div 
                key={proy.id_proyecto}
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '2fr 1fr 1fr 1fr', 
                  padding: '1.25rem 1.5rem', 
                  alignItems: 'center', 
                  borderTop: '1px solid #334155',
                  backgroundColor: index % 2 === 0 ? 'transparent' : '#1e293b' 
                }}
              >
                {/* Columna: Nombre del Proyecto e Icono */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ backgroundColor: '#334155', padding: '0.6rem', borderRadius: '8px', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div>
                    {editandoId === proy.id_proyecto ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          value={nuevoNombre}
                          onChange={(e) => setNuevoNombre(e.target.value)}
                          style={{ backgroundColor: '#0f172a', color: '#f8fafc', border: '1px solid #8b5cf6', borderRadius: '4px', padding: '4px 8px', outline: 'none' }}
                          autoFocus
                        />
                        <button onClick={(e) => guardarNombreProyecto(proy.id_proyecto, e)} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>✓</button>
                        <button onClick={(e) => { e.stopPropagation(); setEditandoId(null); }} style={{ backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>✗</button>
                      </div>
                    ) : (
                      <>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#f8fafc', fontWeight: '600' }}>
                          {proy.nombre}
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Proyecto Python</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Columna: Cantidad de versiones */}
                <div>
                  <span style={{ backgroundColor: '#2e1065', color: '#c4b5fd', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '500' }}>
                    {proy.total_versiones} {proy.total_versiones === 1 ? 'versión' : 'versiones'}
                  </span>
                </div>

                {/* Columna: Última entrega */}
                <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                  {proy.total_versiones > 0 ? (
                    <>
                      <div style={{ marginBottom: '4px' }}>{proy.versiones[0].numero_version}</div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        {proy.versiones[0].fecha}
                      </div>
                    </>
                  ) : (
                    <span style={{ color: '#64748b' }}>Sin entregas</span>
                  )}
                </div>

                {/* Columna: Botones de Gestión */}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setProyectoAbiertoId(proy.id_proyecto)}
                    style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#1e293b'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#0f172a'}
                  >
                    ↗ Ver versiones
                  </button>

                  <button
                    onClick={(e) => iniciarEdicion(proy, e)}
                    style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#94a3b8', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}
                    title="Editar nombre"
                    onMouseOver={(e) => e.target.style.backgroundColor = '#1e293b'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#0f172a'}
                  >
                    ✏️
                  </button>

                  <button
                    onClick={(e) => manejarEliminarProyecto(proy, e)}
                    style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f87171', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}
                    title="Eliminar proyecto"
                    onMouseOver={(e) => e.target.style.backgroundColor = '#450a0a'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#0f172a'}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer de la Tabla (Paginador / Resumen) */}
          <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            <div>Mostrando {proyectosFiltrados.length} de {proyectos.length} proyectos</div>
            <div>Selecciona «Ver versiones» para explorar cada entrega.</div>
          </div>
        </div>
      ) : (
/* --- NIVEL 2: HISTORIAL DE VERSIONES DEL PROYECTO (Diseño Captura 2 y 3) --- */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Encabezado del Historial de Versiones */}
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ backgroundColor: '#334155', padding: '0.6rem', borderRadius: '8px', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.3rem', color: '#f8fafc', fontWeight: '600' }}>
                  {proyectoSeleccionado.nombre}
                </h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                  Total de entregas analizadas: {proyectoSeleccionado.versiones.length}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => irASubirNuevaVersion(proyectoSeleccionado.id_proyecto)}
              style={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#f8fafc', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#334155'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#1e293b'}
            >
              <span style={{ fontSize: '1.1rem' }}>+</span> Subir nueva versión
            </button>
          </div>

          {/* Tarjetas de Versiones */}
          {proyectoSeleccionado.versiones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px dashed #334155' }}>
              <h3 style={{ color: '#f8fafc', fontWeight: '500' }}>
                El proyecto "{proyectoSeleccionado.nombre}" aún no tiene versiones analizadas
              </h3>
              <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Abre el módulo de subida para enviar tu primera entrega en formato .zip.</p>
              <button
                onClick={() => irASubirNuevaVersion(proyectoSeleccionado.id_proyecto)}
                style={{ backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
              >
                Subir Versión 1
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              {proyectoSeleccionado.versiones.map((ver) => (
                <div
                  key={ver.id_analisis}
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderLeft: '4px solid #8b5cf6',
                    borderRadius: '8px',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#f8fafc' }}>
                        {ver.etiqueta_completa}
                      </span>
                      <span style={{ backgroundColor: '#0f172a', color: '#cbd5e1', border: '1px solid #334155', fontSize: '0.75rem', fontWeight: '500', padding: '4px 10px', borderRadius: '12px' }}>
                        {ver.fecha}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
                      <strong>📊 ISO 25010:</strong> <span style={{ color: '#cbd5e1' }}>{ver.resumen_metricas}</span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      <strong>🏆 CMMI:</strong> <span style={{ color: '#34d399' }}>{ver.nivel_cmmi}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => verVersionEnDashboard(ver.id_analisis, proyectoSeleccionado.id_proyecto)}
                      style={{
                        backgroundColor: '#8b5cf6', color: 'white', border: 'none',
                        padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#7c3aed'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#8b5cf6'}
                    >
                      ↗ Ver en Dashboard
                    </button>

                    <button
                      onClick={() => manejarEliminarVersion(ver)}
                      style={{
                        backgroundColor: '#0f172a', color: '#f87171', border: '1px solid #334155',
                        padding: '0.6rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem'
                      }}
                      title="Eliminar Versión"
                      onMouseOver={(e) => e.target.style.backgroundColor = '#450a0a'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#0f172a'}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default HistorialProyectos;