import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

// Tu configuración de Firebase, idealmente guardada en variables de entorno
const firebaseConfig = {
  apiKey: "AIzaSyCU8P2Fd34ymLWBYWDlQfZuImyJh0gmASA",
  authDomain: "memorialapp-b1ccf.firebaseapp.com",
  projectId: "memorialapp-b1ccf",
  storageBucket: "memorialapp-b1ccf.appspot.com",
  messagingSenderId: "931250217735",
  appId: "1:931250217735:web:a010fff296af35e6a41ba2",
}

// Inicializar Firebase de forma segura (evita reinicializar en el lado del cliente)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

const googleProvider = new GoogleAuthProvider()

export { app, auth, db, storage, googleProvider }
