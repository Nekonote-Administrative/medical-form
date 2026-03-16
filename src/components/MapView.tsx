"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

interface MapViewProps {
  center: { lat: number; lng: number };
  markers: Array<{ lat: number; lng: number; name: string }>;
  onMarkerClick?: (index: number) => void;
  highlightedIndex?: number | null;
}

export default function MapView({ center, markers, onMarkerClick, highlightedIndex }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Google Maps APIキーが設定されていません");
      setLoading(false);
      return;
    }

    const loader = new Loader({
      apiKey,
      version: "weekly",
      language: "ja",
      region: "JP",
    });

    loader
      .importLibrary("maps")
      .then(() => {
        if (!mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        mapInstanceRef.current = map;
        infoWindowRef.current = new google.maps.InfoWindow();
        setLoading(false);
      })
      .catch(() => {
        setError("地図の読み込みに失敗しました");
        setLoading(false);
      });

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center when no markers
  useEffect(() => {
    if (mapInstanceRef.current && markers.length === 0) {
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(13);
    }
  }, [center, markers.length]);

  // Update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (markers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    markers.forEach((markerData, index) => {
      const marker = new google.maps.Marker({
        position: { lat: markerData.lat, lng: markerData.lng },
        map,
        title: markerData.name,
      });

      marker.addListener("click", () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(
            `<div style="font-size:14px;font-weight:500;padding:2px 0;">${markerData.name}</div>`
          );
          infoWindowRef.current.open(map, marker);
        }
        onMarkerClick?.(index);
      });

      bounds.extend(marker.getPosition()!);
      markersRef.current.push(marker);
    });

    map.fitBounds(bounds);

    // Don't zoom in too much for a single marker
    if (markers.length === 1) {
      const listener = google.maps.event.addListener(map, "idle", () => {
        if (map.getZoom()! > 15) {
          map.setZoom(15);
        }
        google.maps.event.removeListener(listener);
      });
    }
  }, [markers, onMarkerClick]);

  // Highlight marker on hover
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((marker, index) => {
      if (index === highlightedIndex) {
        marker.setAnimation(google.maps.Animation.BOUNCE);
        // Open info window for highlighted marker
        if (infoWindowRef.current && markers[index]) {
          infoWindowRef.current.setContent(
            `<div style="font-size:14px;font-weight:500;padding:2px 0;">${markers[index].name}</div>`
          );
          infoWindowRef.current.open(map, marker);
        }
      } else {
        marker.setAnimation(null);
      }
    });

    if (highlightedIndex === null || highlightedIndex === undefined) {
      infoWindowRef.current?.close();
    }
  }, [highlightedIndex, markers]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[300px] md:h-[400px] bg-gray-100 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <p className="text-sm text-gray-500">地図を読み込んでいます...</p>
          </div>
        </div>
      )}
      <div
        ref={mapRef}
        className="h-[300px] md:h-[400px] w-full rounded-lg"
      />
    </div>
  );
}
