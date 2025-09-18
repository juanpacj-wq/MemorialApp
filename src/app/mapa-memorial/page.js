"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "../../lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { collection, query, where, getDocs } from "firebase/firestore"
import Header from "../../components/Header"
import Breadcrumb from "../../components/Breadcrumb"
import { MAPBOX_TOKEN } from "../../lib/mapbox-config";

const MapaMemorial = () => {
  const [user, setUser] = useState(null)
  const [arboles, setArboles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedArbol, setSelectedArbol] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [searchRadius, setSearchRadius] = useState(10) // km
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      
      // Cargar árboles públicos
      try {
        const q = query(collection(db, "arboles"), where("esPublico", "==", true))
        const snapshot = await getDocs(q)
        const arbolesPublicos = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })).filter(arbol => arbol.ubicacion) // Solo árboles con ubicación
        
        setArboles(arbolesPublicos)
      } catch (error) {
        console.error("Error al cargar árboles públicos:", error)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    // Obtener ubicación del usuario
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.log("No se pudo obtener la ubicación:", error)
          // Usar ubicación por defecto (puedes cambiar esto a tu país/ciudad)
          setUserLocation({
            lat: 40.7128,
            lng: -74.0060
          })
        }
      )
    }
  }, [])

  useEffect(() => {
    // Inicializar mapa cuando tengamos ubicación
    if (!loading && userLocation && mapContainerRef.current && !mapRef.current) {
      initializeMap()
    }
  }, [loading, userLocation])

  const initializeMap = () => {
    // Cargar script de Mapbox GL JS
    if (!window.mapboxgl) {
      const script = document.createElement('script')
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'
      script.async = true
      script.onload = () => {
        const link = document.createElement('link')
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css'
        link.rel = 'stylesheet'
        document.head.appendChild(link)
        
        setTimeout(() => createMap(), 100)
      }
      document.head.appendChild(script)
    } else {
      createMap()
    }
  }

  const createMap = () => {
    // Token público de Mapbox (deberías usar tu propio token en producción)
    window.mapboxgl.accessToken = MAPBOX_TOKEN;
    
    const map = new window.mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [userLocation.lng, userLocation.lat],
      zoom: 12
    })

    mapRef.current = map

    // Añadir control de navegación
    map.addControl(new window.mapboxgl.NavigationControl())

    // Añadir marcador de ubicación del usuario
    new window.mapboxgl.Marker({ color: '#3B82F6' })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(new window.mapboxgl.Popup().setHTML('<p class="font-medium">Tu ubicación</p>'))
      .addTo(map)

    // Añadir marcadores para cada árbol público
    arboles.forEach(arbol => {
      if (arbol.ubicacion) {
        const el = document.createElement('div')
        el.className = 'tree-marker'
        el.style.width = '30px'
        el.style.height = '30px'
        el.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'%2310b981\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z\'/%3E%3C/svg%3E")'
        el.style.backgroundSize = 'cover'
        el.style.cursor = 'pointer'

        const marker = new window.mapboxgl.Marker(el)
          .setLngLat([arbol.ubicacion.lng, arbol.ubicacion.lat])
          .addTo(map)

        // Popup con información del árbol
        const popupContent = `
          <div class="p-2 max-w-xs">
            <h3 class="font-bold text-sm mb-1">${arbol.nombre}</h3>
            <p class="text-xs text-gray-600 mb-2">Por ${arbol.usuarioNombre || 'Usuario'}</p>
            ${arbol.nacimiento ? `<p class="text-xs">Nacimiento: ${arbol.nacimiento}</p>` : ''}
            ${arbol.fallecimiento ? `<p class="text-xs">Fallecimiento: ${arbol.fallecimiento}</p>` : ''}
            <button 
              onclick="window.location.href='/ver-arbol/${arbol.id}'"
              class="mt-2 text-xs bg-emerald-500 text-white px-2 py-1 rounded hover:bg-emerald-600"
            >
              Ver en AR
            </button>
          </div>
        `

        const popup = new window.mapboxgl.Popup({ offset: 25 })
          .setHTML(popupContent)

        marker.setPopup(popup)

        el.addEventListener('click', () => {
          setSelectedArbol(arbol)
        })

        markersRef.current.push(marker)
      }
    })
  }

  const buscarCercanos = () => {
    if (!userLocation || !mapRef.current) return

    // Filtrar árboles dentro del radio
    const arbolesCercanos = arboles.filter(arbol => {
      if (!arbol.ubicacion) return false
      const distancia = calcularDistancia(
        userLocation.lat,
        userLocation.lng,
        arbol.ubicacion.lat,
        arbol.ubicacion.lng
      )
      return distancia <= searchRadius
    })

    // Actualizar vista del mapa
    if (arbolesCercanos.length > 0) {
      const bounds = new window.mapboxgl.LngLatBounds()
      bounds.extend([userLocation.lng, userLocation.lat])
      arbolesCercanos.forEach(arbol => {
        bounds.extend([arbol.ubicacion.lng, arbol.ubicacion.lat])
      })
      mapRef.current.fitBounds(bounds, { padding: 50 })
    }

    // Resaltar marcadores cercanos
    markersRef.current.forEach(marker => {
      const lngLat = marker.getLngLat()
      const distancia = calcularDistancia(
        userLocation.lat,
        userLocation.lng,
        lngLat.lat,
        lngLat.lng
      )
      if (distancia <= searchRadius) {
        marker.getElement().style.opacity = '1'
      } else {
        marker.getElement().style.opacity = '0.3'
      }
    })
  }

  // Función para calcular distancia entre dos puntos (Haversine)
  const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando mapa memorial...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <main className="container mx-auto px-4 py-8">
        <Breadcrumb />

        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-4">Mapa Memorial</h2>
          <p className="text-muted-foreground mb-6">
            Explora los árboles conmemorativos plantados alrededor del mundo. 
            Cada árbol representa un tributo especial a la memoria de un ser querido.
          </p>

          {/* Controles del mapa */}
          <div className="memorial-card mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Radio de búsqueda
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-12">{searchRadius}km</span>
                </div>
              </div>
              
              <button
                onClick={buscarCercanos}
                className="memorial-button-primary text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Buscar cercanos
              </button>

              {!user && (
                <button
                  onClick={() => router.push('/')}
                  className="memorial-button-secondary text-sm"
                >
                  Iniciar sesión para plantar
                </button>
              )}

              {user && (
                <button
                  onClick={() => router.push('/crear-arbol')}
                  className="memorial-button-secondary text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Plantar árbol
                </button>
              )}
            </div>

            <div className="mt-4 flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-muted-foreground">Tu ubicación</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-muted-foreground">Árboles públicos ({arboles.length})</span>
              </div>
            </div>
          </div>

          {/* Contenedor del mapa */}
          <div className="memorial-card p-0 overflow-hidden">
            <div 
              ref={mapContainerRef}
              className="w-full h-[600px] rounded-xl"
              style={{ minHeight: '400px' }}
            />
          </div>

          {/* Panel de información del árbol seleccionado */}
          {selectedArbol && (
            <div className="memorial-card mt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-2">{selectedArbol.nombre}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Plantado por {selectedArbol.usuarioNombre || 'Usuario'}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    {selectedArbol.nacimiento && (
                      <div>
                        <span className="text-muted-foreground">Nacimiento:</span>
                        <p className="font-medium">{selectedArbol.nacimiento}</p>
                      </div>
                    )}
                    {selectedArbol.fallecimiento && (
                      <div>
                        <span className="text-muted-foreground">Fallecimiento:</span>
                        <p className="font-medium">{selectedArbol.fallecimiento}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/ver-arbol/${selectedArbol.id}`)}
                      className="memorial-button-primary text-sm"
                    >
                      Ver en AR
                    </button>
                    <button
                      onClick={() => {
                        if (mapRef.current) {
                          mapRef.current.flyTo({
                            center: [selectedArbol.ubicacion.lng, selectedArbol.ubicacion.lat],
                            zoom: 15
                          })
                        }
                      }}
                      className="memorial-button-secondary text-sm"
                    >
                      Centrar en mapa
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedArbol(null)}
                  className="text-muted-foreground hover:text-foreground ml-4"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Lista de árboles cercanos */}
          {arboles.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-bold text-foreground mb-4">
                Árboles Conmemorativos Públicos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {arboles.slice(0, 6).map(arbol => (
                  <div key={arbol.id} className="memorial-card">
                    <h4 className="font-bold text-foreground mb-2">{arbol.nombre}</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Por {arbol.usuarioNombre || 'Usuario'}
                    </p>
                    
                    {arbol.ubicacion?.direccion && (
                      <p className="text-xs text-muted-foreground mb-3 flex items-start gap-1">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{arbol.ubicacion.direccion}</span>
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedArbol(arbol)
                          if (mapRef.current) {
                            mapRef.current.flyTo({
                              center: [arbol.ubicacion.lng, arbol.ubicacion.lat],
                              zoom: 15
                            })
                          }
                        }}
                        className="flex-1 memorial-button-secondary text-xs py-1.5"
                      >
                        Ver en mapa
                      </button>
                      <button
                        onClick={() => router.push(`/ver-arbol/${arbol.id}`)}
                        className="flex-1 memorial-button-primary text-xs py-1.5"
                      >
                        Ver AR
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default MapaMemorial