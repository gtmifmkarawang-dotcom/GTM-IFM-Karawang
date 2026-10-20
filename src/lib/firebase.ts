import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  collection,
  getDocs,
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey || 'AIzaSyB4c6Bab6V1YlqlEQdPH13_Sv4KQbkqi28',
  authDomain: firebaseAppletConfig.authDomain || 'sales-gtm-karawang.firebaseapp.com',
  projectId: firebaseAppletConfig.projectId || 'sales-gtm-karawang',
  storageBucket: firebaseAppletConfig.storageBucket || 'sales-gtm-karawang.firebasestorage.app',
  messagingSenderId: firebaseAppletConfig.messagingSenderId || '358750544673',
  appId: firebaseAppletConfig.appId || '1:358750544673:web:91ae60c2ddc6cb8907d460',
  firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId || '(default)',
};

/**
 * Initialize Firebase connected to the existing project: sales-gtm-karawang
 * and the existing (default) Cloud Firestore database.
 * We use experimentalForceLongPolling to prevent WebChannel streaming buffering
 * issues and the 10-second timeout warning in preview iframe environments.
 */
export const app = initializeApp(firebaseConfig);

const initDb = () => {
  const customDbId =
    firebaseConfig.firestoreDatabaseId &&
    firebaseConfig.firestoreDatabaseId !== '(default)'
      ? firebaseConfig.firestoreDatabaseId
      : undefined;

  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      customDbId
    );
  } catch {
    return customDbId ? getFirestore(app, customDbId) : getFirestore(app);
  }
};

export const db = initDb();
export const auth = getAuth(app);

export const ACTIVE_FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const ACTIVE_FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;
export const ACTIVE_FIREBASE_APP_ID = firebaseConfig.appId;

export const EXISTING_COLLECTIONS = [
  'Product',
  'Area',
  'Supplier',
  'Stores',
  'Users',
  'Visits',
  'Orders',
] as const;

export type ExistingCollectionName = (typeof EXISTING_COLLECTIONS)[number];

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<{
  reachable: boolean;
  message: string;
}> {
  try {
    const snap = await getDocs(collection(db, 'Product'));
    return {
      reachable: true,
      message: `Terhubung ke ${firebaseConfig.projectId} (${firebaseConfig.firestoreDatabaseId}) - ${snap.size} dokumen terbaca`,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('the client is offline') ||
        error.message.includes('Could not reach Cloud Firestore backend') ||
        error.message.includes('unavailable'))
    ) {
      return {
        reachable: false,
        message: 'Client offline atau konfigurasi Firestore tidak dapat dijangkau.',
      };
    }
    return {
      reachable: true,
      message: `Terhubung ke ${firebaseConfig.projectId} · DB: ${firebaseConfig.firestoreDatabaseId}`,
    };
  }
}
