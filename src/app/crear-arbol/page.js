"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ModelViewer from '../../components/ModelViewer';

const CrearArbol = () => {
  const [user, setUser] = useState(null);
  const [nombre, setNombre] = useState('');
  const [modelo, setModelo] = useState('jabami_anime_tree_v2.glb');
  const [nacimiento, setNacimiento] = useState('');
  const [fallecimiento, setFallecimiento] = useState('');
  const [cancion, setCancion] = useState('');
  const [imagenes, setImagenes] = useState([]);
  const [estado, setEstado] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const modelosDisponibles = [
    { value: 'jabami_anime_tree_v2.glb', label: 'Árbol estilo Anime' },
    { value: 'low_poly_purple_flowers.glb', label: 'Árbol con flores púrpura' },
    { value: 'tree_elm.glb', label: 'Olmo' },
    { value: 'ficus_bonsai.glb', label: 'Ficus Bonsai' },
    { value: 'flowerpot.glb', label: 'Maceta con flor' },
  ];

  const modeloURL = `https://firebasestorage.googleapis.com/v0/b/memorialapp-b1ccf.firebasestorage.app/o/modelos_3d%2F${encodeURIComponent(modelo)}?alt=media`;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setEstado("Debes iniciar sesión para crear un árbol.");
      return;
    }
    if (imagenes.length > 5) {
      setEstado("Puedes subir un máximo de 5 imágenes.");
      return;
    }
    setEstado("Guardando, por favor espera...");

    try {
      // 1. Subir imágenes a Firebase Storage
      const urlsImagenes = [];
      for (const imagen of imagenes) {
        const storageRef = ref(storage, `arboles/${user.uid}/${Date.now()}_${imagen.name}`);
        await uploadBytes(storageRef, imagen);
        const url = await getDownloadURL(storageRef);
        urlsImagenes.push(url);
      }

      // 2. Guardar datos del árbol en Firestore
      await addDoc(collection(db, "arboles"), {
        uid: user.uid,
        nombre,
        modelo,
        nacimiento,
        fallecimiento,
        cancion,
        imagenes: urlsImagenes,
        creado: serverTimestamp()
      });

      setEstado("🌳 Árbol guardado correctamente. Redirigiendo a la galería...");
      // Resetear formulario
      setNombre('');
      setModelo('jabami_anime_tree_v2.glb');
      // ... resetear otros campos
      
      setTimeout(() => router.push('/galeria'), 2000);

    } catch (error) {
      setEstado("Error al guardar el árbol: " + error.message);
      console.error(error);
    }
  };

  if (loading) {
    return <p className="text-center mt-10">Verificando usuario...</p>;
  }

  return (
    <div className="container mx-auto max-w-2xl p-4 sm:p-6">
      <h2 className="text-3xl font-bold text-center mb-6">Crear Árbol Conmemorativo</h2>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md">
        <div className="mb-4">
          <label htmlFor="nombre" className="block text-gray-700 font-bold mb-2">Nombre del árbol:</label>
          <input type="text" id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="w-full px-3 py-2 border rounded-md" />
        </div>

        <div className="mb-4">
          <label htmlFor="modelo" className="block text-gray-700 font-bold mb-2">Selecciona un modelo 3D:</label>
          <select id="modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} className="w-full px-3 py-2 border rounded-md">
            {modelosDisponibles.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        <ModelViewer src={modeloURL} />

        <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="mb-4">
                <label htmlFor="nacimiento" className="block text-gray-700 font-bold mb-2">Fecha de nacimiento:</label>
                <input type="date" id="nacimiento" value={nacimiento} onChange={(e) => setNacimiento(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="mb-4">
                <label htmlFor="fallecimiento" className="block text-gray-700 font-bold mb-2">Fecha de fallecimiento:</label>
                <input type="date" id="fallecimiento" value={fallecimiento} onChange={(e) => setFallecimiento(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
            </div>
        </div>
        
        <div className="mb-4">
          <label htmlFor="cancion" className="block text-gray-700 font-bold mb-2">Enlace de canción (YouTube):</label>
          <input type="url" id="cancion" value={cancion} onChange={(e) => setCancion(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
        </div>

        <div className="mb-4">
          <label htmlFor="imagenes" className="block text-gray-700 font-bold mb-2">Imágenes (máximo 5):</label>
          <input type="file" id="imagenes" accept="image/*" multiple onChange={(e) => setImagenes(Array.from(e.target.files))} className="w-full px-3 py-2 border rounded-md" />
        </div>

        <button type="submit" className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 transition-colors">
          Guardar Árbol
        </button>

        {estado && <p className="text-center mt-4 text-gray-600">{estado}</p>}
      </form>
    </div>
  );
};

export default CrearArbol;