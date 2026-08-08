'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, useMapEvents, Marker, Popup, ZoomControl, useMap } from 'react-leaflet'
import { Icon, latLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PredictionHistoryItem, PredictionResult } from '@/types'

export function getRiskCategory(prob: number) {
  if (prob >= 0.75) return { label: 'CRITICAL', color: '#E11D48', bg: 'rgba(225, 29, 72, 0.15)' }
  if (prob >= 0.50) return { label: 'HIGH', color: '#FF5A6E', bg: 'rgba(255, 90, 110, 0.15)' }
  if (prob >= 0.35) return { label: 'MODERATE', color: '#FFB547', bg: 'rgba(255, 181, 71, 0.15)' }
  return { label: 'LOW', color: '#27D980', bg: 'rgba(39, 217, 128, 0.15)' }
}

export function getRiskMarkerIcon(probability: number) {
  const cat = getRiskCategory(probability)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="12" fill="${cat.color}" fill-opacity="0.3">
        <animate attributeName="r" values="8;14;8" dur="2.5s" repeatCount="indefinite"/>
        <animate attributeName="fill-opacity" values="0.5;0.1;0.5" dur="2.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="16" cy="16" r="8" fill="${cat.color}" stroke="#07131E" stroke-width="2"/>
      <circle cx="16" cy="16" r="3" fill="#F5FAFC"/>
    </svg>
  `
  return new Icon({
    iconUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -14],
  })
}

const targetIcon = new Icon({
  iconUrl: `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
      <circle cx="18" cy="18" r="14" fill="#18C8FF" fill-opacity="0.35">
        <animate attributeName="r" values="8;16;8" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="fill-opacity" values="0.7;0.15;0.7" dur="1.8s" repeatCount="indefinite"/>
      </circle>
      <circle cx="18" cy="18" r="9" fill="#18C8FF" stroke="#07131E" stroke-width="2"/>
      <circle cx="18" cy="18" r="4" fill="#07131E"/>
    </svg>
  `)}`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
})

function MapBoundsController({
  predictions,
  selectedCoords,
}: {
  predictions: PredictionHistoryItem[]
  selectedCoords: { lat: number; lng: number } | null
}) {
  const map = useMap()
  const [initialFitted, setInitialFitted] = useState(false)

  // Fit initial viewport to observation markers if observations exist
  useEffect(() => {
    if (!initialFitted && predictions.length > 0) {
      if (predictions.length === 1) {
        map.flyTo([predictions[0].latitude, predictions[0].longitude], 7.5, { duration: 1.2 })
      } else {
        const bounds = latLngBounds(predictions.map((p) => [p.latitude, p.longitude]))
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 8, animate: true, duration: 1.2 })
      }
      setInitialFitted(true)
    }
  }, [predictions, initialFitted, map])

  // Fly to target when user clicks map or selects a coordinate
  useEffect(() => {
    if (selectedCoords) {
      map.flyTo([selectedCoords.lat, selectedCoords.lng], Math.max(map.getZoom(), 7.5), { duration: 1.2 })
    }
  }, [selectedCoords, map])

  return null
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

interface EcoMapProps {
  onMapClick: (lat: number, lng: number) => void
  selectedCoords: { lat: number; lng: number } | null
  regionName?: string
  sst?: number
  predictions?: PredictionHistoryItem[]
  prediction?: PredictionResult | null
  currentPrediction?: PredictionResult | null
  onSelectPrediction?: (pred: PredictionHistoryItem) => void
}

