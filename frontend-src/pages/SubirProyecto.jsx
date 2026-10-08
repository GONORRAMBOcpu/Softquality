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

  // Crear un proyecto nuevo (ej. "PopaBus")
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

  // Editar el nombre del proyecto seleccionado
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

  // Selección del archivo .zip
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

  // Subir el archivo .zip al proyecto seleccionado
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
      // 1. Enviamos el ZIP junto con el id_proyecto al backend de FastAPI
      const respuestaAnalisis = await subirProyectoZIP(archivo, Number(idProyectoSeleccionado));
      const nuevoId = respuestaAnalisis.id_analisis;
      const etiqueta = respuestaAnalisis.etiqueta_completa || `Análisis #${nuevoId}`;

      localStorage.setItem('ultimoIdAnalisis', nuevoId);
      localStorage.setItem('ultimoIdProyecto', idProyectoSeleccionado);

      setMensaje({
        tipo: 'info',
        texto: `${etiqueta} analizada. Generando recomendaciones con IA...`,
      });

      // 2. Llamamos a Gemini para que interprete los resultados
      await generarRecomendacionesIA(nuevoId);

      setMensaje({
        tipo: 'exito',
        texto: `¡${etiqueta} completada con éxito! Redirigiendo al Dashboard...`,
      });
      setArchivo(null);

      // 3. Redirigimos automáticamente al Dashboard
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

  return (
    <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#004080', marginBottom: '0.5rem' }}>📦 Subir Proyecto y Analizar Versión</h2>
      <p style={{ color: '#555', marginTop: 0, marginBottom: '1.5rem' }}>
        Crea un proyecto nuevo o selecciona uno existente para subir una nueva versión (<code>.zip</code>) y evaluar su evolución.
      </p>

      {/* PASO 1: CREAR O SELECCIONAR PROYECTO */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
        <h3 style={{ marginTop: 0, color: '#1e3a8a', fontSize: '1.05rem' }}>1. Seleccionar o Crear Proyecto</h3>

        {/* Formulario rápido para crear un proyecto nuevo */}
        <form onSubmit={manejarCrearProyecto} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <input
            type="text"
            placeholder="Nombre de nuevo proyecto (ej. PopaBus)..."
            value={nuevoNombreProyecto}
            onChange={(e) => setNuevoNombreProyecto(e.target.value)}
            disabled={cargando}
            style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '0.95rem' }}
          />
          <button
            type="submit"
            disabled={cargando}
            style={{
              backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px 16px',
              borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap'
            }}
          >
            + Crear Proyecto
          </button>
        </form>

        {/* Selector de proyecto existente y botón para editar su nombre */}
        {proyectos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontWeight: 'bold', color: '#334155', fontSize: '0.9rem' }}>
              Proyecto Activo:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                value={idProyectoSeleccionado}
                onChange={(e) => {
                  setIdProyectoSeleccionado(e.target.value);
                  localStorage.setItem('ultimoIdProyecto', e.target.value);
                  setModoEditarNombre(false);
                }}
                disabled={cargando}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '0.95rem', backgroundColor: '#f8fafc', fontWeight: 'bold', color: '#0f172a' }}
              >
                {proyectos.map((p) => (
                  <option key={p.id_proyecto} value={p.id_proyecto}>
                    {p.nombre} ({p.total_versiones} {p.total_versiones === 1 ? 'versión analizada' : 'versiones analizadas'})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={iniciarEdicionNombre}
                disabled={cargando || !proyectoActual}
                style={{
                  backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '10px 14px',
                  borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap'
                }}
              >
                ✏️ Editar Nombre
              </button>
            </div>

            {/* Cuadro desplegable para editar el nombre del proyecto */}
            {modoEditarNombre && proyectoActual && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', backgroundColor: '#fffbeb', padding: '10px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                <input
                  type="text"
                  value={nombreEditado}
                  onChange={(e) => setNombreEditado(e.target.value)}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: '5px', border: '1px solid #d97706' }}
                />
                <button
                  type="button"
                  onClick={guardarEdicionNombre}
                  style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setModoEditarNombre(false)}
                  style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              </div>
            )}

            {/* Indicador de la versión automática que se creará */}
            {proyectoActual && (
              <div style={{ backgroundColor: '#eff6ff', borderLeft: '4px solid #2563eb', padding: '10px 12px', borderRadius: '4px', fontSize: '0.9rem', color: '#1e40af' }}>
                📌 Estás dentro del proyecto <strong>{proyectoActual.nombre}</strong>. Al subir el archivo <code>.zip</code> se registrará automáticamente como la <strong>{proyectoActual.proxima_version} de {proyectoActual.nombre}</strong>.
              </div>
            )}
          </div>
        )}
      </div>

      {/* PASO 2: INSTRUCCIONES Y SUBIDA DEL ARCHIVO ZIP */}
      <div style={{ backgroundColor: '#f0f8ff', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>⚠️ Contenido del Archivo .zip</h3>
        <p style={{ margin: '0.4rem 0' }}>Tu archivo comprimido debe incluir:</p>
        <ul style={{ margin: '0.4rem 0' }}>
          <li>Tus archivos de código fuente (<strong>.py</strong>).</li>
          <li>El listado de dependencias (<strong>requirements.txt</strong>).</li>
          <li>El reporte de pruebas unitarias (<strong>coverage.xml</strong>).</li>
        </ul>
      </div>

      <form onSubmit={manejarEnvio} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="file"
          accept=".zip"
          onChange={manejarSeleccion}
          disabled={cargando}
          style={{ padding: '1rem', border: '2px dashed #94a3b8', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#fff' }}
        />

        {archivo && (
          <p style={{ margin: 0, color: '#0f172a' }}>
            Archivo listo para analizar: <strong>{archivo.name}</strong>
          </p>
        )}

        <button
          type="submit"
          disabled={!archivo || !idProyectoSeleccionado || cargando}
          style={{
            padding: '12px',
            backgroundColor: (!archivo || cargando) ? '#94a3b8' : '#0056b3',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '1rem',
            cursor: (!archivo || cargando) ? 'not-allowed' : 'pointer'
          }}
        >
          {cargando
            ? 'Procesando versión y consultando IA...'
            : proyectoActual
            ? `🚀 Subir y Analizar ${proyectoActual.proxima_version} de ${proyectoActual.nombre}`
            : 'Subir y Analizar'}
        </button>
      </form>

      {/* Mensajes de retroalimentación */}
      {mensaje.texto && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          borderRadius: '6px',
          fontWeight: 'bold',
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