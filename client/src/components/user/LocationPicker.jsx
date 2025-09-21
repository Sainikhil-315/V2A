// src/components/user/LocationPicker.jsx
import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { Search, MapPin, X, Navigation } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in react-leaflet
import L from 'leaflet'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const LocationPicker = ({ onLocationSelect, onClose, initialLocation = null }) => {
  const [position, setPosition] = useState(initialLocation || [17.6868, 83.2185]) // Default to Bhimavaram
  const [address, setAddress] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])

  // Component to handle map clicks
  function LocationMarker() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng
        setPosition([lat, lng])
        reverseGeocode(lat, lng)
      },
    })

    return position === null ? null : (
      <Marker position={position} />
    )
  }

  // Reverse geocode to get address from coordinates
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      )
      const data = await response.json()
      setAddress(data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`)
    } catch (error) {
      console.error('Reverse geocoding failed:', error)
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
    }
  }

  // Search for locations
  const searchLocation = async () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      )
      const data = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // Select search result
  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    setPosition([lat, lng])
    setAddress(result.display_name)
    setSearchResults([])
    setSearchQuery('')
  }

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setPosition([latitude, longitude])
        reverseGeocode(latitude, longitude)
      },
      (error) => {
        console.error('Error getting location:', error)
        alert('Unable to get your location')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    )
  }

  // Handle confirm location
  const handleConfirm = () => {
    if (!position) return
    
    onLocationSelect({
      lat: position[0],
      lng: position[1],
      address: address || `${position[0].toFixed(6)}, ${position[1].toFixed(6)}`
    })
  }

  // Initialize address for initial position
  useEffect(() => {
    if (position && !address) {
      reverseGeocode(position[0], position[1])
    }
  }, [position])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Select Location
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="mt-4 flex space-x-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
                  placeholder="Search for a location..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => selectSearchResult(result)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-sm">{result.display_name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={searchLocation}
                disabled={isSearching}
                className="btn btn-outline flex items-center"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </button>
              <button
                onClick={getCurrentLocation}
                className="btn btn-outline flex items-center"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Current
              </button>
            </div>
          </div>

          {/* Map */}
          <div className="bg-white px-6 py-4">
            <div style={{ height: '400px', width: '100%' }}>
              <MapContainer
                center={position}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <LocationMarker />
              </MapContainer>
            </div>
            
            {/* Selected Address */}
            {address && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Selected Location:</p>
                    <p className="text-sm text-gray-600">{address}</p>
                    {position && (
                      <p className="text-xs text-gray-500 mt-1">
                        Coordinates: {position[0].toFixed(6)}, {position[1].toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!position}
              className="btn btn-primary"
            >
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LocationPicker