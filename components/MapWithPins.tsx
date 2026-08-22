"use client";

import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const propertyIcon = L.divIcon({
  className: "property-marker",
  html: `<span style="
    display: block;
    width: 24px;
    height: 24px;
    background: #ef4444;
    border: 2px solid white;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  "></span>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

const nearbyIcon = L.divIcon({
  className: "nearby-marker",
  html: `<span style="
    display: block;
    width: 20px;
    height: 20px;
    background: #3b82f6;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  "></span>`,
  iconSize: [20, 20],
  iconAnchor: [10, 20],
});

const nearbyHighlightedIcon = L.divIcon({
  className: "nearby-marker-highlighted",
  html: `<span style="
    display: block;
    width: 28px;
    height: 28px;
    background: #f59e0b;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 0 3px rgba(245,158,11,0.5), 0 2px 8px rgba(0,0,0,0.4);
  "></span>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

export type NearbyPlaceForMap = {
  lat: number;
  lng: number;
  name: string;
  vicinity?: string;
};

type MapWithPinsProps = {
  propertyLat?: number | null;
  propertyLng?: number | null;
  nearbyPlaces?: NearbyPlaceForMap[];
  /** When set, highlights this nearby place on the map and flies to it (e.g. when editing that location). */
  highlightedNearbyIndex?: number | null;
  className?: string;
  height?: number;
};

export default function MapWithPins({
  propertyLat,
  propertyLng,
  nearbyPlaces = [],
  highlightedNearbyIndex = null,
  className = "",
  height = 420,
}: MapWithPinsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const nearbyMarkersRef = useRef<L.Marker[]>([]);

  const hasProperty =
    propertyLat != null &&
    propertyLng != null &&
    !Number.isNaN(propertyLat) &&
    !Number.isNaN(propertyLng);
  const propPoint: [number, number] | null = hasProperty
    ? [propertyLat, propertyLng]
    : null;

  const points = useMemo(() => {
    const p: [number, number][] = [];
    if (propPoint) p.push(propPoint);
    nearbyPlaces.forEach((n) => p.push([n.lat, n.lng]));
    return p;
  }, [propPoint, nearbyPlaces]);

  const center = useMemo((): [number, number] => {
    if (propPoint) return propPoint;
    if (nearbyPlaces.length > 0) {
      const lat =
        nearbyPlaces.reduce((a, n) => a + n.lat, 0) / nearbyPlaces.length;
      const lng =
        nearbyPlaces.reduce((a, n) => a + n.lng, 0) / nearbyPlaces.length;
      return [lat, lng];
    }
    return [0, 0];
  }, [propPoint, nearbyPlaces]);

  useEffect(() => {
    if (points.length === 0 || !containerRef.current) return;

    const el = containerRef.current;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(el, { scrollWheelZoom: true }).setView(center, 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    if (propPoint) {
      const marker = L.marker(propPoint, { icon: propertyIcon }).addTo(map);
      marker.bindPopup(
        `<strong>Property</strong><br/>${propPoint[0].toFixed(5)}, ${propPoint[1].toFixed(5)}`
      );
    }

    nearbyMarkersRef.current = [];
    nearbyPlaces.forEach((place) => {
      const marker = L.marker([place.lat, place.lng], {
        icon: nearbyIcon,
      }).addTo(map);
      const popupContent = place.vicinity
        ? `<strong>${escapeHtml(place.name)}</strong><br/><span class="text-gray-600">${escapeHtml(place.vicinity)}</span>`
        : `<strong>${escapeHtml(place.name)}</strong>`;
      marker.bindPopup(popupContent);
      nearbyMarkersRef.current.push(marker);
    });

    if (points.length === 1) {
      map.setView(points[0], 15);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), {
        padding: [40, 40],
        maxZoom: 15,
      });
    }

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      nearbyMarkersRef.current = [];
    };
  }, [center, points, propPoint, nearbyPlaces]);

  // When user clicks Edit on a nearby location, fly to it, highlight that marker, and open its popup
  useEffect(() => {
    const markers = nearbyMarkersRef.current;
    const map = mapRef.current;
    // Reset all nearby markers to default icon
    markers.forEach((m) => m.setIcon(nearbyIcon));
    if (
      highlightedNearbyIndex == null ||
      highlightedNearbyIndex < 0 ||
      highlightedNearbyIndex >= nearbyPlaces.length ||
      !map
    )
      return;
    const place = nearbyPlaces[highlightedNearbyIndex];
    const latLng: [number, number] = [place.lat, place.lng];
    map.flyTo(latLng, 16, { duration: 0.5 });
    const marker = markers[highlightedNearbyIndex];
    if (marker) {
      marker.setIcon(nearbyHighlightedIcon);
      marker.openPopup();
    }
  }, [highlightedNearbyIndex, nearbyPlaces]);

  if (points.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: `${height}px`, minHeight: 280 }}
    />
  );
}

function escapeHtml(s: string): string {
  const div = typeof document !== "undefined" ? document.createElement("div") : null;
  if (div) {
    div.textContent = s;
    return div.innerHTML;
  }
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
