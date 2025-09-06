"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const VerArbolAR = () => {
  const [estado, setEstado] = useState("Verificando autenticación...");
  const router = useRouter();
  const params = useParams();
  const { id: arbolId } = params;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setEstado("Cargando modelo...");
        if (!arbolId) {
          setEstado("ID de árbol no encontrado.");
          return;
        }

        try {
          const docRef = doc(db, "arboles", arbolId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            const modelo = data.modelo;

            // Los tokens de acceso parecen ser necesarios para estas URLs de Firebase Storage
            // Estos son los mismos que estaban en el archivo original
            const tokens = {
              "ficus_bonsai.glb": "95008e57-0fb6-464f-a3b6-fa033defd4ed",
              "flowerpot.glb": "0f3f5742-f37b-4d0a-b993-96f10f7b9f93",
              "jabami_anime_tree_v2.glb": "d4e45f36-4e65-4b84-8bdf-5f739d123cbf",
              "low_poly_purple_flowers.glb": "e7eeb43f-1e00-4b97-a038-337be1fefb76",
              "tree_elm.glb": "60f1f680-3e57-402b-b91d-c7dabc8d4760"
            };

            const token = tokens[modelo];
            if (!token) {
              setEstado("No se encontró un token para este modelo 3D.");
              return;
            }
            
            setEstado("Iniciando experiencia AR...");

            const url = `https://firebasestorage.googleapis.com/v0/b/memorialapp-b1ccf.firebasestorage.app/o/modelos_3d%2F${encodeURIComponent(modelo)}?alt=media&token=${token}`;
            const fallbackUrl = `https://memorial-app-snowy.vercel.app/galeria`; // URL de respaldo
            
            // Construimos el intent para Android
            const intentUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(url)}&mode=ar_preferred#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end;`;

            // Para iOS, se usa un enlace con rel="ar"
            // Por simplicidad, aquí solo hacemos la redirección directa que funciona para Android
            window.location.href = intentUrl;

          } else {
            setEstado("Árbol no encontrado.");
          }
        } catch (error) {
          console.error("Error al cargar el árbol:", error);
          setEstado("Error al cargar el árbol.");
        }
      } else {
        setEstado("Redirigiendo al inicio de sesión...");
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router, arbolId]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-xl font-semibold">{estado}</p>
        <p className="mt-2 text-gray-500">Si no eres redirigido, asegúrate de tener los servicios de Google Play para RA instalados.</p>
      </div>
    </div>
  );
};

export default VerArbolAR;