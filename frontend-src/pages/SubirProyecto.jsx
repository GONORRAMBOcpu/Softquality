import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  obtenerProyectos,
  crearProyecto,
  actualizarNombreProyecto,
  subirProyectoZIP,
  generarRecomendacionesIA,
} from '../services/api';

const SubirProyecto = () => {
  // === 1. ESTADOS Y LÓGICA ORIGINALES INTACTOS ===
  const [proyectos, setProyectos] = useState([]);
  const [idProyectoSeleccionado, setIdProyectoSeleccionado] = useState('');
  const [nuevoNombreProyecto, setNuevoNombreProyecto] = useState('');
  const [modoEditarNombre, setModoEditarNombre] = useState(false);
  const [nombreEditado, setNombreEditado] = useState('');

  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const navigate = useNavigate();

  const cargarListaProyectos = async (idPreferido = null) => {
    try {
      const lista = await obtenerProyectos();
      setProyectos(lista);

      if (idPreferido) {
        setIdProyectoSeleccionado(String(idPreferido));
        localStorage.setItem('ultimoIdProyecto', String(idPreferido));
      } else {
        const guardado = localStorage.getItem('ultimoIdProyecto');
        const existeGuardado = lista.some((p) => String(p.id_proyecto) === String(guardado));
        if (existeGuardado) {
          setIdProyectoSeleccionado(String(guardado));
        } else if (lista.length > 0) {
          setIdProyectoSeleccionado(String(lista[0].id_proyecto));
        }
      }
    } catch (error) {
      console.error("Error cargando proyectos:", error);
    }
  };

  useEffect(() => {
    cargarListaProyectos();
  }, []);

  const proyectoActual = proyectos.find(
    (p) => String(p.id_proyecto) === String(idProyectoSeleccionado)
  );

  const manejarCrearProyecto = async (e) => {
    e.preventDefault();
    if (!nuevoNombreProyecto.trim()) {
      setMensaje({ tipo: 'error', texto: 'Escribe un nombre para el nuevo proyecto (ej. PopaBus).' });
      return;
    }

    try {
      const creado = await crearProyecto(nuevoNombreProyecto.trim());
      setNuevoNombreProyecto('');
      await cargarListaProyectos(creado.id_proyecto);
      setMensaje({
        tipo: 'exito',
        texto: `✅ Proyecto "${creado.nombre}" creado y seleccionado. Ahora puedes subir su Versión 1.`,
      });
    } catch (error) {
      const detalle = error.response?.data?.detail || 'No se pudo crear el proyecto.';
      setMensaje({ tipo: 'error', texto: detalle });
    }
  };

  const iniciarEdicionNombre = () => {
    if (!proyectoActual) return;
    setNombreEditado(proyectoActual.nombre);
    setModoEditarNombre(true);
  };

  const guardarEdicionNombre = async () => {
    if (!proyectoActual || !nombreEditado.trim()) return;
    try {
      const actualizado = await actualizarNombreProyecto(
        proyectoActual.id_proyecto,
        nombreEditado.trim()
      );
      setModoEditarNombre(false);
      await cargarListaProyectos(actualizado.id_proyecto);
      setMensaje({
        tipo: 'exito',
        texto: `✏️ Nombre del proyecto actualizado a "${actualizado.nombre}".`,
      });
    } catch (error) {
      const detalle = error.response?.data?.detail || 'Error al cambiar el nombre del proyecto.';
      setMensaje({ tipo: 'error', texto: detalle });
    }
  };

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

  const manejarEnvio = async (e) => {
    e.preventDefault();
    if (!idProyectoSeleccionado) {
      setMensaje({ tipo: 'error', texto: 'Primero crea o selecciona un proyecto.' });
      return;
    }
    if (!archivo) {
      setMensaje({ tipo: 'error', texto: 'Debes seleccionar un archivo .zip primero.' });
      return;
    }

    setCargando(true);
    setMensaje({
      tipo: 'info',
      texto: `Subiendo archivo y calculando ${proyectoActual?.proxima_version || 'nueva versión'} de "${proyectoActual?.nombre}"...`,
    });

    try {
      const respuestaAnalisis = await subirProyectoZIP(archivo, Number(idProyectoSeleccionado));
      const nuevoId = respuestaAnalisis.id_analisis;
      const etiqueta = respuestaAnalisis.etiqueta_completa || `Análisis #${nuevoId}`;

      localStorage.setItem('ultimoIdAnalisis', nuevoId);
      localStorage.setItem('ultimoIdProyecto', idProyectoSeleccionado);

      setMensaje({
        tipo: 'info',
        texto: `${etiqueta} analizada. Generando recomendaciones con IA...`,
      });

      await generarRecomendacionesIA(nuevoId);

      setMensaje({
        tipo: 'exito',
        texto: `¡${etiqueta} completada con éxito! Redirigiendo al Dashboard...`,
      });
      setArchivo(null);

      setTimeout(() => {
        navigate(`/dashboard/${nuevoId}`);
      }, 1200);
    } catch (error) {
      console.error("Error en el flujo de análisis:", error);
      setMensaje({
        tipo: 'error',
        texto: 'Hubo un error procesando el proyecto. Verifica que el archivo .zip contenga código Python válido y que el backend esté encendido.',
      });
    } finally {
      setCargando(false);
    }
  };

  // === 2. INTERFAZ GRÁFICA (IDENTIDAD VISUAL DARK THEME) ===
  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc', padding: '2.5rem', fontFamily: 'Inter, sans-serif' }}>
      
      {/* --- ENCABEZADO SUPERIOR --- */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: '#06b6d4', fontSize: '0.75rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.6rem', fontWeight: '600' }}>
          ESPACIO DE TRABAJO / NUEVO ANÁLISIS
        </p>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.4rem', fontWeight: 'bold', color: '#f8fafc' }}>
          Subir proyecto y analizar versión
        </h1>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '1rem' }}>
          Crea un proyecto o selecciona uno existente. Cada entrega es un nuevo punto en su evolución.
        </p>
      </div>

      {/* --- CONTENEDOR PRINCIPAL DOS COLUMNAS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2rem' }}>
        
        {/* COLUMNA IZQUIERDA: Formulario de Subida */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* PASO 01: CREAR O SELECCIONAR PROYECTO */}
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <span style={{ backgroundColor: '#164e63', color: '#67e8f9', padding: '6px 10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>01</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>Selecciona o crea un proyecto</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Organiza todas tus versiones en un mismo lugar.</p>
              </div>
            </div>

            {/* Nuevo proyecto */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#f8fafc', marginBottom: '0.5rem' }}>Nuevo proyecto</label>
              <form onSubmit={manejarCrearProyecto} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Nombre del proyecto, p. ej. PopaBus"
                  value={nuevoNombreProyecto}
                  onChange={(e) => setNuevoNombreProyecto(e.target.value)}
                  disabled={cargando}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
                />
                <button
                  type="submit"
                  disabled={cargando}
                  style={{
                    backgroundColor: 'transparent', color: '#f8fafc', border: '1px solid #334155', padding: '10px 16px',
                    borderRadius: '6px', cursor: 'pointer', fontWeight: '500', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#334155'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <span style={{color: '#8b5cf6', fontSize: '1.2rem', lineHeight: 1}}>+</span> Crear proyecto
                </button>
              </form>
            </div>

            {/* Proyecto activo */}
            {proyectos.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f8fafc' }}>Proyecto activo</label>
                  {proyectoActual && (
                    <span style={{ backgroundColor: '#1e3a8a', color: '#93c5fd', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
                      {proyectoActual.total_versiones} {proyectoActual.total_versiones === 1 ? 'versión analizada' : 'versiones analizadas'}
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>📁</span>
                    <select
                      value={idProyectoSeleccionado}
                      onChange={(e) => {
                        setIdProyectoSeleccionado(e.target.value);
                        localStorage.setItem('ultimoIdProyecto', e.target.value);
                        setModoEditarNombre(false);
                      }}
                      disabled={cargando}
                      style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f8fafc', fontSize: '0.9rem', appearance: 'none', cursor: 'pointer', outline: 'none' }}
                    >
                      {proyectos.map((p) => (
                        <option key={p.id_proyecto} value={p.id_proyecto}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', fontSize: '0.8rem' }}>▼</span>
                  </div>

                  <button
                    type="button"
                    onClick={iniciarEdicionNombre}
                    disabled={cargando || !proyectoActual}
                    style={{
                      backgroundColor: 'transparent', color: '#f8fafc', border: '1px solid #334155', padding: '10px 16px',
                      borderRadius: '6px', cursor: 'pointer', fontWeight: '500', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#334155'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    ✏️ Editar nombre
                  </button>
                </div>

                {/* Edición de nombre (Desplegable) */}
                {modoEditarNombre && proyectoActual && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #334155' }}>
                    <input
                      type="text"
                      value={nombreEditado}
                      onChange={(e) => setNombreEditado(e.target.value)}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#f8fafc', outline: 'none' }}
                    />
                    <button type="button" onClick={guardarEdicionNombre} style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                      Guardar
                    </button>
                    <button type="button" onClick={() => setModoEditarNombre(false)} style={{ backgroundColor: '#475569', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer' }}>
                      Cancelar
                    </button>
                  </div>
                )}

                {/* Indicador visual de la versión automática */}
                {proyectoActual && (
                  <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e3a8a', padding: '10px 14px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px', color: '#93c5fd', fontSize: '0.85rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    <span>Tu archivo se registrará como la <strong>{proyectoActual.proxima_version}</strong> de {proyectoActual.nombre}. Las versiones anteriores se conservan.</span>
                  </div>
                )}
              </div>
            )}
          </div>

{/* PASO 02: CARGA TU CÓDIGO FUENTE (Área Drag & Drop) */}
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', opacity: proyectoActual ? 1 : 0.5, pointerEvents: proyectoActual ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <span style={{ backgroundColor: '#164e63', color: '#67e8f9', padding: '6px 10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>02</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>Carga tu código fuente</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Selecciona el archivo comprimido de esta entrega.</p>
              </div>
            </div>

            <form onSubmit={manejarEnvio} style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* Área de arrastrar y soltar (Dashed box) */}
              <div style={{ 
                border: '1px dashed #475569', 
                borderRadius: '12px', 
                padding: '3rem 2rem', 
                textAlign: 'center', 
                backgroundColor: '#0f172a',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem',
                position: 'relative'
              }}>
                <div style={{ backgroundColor: '#1e3a8a', color: '#93c5fd', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', fontWeight: '500' }}>Arrastra tu archivo .zip aquí</h4>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Botón falso para diseño que activa el input real oculto */}
                  <label 
                    htmlFor="zip-upload" 
                    style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', cursor: cargando ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
                    onMouseOver={(e) => { if(!cargando) e.target.style.backgroundColor = '#334155'; }}
                    onMouseOut={(e) => { if(!cargando) e.target.style.backgroundColor = '#1e293b'; }}
                  >
                    Seleccionar archivo
                  </label>
                  <input
                    id="zip-upload"
                    type="file"
                    accept=".zip"
                    onChange={manejarSeleccion}
                    disabled={cargando}
                    style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}
                  />
                  <span style={{ fontSize: '0.85rem', color: archivo ? '#38bdf8' : '#64748b' }}>
                    {archivo ? archivo.name : 'Ningún archivo seleccionado'}
                  </span>
                </div>
              </div>

              {/* Botón de Enviar Fila Inferior */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: '1.5rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>PRÓXIMA ENTREGA</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '1.1rem', color: '#f8fafc', fontWeight: 'bold' }}>
                    {proyectoActual ? proyectoActual.proxima_version : 'Versión -'}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <button
                    type="submit"
                    disabled={!archivo || !idProyectoSeleccionado || cargando}
                    style={{
                      backgroundColor: (!archivo || cargando) ? '#334155' : '#1e3a8a',
                      color: (!archivo || cargando) ? '#94a3b8' : '#bfdbfe',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '6px',
                      fontWeight: '500',
                      fontSize: '0.95rem',
                      cursor: (!archivo || cargando) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    {cargando ? 'Procesando...' : proyectoActual ? `Subir y analizar ${proyectoActual.proxima_version}` : 'Subir y analizar versión'}
                  </button>
                  {(!archivo || !proyectoActual) && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Selecciona un archivo .zip para habilitar el análisis.</span>
                  )}
                </div>
              </div>

            </form>
          </div>

        </div>

{/* COLUMNA DERECHA: Instrucciones y tarjetas complementarias */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Tarjeta de Instrucciones .zip */}
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <span style={{ color: '#38bdf8' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </span>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>Prepara tu archivo .zip</h3>
            </div>
            
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5' }}>
              Incluye estos archivos para que el motor pueda evaluar tu proyecto.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontWeight: '600', fontSize: '0.9rem', marginBottom: '4px' }}>
                  <span style={{ color: '#06b6d4' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  </span>
                  .py
                </div>
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Código fuente - Tus archivos de Python.</div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontWeight: '600', fontSize: '0.9rem', marginBottom: '4px' }}>
                  <span style={{ color: '#06b6d4' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  </span>
                  requirements.txt
                </div>
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Dependencias - Listado de librerías del proyecto.</div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontWeight: '600', fontSize: '0.9rem', marginBottom: '4px' }}>
                  <span style={{ color: '#06b6d4' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  </span>
                  coverage.xml
                </div>
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Pruebas unitarias - Reporte de cobertura de pruebas.</div>
              </div>
            </div>
          </div>

          {/* Tarjeta Informativa Inferior */}
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ color: '#8b5cf6', marginBottom: '1rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </div>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#f8fafc', fontWeight: '600' }}>
              Del código a la mejora continua
            </h4>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5' }}>
              El motor calcula las métricas. La IA interpreta los resultados y propone recomendaciones para tu siguiente versión.
            </p>
            <div style={{ borderTop: '1px solid #334155', paddingTop: '1rem', fontSize: '0.75rem', color: '#475569' }}>
              Calidad del producto con referencia a ISO/IEC 25010.
            </div>
          </div>
          
        </div>

      </div>

      {/* --- ALERTAS TEMPORALES DEL SISTEMA --- */}
      {mensaje.texto && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50 }}>
          <div style={{ 
            backgroundColor: mensaje.tipo === 'error' ? '#7f1d1d' : mensaje.tipo === 'exito' ? '#064e3b' : '#1e3a8a',
            color: mensaje.tipo === 'error' ? '#fecaca' : mensaje.tipo === 'exito' ? '#a7f3d0' : '#bfdbfe',
            border: `1px solid ${mensaje.tipo === 'error' ? '#b91c1c' : mensaje.tipo === 'exito' ? '#059669' : '#1d4ed8'}`,
            padding: '12px 20px', 
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontWeight: '500' }}>{mensaje.texto}</span>
            <button onClick={() => setMensaje({ tipo: '', texto: '' })} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem', marginLeft: '10px' }}>×</button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1e293b', marginTop: '3rem', paddingTop: '1.5rem', color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
        <span>SoftQuality / Inteligencia de Software</span>
        <span>Diagnóstico académico · Mejora continua</span>
      </div>

    </div>
  );
};

export default SubirProyecto;