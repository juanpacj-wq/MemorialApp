"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "../../lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { collection, query, where, orderBy, getDocs, doc, deleteDoc } from "firebase/firestore"
import { getStorage, ref, deleteObject } from "firebase/storage"
import QRCode from "qrcode"
import ModelViewer from "../../components/ModelViewer"
import Header from "../../components/Header"

const Galeria = () => {
  const [user, setUser] = useState(null)
  const [arboles, setArboles] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [showQR, setShowQR] = useState({})
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        const q = query(collection(db, "arboles"), where("uid", "==", currentUser.uid), orderBy("creado", "desc"))
        try {
          const snapshot = await getDocs(q)
          const listaArboles = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          setArboles(listaArboles)
        } catch (error) {
          console.error("Error al cargar galería:", error)
          alert("Error al cargar la galería.")
        }
      } else {
        router.push("/")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const eliminarArbol = async (docId, imagenes) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este árbol? Esta acción no se puede deshacer.")) return

    setDeletingId(docId)
    try {
      const storage = getStorage()
      if (Array.isArray(imagenes)) {
        for (const url of imagenes) {
          try {
            const path = decodeURIComponent(new URL(url).pathname.split("/o/")[1].split("?")[0])
            const imgRef = ref(storage, path)
            await deleteObject(imgRef)
          } catch (err) {
            console.warn("No se pudo eliminar la imagen:", url, err)
          }
        }
      }
      await deleteDoc(doc(db, "arboles", docId))
      setArboles(arboles.filter((arbol) => arbol.id !== docId))
    } catch (error) {
      console.error("Error al eliminar el árbol:", error)
    } finally {
      setDeletingId(null)
    }
  }

  const generarQR = (id) => {
    const url = `${window.location.origin}/ver-arbol/${id}`
    const contenedor = document.getElementById(`qr-${id}`)
    contenedor.innerHTML = ""
    QRCode.toCanvas(document.createElement("canvas"), url, { width: 128 }, (error, canvas) => {
      if (error) console.error(error)
      else {
        contenedor.appendChild(canvas)
        setShowQR((prev) => ({ ...prev, [id]: true }))
      }
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando tu galería...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4 text-balance">Tus Árboles Conmemorativos</h2>
          <p className="text-muted-foreground mb-8 text-balance max-w-2xl mx-auto">
            Cada árbol es un tributo especial a la memoria de tus seres queridos. Crea, personaliza y comparte estos
            espacios de recuerdo.
          </p>

          <button
            onClick={() => router.push("/crear-arbol")}
            className="memorial-button-primary inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear nuevo árbol
          </button>
        </div>

        {arboles.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Aún no has creado ningún árbol</h3>
            <p className="text-muted-foreground mb-6 text-balance max-w-md mx-auto">
              Comienza creando tu primer árbol conmemorativo para honrar la memoria de un ser querido.
            </p>
            <button
              onClick={() => router.push("/crear-arbol")}
              className="memorial-button-secondary inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear mi primer árbol
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {arboles.map((arbol) => {
              const modeloURL = `https://firebasestorage.googleapis.com/v0/b/memorialapp-b1ccf.firebasestorage.app/o/modelos_3d%2F${encodeURIComponent(arbol.modelo)}?alt=media`

              return (
                <div key={arbol.id} className="memorial-card group">
                  <div className="relative overflow-hidden rounded-lg mb-4">
                    <ModelViewer src={modeloURL} />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-2 text-balance">{arbol.nombre}</h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>Nacimiento: {arbol.nacimiento || "No especificado"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                            />
                          </svg>
                          <span>Fallecimiento: {arbol.fallecimiento || "No especificado"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => router.push(`/ver-arbol/${arbol.id}`)}
                        className="memorial-button-primary text-sm py-2 px-3 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        Ver en AR
                      </button>

                      <button
                        onClick={() => generarQR(arbol.id)}
                        className="memorial-button-secondary text-sm py-2 px-3 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1z"
                          />
                        </svg>
                        QR Code
                      </button>

                      <button
                        onClick={() => router.push(`/editar-arbol/${arbol.id}`)}
                        className="bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground text-sm py-2 px-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Editar
                      </button>

                      <button
                        onClick={() => eliminarArbol(arbol.id, arbol.imagenes)}
                        disabled={deletingId === arbol.id}
                        className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground text-sm py-2 px-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === arbol.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                        Eliminar
                      </button>
                    </div>

                    <div
                      id={`qr-${arbol.id}`}
                      className={`flex justify-center transition-all duration-200 ${showQR[arbol.id] ? "mt-4" : ""}`}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default Galeria
