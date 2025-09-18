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
      setError("Por favor ingresa tu correo electrónico para restablecer la contraseña.")
      return
    }
    setLoading(true)
    setError("")
    try {
      await sendPasswordResetEmail(auth, email)
      setResetEmailSent(true)
    } catch (err) {
      const authError = err as AuthError
      setError(authError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">
              {isLogin ? "Bienvenido de nuevo" : "Crea una cuenta"}
            </h1>
            <p className="text-balance text-muted-foreground">
              {isLogin
                ? "Ingresa tus datos para acceder a tu galería."
                : "Completa los campos para empezar a crear homenajes."}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="memorial-input"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <label htmlFor="password">Contraseña</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="ml-auto inline-block text-sm underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="memorial-input"
              />
            </div>
            {error && <div className="memorial-error text-center">{error}</div>}
            {resetEmailSent && (
              <div className="memorial-success text-center">
                Correo de recuperación enviado. ¡Revisa tu bandeja de entrada!
              </div>
            )}
            <button type="submit" className="memorial-btn-primary w-full" disabled={loading}>
              {loading ? "Cargando..." : isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
            </button>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="memorial-btn-google w-full"
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
              {isLogin ? "Inicia sesión con Google" : "Regístrate con Google"}
            </button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isLogin ? "¿No tienes una cuenta?" : "¿Ya tienes una cuenta?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="underline">
              {isLogin ? "Regístrate" : "Inicia Sesión"}
            </button>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        <img
          src="https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=2070&auto=format&fit=crop"
          alt="Image"
          width="1920"
          height="1080"
          className="h-full w-full object-cover dark:brightness-[0.4]"
        />
      </div>
    </div>
  )
}