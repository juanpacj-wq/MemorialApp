// Configuración de Mapbox GL JS
// IMPORTANTE: En producción, debes obtener tu propio token de Mapbox

// Token público de Mapbox para desarrollo
// Registrate en https://www.mapbox.com/ para obtener tu propio token gratuito
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

// Estilos de mapa disponibles
export const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  satelliteStreets: 'mapbox://styles/mapbox/satellite-streets-v12'
}

// Configuración por defecto del mapa
export const DEFAULT_MAP_CONFIG = {
  style: MAP_STYLES.outdoors,
  zoom: 12,
  center: [-74.0060, 40.7128], // Nueva York por defecto
  pitch: 0,
  bearing: 0,
  interactive: true,
  attributionControl: true
}

// Colores para marcadores
export const MARKER_COLORS = {
  user: '#3B82F6', // Azul para ubicación del usuario
  tree: '#10b981', // Verde esmeralda para árboles
  selected: '#f59e0b', // Naranja para árbol seleccionado
  private: '#6b7280' // Gris para árboles privados
}

// Función para cargar Mapbox GL JS dinámicamente
export const loadMapboxGL = () => {
  return new Promise((resolve, reject) => {
    // Si ya está cargado, resolver inmediatamente
    if (window.mapboxgl) {
      resolve(window.mapboxgl)
      return
    }

    // Cargar el script
    const script = document.createElement('script')
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'
    script.async = true
    
    script.onload = () => {
      // Cargar también los estilos CSS
      const link = document.createElement('link')
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css'
      link.rel = 'stylesheet'
      document.head.appendChild(link)
      
      // Configurar el token
      if (window.mapboxgl) {
        window.mapboxgl.accessToken = MAPBOX_TOKEN
        resolve(window.mapboxgl)
      } else {
        reject(new Error('Mapbox GL JS no se pudo cargar correctamente'))
      }
    }
    
    script.onerror = () => {
      reject(new Error('Error al cargar Mapbox GL JS'))
    }
    
    document.head.appendChild(script)
  })
}

// Función para geocodificación (obtener dirección de coordenadas)
export const reverseGeocode = async (lng, lat) => {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`
    )
    const data = await response.json()
    
    if (data.features && data.features.length > 0) {
      return {
        direccion: data.features[0].place_name,
        lugar: data.features[0].text,
        contexto: data.features[0].context
      }
    }
    
    return {
      direccion: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      lugar: 'Ubicación desconocida',
      contexto: []
    }
  } catch (error) {
    console.error('Error en geocodificación inversa:', error)
    return {
      direccion: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      lugar: 'Error al obtener dirección',
      contexto: []
    }
  }
}

// Función para búsqueda de lugares
export const searchPlace = async (query) => {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}`
    )
    const data = await response.json()
    
    if (data.features && data.features.length > 0) {
      return data.features.map(feature => ({
        id: feature.id,
        nombre: feature.text,
        direccion: feature.place_name,
        coordenadas: {
          lng: feature.center[0],
          lat: feature.center[1]
        },
        bbox: feature.bbox
      }))
    }
    
    return []
  } catch (error) {
    console.error('Error buscando lugares:', error)
    return []
  }
}

// Función para calcular distancia entre dos puntos (Haversine formula)
export const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Radio de la Tierra en kilómetros
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distancia = R * c
  
  return distancia // Retorna la distancia en kilómetros
}

// Función auxiliar para convertir grados a radianes
const toRad = (grados) => {
  return grados * (Math.PI / 180)
}

// Función para crear un marcador HTML personalizado
export const crearMarcadorHTML = (tipo = 'tree', color = null) => {
  const el = document.createElement('div')
  el.className = 'memorial-map-marker'
  
  const markerColor = color || MARKER_COLORS[tipo] || MARKER_COLORS.tree
  
  // Estilos del marcador
  el.style.width = '35px'
  el.style.height = '35px'
  el.style.borderRadius = '50%'
  el.style.backgroundColor = markerColor
  el.style.border = '3px solid white'
  el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)'
  el.style.cursor = 'pointer'
  el.style.display = 'flex'
  el.style.alignItems = 'center'
  el.style.justifyContent = 'center'
  el.style.transition = 'transform 0.2s'
  
  // Icono interno
  const icon = document.createElement('div')
  icon.style.width = '20px'
  icon.style.height = '20px'
  
  // SVG según el tipo
  if (tipo === 'user') {
    icon.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    `
  } else if (tipo === 'tree') {
    icon.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M12 2C9.24 2 7 4.24 7 7c0 2.85 2.92 7.21 5 9.88 2.08-2.67 5-7.03 5-9.88 0-2.76-2.24-5-5-5zm0 7.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `
  }
  
  el.appendChild(icon)
  
  // Efecto hover
  el.onmouseenter = () => {
    el.style.transform = 'scale(1.1)'
  }
  el.onmouseleave = () => {
    el.style.transform = 'scale(1)'
  }
  
  return el
}

// Función para generar un geohash simple (para búsquedas geográficas en Firestore)
export const generarGeohash = (lat, lng, precision = 5) => {
  // Esta es una implementación simplificada
  // En producción, podrías usar una librería como 'ngeohash'
  const latStr = lat.toFixed(precision)
  const lngStr = lng.toFixed(precision)
  return `${latStr},${lngStr}`
}

// Función para obtener bounds (límites) de un conjunto de coordenadas
export const obtenerBounds = (coordenadas) => {
  if (!coordenadas || coordenadas.length === 0) return null
  
  let minLat = coordenadas[0].lat
  let maxLat = coordenadas[0].lat
  let minLng = coordenadas[0].lng
  let maxLng = coordenadas[0].lng
  
  coordenadas.forEach(coord => {
    minLat = Math.min(minLat, coord.lat)
    maxLat = Math.max(maxLat, coord.lat)
    minLng = Math.min(minLng, coord.lng)
    maxLng = Math.max(maxLng, coord.lng)
  })
  
  return [
    [minLng, minLat], // Southwest
    [maxLng, maxLat]  // Northeast
  ]
}

// Configuración de clusters para múltiples marcadores
export const CLUSTER_CONFIG = {
  radius: 50, // Radio del cluster en píxeles
  maxZoom: 14, // Zoom máximo para agrupar
  minPoints: 2 // Mínimo de puntos para formar un cluster
}

// Export default para facilitar la importación
export default {
  MAPBOX_TOKEN,
  MAP_STYLES,
  DEFAULT_MAP_CONFIG,
  MARKER_COLORS,
  loadMapboxGL,
  reverseGeocode,
  searchPlace,
  calcularDistancia,
  crearMarcadorHTML,
  generarGeohash,
  obtenerBounds,
  CLUSTER_CONFIG
}