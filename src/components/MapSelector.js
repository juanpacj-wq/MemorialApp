"use client"

import { useEffect, useRef, useState } from "react"

const MapSelector = ({ onLocationSelect, onClose, initialLocation }) => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [selectedLocation, setSelectedLocation] = useState(initialLocation)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Cargar el script de Mapbox GL JS si no está cargado
    if (!window.mapboxgl) {
      const script = document.createElement('script')
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'
      script.async = true
      script.onload = () => {
        const link = document.createElement('link')
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css'
        link.rel = 'stylesheet'
        document.head.appendChild(link)
        
        // Esperar un poco para asegurar que los estilos se carguen
        setTimeout(() => initializeMap(), 100)
      }
      document.head.appendChild(script)
    } else {
      initializeMap()
    }

    return () => {
      // Limpiar el mapa cuando el componente se desmonta
      if (mapRef.current) {
        mapRef.current.remove()
      }
    }
  }, [])

  const initializeMap = () => {
    // Token público de Mapbox (deberías usar tu propio token en producción)
    window.mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'

    const defaultCenter = initialLocation || { lng: -74.0060, lat: 40.7128 } // NYC por defecto

    const map = new window.mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [defaultCenter.lng, defaultCenter.lat],
      zoom: initialLocation ? 15 : 12
    })

    mapRef.current = map

    // Añadir controles de navegación
    map.addControl(new window.mapboxgl.NavigationControl())

    // Añadir control de geolocalización
    const geolocateControl = new window.mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: false,
      showUserLocation: false
    })
    
    map.addControl(geolocateControl)

    // Crear marcador personalizado
    const el = document.createElement('div')
    el.className = 'custom-marker'
    el.style.width = '40px'
    el.style.height = '40px'
    el.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'%2310b981\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z\'/%3E%3C/svg%3E")'
    el.style.backgroundSize = 'cover'
    el.style.cursor = 'move'

    // Añadir marcador inicial si hay ubicación
    if (initialLocation) {
      markerRef.current = new window.mapboxgl.Marker(el, { draggable: true })
        .setLngLat([initialLocation.lng, initialLocation.lat])
        .addTo(map)

      markerRef.current.on('dragend', onDragEnd)
      setSelectedLocation(initialLocation)
    }

    // Evento de click en el mapa
    map.on('click', (e) => {
      const { lng, lat } = e.lngLat

      // Si ya hay un marcador, actualizarlo
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat])
      } else {
        // Crear nuevo marcador
        markerRef.current = new window.mapboxgl.Marker(el, { draggable: true })
          .setLngLat([lng, lat])
          .addTo(map)

        markerRef.current.on('dragend', onDragEnd)
      }

      // Obtener dirección mediante geocoding inverso
      fetchAddress(lng, lat)
    })

    map.on('load', () => {
      setIsLoading(false)
    })
  }

  const onDragEnd = () => {
    if (markerRef.current) {
      const lngLat = markerRef.current.getLngLat()
      fetchAddress(lngLat.lng, lngLat.lat)
    }
  }

  const fetchAddress = async (lng, lat) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${window.mapboxgl.accessToken}`
      )
      const data = await response.json()
      
      let direccion = "Ubicación seleccionada"
      if (data.features && data.features.length > 0) {
        direccion = data.features[0].place_name
      }

      const newLocation = {
        lat,
        lng,
        direccion
      }
      
      setSelectedLocation(newLocation)
    } catch (error) {
      console.error("Error obteniendo dirección:", error)
      setSelectedLocation({
        lat,
        lng,
        direccion: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      })
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !mapRef.current) return

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${window.mapboxgl.accessToken}`
      )
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center
        
        // Mover el mapa a la ubicación
        mapRef.current.flyTo({
          center: [lng, lat],
          zoom: 15
        })

        // Actualizar o crear marcador
        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat])
        } else {
          const el = document.createElement('div')
          el.className = 'custom-marker'
          el.style.width = '40px'
          el.style.height = '40px'
          el.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'%2310b981\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z\'/%3E%3C/svg%3E")'
          el.style.backgroundSize = 'cover'
          el.style.cursor = 'move'

          markerRef.current = new window.mapboxgl.Marker(el, { draggable: true })
            .setLngLat([lng, lat])
            .addTo(mapRef.current)

          markerRef.current.on('dragend', onDragEnd)
        }

        setSelectedLocation({
          lat,
          lng,
          direccion: data.features[0].place_name
        })
      } else {
        alert("No se encontró la ubicación buscada")
      }
    } catch (error) {
      console.error("Error buscando ubicación:", error)
      alert("Error al buscar la ubicación")
    }
  }

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground">Seleccionar ubicación del árbol</h3>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Barra de búsqueda */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Buscar dirección, ciudad o lugar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 memorial-input"
            />
            <button
              onClick={handleSearch}
              className="memorial-button-secondary px-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Instrucciones */}
          <p className="text-xs text-muted-foreground mt-3">
            Haz clic en el mapa para seleccionar una ubicación o busca una dirección específica. 
            Puedes arrastrar el marcador para ajustar la posición.
          </p>
        </div>

        {/* Mapa */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 z-10 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Cargando mapa...</p>
              </div>
            </div>
          )}
          <div 
            ref={mapContainerRef}
            className="w-full h-full"
            style={{ minHeight: '400px' }}
          />
        </div>

        {/* Footer con información y botones */}
        <div className="p-6 border-t border-border">
          {selectedLocation && (
            <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
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
                    {selectedLocation.direccion}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Coordenadas: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-muted text-muted-foreground px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:bg-muted/80 hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedLocation}
              className="flex-1 memorial-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar ubicación
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapSelector