import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Importamos las páginas de la carpeta pages/
import Registrarse from './pages/Registrarse';
import SubirProyecto from './pages/SubirProyecto';
import HistorialProyectos from './pages/HistorialProyectos';
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
          <Link to="/subir" style={{ color: 'white', textDecoration: 'none' }}>Subir Proyecto</Link>
          <Link to="/proyectos" style={{ color: 'white', textDecoration: 'none' }}>Mirar Proyectos</Link>
          <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>Dashboard</Link>
        </nav>

        {/* Contenedor dinámico de las rutas */}
        <main>
          <Routes>
            {/* Ruta 1: Registro/Login (Módulo de tus compañeros) */}
            <Route path="/" element={React.createElement(Registrarse)} />
            
            {/* Ruta 2: Caso de Uso "Subir Proyecto" (Gestión de proyecto + ingesta del .zip) */}
            <Route path="/subir" element={React.createElement(SubirProyecto)} />

            {/* Ruta 3: Caso de Uso "Mirar proyectos y eliminar" */}
            <Route path="/proyectos" element={React.createElement(HistorialProyectos)} />
            
            {/* Ruta 4: El visualizador de ISO 25010 y CMMI */}
            <Route path="/dashboard" element={React.createElement(Dashboard)} />
            <Route path="/dashboard/:id" element={React.createElement(Dashboard)} />
          </Routes>
        </main>

      </div>
    </Router>
  );
};

export default App;