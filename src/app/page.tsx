"use client"

import React, { useState } from "react"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth"
import { auth, googleProvider } from "../lib/firebase"
import { useRouter } from "next/navigation"

interface AuthFormData {
  email: string
  password: string
}

interface AuthError {
  message: string
}

export default function AuthPage() {
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [isLogin, setIsLogin] = useState<boolean>(true)
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [resetEmailSent, setResetEmailSent] = useState<boolean>(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
      router.push("/galeria")
    } catch (err) {
      const authError = err as AuthError
      setError(authError.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async (): Promise<void> => {
    setLoading(true)
    setError("")

    try {
      await signInWithPopup(auth, googleProvider)
      router.push("/galeria")
    } catch (err) {
      const authError = err as AuthError
      setError(authError.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (): Promise<void> => {
    if (!email) {
      setError("Por favor ingresa tu correo electrónico")
      return
    }

    try {
      await sendPasswordResetEmail(auth, email)
      setResetEmailSent(true)
      setError("")
    } catch (err) {
      const authError = err as AuthError
      setError(authError.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center p-4">
      <div className="memorial-card w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Memorial App</h1>
          <p className="text-slate-600">Crea árboles conmemorativos para honrar a tus seres queridos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="memorial-input"
              placeholder="tu@correo.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="memorial-input"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="memorial-error">{error}</div>}

          {resetEmailSent && (
            <div className="memorial-success">Se ha enviado un correo para restablecer tu contraseña</div>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="memorial-btn-primary flex-1">
              {loading ? "Cargando..." : isLogin ? "Iniciar sesión" : "Crear cuenta"}
            </button>
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="memorial-btn-secondary flex-1">
              {isLogin ? "Crear cuenta" : "Iniciar sesión"}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="text-center text-sm text-slate-500 mb-4">o continúa con</div>
          <button onClick={handleGoogleSignIn} disabled={loading} className="memorial-btn-google w-full">
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? "Cargando..." : "Continuar con Google"}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={handlePasswordReset}
            className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>
    </div>
  )
}