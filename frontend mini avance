import React, { useState } from 'react';

export const UploadProjectForm = ({ onUploadSuccess }) => {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('version_tag', version);
    if (file) formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/projects/', { method: 'POST', body: formData });
      const data = await res.json();

      await fetch(`http://localhost:8000/projects/${data.project_id}/versions/${data.version_id}/review`, { method: 'POST' });
      
      alert('Proyecto subido y revision solicitada');
      if (onUploadSuccess) onUploadSuccess(data.project_id);
    } catch (err) {
      alert('Error en la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff' }}>
      <h3>Subir Proyecto / Solicitar Revision</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input type="text" placeholder="Nombre del proyecto" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="text" placeholder="Version (ej: v1.0.0)" value={version} onChange={(e) => setVersion(e.target.value)} required />
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit" disabled={loading} style={{ padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px' }}>
          {loading ? 'Procesando...' : 'Subir y Solicitar Revision'}
        </button>
      </form>
    </div>
  );
};
