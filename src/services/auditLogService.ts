import { collection, getDocs, setDoc, doc, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AdminAuditLog, AdminActionCategory } from '../types/gtm';

const AUDIT_LOG_STORAGE_KEY = 'ifm_admin_logs';

/**
 * Initial sample audit logs so the log view has context upon initial startup
 */
const INITIAL_AUDIT_LOGS: AdminAuditLog[] = [
  {
    id: 'log-init-001',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    adminEmail: 'gtmifmkarawang@gmail.com',
    adminName: 'Admin GTM Karawang',
    actionType: 'PENGATURAN_SISTEM',
    targetType: 'Sistem',
    targetId: 'sys-target-karawang',
    targetTitle: 'Inisialisasi Target Harian Karawang',
    details: 'Target harian sales disetel ke 25 Toko/Hari dan Target Penjualan Rp 2.400.000.',
  },
  {
    id: 'log-init-002',
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    adminEmail: 'gtmifmkarawang@gmail.com',
    adminName: 'Admin GTM Karawang',
    actionType: 'TAMBAH_TOKO',
    targetType: 'Toko',
    targetId: 'store-krw-001',
    targetTitle: 'Toko Berkah Snack Karawang',
    details: 'Mendaftarkan outlet baru di Desa Batu Jaya, Karawang (Pemilik: H. Sukirman).',
  },
  {
    id: 'log-init-003',
    timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
    adminEmail: 'gtmifmkarawang@gmail.com',
    adminName: 'Admin GTM Karawang',
    actionType: 'APPROVE_ORDER',
    targetType: 'Order',
    targetId: 'PO-KRW-202609-001',
    targetTitle: 'PO-KRW-202609-001 (Toko Berkah Snack)',
    details: 'Menyetujui pesanan setelah setoran uang penjualan COD tunai diterima sebesar Rp 412.000.',
  },
];

/**
 * Retrieve cached audit logs from localStorage or fallback
 */
export function getStoredAuditLogs(): AdminAuditLog[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca cache audit logs:', err);
  }
  return INITIAL_AUDIT_LOGS;
}

/**
 * Save audit logs to localStorage
 */
export function saveAuditLogsToStorage(logs: AdminAuditLog[]): void {
  try {
    localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.warn('Gagal menyimpan cache audit logs:', err);
  }
}

/**
 * Record a new admin audit log into Firestore and local state
 */
export function recordAdminAuditLog(
  categoryOrEntry:
    | AdminActionCategory
    | (Omit<AdminAuditLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }),
  targetTitle?: string,
  details?: string,
  adminEmail?: string,
  adminName?: string,
  metadata?: Record<string, unknown>
): AdminAuditLog {
  let newLog: AdminAuditLog;
  if (typeof categoryOrEntry === 'object') {
    newLog = {
      id: categoryOrEntry.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: categoryOrEntry.timestamp || new Date().toISOString(),
      adminEmail: categoryOrEntry.adminEmail || 'gtmifmkarawang@gmail.com',
      adminName: categoryOrEntry.adminName || 'Admin IFM Karawang',
      actionType: categoryOrEntry.actionType,
      targetType: (categoryOrEntry.targetType as 'Toko' | 'Produk' | 'Order' | 'Sistem' | 'Sales') || 'Sistem',
      targetId: categoryOrEntry.targetId,
      targetTitle: categoryOrEntry.targetTitle,
      details: categoryOrEntry.details,
      metadata: categoryOrEntry.metadata || {},
    };
  } else {
    const action = categoryOrEntry;
    let targetType: 'Toko' | 'Produk' | 'Order' | 'Sistem' | 'Sales' = 'Sistem';
    if (action.includes('TOKO')) targetType = 'Toko';
    else if (action.includes('PRODUK')) targetType = 'Produk';
    else if (action.includes('ORDER')) targetType = 'Order';
    else if (action.includes('SALES')) targetType = 'Sales';

    newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      adminEmail: adminEmail || 'gtmifmkarawang@gmail.com',
      adminName: adminName || 'Admin IFM Karawang',
      actionType: action,
      targetType,
      targetTitle: targetTitle || '-',
      details: details || '',
      metadata: metadata || {},
    };
  }

  // 1. Update localStorage synchronously
  const currentLogs = getStoredAuditLogs();
  const updatedLogs = [newLog, ...currentLogs.filter((l) => l.id !== newLog.id)];
  saveAuditLogsToStorage(updatedLogs);

  // 2. Persist to Firestore asynchronously
  setDoc(doc(db, 'AdminLogs', newLog.id), {
    ...newLog,
    recordedAt: newLog.timestamp,
  }).catch((err) => {
    console.warn('Gagal menyimpan log admin ke Firestore (tersimpan di local cache):', err);
  });

  return newLog;
}

/**
 * Fetch logs from Firestore collection 'AdminLogs'
 */
export async function fetchAdminAuditLogsFromFirestore(): Promise<AdminAuditLog[]> {
  try {
    const logsRef = collection(db, 'AdminLogs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(100));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const fetchedLogs: AdminAuditLog[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          timestamp: typeof data.timestamp === 'string' ? data.timestamp : new Date().toISOString(),
          adminEmail: typeof data.adminEmail === 'string' ? data.adminEmail : 'gtmifmkarawang@gmail.com',
          adminName: typeof data.adminName === 'string' ? data.adminName : 'Admin GTM',
          actionType: (data.actionType as AdminActionCategory) || 'PENGATURAN_SISTEM',
          targetType: data.targetType || 'Sistem',
          targetId: data.targetId || d.id,
          targetTitle: data.targetTitle || 'Aktivitas Admin',
          details: data.details || '-',
          metadata: data.metadata || {},
        };
      });

      // Merge with localStorage
      const local = getStoredAuditLogs();
      const map = new Map<string, AdminAuditLog>();
      [...fetchedLogs, ...local].forEach((l) => map.set(l.id, l));
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      saveAuditLogsToStorage(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Gagal menarik AdminLogs dari Firestore, gunakan cache:', err);
  }

  return getStoredAuditLogs();
}
