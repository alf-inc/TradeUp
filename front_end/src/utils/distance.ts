import type { Location } from "../types";

// US8.1 distance utility implementation

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distance between two coordinates in kilometers. */
export function distanceKm(a: Location, b: Location): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * (sinDLng * sinDLng);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** True if `target` is within `radiusKm` of `center`. */
export function withinRadius(center: Location, target: Location, radiusKm: number): boolean {
  return distanceKm(center, target) <= radiusKm;
}