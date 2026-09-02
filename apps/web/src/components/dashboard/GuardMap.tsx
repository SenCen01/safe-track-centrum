"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

export type GuardMapLocation = {
  shiftId: string;
  guardName: string;
  siteName: string;
  latitude: number;
  longitude: number;
};

// Sites have no stored coordinates to center on, but a Guard's live ping
// puts them at the Site anyway while clocked in — centering on the Guard(s)
// achieves the same "zoomed in on the site" result without needing to
// geocode anything.
const FALLBACK_CENTER: [number, number] = [49.2827, -123.1207]; // Vancouver
const FALLBACK_ZOOM = 11;

export function GuardMap({ locations }: { locations: GuardMapLocation[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: true }).setView(FALLBACK_CENTER, FALLBACK_ZOOM);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const marker of markersRef.current) marker.remove();

    markersRef.current = locations.map((loc) => {
      const marker = L.circleMarker([loc.latitude, loc.longitude], {
        radius: 9,
        color: "#ffffff",
        weight: 2,
        fillColor: "#0a6d3c",
        fillOpacity: 1,
      }).addTo(map);
      marker.bindTooltip(`${loc.guardName} — ${loc.siteName}`);
      return marker;
    });

    if (locations.length === 1) {
      map.setView([locations[0].latitude, locations[0].longitude], 17);
    } else if (locations.length > 1) {
      map.fitBounds(
        L.latLngBounds(locations.map((l) => [l.latitude, l.longitude] as [number, number])),
        { padding: [40, 40], maxZoom: 17 },
      );
    } else {
      map.setView(FALLBACK_CENTER, FALLBACK_ZOOM);
    }
  }, [locations]);

  return <div ref={containerRef} style={{ height: 360, width: "100%", borderRadius: 16 }} />;
}
