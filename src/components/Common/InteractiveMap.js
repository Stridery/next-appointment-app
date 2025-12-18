"use client";

import { useState, useCallback } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from "@vis.gl/react-google-maps";

export default function InteractiveMap({
  apiKey,
  businesses = [],
  center,
  zoom = 10,
  height = "500px",
  onBusinessClick,
}) {
  const [selectedBusiness, setSelectedBusiness] = useState(null);

  // Calculate center from businesses if not provided
  const mapCenter = center || calculateCenter(businesses);

  const handleMarkerClick = useCallback((business) => {
    setSelectedBusiness(business);
    if (onBusinessClick) {
      onBusinessClick(business);
    }
  }, [onBusinessClick]);

  const handleClose = useCallback(() => {
    setSelectedBusiness(null);
  }, []);

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

  if (!businesses || businesses.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-gray-100 rounded-lg p-6"
        style={{ height }}
      >
        <p className="text-gray-600 mb-2">No business locations available.</p>
        <p className="text-sm text-gray-500">
          Make sure you've run the database migration and businesses have
          latitude/longitude coordinates.
        </p>
      </div>
    );
  }

  // Check if businesses have coordinates
  const businessesWithCoords = businesses.filter(
    (b) => b.latitude && b.longitude
  );

  if (businessesWithCoords.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-gray-100 rounded-lg p-6"
        style={{ height }}
      >
        <p className="text-gray-600 mb-2">
          {businesses.length} business(es) found, but none have map coordinates.
        </p>
        <p className="text-sm text-gray-500 mb-2">
          Please run the migration file to add latitude/longitude data:
        </p>
        <code className="text-xs bg-white px-3 py-2 rounded">
          src/supabase/migrations/002_add_business_coordinates.sql
        </code>
      </div>
    );
  }

  return (
    <div style={{ height, width: "100%" }}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={mapCenter}
          defaultZoom={zoom}
          mapId="salon-map"
          style={{ width: "100%", height: "100%" }}
        >
          {businesses.map((business) => {
            // Skip businesses without coordinates
            if (!business.latitude || !business.longitude) return null;

            return (
              <AdvancedMarker
                key={business.id}
                position={{
                  lat: Number(business.latitude),
                  lng: Number(business.longitude),
                }}
                onClick={() => handleMarkerClick(business)}
              >
                <Pin
                  background={"#FF6B6B"}
                  borderColor={"#C92A2A"}
                  glyphColor={"#FFFFFF"}
                />
              </AdvancedMarker>
            );
          })}

          {selectedBusiness && (
            <InfoWindow
              position={{
                lat: Number(selectedBusiness.latitude),
                lng: Number(selectedBusiness.longitude),
              }}
              onCloseClick={handleClose}
              headerDisabled={true}
            >
              <div className="min-w-[280px]">
                <div className="flex items-start justify-between mb-3 border-b pb-2">
                  <h3 className="font-bold text-lg pr-2">
                    {selectedBusiness.name}
                  </h3>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 text-xl leading-none -mt-1"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedBusiness.address && (
                    <p className="text-sm text-gray-700 flex items-start">
                      <span className="mr-2">📍</span>
                      <span>{selectedBusiness.address}</span>
                    </p>
                  )}
                  {selectedBusiness.city && (
                    <p className="text-sm text-gray-700 flex items-center">
                      <span className="mr-2">🏙️</span>
                      <span>{selectedBusiness.city}</span>
                    </p>
                  )}
                  {selectedBusiness.phone && (
                    <p className="text-sm text-gray-700 flex items-center">
                      <span className="mr-2">📞</span>
                      <span>{selectedBusiness.phone}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onBusinessClick?.(selectedBusiness)}
                  className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium"
                >
                  Book Appointment
                </button>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}

// Helper function to calculate center point from businesses
function calculateCenter(businesses) {
  if (!businesses || businesses.length === 0) {
    return { lat: 37.7749, lng: -122.4194 }; // Default to SF
  }

  const validBusinesses = businesses.filter(
    (b) => b.latitude && b.longitude
  );

  if (validBusinesses.length === 0) {
    return { lat: 37.7749, lng: -122.4194 }; // Default to SF
  }

  const sum = validBusinesses.reduce(
    (acc, business) => ({
      lat: acc.lat + Number(business.latitude),
      lng: acc.lng + Number(business.longitude),
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: sum.lat / validBusinesses.length,
    lng: sum.lng / validBusinesses.length,
  };
}
