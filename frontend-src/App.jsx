import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Importamos las páginas de la carpeta pages/
import Registrarse from './pages/Registrarse';
import SubirProyecto from './pages/SubirProyecto';
import Dashboard from './pages/Dashboard';

const App = () => {
  return (
    <Router>
      <div style={{ fontFamily: 'sans-serif', margin: 0, padding: 0 }}>
        
        {/* Barra de navegación global (Navbar) */}
        <nav style={{ 
          backgroundColor: '#004080', 
          padding: '1rem 2rem', 
          display: 'flex', 
          gap: '2rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem', marginRight: 'auto' }}>
            SoftQuality 🚀
          </div>
          <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Autenticación</Link>
          <Link to="/subir" style={{ color: 'white', textDecoration: 'none' }}>Analizar Proyecto</Link>
          <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>Dashboard</Link>
        </nav>

        {/* Contenedor dinámico de las rutas */}
        <main>
          <Routes>
            {/* Ruta 1: El punto de entrada será el Registro/Login */}
            <Route path="/" element={<Registrarse />} />
            
            {/* Ruta 2: La pantalla de ingesta del .zip */}
            <Route path="/subir" element={<SubirProyecto />} />
            
            {/* Ruta 3: El visualizador de ISO 25010 y CMMI */}
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>

      </div>
    </Router>
  );
};

export default App;