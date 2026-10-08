import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  obtenerProyectos,
  actualizarNombreProyecto,
  eliminarProyectoPorId,
  eliminarAnalisisPorId,
} from '../services/api';

const HistorialProyectos = () => {
  const [proyectos, setProyectos] = useState([]);
  const [proyectoAbiertoId, setProyectoAbiertoId] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');

  const navigate = useNavigate();

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

  // Editar el nombre de un proyecto
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

  // Eliminar un proyecto completo con todas sus versiones
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

  // Abrir una versión específica en el Dashboard
  const verVersionEnDashboard = (idAnalisis, idProyecto) => {
    localStorage.setItem('ultimoIdAnalisis', idAnalisis);
    if (idProyecto) {
      localStorage.setItem('ultimoIdProyecto', idProyecto);
    }
    navigate(`/dashboard/${idAnalisis}`);
  };

  // Ir a subir una nueva versión para este proyecto específico
  const irASubirNuevaVersion = (idProyecto, e) => {
    if (e) e.stopPropagation();
    localStorage.setItem('ultimoIdProyecto', idProyecto);
    navigate('/subir');
  };

  // Eliminar una versión individual dentro de un proyecto
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

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* ENCABEZADO DINÁMICO */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, color: '#004080' }}>
            {proyectoSeleccionado
              ? `📂 Proyecto: ${proyectoSeleccionado.nombre}`
              : '📂 Mirar Proyectos'}
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>
            {proyectoSeleccionado
              ? `Explora las versiones analizadas de "${proyectoSeleccionado.nombre}", visualízalas en el Dashboard o elimina registros.`
              : 'Selecciona un proyecto para ver todas sus versiones analizadas, edita su nombre o administra tus entregas.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {proyectoSeleccionado && (
            <button
              onClick={() => setProyectoAbiertoId(null)}
              style={{
                backgroundColor: '#475569', color: '#fff', border: 'none', padding: '10px 16px',
                borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              ⬅ Volver a Proyectos
            </button>
          )}

          <button
            onClick={() =>
              proyectoSeleccionado
                ? irASubirNuevaVersion(proyectoSeleccionado.id_proyecto)
                : navigate('/subir')
            }
            style={{
              backgroundColor: '#0056b3', color: '#fff', border: 'none', padding: '10px 18px',
              borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            {proyectoSeleccionado
              ? `+ Subir ${proyectoSeleccionado.proxima_version} a ${proyectoSeleccionado.nombre}`
              : '+ Subir Proyecto / Nueva Versión'}
          </button>
        </div>
      </header>

      {mensaje && (
        <div style={{ backgroundColor: '#e6f4ea', color: '#1e7e34', padding: '12px 16px', borderRadius: '6px', marginBottom: '1.5rem', fontWeight: 'bold' }}>
          {mensaje}
        </div>
      )}

      {cargando ? (
        <p style={{ textAlign: 'center', marginTop: '3rem', color: '#555' }}>
          Cargando proyectos y versiones desde PostgreSQL...
        </p>
      ) : proyectos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3 style={{ color: '#555' }}>No hay proyectos registrados todavía</h3>
          <p style={{ color: '#777' }}>Ve a la pestaña "Subir Proyecto" para crear tu primer proyecto y analizar su Versión 1.</p>
        </div>
      ) : !proyectoSeleccionado ? (
        /* =========================================================
           NIVEL 1: LISTA DE PROYECTOS (EJ. "PopaBus", "Pruebas Iniciales")
           ========================================================= */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1.25rem' }}>
          {proyectos.map((proy) => (
            <div
              key={proy.id_proyecto}
              onClick={() => setProyectoAbiertoId(proy.id_proyecto)}
              style={{
                backgroundColor: '#fff',
                border: '1px solid #cbd5e1',
                borderTop: '5px solid #004080',
                borderRadius: '10px',
                padding: '1.35rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
              }}
            >
              <div>
                {editandoId === proy.id_proyecto ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: 'flex', gap: '6px', marginBottom: '0.5rem' }}
                  >
                    <input
                      type="text"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      style={{ flex: 1, padding: '6px 8px', borderRadius: '5px', border: '1px solid #004080' }}
                    />
                    <button
                      onClick={(e) => guardarNombreProyecto(proy.id_proyecto, e)}
                      style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      OK
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditandoId(null); }}
                      style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '5px', cursor: 'pointer' }}
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#004080', fontSize: '1.25rem' }}>
                      📁 {proy.nombre}
                    </h3>
                    <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '0.8rem', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px' }}>
                      {proy.total_versiones} {proy.total_versiones === 1 ? 'Versión' : 'Versiones'}
                    </span>
                  </div>
                )}

                <p style={{ margin: '8px 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                  {proy.total_versiones > 0
                    ? `Última entrega: ${proy.versiones[0].numero_version} (${proy.versiones[0].fecha})`
                    : 'Sin versiones subidas todavía'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setProyectoAbiertoId(proy.id_proyecto);
                  }}
                  style={{
                    flex: 1, backgroundColor: '#004080', color: '#fff', border: 'none',
                    padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem'
                  }}
                >
                  🔍 Ver Versiones ({proy.total_versiones})
                </button>

                <button
                  onClick={(e) => iniciarEdicion(proy, e)}
                  style={{
                    backgroundColor: '#f59e0b', color: '#fff', border: 'none',
                    padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem'
                  }}
                  title="Editar nombre del proyecto"
                >
                  ✏️ Editar
                </button>

                <button
                  onClick={(e) => manejarEliminarProyecto(proy, e)}
                  style={{
                    backgroundColor: '#dc2626', color: '#fff', border: 'none',
                    padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem'
                  }}
                  title="Eliminar proyecto completo"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* =========================================================
           NIVEL 2: VERSIONES DENTRO DEL PROYECTO SELECCIONADO
           ========================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {proyectoSeleccionado.versiones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <h3 style={{ color: '#475569', marginTop: 0 }}>
                El proyecto "{proyectoSeleccionado.nombre}" aún no tiene versiones analizadas
              </h3>
              <button
                onClick={() => irASubirNuevaVersion(proyectoSeleccionado.id_proyecto)}
                style={{
                  backgroundColor: '#0056b3', color: '#fff', border: 'none', padding: '10px 18px',
                  borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                }}
              >
                Subir Versión 1 de {proyectoSeleccionado.nombre}
              </button>
            </div>
          ) : (
            proyectoSeleccionado.versiones.map((ver) => (
              <div
                key={ver.id_analisis}
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderLeft: '5px solid #004080',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#004080' }}>
                      {ver.etiqueta_completa}
                    </span>
                    <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '0.78rem', fontWeight: 'bold', padding: '3px 10px', borderRadius: '12px' }}>
                      {ver.fecha}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.9rem', color: '#334155' }}>
                    <strong>📊 Métricas ISO/IEC 25010:</strong> {ver.resumen_metricas}
                  </div>

                  <div style={{ fontSize: '0.88rem', color: '#047857' }}>
                    <strong>🏆 Madurez CMMI:</strong> {ver.nivel_cmmi}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => verVersionEnDashboard(ver.id_analisis, proyectoSeleccionado.id_proyecto)}
                    style={{
                      backgroundColor: '#004080', color: '#fff', border: 'none',
                      padding: '9px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                    }}
                  >
                    📊 Ver en Dashboard
                  </button>

                  <button
                    onClick={() => manejarEliminarVersion(ver)}
                    style={{
                      backgroundColor: '#dc2626', color: '#fff', border: 'none',
                      padding: '9px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                    }}
                  >
                    🗑️ Eliminar Versión
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default HistorialProyectos;