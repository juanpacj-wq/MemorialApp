"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth, db, storage } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import ModelViewer from '../../../components/ModelViewer';

const EditarArbol = () => {
  const [user, setUser] = useState(null);
  const [arbol, setArbol] = useState(null);
  const [nombre, setNombre] = useState('');
  const [modelo, setModelo] = useState('');
  const [nacimiento, setNacimiento] = useState('');
  const [fallecimiento, setFallecimiento] = useState('');
  const [cancion, setCancion] = useState('');
  const [imagenesNuevas, setImagenesNuevas] = useState([]);
  const [imagenesActuales, setImagenesActuales] = useState([]);
  const [estado, setEstado] = useState('');
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const params = useParams();
  const { id: arbolId } = params;

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
      if (!currentUser) {
        router.push('/');
        return;
      }
      setUser(currentUser);

      const fetchArbol = async () => {
        if (!arbolId) return;
        const docRef = doc(db, "arboles", arbolId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.uid !== currentUser.uid) {
            alert("No tienes permiso para editar este árbol.");
            router.push('/galeria');
            return;
          }
          setArbol(data);
          setNombre(data.nombre || '');
          setModelo(data.modelo || 'jabami_anime_tree_v2.glb');
          setNacimiento(data.nacimiento || '');
          setFallecimiento(data.fallecimiento || '');
          setCancion(data.cancion || '');
          setImagenesActuales(data.imagenes || []);
        } else {
          alert("Árbol no encontrado.");
          router.push('/galeria');
        }
        setLoading(false);
      };

      fetchArbol();
    });
    return () => unsubscribe();
  }, [router, arbolId]);

  const eliminarImagen = async (url) => {
    if (!confirm("¿Deseas eliminar esta imagen permanentemente?")) return;
    try {
      // Borrar de Storage
      const path = decodeURIComponent(new URL(url).pathname.split('/o/')[1].split('?')[0]);
      const imgRef = ref(storage, path);
      await deleteObject(imgRef);

      // Actualizar estado y Firestore
      const nuevasImagenes = imagenesActuales.filter(img => img !== url);
      const docRef = doc(db, "arboles", arbolId);
      await updateDoc(docRef, { imagenes: nuevasImagenes });
      
      setImagenesActuales(nuevasImagenes);
      alert("Imagen eliminada.");
    } catch (e) {
      alert("No se pudo eliminar esta imagen.");
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEstado("Guardando cambios...");

    try {
      // 1. Subir nuevas imágenes
      const urlsImagenesNuevas = [];
      for (const imagen of imagenesNuevas) {
        const storageRef = ref(storage, `arboles/${user.uid}/${Date.now()}_${imagen.name}`);
        await uploadBytes(storageRef, imagen);
        const url = await getDownloadURL(storageRef);
        urlsImagenesNuevas.push(url);
      }
      
      // 2. Actualizar documento en Firestore
      const docRef = doc(db, "arboles", arbolId);
      await updateDoc(docRef, {
        nombre,
        modelo,
        nacimiento,
        fallecimiento,
        cancion,
        imagenes: [...imagenesActuales, ...urlsImagenesNuevas]
      });

      setEstado("✅ Cambios guardados. Redirigiendo...");
      setTimeout(() => router.push('/galeria'), 2000);

    } catch (error) {
      setEstado("Error al guardar: " + error.message);
    }
  };

  if (loading) {
    return <p className="text-center mt-10">Cargando datos del árbol...</p>;
  }

  return (
    <div className="container mx-auto max-w-2xl p-4 sm:p-6">
      <h2 className="text-3xl font-bold text-center mb-6">Editar Árbol Conmemorativo</h2>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md">
        {/* ... (campos del formulario idénticos a crear_arbol) ... */}
        <div className="mb-4">
          <label htmlFor="nombre" className="block text-gray-700 font-bold mb-2">Nombre del árbol:</label>
          <input type="text" id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div className="mb-4">
          <label htmlFor="modelo" className="block text-gray-700 font-bold mb-2">Modelo 3D:</label>
          <select id="modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} className="w-full px-3 py-2 border rounded-md">
            {modelosDisponibles.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <ModelViewer src={modeloURL} />
        {/* ... otros campos: nacimiento, fallecimiento, cancion ... */}

        <div className="mt-6">
          <h4 className="font-bold mb-2">Imágenes actuales:</h4>
          {imagenesActuales.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {imagenesActuales.map((url, index) => (
                <div key={index} className="relative">
                  <img src={url} alt="Imagen actual" className="w-full h-24 object-cover rounded-md"/>
                  <button type="button" onClick={() => eliminarImagen(url)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold">
                    &times;
                  </button>
                </div>
              ))}
            </div>
          ) : <p>No hay imágenes.</p>}
        </div>

        <div className="my-4">
          <label htmlFor="imagenes" className="block text-gray-700 font-bold mb-2">Agregar nuevas imágenes:</label>
          <input type="file" id="imagenes" accept="image/*" multiple onChange={(e) => setImagenesNuevas(Array.from(e.target.files))} className="w-full px-3 py-2 border rounded-md" />
        </div>

        <button type="submit" className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600">
          Guardar Cambios
        </button>
        {estado && <p className="text-center mt-4">{estado}</p>}
      </form>
    </div>
  );
};

export default EditarArbol;