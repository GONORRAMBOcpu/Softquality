import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import RutaProtegida from './components/RutaProtegida';

// Importamos las páginas de la carpeta pages/
import Login from './pages/Login';
import Registrarse from './pages/Registrarse';
import SubirProyecto from './pages/SubirProyecto';
import Dashboard from './pages/Dashboard';
import HistorialProyectos from './pages/HistorialProyectos';

// Barra de navegación global (Dark Theme Moderno)
const Navbar = () => {
  const { usuario, logout } = useAuth();
  const location = useLocation();

  // Función para determinar si la ruta está activa (para pintarla de otro color)
  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <nav style={{
      backgroundColor: '#1e2330', // Azul muy oscuro de tu diseño base (Dark Theme)
      borderBottom: '1px solid #334155', // Línea sutil separadora
      padding: '1rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between', // Separa logo a la izq y enlaces a la der
      boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
      fontFamily: 'sans-serif'
    }}>
      
      {/* Sección Izquierda: Logo y Enlaces */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
        
        {/* Logo SoftQuality */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: '#8b5cf6', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </div>
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.4rem', letterSpacing: '-0.5px' }}>SoftQuality</span>
        </div>

        {/* Enlaces de Navegación (Solo si hay usuario logueado) */}
        {usuario && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link 
              to="/subir" 
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                color: isActive('/subir') ? '#ffffff' : '#94a3b8',
                backgroundColor: isActive('/subir') ? '#2a3142' : 'transparent',
                textDecoration: 'none', padding: '8px 16px', borderRadius: '6px',
                fontWeight: '500', fontSize: '0.9rem', transition: 'all 0.2s'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Subir proyecto
            </Link>
            
            <Link 
              to="/proyectos" 
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                color: isActive('/proyectos') ? '#ffffff' : '#94a3b8',
                backgroundColor: isActive('/proyectos') ? '#2a3142' : 'transparent',
                textDecoration: 'none', padding: '8px 16px', borderRadius: '6px',
                fontWeight: '500', fontSize: '0.9rem', transition: 'all 0.2s'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              Mirar proyectos
            </Link>

            <Link 
              to="/dashboard" 
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                color: isActive('/dashboard') ? '#ffffff' : '#94a3b8',
                backgroundColor: isActive('/dashboard') ? '#2a3142' : 'transparent',
                textDecoration: 'none', padding: '8px 16px', borderRadius: '6px',
                fontWeight: '500', fontSize: '0.9rem', transition: 'all 0.2s'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              Dashboard
            </Link>
          </div>
        )}
      </div>

      {/* Sección Derecha: Usuario y Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {usuario ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e2e8f0', fontWeight: 'bold', fontSize: '14px' }}>
                {usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : 'U'}
              </div>
              <span style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: '500' }}>
                {usuario.nombre}
              </span>
            </div>
            
            <div style={{ width: '1px', height: '24px', backgroundColor: '#334155' }}></div>
            
            <button
              onClick={logout}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', transition: 'color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#f87171'}
              onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              Cerrar sesión
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/login" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>Iniciar sesión</Link>
            <Link to="/registrarse" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>Crear cuenta</Link>
          </div>
        )}
      </div>

    </nav>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        {/* Envolvemos todo en un div con el color de fondo oscuro de tu dashboard para evitar márgenes blancos */}
        <div style={{ fontFamily: 'sans-serif', margin: 0, padding: 0, backgroundColor: '#131722', minHeight: '100vh' }}>
          <Navbar />

          <main>
            <Routes>
              {/* Públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/registrarse" element={<Registrarse />} />
              
              {/* Protegidas: exigen sesión iniciada */}
              <Route path="/proyectos" element={<RutaProtegida><HistorialProyectos /></RutaProtegida>}/>
              <Route path="/dashboard/:id" element={<RutaProtegida><Dashboard /></RutaProtegida>}/>
              <Route path="/subir" element={<RutaProtegida><SubirProyecto /></RutaProtegida>} />
              <Route path="/dashboard" element={<RutaProtegida><Dashboard /></RutaProtegida>} />

              {/* El punto de entrada envía a /subir (y de ahí a /login si no hay sesión) */}
              <Route path="/" element={<Navigate to="/subir" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;