import firebaseAppletConfig from '../../firebase-applet-config.json';
import { ExistingFirebaseConfig } from '../types/gtm';

/**
 * Firebase Connection Configuration Module for Sales GTM Karawang.
 * Connected to the existing Firebase project: sales-gtm-karawang
 * and the existing (default) Cloud Firestore database.
 */

export const DEFAULT_FIREBASE_CONFIG: ExistingFirebaseConfig = {
  projectId: firebaseAppletConfig.projectId || 'sales-gtm-karawang',
  apiKey: firebaseAppletConfig.apiKey || '',
  authDomain:
    firebaseAppletConfig.authDomain || 'sales-gtm-karawang.firebaseapp.com',
  storageBucket:
    firebaseAppletConfig.storageBucket ||
    'sales-gtm-karawang.firebasestorage.app',
  messagingSenderId: firebaseAppletConfig.messagingSenderId || '',
  appId: firebaseAppletConfig.appId || '',
  databaseId: firebaseAppletConfig.firestoreDatabaseId || '(default)',
};

const STORAGE_KEY = 'sales_gtm_karawang_firebase_config_v2';

export function getSavedFirebaseConfig(): ExistingFirebaseConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ExistingFirebaseConfig>;
      return {
        ...DEFAULT_FIREBASE_CONFIG,
        ...parsed,
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseConfig(config: ExistingFirebaseConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage write errors
  }
}

export function isFirebaseConfigPopulated(
  config: ExistingFirebaseConfig
): boolean {
  return Boolean(
    config.projectId.trim() &&
      config.apiKey.trim() &&
      config.authDomain.trim() &&
      config.appId.trim()
  );
}

/**
 * Existing Firestore Collections in sales-gtm-karawang ((default) database).
 * Read-Only Mode active: No collections or documents are modified yet.
 */
export const PLANNED_FIRESTORE_ARCHITECTURE = [
  {
    collectionPath: 'Area',
    purpose: 'Existing sales territory / area definitions in Karawang',
    keyFields: 'Existing Area collection in (default) database',
  },
  {
    collectionPath: 'Product',
    purpose: 'Existing product master catalog (Verified Read-Only)',
    keyFields: 'Existing Product collection in (default) database',
  },
  {
    collectionPath: 'Supplier',
    purpose: 'Existing supplier and principal records',
    keyFields: 'Existing Supplier collection in (default) database',
  },
  {
    collectionPath: 'Stores',
    purpose: 'Existing customer store profiles in Karawang',
    keyFields: 'Existing Stores collection in (default) database',
  },
  {
    collectionPath: 'Users',
    purpose: 'Existing sales representatives and user accounts',
    keyFields: 'Existing Users collection in (default) database',
  },
  {
    collectionPath: 'Visits',
    purpose: 'Existing daily store visit records and non-purchase reasons',
    keyFields: 'Existing Visits collection in (default) database',
  },
  {
    collectionPath: 'Orders',
    purpose: 'Existing purchase orders recorded from store visits',
    keyFields: 'Existing Orders collection in (default) database',
  },
];
