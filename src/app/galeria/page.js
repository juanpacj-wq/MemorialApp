"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, getDocs, doc, deleteDoc } from "firebase/firestore";
import { getStorage, ref, deleteObject } from "firebase/storage";
import QRCode from 'qrcode';
import ModelViewer from '../../components/ModelViewer'; // Importamos el nuevo componente

const Galeria = () => {
  const [user, setUser] = useState(null);
  const [arboles, setArboles] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const q = query(
          collection(db, "arboles"),
          where("uid", "==", currentUser.uid),
          orderBy("creado", "desc")
        );
        try {
          const snapshot = await getDocs(q);
          const listaArboles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setArboles(listaArboles);
        } catch (error) {
          console.error("Error al cargar galería:", error);
          alert("Error al cargar la galería.");
        }
      } else {
        router.push('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const eliminarArbol = async (docId, imagenes) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este árbol? Esta acción no se puede deshacer.")) return;
    try {
      const storage = getStorage();
      if (Array.isArray(imagenes)) {
        for (const url of imagenes) {
          try {
            const path = decodeURIComponent(new URL(url).pathname.split('/o/')[1].split('?')[0]);
            const imgRef = ref(storage, path);
            await deleteObject(imgRef);
          } catch (err) {
            console.warn("No se pudo eliminar la imagen:", url, err);
          }
        }
      }
      await deleteDoc(doc(db, "arboles", docId));
      setArboles(arboles.filter(arbol => arbol.id !== docId));
      alert("Árbol eliminado correctamente.");
    } catch (error) {
      alert("Error al eliminar el árbol.");
      console.error(error);
    }
  };

  const generarQR = (id) => {
    const url = `${window.location.origin}/ver_arbol/${id}`;
    const contenedor = document.getElementById(`qr-${id}`);
    contenedor.innerHTML = "";
    QRCode.toCanvas(document.createElement('canvas'), url, { width: 128 }, function (error, canvas) {
      if (error) console.error(error);
      else contenedor.appendChild(canvas);
    });
  };

  if (loading) {
    return <p className="text-center mt-10">Cargando...</p>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <h2 className="text-3xl font-bold text-center mb-6">🌿 Galería de Árboles</h2>
      <button
        onClick={() => router.push('/crear-arbol')}
        className="block mx-auto mb-8 px-6 py-3 bg-green-500 text-white font-bold rounded-lg shadow-md hover:bg-green-600 transition-colors"
      >
        ➕ Crear nuevo árbol
      </button>

      {arboles.length === 0 ? (
        <p className="text-center text-gray-500">No has creado ningún árbol todavía.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {arboles.map((arbol) => {
            // Construimos la URL del modelo 3D
            const modeloURL = `https://firebasestorage.googleapis.com/v0/b/memorialapp-b1ccf.firebasestorage.app/o/modelos_3d%2F${encodeURIComponent(arbol.modelo)}?alt=media`;
            
            return (
              <div key={arbol.id} className="arbol-card bg-white rounded-xl shadow-lg p-5">
                {/* Usamos el componente ModelViewer */}
                <ModelViewer src={modeloURL} />
                
                <h3 className="text-xl font-bold">{arbol.nombre}</h3>
                <p className="text-sm text-gray-500">🎂 Nacimiento: {arbol.nacimiento || "-"}</p>
                <p className="text-sm text-gray-500">🕯️ Fallecimiento: {arbol.fallecimiento || "-"}</p>
                
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                        onClick={() => router.push(`/ver-arbol/${arbol.id}`)}
                        className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700 text-sm"
                        >
                        🌱 Plantar árbol
                        </button>
<button onClick={() => generarQR(arbol.id)} className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 text-sm">📱 Generar QR</button>
                  <button onClick={() => router.push(`/editar-arbol/${arbol.id}`)} className="bg-yellow-500 text-black p-2 rounded-md hover:bg-yellow-600 text-sm">✏️ Editar</button>
                  <button onClick={() => eliminarArbol(arbol.id, arbol.imagenes)} className="bg-red-600 text-white p-2 rounded-md hover:bg-red-700 text-sm">🗑️ Eliminar</button>
                </div>
                <div id={`qr-${arbol.id}`} className="mt-4 flex justify-center"></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Galeria;