export default function EcoMap({
  onMapClick,
  selectedCoords,
  regionName,
  sst,
  predictions = [],
  prediction,
  currentPrediction,
  onSelectPrediction,
}: EcoMapProps) {
  const activePrediction = currentPrediction || prediction

  return (
    <div className="relative w-full h-full z-0 overflow-hidden">
      <MapContainer
        center={[0, 120]}
        zoom={3}
        style={{ width: '100%', height: '100%', background: '#07131E' }}
        zoomControl={false}
      >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="CartoDB"
      />
      <ZoomControl position="bottomright" />
      <ClickHandler onMapClick={onMapClick} />
      <MapBoundsController predictions={predictions} selectedCoords={selectedCoords} />

      {/* PERSISTED DATABASE PREDICTION MARKERS */}
      {predictions.map((p) => {
        const cat = getRiskCategory(p.probability)
        const icon = getRiskMarkerIcon(p.probability)

        return (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={icon}
            eventHandlers={{
              click: () => {
                if (onSelectPrediction) onSelectPrediction(p)
                onMapClick(p.latitude, p.longitude)
              },
            }}
          >
            <Popup autoPan={true}>
              <div style={{ fontFamily: 'Inter, sans-serif', color: '#F5FAFC', background: '#0C1C2A', padding: '8px', minWidth: '220px' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#8FA6B8', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Persisted Observation
                </span>
                <strong style={{ color: '#F5FAFC', fontSize: '13px', display: 'block', marginTop: '2px' }}>
                  {p.location_name || 'Ocean Telemetry Station'}
                </strong>

                <div style={{ fontSize: '11px', color: '#8FA6B8', fontFamily: 'monospace', margin: '4px 0' }}>
                  {p.latitude > 0 ? `${p.latitude.toFixed(2)}°N` : `${Math.abs(p.latitude).toFixed(2)}°S`},{' '}
                  {p.longitude > 0 ? `${p.longitude.toFixed(2)}°E` : `${Math.abs(p.longitude).toFixed(2)}°W`}{' '}
                  · <span style={{ color: '#18C8FF', fontWeight: 'bold' }}>{p.sea_surface_temperature}°C</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #24475F' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: cat.color,
                      backgroundColor: cat.bg,
                      border: `1px solid ${cat.color}40`,
                    }}
                  >
                    {cat.label} RISK
                  </span>
                  <span style={{ fontSize: '11px', color: '#F5FAFC', fontWeight: 'bold', marginLeft: 'auto' }}>
                    {(p.probability * 100).toFixed(1)}% Prob
                  </span>
                </div>

                <div style={{ fontSize: '10px', color: '#8FA6B8', marginTop: '6px' }}>
                  Model Confidence: <strong style={{ color: '#5EEAD4' }}>{(p.confidence * 100).toFixed(1)}%</strong>
                </div>

                {p.created_at && (
                  <div style={{ fontSize: '9px', color: '#8FA6B8', marginTop: '4px' }}>
                    Log Date: {new Date(p.created_at).toLocaleDateString()} {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}

      {/* CURRENTLY SELECTED TARGET LOCATION MARKER */}
      {selectedCoords && (
        <Marker position={[selectedCoords.lat, selectedCoords.lng]} icon={targetIcon}>
          <Popup autoPan={true}>
            <div style={{ fontFamily: 'Inter, sans-serif', color: '#F5FAFC', background: '#0C1C2A', padding: '8px', minWidth: '200px' }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#18C8FF', fontWeight: 700, letterSpacing: '0.05em' }}>
                Selected Target Location
              </span>
              <strong style={{ color: '#F5FAFC', fontSize: '13px', display: 'block', marginTop: '2px' }}>
                {regionName || 'Ocean Coordinates'}
              </strong>
              <div style={{ fontSize: '11px', color: '#8FA6B8', fontFamily: 'monospace', margin: '4px 0' }}>
                {selectedCoords.lat > 0 ? `${selectedCoords.lat.toFixed(4)}°N` : `${Math.abs(selectedCoords.lat).toFixed(4)}°S`},{' '}
                {selectedCoords.lng > 0 ? `${selectedCoords.lng.toFixed(4)}°E` : `${Math.abs(selectedCoords.lng).toFixed(4)}°W`}
                {sst !== undefined && <span style={{ color: '#18C8FF', marginLeft: '6px', fontWeight: 'bold' }}>· {sst}°C</span>}
              </div>

              {activePrediction ? (
                <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #24475F' }}>
                  {(() => {
                    const cat = getRiskCategory(activePrediction.probability)
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            color: cat.color,
                            backgroundColor: cat.bg,
                            border: `1px solid ${cat.color}40`,
                          }}
                        >
                          {cat.label} RISK
                        </span>
                        <span style={{ fontSize: '11px', color: '#F5FAFC', fontWeight: 'bold', marginLeft: 'auto' }}>
                          {(activePrediction.probability * 100).toFixed(1)}% Prob
                        </span>
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #24475F', fontSize: '10px', color: '#5EEAD4' }}>
                  Click &quot;Analyze Risk&quot; to run predictions.
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
    </div>
  )
}
