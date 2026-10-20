import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_FIREBASE_AREAS } from '../data/karawangData';

const AREA_CACHE_KEY = 'sales_gtm_firebase_areas_cache';

export interface FirebaseAreaDoc {
  id: string;
  namaArea: string;
  active: boolean;
}

/**
 * Extracts area name from a raw Firestore Area document.
 * Prioritizes `namaArea`, followed by other standard naming variations.
 */
export function extractAreaName(docId: string, data: Record<string, unknown>): string {
  if (typeof data.namaArea === 'string' && data.namaArea.trim()) {
    return data.namaArea.trim();
  }
  if (typeof data.nama_area === 'string' && data.nama_area.trim()) {
    return data.nama_area.trim();
  }
  if (typeof data.areaName === 'string' && data.areaName.trim()) {
    return data.areaName.trim();
  }
  if (typeof data.area === 'string' && data.area.trim()) {
    return data.area.trim();
  }
  if (typeof data.nama === 'string' && data.nama.trim()) {
    return data.nama.trim();
  }
  if (typeof data.name === 'string' && data.name.trim()) {
    return data.name.trim();
  }
  return docId;
}

/**
 * Validates whether an Area document is marked as active.
 * Handles both boolean `true` and string `"true"`.
 */
export function isAreaActive(data: Record<string, unknown>): boolean {
  if (
    data.active === false ||
    data.active === 'false' ||
    data.active === 0 ||
    data.active === '0'
  ) {
    return false;
  }
  return true;
}

/**
 * Retrieves cached area list from localStorage or falls back to default list.
 */
export function getCachedAreas(): string[] {
  try {
    const cached = localStorage.getItem(AREA_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback to default
  }
  return DEFAULT_FIREBASE_AREAS;
}

/**
 * Asynchronously fetches live Area documents from the Firebase Firestore `Area` collection.
 */
export async function fetchAreasFromFirestore(): Promise<string[]> {
  try {
    const snap = await getDocs(collection(db, 'Area'));
    if (snap.empty) {
      return getCachedAreas();
    }
    const areaSet = new Set<string>();
    snap.docs.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      if (isAreaActive(data)) {
        const name = extractAreaName(d.id, data);
        if (name) areaSet.add(name);
      }
    });

    if (areaSet.size > 0) {
      const sorted = Array.from(areaSet).sort((a, b) => a.localeCompare(b, 'id'));
      try {
        localStorage.setItem(AREA_CACHE_KEY, JSON.stringify(sorted));
      } catch {
        // ignore storage errors in private browsing
      }
      return sorted;
    }
  } catch (err) {
    console.warn('Gagal membaca collection Area dari Firestore, menggunakan cache/default:', err);
  }
  return getCachedAreas();
}
