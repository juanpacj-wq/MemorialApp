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
import MapSelector from "../../../components/MapSelector"

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

  // Nuevos estados para geolocalización y privacidad
  const [esPublico, setEsPublico] = useState(false)
  const [ubicacion, setUbicacion] = useState(null)
  const [mostrarMapa, setMostrarMapa] = useState(false)

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
          
          // Cargar nuevos campos
          setEsPublico(data.esPublico || false)
          if (data.ubicacion) {
            setUbicacion({
              lat: data.ubicacion.lat,
              lng: data.ubicacion.lng,
              direccion: data.ubicacion.direccion || ""
            })
          }
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

  const handleUbicacionActual = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUbicacion({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            direccion: "Mi ubicación actual"
          })
          setMostrarMapa(false)
        },
        (error) => {
          setError("No se pudo obtener tu ubicación actual")
          console.error(error)
        }
      )
    } else {
      setError("Tu navegador no soporta geolocalización")
    }
  }

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

  // Función simple para generar geohash
  const generarGeohash = (lat, lng) => {
    const precision = 5
    const latStr = lat.toFixed(precision)
    const lngStr = lng.toFixed(precision)
    return `${latStr},${lngStr}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (esPublico && !ubicacion) {
      setError("Para hacer el árbol público, debes seleccionar una ubicación.")
      return
    }

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

      // 2. Actualizar documento en Firestore con nuevos campos
      const docRef = doc(db, "arboles", arbolId)
      const datosActualizados = {
        nombre,
        modelo,
        nacimiento,
        fallecimiento,
        cancion,
        imagenes: [...imagenesActuales, ...urlsImagenesNuevas],
        // Nuevos campos
        esPublico,
        ubicacion: esPublico && ubicacion ? {
          lat: ubicacion.lat,
          lng: ubicacion.lng,
          direccion: ubicacion.direccion || "",
          geohash: generarGeohash(ubicacion.lat, ubicacion.lng)
        } : null,
        usuarioNombre: user.displayName || user.email?.split('@')[0] || 'Usuario Anónimo'
      }

      await updateDoc(docRef, datosActualizados)

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

              {/* Nueva sección de Privacidad y Ubicación */}
              <div className="space-y-4 p-6 bg-muted/30 rounded-lg">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Privacidad y Ubicación
                </h3>
                
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="esPublico"
                    checked={esPublico}
                    onChange={(e) => setEsPublico(e.target.checked)}
                    className="mt-1 w-4 h-4 text-primary border-border rounded focus:ring-primary"
                    disabled={isSubmitting}
                  />
                  <div className="flex-1">
                    <label htmlFor="esPublico" className="text-sm font-medium text-foreground cursor-pointer">
                      Hacer este árbol público
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Los árboles públicos aparecen en el mapa memorial y pueden ser visitados por cualquier persona
                    </p>
                  </div>
                </div>

                {esPublico && (
                  <div className="space-y-3 mt-4 pt-4 border-t border-border">
                    <label className="block text-sm font-medium text-foreground">
                      Ubicación del árbol *
                    </label>
                    
                    {ubicacion && (
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-primary mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">Ubicación seleccionada</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {ubicacion.direccion || `${ubicacion.lat.toFixed(4)}, ${ubicacion.lng.toFixed(4)}`}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setUbicacion(null)}
                            className="text-muted-foreground hover:text-destructive"
                            disabled={isSubmitting}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleUbicacionActual}
                        className="flex-1 memorial-button-secondary text-sm py-2"
                        disabled={isSubmitting}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Usar mi ubicación
                      </button>
                      <button
                        type="button"
                        onClick={() => setMostrarMapa(true)}
                        className="flex-1 memorial-button-secondary text-sm py-2"
                        disabled={isSubmitting}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        Elegir en el mapa
                      </button>
                    </div>

                    {mostrarMapa && (
                      <MapSelector 
                        onLocationSelect={(loc) => {
                          setUbicacion(loc)
                          setMostrarMapa(false)
                        }}
                        onClose={() => setMostrarMapa(false)}
                        initialLocation={ubicacion}
                      />
                    )}
                  </div>
                )}
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