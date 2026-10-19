import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import RutaProtegida from './components/RutaProtegida';

// Importamos las páginas de la carpeta pages/
import Login from './pages/Login';
import Registrarse from './pages/Registrarse';
import SubirProyecto from './pages/SubirProyecto';
import Dashboard from './pages/Dashboard';
import HistorialProyectos from './pages/HistorialProyectos';

const enlaceEstilo = { color: 'white', textDecoration: 'none' };

// Barra de navegación global: cambia según haya sesión o no
const Navbar = () => {
  const { usuario, logout } = useAuth();

  return (
    <nav style={{
      backgroundColor: '#004080',
      padding: '1rem 2rem',
      display: 'flex',
      alignItems: 'center',
      gap: '2rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem', marginRight: 'auto' }}>
        SoftQuality 🚀
      </div>

      {usuario ? (
        <>
          <Link to="/subir" style={enlaceEstilo}>Subir Proyectos</Link>
          <Link to="/proyectos" style={{ color: 'white', textDecoration: 'none' }}>Mirar Proyectos</Link>

          <Link to="/dashboard" style={enlaceEstilo}>Dashboard</Link>
          <span style={{ color: '#cfe0f5', fontSize: '0.9rem' }}>{usuario.nombre}</span>
          <button
            onClick={logout}
            style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 5, padding: '6px 12px', cursor: 'pointer' }}
          >
            Cerrar sesión
          </button>
        </>
      ) : (
        <>
          <Link to="/login" style={enlaceEstilo}>Iniciar sesión</Link>
          <Link to="/registrarse" style={enlaceEstilo}>Crear cuenta</Link>
        </>
      )}
    </nav>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div style={{ fontFamily: 'sans-serif', margin: 0, padding: 0 }}>
          <Navbar />

          <main>
            <Routes>
              {/* Públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/registrarse" element={<Registrarse />} />
              
              <Route path="/proyectos" element={<RutaProtegida><HistorialProyectos /></RutaProtegida>}/>
              <Route path="/dashboard/:id" element={<RutaProtegida><Dashboard /></RutaProtegida>}/>
              {/* Protegidas: exigen sesión iniciada */}
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
