"use client";

import { useEffect } from 'react';

const ModelViewer = ({ src }) => {
  useEffect(() => {
    // Importamos el script de model-viewer dinámicamente solo en el lado del cliente
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
    document.head.appendChild(script);

    return () => {
      // Limpiamos el script si el componente se desmonta
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="w-full h-64 bg-gray-200 rounded-lg mb-4">
      <model-viewer
        src={src}
        alt="Vista previa del árbol"
        auto-rotate
        camera-controls
        ar
        style={{ width: '100%', height: '100%', borderRadius: '8px' }}
      ></model-viewer>
    </div>
  );
};

export default ModelViewer;