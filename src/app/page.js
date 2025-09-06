"use client"; // Marcamos este componente como un Componente de Cliente

import { useState } from 'react';
import { auth, db } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from 'next/navigation';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const router = useRouter();

  const saveUserData = async (user) => {
    const userRef = doc(db, "usuarios", user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      creadoEn: serverTimestamp()
    }, { merge: true }); // Usamos merge por si el usuario ya existe
  };

  const handleRegister = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await saveUserData(userCredential.user);
      alert("Usuario registrado exitosamente");
      router.push('/galeria');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await saveUserData(userCredential.user);
      alert("Inicio de sesión exitoso");
      router.push('/galeria');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await saveUserData(result.user);
      alert("Inicio de sesión con Google exitoso");
      router.push('/galeria');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRecovery = async () => {
    if (!email) {
        alert("Por favor escribe tu correo antes de recuperar contraseña.");
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        alert("Se ha enviado un enlace de recuperación a tu correo.");
        setShowRecovery(false);
    } catch (error) {
        alert(error.message);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center mb-6">Memorial App</h1>
        
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo electrónico"
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <div className="grid grid-cols-1 gap-3">
          <button onClick={handleLogin} className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors">
            Iniciar sesión
          </button>
          <button onClick={handleRegister} className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition-colors">
            Registrarse
          </button>
          <button onClick={handleGoogleLogin} className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition-colors">
            Iniciar sesión con Google
          </button>
        </div>

        <div className="text-center mt-6">
          <span onClick={() => setShowRecovery(!showRecovery)} className="text-blue-500 hover:underline cursor-pointer">
            ¿Olvidaste tu contraseña?
          </span>
        </div>

        {showRecovery && (
          <div id="recovery-section" className="mt-6 border-t pt-4">
            <h4 className="font-bold text-center mb-3">Recuperar contraseña</h4>
            <p className="text-sm text-center mb-3">Se usará el correo que escribiste arriba.</p>
            <button onClick={handleRecovery} className="w-full bg-gray-700 text-white py-2 rounded-md hover:bg-gray-800 transition-colors">
              Enviar enlace de recuperación
            </button>
          </div>
        )}
      </div>
    </main>
  );
}