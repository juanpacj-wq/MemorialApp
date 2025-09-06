"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { auth, db, storage } from "../../../lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import ModelViewer from "../../../components/ModelViewer"
import Header from "../../../components/Header"
import Breadcrumb from "../../../components/Breadcrumb"

const EditarArbol = () => {
  const [user, setUser] = useState(null)
  const [arbol, setArbol] = useState(null)
  const [nombre, setNombre] = useState("")
  const [modelo, setModelo] = useState("")
  const [nacimiento, setNacimiento] = useState("")
  const [fallecimiento, setFallecimiento] = useState("")
  const [cancion, setCancion] = useState("")
  const [imagenesNuevas, setImagenesNuevas] = useState([])
  const [imagenesActuales, setImagenesActuales] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(true)
  const [deletingImage, setDeletingImage] = useState(null)

  const router = useRouter()
  const params = useParams()
  const { id: arbolId } = params

  const modelosDisponibles = [
    {
      value: "jabami_anime_tree_v2.glb",
      label: "Árbol estilo Anime",
      description: "Un árbol con estética japonesa moderna",
    },
    {
      value: "low_poly_purple_flowers.glb",
      label: "Árbol con flores púrpura",
      description: "Delicadas flores en tonos violeta",
    },
    { value: "tree_elm.glb", label: "Olmo", description: "Árbol clásico de gran elegancia" },
    { value: "ficus_bonsai.glb", label: "Ficus Bonsai", description: "Pequeño pero lleno de significado" },
    { value: "flowerpot.glb", label: "Maceta con flor", description: "Una planta en maceta decorativa" },
  ]

  const modeloURL = `https://firebasestorage.googleapis.com/v0/b/memorialapp-b1ccf.firebasestorage.app/o/modelos_3d%2F${encodeURIComponent(modelo)}?alt=media`

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/")
        return
      }
      setUser(currentUser)

      const fetchArbol = async () => {
        if (!arbolId) return
        const docRef = doc(db, "arboles", arbolId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          if (data.uid !== currentUser.uid) {
            setError("No tienes permiso para editar este árbol.")
            setTimeout(() => router.push("/galeria"), 2000)
            return
          }
          setArbol(data)
          setNombre(data.nombre || "")
          setModelo(data.modelo || "jabami_anime_tree_v2.glb")
          setNacimiento(data.nacimiento || "")
          setFallecimiento(data.fallecimiento || "")
          setCancion(data.cancion || "")
          setImagenesActuales(data.imagenes || [])
        } else {
          setError("Árbol no encontrado.")
          setTimeout(() => router.push("/galeria"), 2000)
        }
        setLoading(false)
      }

      fetchArbol()
    })
    return () => unsubscribe()
  }, [router, arbolId])

  const eliminarImagen = async (url) => {
    if (!confirm("¿Deseas eliminar esta imagen permanentemente?")) return

    setDeletingImage(url)
    try {
      // Borrar de Storage
      const path = decodeURIComponent(new URL(url).pathname.split("/o/")[1].split("?")[0])
      const imgRef = ref(storage, path)
      await deleteObject(imgRef)

      // Actualizar estado y Firestore
      const nuevasImagenes = imagenesActuales.filter((img) => img !== url)
      const docRef = doc(db, "arboles", arbolId)
      await updateDoc(docRef, { imagenes: nuevasImagenes })

      setImagenesActuales(nuevasImagenes)
    } catch (e) {
      setError("No se pudo eliminar esta imagen.")
      console.error(e)
    } finally {
      setDeletingImage(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")
    setSuccess("")

    try {
      // 1. Subir nuevas imágenes
      const urlsImagenesNuevas = []
      for (const imagen of imagenesNuevas) {
        const storageRef = ref(storage, `arboles/${user.uid}/${Date.now()}_${imagen.name}`)
        await uploadBytes(storageRef, imagen)
        const url = await getDownloadURL(storageRef)
        urlsImagenesNuevas.push(url)
      }

      // 2. Actualizar documento en Firestore
      const docRef = doc(db, "arboles", arbolId)
      await updateDoc(docRef, {
        nombre,
        modelo,
        nacimiento,
        fallecimiento,
        cancion,
        imagenes: [...imagenesActuales, ...urlsImagenesNuevas],
      })

      setSuccess("Cambios guardados correctamente. Redirigiendo...")
      setImagenesNuevas([])
      setTimeout(() => router.push("/galeria"), 2000)
    } catch (error) {
      setError("Error al guardar: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando datos del árbol...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <Breadcrumb />

        <div className="memorial-card">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-destructive flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-destructive text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-primary flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-primary text-sm">{success}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-foreground mb-2">
                  Nombre del árbol *
                </label>
                <input
                  type="text"
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  placeholder="Ej: En memoria de María García"
                  className="memorial-input w-full"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="modelo" className="block text-sm font-medium text-foreground mb-3">
                  Selecciona un modelo 3D *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {modelosDisponibles.map((opt) => (
                    <label key={opt.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="modelo"
                        value={opt.value}
                        checked={modelo === opt.value}
                        onChange={(e) => setModelo(e.target.value)}
                        className="sr-only"
                        disabled={isSubmitting}
                      />
                      <div
                        className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                          modelo === opt.value
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        <h4 className="font-medium text-foreground">{opt.label}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{opt.description}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-foreground mb-3">Vista previa del modelo</h4>
                  <ModelViewer src={modeloURL} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="nacimiento" className="block text-sm font-medium text-foreground mb-2">
                    Fecha de nacimiento
                  </label>
                  <input
                    type="date"
                    id="nacimiento"
                    value={nacimiento}
                    onChange={(e) => setNacimiento(e.target.value)}
                    className="memorial-input w-full"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="fallecimiento" className="block text-sm font-medium text-foreground mb-2">
                    Fecha de fallecimiento
                  </label>
                  <input
                    type="date"
                    id="fallecimiento"
                    value={fallecimiento}
                    onChange={(e) => setFallecimiento(e.target.value)}
                    className="memorial-input w-full"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cancion" className="block text-sm font-medium text-foreground mb-2">
                  Enlace de canción (YouTube)
                </label>
                <input
                  type="url"
                  id="cancion"
                  value={cancion}
                  onChange={(e) => setCancion(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="memorial-input w-full"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Imágenes actuales</h4>
                {imagenesActuales.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {imagenesActuales.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url || "/placeholder.svg"}
                          alt={`Imagen ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => eliminarImagen(url)}
                          disabled={deletingImage === url}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                        >
                          {deletingImage === url ? (
                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            "×"
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed border-border">
                    <svg
                      className="w-12 h-12 text-muted-foreground mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-muted-foreground text-sm">No hay imágenes guardadas</p>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="imagenes" className="block text-sm font-medium text-foreground mb-2">
                  Agregar nuevas imágenes
                </label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="imagenes"
                    accept="image/*"
                    multiple
                    onChange={(e) => setImagenesNuevas(Array.from(e.target.files))}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="imagenes" className="cursor-pointer">
                    <svg
                      className="w-12 h-12 text-muted-foreground mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-foreground font-medium">Seleccionar nuevas imágenes</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Arrastra archivos aquí o haz clic para seleccionar
                    </p>
                  </label>
                </div>
                {imagenesNuevas.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground">
                      {imagenesNuevas.length} nueva{imagenesNuevas.length !== 1 ? "s" : ""} imagen
                      {imagenesNuevas.length !== 1 ? "es" : ""} seleccionada{imagenesNuevas.length !== 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Array.from(imagenesNuevas).map((imagen, index) => (
                        <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {imagen.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-border">
              <button
                type="button"
                onClick={() => router.push("/galeria")}
                className="flex-1 bg-muted text-muted-foreground px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:bg-muted/80 hover:text-foreground"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !nombre.trim()}
                className="flex-1 memorial-button-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    Guardando cambios...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default EditarArbol
