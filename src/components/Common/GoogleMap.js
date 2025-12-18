"use client";

import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";

export default function GoogleMap({
  apiKey,
  center = { lat: 37.7749, lng: -122.4194 }, // Default: San Francisco
  zoom = 12,
  markers = [],
  height = "400px",
}) {
  if (!apiKey) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded-lg"
        style={{ height }}
      >
        <p className="text-gray-600">
          Google Maps API key not configured. Please add
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.
        </p>
      </div>
    );
  }

  return (
    <div style={{ height, width: "100%" }}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={zoom}
          mapId="salon-map"
          style={{ width: "100%", height: "100%" }}
        >
          {markers.map((marker, index) => (
            <Marker
              key={index}
              position={{ lat: marker.lat, lng: marker.lng }}
              title={marker.title}
            />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
