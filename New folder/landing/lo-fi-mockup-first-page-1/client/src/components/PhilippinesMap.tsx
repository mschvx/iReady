import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = icon;

interface PhilippinesMapProps {
  className?: string;
}

export const PhilippinesMap: React.FC<PhilippinesMapProps> = ({ className = '' }) => {
  // Center of the Philippines (approximately Manila)
  const philippinesCenter: [number, number] = [12.8797, 121.7740];
  const zoom = 6;

  return (
    <MapContainer
      center={philippinesCenter}
      zoom={zoom}
      scrollWheelZoom={true}
      className={`${className} rounded-3xl overflow-hidden`}
      style={{ height: '100%', width: '100%', minHeight: '400px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={philippinesCenter}>
        <Popup>
          Philippines
        </Popup>
      </Marker>
    </MapContainer>
  );
};
