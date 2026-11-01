import React, { useEffect, useMemo, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Database,
  FileText,
  History,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  Navigation,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store as StoreIcon,
  User,
  Users,
  X,
} from 'lucide-react';
import { AdminAuditLogsView } from './components/AdminAuditLogsView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { FirebaseConnectionSheet } from './components/FirebaseConnectionSheet';
import { IndofoodSnackTimeLogo } from './components/IndofoodSnackTimeLogo';
import { InvoiceReceiptModal } from './components/InvoiceReceiptModal';
import { LoginPage, UserRole } from './components/LoginPage';
import { OrdersAndBarriersView } from './components/OrdersAndBarriersView';
import {
  ProductVerificationView,
  RawFirestoreDoc,
} from './components/ProductVerificationView';
import { SalesDashboardView } from './components/SalesDashboardView';
import { SalesLoginModal } from './components/SalesLoginModal';
import { SalesProfileView } from './components/SalesProfileView';
import { SalesTeamManagementView } from './components/SalesTeamManagementView';
import { StoreDirectoryView } from './components/StoreDirectoryView';
import { VisitRecorderModal } from './components/VisitRecorderModal';
import { getSavedFirebaseConfig } from './config/firebase';
import {
  fetchAreasFromFirestore,
  getCachedAreas,
} from './services/areaService';
import {
  fetchAdminAuditLogsFromFirestore,
  getStoredAuditLogs,
  recordAdminAuditLog,
  saveAuditLogsToStorage,
} from './services/auditLogService';
import {
  INITIAL_PLANNED_ROUTE,
  INITIAL_SALES_REP,
  INITIAL_SALES_REPRESENTATIVES,
  INITIAL_STORES,
  INITIAL_VISITS,
  PRODUCT_SKU_CATALOG,
  calculateDailyTargetFromMonthly,
  extractNameFromEmail,
  formatIdr,
  getEffectiveWorkingDaysInMonth,
} from './data/karawangData';
import {
  ACTIVE_FIREBASE_PROJECT_ID,
  ACTIVE_FIRESTORE_DATABASE_ID,
  auth,
  db,
} from './lib/firebase';
import {
  AdminActionCategory,
  AdminAuditLog,
  ExistingFirebaseConfig,
  OrderStatus,
  OrderUnit,
  PlannedRouteStop,
  ProductSKU,
  SalesRepresentative,
  Store,
  StoreVisit,
  VisitOutcome,
} from './types/gtm';

type ActiveSection =
  | 'sales_dashboard'
  | 'admin'
  | 'visits'
  | 'orders'
  | 'profile'
  | 'stores'
  | 'products'
  | 'no_orders'
  | 'audit_logs'
  | 'sales_team';

type VisitListFilter = 'ALL' | 'ORDER' | 'NO_ORDER' | 'ROUTE';

const SCHEDULE_DATES = [
  { date: '2026-09-28', dayShort: 'Sen', dayNum: '28' },
  { date: '2026-09-29', dayShort: 'Sel', dayNum: '29' },
  { date: '2026-09-30', dayShort: 'Rab', dayNum: '30' },
  { date: '2026-10-01', dayShort: 'Kam', dayNum: '01' },
  { date: '2026-10-02', dayShort: 'Jum', dayNum: '02' },
];

function mapFirestoreProductDocsToCatalog(
  rawDocs: RawFirestoreDoc[]
): ProductSKU[] {
  if (!rawDocs || rawDocs.length === 0) return PRODUCT_SKU_CATALOG;
  return rawDocs.map((docItem, idx) => {
    const d = docItem.data;
    const name =
      (typeof d.namaProduct === 'string' && d.namaProduct.trim()) ||
      (typeof d.name === 'string' && d.name) ||
      (typeof d.nama === 'string' && d.nama) ||
      (typeof d.nama_produk === 'string' && d.nama_produk) ||
      (typeof d.productName === 'string' && d.productName) ||
      (typeof d.product_name === 'string' && d.product_name) ||
      (typeof d.namaProduk === 'string' && d.namaProduk) ||
      `Product ${docItem.id}`;

    const skuCode =
      (typeof d.code === 'string' && d.code) ||
      (typeof d.kode === 'string' && d.kode) ||
      (typeof d.sku === 'string' && d.sku) ||
      (typeof d.skuCode === 'string' && d.skuCode) ||
      (typeof d.kode_produk === 'string' && d.kode_produk) ||
      docItem.id;

    const category =
      (typeof d.category === 'string' && d.category) ||
      (typeof d.kategori === 'string' && d.kategori) ||
      (typeof d.supplier === 'string' && d.supplier) ||
      (typeof d.brand === 'string' && d.brand) ||
      'Snack Indofood';

    // 1. HARGA PERUSAHAAN (Company Price / HPP) diambil langsung dari field 'harga' collection /Product di Firebase
    let companyPrice = 0;
    const companyPriceCandidates = [
      'harga_perusahaan',
      'hargaPerusahaan',
      'companyPrice',
      'company_price',
      'companyPriceIdr',
      'harga', // Field utama dari dokumen collection /Product di Firebase
      'price',
      'hpp',
      'HPP',
      'harga_pokok',
      'hargaPokok',
      'harga_modal',
      'unitPrice',
    ];
    for (const key of companyPriceCandidates) {
      const val = d[key];
      if (typeof val === 'number' && !Number.isNaN(val) && val > 0) {
        companyPrice = val;
        break;
      }
      if (typeof val === 'string' && val.trim()) {
        const num = Number(val.replace(/[^0-9.-]+/g, ''));
        if (!Number.isNaN(num) && num > 0) {
          companyPrice = num;
          break;
        }
      }
    }

    // Fallback harga perusahaan jika dokumen belum memiliki field harga (sesuai standar gramasi Indofood Snack)
    if (!companyPrice || companyPrice <= 0) {
      const lower = name.toLowerCase();
      if (lower.includes('68 gr')) companyPrice = 245500;
      else if (lower.includes('140 gr')) companyPrice = 183500;
      else if (lower.includes('55 gr') || lower.includes('60 gr') || lower.includes('75 gr')) companyPrice = 143000;
      else if (lower.includes('35 gr')) companyPrice = 183500;
      else if (lower.includes('14 gr') || lower.includes('15 gr')) companyPrice = 102400;
      else if (lower.includes('20 gr')) companyPrice = 100250;
      else if (lower.includes('16 gr') || lower.includes('18 gr') || lower.includes('22,5 gr')) companyPrice = 98750;
      else companyPrice = 100000 + (idx % 4) * 15000;
    }

    // 2. HARGA JUAL KE TOKO (Store Price): gunakan field harga_jual/harga_toko jika ada,
    // atau gunakan harga rekomendasi toko dengan standar margin GTM Karawang (+6% rounded Rp 500)
    let storePrice = 0;
    const storePriceCandidates = [
      'harga_jual',
      'hargaJual',
      'harga_toko',
      'hargaToko',
      'storePrice',
      'store_price',
      'storePriceIdr',
      'harga_jual_ke_toko',
    ];
    for (const key of storePriceCandidates) {
      const val = d[key];
      if (typeof val === 'number' && !Number.isNaN(val) && val > 0) {
        storePrice = val;
        break;
      }
      if (typeof val === 'string' && val.trim()) {
        const num = Number(val.replace(/[^0-9.-]+/g, ''));
        if (!Number.isNaN(num) && num > 0) {
          storePrice = num;
          break;
        }
      }
    }
    if (!storePrice || storePrice <= 0) {
      // Default harga jual toko dengan selisih harga sehat (~6% di atas harga perusahaan)
      storePrice = Math.round((companyPrice * 1.065) / 500) * 500;
    }

    // 1b. HARGA PERUSAHAAN RCG & PCS DARI FIRESTORE
    let companyPriceRcg = 0;
    const rcgCandidates = [
      'harga_perusahaan_rcg',
      'harga_rcg',
      'hargaRcg',
      'companyPriceRcg',
      'harga_renceng',
    ];
    for (const key of rcgCandidates) {
      const val = d[key];
      if (typeof val === 'number' && !Number.isNaN(val) && val > 0) {
        companyPriceRcg = val;
        break;
      }
      if (typeof val === 'string' && val.trim()) {
        const num = Number(val.replace(/[^0-9.-]+/g, ''));
        if (!Number.isNaN(num) && num > 0) {
          companyPriceRcg = num;
          break;
        }
      }
    }
    if (!companyPriceRcg || companyPriceRcg <= 0) {
      companyPriceRcg = Math.round(companyPrice / 8);
    }

    let companyPricePcs = 0;
    const pcsCandidates = [
      'harga_perusahaan_pcs',
      'harga_pcs',
      'hargaPcs',
      'companyPricePcs',
    ];
    for (const key of pcsCandidates) {
      const val = d[key];
      if (typeof val === 'number' && !Number.isNaN(val) && val > 0) {
        companyPricePcs = val;
        break;
      }
      if (typeof val === 'string' && val.trim()) {
        const num = Number(val.replace(/[^0-9.-]+/g, ''));
        if (!Number.isNaN(num) && num > 0) {
          companyPricePcs = num;
          break;
        }
      }
    }
    if (!companyPricePcs || companyPricePcs <= 0) {
      companyPricePcs = Math.round(companyPrice / 40);
    }

    return {
      id: docItem.id,
      skuCode,
      name,
      category,
      defaultUnit: 'CTN' as OrderUnit,
      units: [
        {
          unit: 'CTN',
          priceIdr: storePrice,
          companyPriceIdr: companyPrice, // HARGA PERUSAHAAN CTN DARI FIRESTORE
          storePriceIdr: storePrice,
          pcsPerUnit: 40,
        },
        {
          unit: 'RCG',
          priceIdr: Math.round(storePrice / 8),
          companyPriceIdr: companyPriceRcg, // HARGA PERUSAHAAN RCG DARI FIRESTORE
          storePriceIdr: Math.round(storePrice / 8),
          pcsPerUnit: 10,
        },
        {
          unit: 'Pcs',
          priceIdr: Math.round(storePrice / 40),
          companyPriceIdr: companyPricePcs, // HARGA PERUSAHAAN PCS DARI FIRESTORE
          storePriceIdr: Math.round(storePrice / 40),
          pcsPerUnit: 1,
        },
        {
          unit: 'Karton',
          priceIdr: storePrice,
          companyPriceIdr: companyPrice,
          storePriceIdr: storePrice,
          pcsPerUnit: 40,
        },
      ],
      stockAvailable: true,
    };
  });
}

const SESSION_STORAGE_KEY = 'sales_gtm_auth_session';

interface SessionData {
  email: string;
  displayName: string;
  role: UserRole;
}

function getStoredSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.email === 'string' &&
        (parsed.role === 'sales' || parsed.role === 'admin')
      ) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return null;
}

const VISITS_STORAGE_KEY = 'sales_gtm_visits_cache_v2';
const STORES_STORAGE_KEY = 'sales_gtm_stores_cache_v2';

function getStoredVisits(): StoreVisit[] {
  try {
    const raw = localStorage.getItem(VISITS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse cached visits:', err);
  }
  return INITIAL_VISITS;
}

function getStoredStores(): Store[] {
  try {
    const raw = localStorage.getItem(STORES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const idSet = new Set<string>();
        const valid: Store[] = [];
        parsed.forEach((s, idx) => {
          if (s && typeof s === 'object') {
            const sid =
              (typeof s.id === 'string' && s.id.trim()) ||
              `store-legacy-${idx}-${Date.now()}`;
            if (!idSet.has(sid)) {
              idSet.add(sid);
              valid.push({
                ...s,
                id: sid,
                storeCode:
                  (typeof s.storeCode === 'string' && s.storeCode.trim()) ||
                  `KRW-${sid.slice(0, 6)}`,
              });
            }
          }
        });
        return valid;
      }
    }
  } catch (err) {
    console.warn('Failed to parse cached stores:', err);
  }
  return INITIAL_STORES;
}

const SALES_TEAM_STORAGE_KEY = 'ifm_sales_team_cache_v1';

function getStoredSalesTeam(): SalesRepresentative[] {
  try {
    const raw = localStorage.getItem(SALES_TEAM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse cached sales team:', err);
  }
  return INITIAL_SALES_REPRESENTATIVES;
}

export default function App() {
  const [session, setSession] = useState<SessionData | null>(() => getStoredSession());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(getStoredSession()));
  const [userRole, setUserRole] = useState<UserRole>(() => getStoredSession()?.role || 'sales');

  // Default active section: 'admin' if admin role, otherwise 'sales_dashboard'
  const [activeSection, setActiveSection] = useState<ActiveSection>(() => {
    const s = getStoredSession();
    return s?.role === 'admin' ? 'admin' : 'sales_dashboard';
  });
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-30');
  const [visitFilter, setVisitFilter] = useState<VisitListFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Firebase Auth & Live Firestore Product State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [liveProductDocs, setLiveProductDocs] = useState<RawFirestoreDoc[]>([]);
  const [areaList, setAreaList] = useState<string[]>(() => getCachedAreas());

  // Handle successful login and route to appropriate dashboard
  const handleLoginSuccess = (
    user: FirebaseUser | { email: string; displayName?: string | null },
    role: UserRole
  ) => {
    const email =
      user.email ||
      (role === 'admin'
        ? 'admin.karawang@indofood.co.id'
        : 'gtmifmkarawang@gmail.com');
    const lowerEmail = email.toLowerCase();
    let effectiveRole = role;
    if (role === 'admin' && lowerEmail.includes('sales')) {
      effectiveRole = 'sales';
    } else if (role === 'sales' && lowerEmail.includes('admin')) {
      effectiveRole = 'admin';
    }

    // Nama profil otomatis diambil dari email tanpa harus input di halaman login
    const displayName =
      user.displayName ||
      extractNameFromEmail(email, effectiveRole);
    const newSession: SessionData = { email, displayName, role: effectiveRole };

    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    } catch {
      // ignore
    }

    setSession(newSession);
    setUserRole(effectiveRole);
    setIsAuthenticated(true);

    if (effectiveRole === 'admin') {
      setActiveSection('admin');
    } else {
      setActiveSection('sales_dashboard');
    }
  };

  // Handle update profile name from SalesProfileView
  const handleUpdateProfileName = (newName: string) => {
    const clean = newName.trim();
    if (!clean) return;
    if (session) {
      const updated = { ...session, displayName: clean };
      setSession(updated);
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
    setSalesRep((prev) => ({ ...prev, name: clean }));
  };

  // Handle sign out and return to LoginPage
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out notice:', err);
    }
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
    setSession(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
    setUserRole('sales');
    setActiveSection('sales_dashboard');
  };

  // Local UI State with Production-ready data
  const [salesTeam, setSalesTeam] = useState<SalesRepresentative[]>(() =>
    getStoredSalesTeam()
  );

  useEffect(() => {
    try {
      localStorage.setItem(SALES_TEAM_STORAGE_KEY, JSON.stringify(salesTeam));
    } catch (e) {
      console.warn('Failed to save sales team to localStorage:', e);
    }
  }, [salesTeam]);

  const [salesRep, setSalesRep] = useState(INITIAL_SALES_REP);

  // Synced Active Sales Rep according to active login session (otomatis dari nama email dan team data)
  const activeSalesRep: SalesRepresentative = useMemo(() => {
    const rawEmail = session?.email || currentUser?.email || salesRep.email || 'gtmifmkarawang@gmail.com';
    const email = rawEmail.toLowerCase().trim();
    const matchedPerson = salesTeam.find(
      (s) => (s.email || '').toLowerCase().trim() === email
    );

    const name =
      session?.displayName ||
      currentUser?.displayName ||
      matchedPerson?.name ||
      extractNameFromEmail(email, session?.role || userRole);

    const effectiveDaysInfo = getEffectiveWorkingDaysInMonth();
    const monthlyTarget =
      matchedPerson?.monthlyOrderTargetIdr ||
      salesRep.monthlyOrderTargetIdr ||
      (matchedPerson?.dailyOrderTargetIdr
        ? matchedPerson.dailyOrderTargetIdr * effectiveDaysInfo.effectiveWorkingDays
        : 60000000);

    const dailyTarget = calculateDailyTargetFromMonthly(
      monthlyTarget,
      effectiveDaysInfo.effectiveWorkingDays
    );

    const dailyVisit = matchedPerson?.dailyVisitTarget || salesRep.dailyVisitTarget || 25;
    const monthlyVisit = matchedPerson?.monthlyVisitTarget || dailyVisit * effectiveDaysInfo.effectiveWorkingDays;

    return {
      ...(matchedPerson || salesRep),
      name: name || 'GTM IFM Karawang',
      email: email,
      dailyVisitTarget: dailyVisit,
      dailyOrderTargetIdr: dailyTarget,
      monthlyOrderTargetIdr: monthlyTarget,
      monthlyVisitTarget: monthlyVisit,
    };
  }, [session, currentUser, salesRep, salesTeam, userRole]);

  const [stores, setStores] = useState<Store[]>(() => getStoredStores());
  const [visits, setVisits] = useState<StoreVisit[]>(() => getStoredVisits());
  const [routeStops, setRouteStops] = useState<PlannedRouteStop[]>(
    INITIAL_PLANNED_ROUTE
  );

  // Auto-persist visits & stores ke localStorage sehingga tidak hilang saat direfresh
  useEffect(() => {
    try {
      localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(visits));
    } catch (e) {
      console.warn('Failed to save visits to localStorage:', e);
    }
  }, [visits]);

  useEffect(() => {
    try {
      localStorage.setItem(STORES_STORAGE_KEY, JSON.stringify(stores));
    } catch (e) {
      console.warn('Failed to save stores to localStorage:', e);
    }
  }, [stores]);

  // Modals & Drawers
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isVisitRecorderOpen, setIsVisitRecorderOpen] = useState(false);
  const [preselectedStoreId, setPreselectedStoreId] = useState<string | null>(null);
  const [inspectedVisit, setInspectedVisit] = useState<StoreVisit | null>(null);
  const [selectedInvoiceVisit, setSelectedInvoiceVisit] = useState<StoreVisit | null>(null);
  const [isFirebaseSheetOpen, setIsFirebaseSheetOpen] = useState(false);
  const [firebaseConfig, setFirebaseConfig] = useState<ExistingFirebaseConfig>(
    () => getSavedFirebaseConfig()
  );

  // Admin Top Toolbar Dropdown State (accessible on mobile, tablet, and desktop)
  const [isAdminMenuDropdownOpen, setIsAdminMenuDropdownOpen] = useState(false);

  // Admin Audit Log State
  const [adminAuditLogs, setAdminAuditLogs] = useState<AdminAuditLog[]>(() =>
    getStoredAuditLogs()
  );

  useEffect(() => {
    fetchAdminAuditLogsFromFirestore().then((logs) => {
      if (logs && logs.length > 0) {
        setAdminAuditLogs(logs);
      }
    });
  }, []);

  const logAdminAction = (
    category: AdminActionCategory,
    targetTitle: string,
    details: string
  ) => {
    const adminEmail =
      currentUser?.email || session?.email || 'admin.karawang@indofood.co.id';
    const adminName =
      currentUser?.displayName || session?.displayName || 'Admin GTM Karawang';
    const newLog = recordAdminAuditLog(
      category,
      targetTitle,
      details,
      adminEmail,
      adminName
    );
    setAdminAuditLogs((prev) => [
      newLog,
      ...prev.filter((l) => l.id !== newLog.id),
    ]);
  };

  const handleClearAuditLogs = () => {
    setAdminAuditLogs([]);
    saveAuditLogsToStorage([]);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (user && !session) {
        const isEmailAdmin = user.email?.toLowerCase().includes('admin');
        const roleDetected: UserRole = isEmailAdmin ? 'admin' : 'sales';
        const userEmail =
          user.email ||
          (roleDetected === 'admin'
            ? 'admin.karawang@indofood.co.id'
            : 'gtmifmkarawang@gmail.com');
        const restored: SessionData = {
          email: userEmail,
          displayName: user.displayName || extractNameFromEmail(userEmail, roleDetected),
          role: roleDetected,
        };
        try {
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(restored));
        } catch {
          // ignore
        }
        setSession(restored);
        setUserRole(roleDetected);
        setIsAuthenticated(true);
      }
    });
    return () => unsubscribe();
  }, [session]);

  // Preload Product collection from sales-gtm-karawang database
  useEffect(() => {
    if (!authReady) return;
    let mounted = true;
    getDocs(collection(db, 'Product'))
      .then((snap) => {
        if (!mounted) return;
        if (snap.docs.length > 0) {
          const docs: RawFirestoreDoc[] = snap.docs.map((d) => ({
            id: d.id,
            data: d.data() as Record<string, unknown>,
          }));
          setLiveProductDocs(docs);
        }
      })
      .catch((err) => {
        // Fallback to default catalog gracefully if offline
        console.warn('Product preload notice:', err);
      });
    return () => {
      mounted = false;
    };
  }, [authReady, currentUser]);

  // Preload Area collection from sales-gtm-karawang database
  useEffect(() => {
    let mounted = true;
    fetchAreasFromFirestore()
      .then((areas) => {
        if (!mounted) return;
        if (areas.length > 0) {
          setAreaList(areas);
        }
      })
      .catch((err) => {
        console.warn('Area preload notice:', err);
      });
    return () => {
      mounted = false;
    };
  }, [authReady, currentUser]);

  // Sinkronisasi data kunjungan (Visits) & Toko (Stores) dari Firestore
  useEffect(() => {
    if (!authReady) return;
    let mounted = true;

    // Load Stores from Firestore
    getDocs(collection(db, 'Stores'))
      .then((snap) => {
        if (!mounted || snap.empty) return;
        const loadedStores: Store[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            ...data,
            id: (typeof data.id === 'string' && data.id.trim()) || d.id,
            storeCode:
              (typeof data.storeCode === 'string' && data.storeCode.trim()) ||
              `KRW-${d.id.slice(0, 6)}`,
          } as Store;
        });
        setStores((prev) => {
          const map = new Map<string, Store>();
          prev.forEach((s) => {
            if (s && s.id) map.set(s.id, s);
          });
          loadedStores.forEach((s) => {
            if (s && s.id) map.set(s.id, s);
          });
          return Array.from(map.values());
        });
      })
      .catch((err) => console.warn('Stores sync notice:', err));

    // Load Visits from Firestore
    getDocs(collection(db, 'Visits'))
      .then((snap) => {
        if (!mounted || snap.empty) return;
        const loadedVisits: StoreVisit[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            ...data,
            id: (typeof data.id === 'string' && data.id.trim()) || d.id,
          } as StoreVisit;
        });
        setVisits((prev) => {
          const map = new Map<string, StoreVisit>();
          prev.forEach((v) => {
            if (v && v.id) map.set(v.id, v);
          });
          loadedVisits.forEach((v) => {
            if (v && v.id) map.set(v.id, v);
          });
          return Array.from(map.values());
        });
      })
      .catch((err) => console.warn('Visits sync notice:', err));

    // Load SalesPersons from Firestore
    getDocs(collection(db, 'SalesPersons'))
      .then((snap) => {
        if (!mounted || snap.empty) return;
        const loadedPersons: SalesRepresentative[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: (typeof data.id === 'string' && data.id.trim()) || d.id,
            employeeCode: (typeof data.employeeCode === 'string' && data.employeeCode.trim()) || `GTM-KRW-${d.id.slice(-3)}`,
            name: (typeof data.name === 'string' && data.name.trim()) || 'Sales IFM',
            email: (typeof data.email === 'string' && data.email.trim()) || '',
            phone: (typeof data.phone === 'string' && data.phone.trim()) || '',
            address: (typeof data.address === 'string' && data.address.trim()) || '',
            photoUrl: (typeof data.photoUrl === 'string' && data.photoUrl.trim()) || '',
            role: (data.role as any) || 'Sales Representative',
            assignedDistricts: Array.isArray(data.assignedDistricts) ? data.assignedDistricts : [],
            dailyVisitTarget: Number(data.dailyVisitTarget) || 25,
            dailyOrderTargetIdr: Number(data.dailyOrderTargetIdr) || 2400000,
            monthlyVisitTarget: Number(data.monthlyVisitTarget) || 625,
            monthlyOrderTargetIdr: Number(data.monthlyOrderTargetIdr) || 60000000,
            isActive: data.isActive !== false,
            joinDate: typeof data.joinDate === 'string' ? data.joinDate : '',
          };
        });
        setSalesTeam((prev) => {
          const map = new Map<string, SalesRepresentative>();
          prev.forEach((p) => {
            if (p && p.id) map.set(p.id, p);
          });
          loadedPersons.forEach((p) => {
            if (p && p.id) map.set(p.id, p);
          });
          return Array.from(map.values());
        });
      })
      .catch((err) => console.warn('SalesPersons sync notice:', err));

    return () => {
      mounted = false;
    };
  }, [authReady]);

  // Keamanan peran (Role Guard): Sembunyikan dan cegah dashboard admin/sales team jika role sales, dan sebaliknya
  useEffect(() => {
    if (!isAuthenticated) return;
    if (
      userRole === 'sales' &&
      (activeSection === 'admin' || activeSection === 'sales_team' || activeSection === 'audit_logs')
    ) {
      setActiveSection('sales_dashboard');
    } else if (
      userRole === 'admin' &&
      (activeSection === 'sales_dashboard' || activeSection === 'visits' || activeSection === 'profile')
    ) {
      setActiveSection('admin');
    }
  }, [isAuthenticated, userRole, activeSection]);

  const activeProductCatalog = useMemo(
    () => mapFirestoreProductDocsToCatalog(liveProductDocs),
    [liveProductDocs]
  );

  // ISOLASI DATA SALES:
  // Sales representative hanya dapat melihat record transaksi dan kunjungan miliknya sendiri.
  // Role Admin dapat memonitor seluruh record transaksi dari semua sales representative di Karawang.
  const visibleVisits = useMemo(() => {
    if (userRole === 'admin') return visits;

    const currentEmail = (
      session?.email ||
      currentUser?.email ||
      activeSalesRep.email ||
      ''
    ).toLowerCase().trim();

    const currentName = (
      session?.displayName ||
      currentUser?.displayName ||
      activeSalesRep.name ||
      ''
    ).toLowerCase().trim();

    const currentId = activeSalesRep.id;

    return visits.filter((v) => {
      const vEmail = (v.salesRepEmail || '').toLowerCase().trim();
      const vName = (v.salesRepName || '').toLowerCase().trim();
      const vId = v.salesRepId;

      if (vEmail && currentEmail) {
        return vEmail === currentEmail;
      }
      if (vId && currentId) {
        return vId === currentId;
      }
      if (vName && currentName) {
        return vName === currentName;
      }
      // Fallback: If legacy visit has neither, allow current representative
      return true;
    });
  }, [visits, userRole, session, currentUser, activeSalesRep]);

  // Filtered visits for selected date (sesuai isolasi peran)
  const visitsForDate = useMemo(
    () => visibleVisits.filter((v) => v.date === selectedDate),
    [visibleVisits, selectedDate]
  );

  // Daily KPI metrics
  const kpiMetrics = useMemo(() => {
    const completedCount = visitsForDate.length;
    const targetCount = activeSalesRep.dailyVisitTarget;
    const coveragePct = Math.min(
      100,
      Math.round((completedCount / Math.max(1, targetCount)) * 100)
    );

    const orderVisits = visitsForDate.filter(
      (v) => v.outcome === VisitOutcome.ORDER
    );
    const noOrderVisits = visitsForDate.filter(
      (v) => v.outcome === VisitOutcome.NO_ORDER
    );

    const effectiveCallPct =
      completedCount > 0
        ? Math.round((orderVisits.length / completedCount) * 100)
        : 0;

    const totalRevenueIdr = orderVisits.reduce(
      (sum, v) => sum + (v.purchaseOrder?.netAmountIdr || 0),
      0
    );

    return {
      completedCount,
      targetCount,
      coveragePct,
      orderCount: orderVisits.length,
      noOrderCount: noOrderVisits.length,
      effectiveCallPct,
      totalRevenueIdr,
    };
  }, [visitsForDate, salesRep.dailyVisitTarget]);

  const displayedVisits = useMemo(() => {
    return visitsForDate.filter((v) => {
      const matchesFilter =
        visitFilter === 'ALL' ||
        (visitFilter === 'ORDER' && v.outcome === VisitOutcome.ORDER) ||
        (visitFilter === 'NO_ORDER' && v.outcome === VisitOutcome.NO_ORDER) ||
        visitFilter === 'ROUTE';

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        v.storeName.toLowerCase().includes(q) ||
        v.district.toLowerCase().includes(q) ||
        v.visitCode.toLowerCase().includes(q) ||
        v.storeOwner.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [visitsForDate, visitFilter, searchQuery]);

  const pendingRouteStores = useMemo(() => {
    return routeStops
      .filter((stop) => !stop.completedVisitId)
      .map((stop) => {
        const store = stores.find((s) => s.id === stop.storeId);
        return { stop, store };
      })
      .filter((item): item is { stop: PlannedRouteStop; store: Store } =>
        Boolean(item.store)
      );
  }, [routeStops, stores]);

  const handleOpenVisitRecorder = (storeId?: string) => {
    setPreselectedStoreId(storeId || null);
    setIsVisitRecorderOpen(true);
  };

  const handleSaveVisit = (newVisit: StoreVisit, newStore?: Store) => {
    // Explicitly guarantee active sales rep identity is stamped onto visit and PO
    const visitWithRep: StoreVisit = {
      ...newVisit,
      salesRepEmail: newVisit.salesRepEmail || activeSalesRep.email,
      salesRepName: newVisit.salesRepName || activeSalesRep.name,
      salesRepId: newVisit.salesRepId || activeSalesRep.id,
      purchaseOrder: newVisit.purchaseOrder
        ? {
            ...newVisit.purchaseOrder,
            salesRepEmail: newVisit.purchaseOrder.salesRepEmail || activeSalesRep.email,
            salesRepName: newVisit.purchaseOrder.salesRepName || activeSalesRep.name,
            salesRepId: newVisit.purchaseOrder.salesRepId || activeSalesRep.id,
          }
        : undefined,
    };

    if (newStore) {
      setStores((prev) => [newStore, ...prev]);
      setDoc(doc(db, 'Stores', newStore.id), newStore, { merge: true }).catch((err) =>
        console.warn('Firestore store save notice:', err)
      );
    } else {
      setStores((prev) =>
        prev.map((s) =>
          s.id === visitWithRep.storeId
            ? {
                ...s,
                lastVisitDate: visitWithRep.date,
                lastOutcome: visitWithRep.outcome,
              }
            : s
        )
      );
    }

    setVisits((prev) => [visitWithRep, ...prev]);
    setRouteStops((prev) =>
      prev.map((stop) =>
        stop.storeId === visitWithRep.storeId && !stop.completedVisitId
          ? { ...stop, completedVisitId: visitWithRep.id }
          : stop
      )
    );

    // Simpan ke Firestore
    setDoc(doc(db, 'Visits', visitWithRep.id), visitWithRep, { merge: true }).catch((err) =>
      console.warn('Firestore visit save notice:', err)
    );
  };

  const handleAddStore = (newStore: Store) => {
    setStores((prev) => [newStore, ...prev]);
    setDoc(doc(db, 'Stores', newStore.id), newStore, { merge: true }).catch((err) =>
      console.warn('Firestore store save notice:', err)
    );
    if (userRole === 'admin') {
      logAdminAction(
        'TAMBAH_TOKO',
        newStore.name,
        `Admin menambahkan outlet baru "${newStore.name}" (${newStore.storeCode}) di ${newStore.district}${newStore.subdistrict ? ', ' + newStore.subdistrict : ''}`
      );
    }
  };

  const handleEditStore = (updatedStore: Store) => {
    setStores((prev) =>
      prev.map((s) => (s.id === updatedStore.id ? updatedStore : s))
    );
    setDoc(doc(db, 'Stores', updatedStore.id), updatedStore, { merge: true }).catch((err) =>
      console.warn('Firestore store update notice:', err)
    );
    if (userRole === 'admin') {
      logAdminAction(
        'EDIT_TOKO',
        updatedStore.name,
        `Admin memperbarui data toko "${updatedStore.name}" (${updatedStore.storeCode}) di ${updatedStore.district}`
      );
    }
  };

  const handleDeleteStore = (storeId: string) => {
    const targetStore = stores.find((s) => s.id === storeId);
    setStores((prev) => prev.filter((s) => s.id !== storeId));
    deleteDoc(doc(db, 'Stores', storeId)).catch((err) =>
      console.warn('Firestore store delete notice:', err)
    );
    if (userRole === 'admin') {
      logAdminAction(
        'HAPUS_TOKO',
        targetStore ? targetStore.name : storeId,
        `Admin menghapus toko "${targetStore ? targetStore.name : storeId}" dari direktori`
      );
    }
  };

  // Kewenangan Admin: Menghapus pesanan tertentu
  const handleDeleteOrder = (orderOrVisitId: string) => {
    const targetVisit = visits.find(
      (v) =>
        v.id === orderOrVisitId ||
        v.purchaseOrder?.id === orderOrVisitId ||
        v.purchaseOrder?.poNumber === orderOrVisitId
    );

    setVisits((prev) =>
      prev.filter(
        (v) =>
          v.id !== orderOrVisitId &&
          v.purchaseOrder?.id !== orderOrVisitId &&
          v.purchaseOrder?.poNumber !== orderOrVisitId
      )
    );
    // Hapus dari Firestore
    deleteDoc(doc(db, 'Visits', orderOrVisitId)).catch((err) =>
      console.warn('Firestore delete notice:', err)
    );

    if (userRole === 'admin' && targetVisit?.purchaseOrder) {
      logAdminAction(
        'HAPUS_ORDER',
        targetVisit.purchaseOrder.poNumber,
        `Admin menghapus order ${targetVisit.purchaseOrder.poNumber} dari ${targetVisit.storeName} senilai ${formatIdr(targetVisit.purchaseOrder.netAmountIdr)}`
      );
    }
  };

  const handleUpdateOrderStatus = (
    orderOrVisitId: string,
    nextStatus: OrderStatus
  ) => {
    // Kebijakan Bisnis: Akun sales tidak dapat mengubah status menjadi APPROVED.
    // APPROVED adalah kewenangan khusus akun Admin saat sales sudah menyetorkan uang penjualan ke admin.
    if (userRole === 'sales' && nextStatus === OrderStatus.APPROVED) {
      console.warn('Akun sales tidak memiliki otoritas mengubah status menjadi Approved. Approval hanya dapat dilakukan oleh Admin setelah setor uang penjualan.');
      return;
    }

    const targetVisit = visits.find(
      (v) => v.id === orderOrVisitId || v.purchaseOrder?.id === orderOrVisitId
    );

    setVisits((prev) =>
      prev.map((v) =>
        (v.id === orderOrVisitId || v.purchaseOrder?.id === orderOrVisitId) &&
        v.purchaseOrder
          ? {
              ...v,
              purchaseOrder: {
                ...v.purchaseOrder,
                status: nextStatus,
              },
            }
          : v
      )
    );

    if (userRole === 'admin' && targetVisit?.purchaseOrder) {
      const isApproved = nextStatus === OrderStatus.APPROVED;
      logAdminAction(
        isApproved ? 'APPROVE_ORDER' : 'REVERT_ORDER',
        targetVisit.purchaseOrder.poNumber,
        `Admin mengubah status order ${targetVisit.purchaseOrder.poNumber} (${targetVisit.storeName}) menjadi ${nextStatus}`
      );
    }
  };

  const handleClearAllSalesRecords = () => {
    setVisits([]);
    try {
      localStorage.removeItem(VISITS_STORAGE_KEY);
    } catch {
      // ignore
    }
    setRouteStops((prev) =>
      prev.map((stop) => ({ ...stop, completedVisitId: undefined }))
    );
    setStores((prev) =>
      prev.map((s) => ({
        ...s,
        lastVisitDate: undefined,
        lastOutcome: undefined,
      }))
    );
  };

  const handleAddSalesPerson = (newPerson: SalesRepresentative) => {
    setSalesTeam((prev) => [newPerson, ...prev]);
    setDoc(doc(db, 'SalesPersons', newPerson.id), newPerson, { merge: true }).catch((err) =>
      console.warn('Firestore SalesPerson save notice:', err)
    );
    if (userRole === 'admin') {
      logAdminAction(
        'TAMBAH_SALES',
        newPerson.name,
        `Admin mendaftarkan sales person baru "${newPerson.name}" (${newPerson.employeeCode}) untuk wilayah: ${(newPerson.assignedDistricts || []).join(', ')}. Target: ${newPerson.dailyVisitTarget} Toko & ${formatIdr(newPerson.dailyOrderTargetIdr)}/Hari.`
      );
    }
  };

  const handleEditSalesPerson = (updatedPerson: SalesRepresentative) => {
    setSalesTeam((prev) =>
      prev.map((p) => (p.id === updatedPerson.id ? updatedPerson : p))
    );
    setDoc(doc(db, 'SalesPersons', updatedPerson.id), updatedPerson, { merge: true }).catch((err) =>
      console.warn('Firestore SalesPerson update notice:', err)
    );
    if (userRole === 'admin') {
      logAdminAction(
        'EDIT_SALES',
        updatedPerson.name,
        `Admin memperbarui data sales "${updatedPerson.name}" (${updatedPerson.employeeCode}). Target: ${updatedPerson.dailyVisitTarget} Toko & ${formatIdr(updatedPerson.dailyOrderTargetIdr)}/Hari.`
      );
    }
  };

  const handleDeleteSalesPerson = (personId: string) => {
    const target = salesTeam.find((p) => p.id === personId);
    setSalesTeam((prev) => prev.filter((p) => p.id !== personId));
    deleteDoc(doc(db, 'SalesPersons', personId)).catch((err) =>
      console.warn('Firestore SalesPerson delete notice:', err)
    );
    if (userRole === 'admin') {
      logAdminAction(
        'HAPUS_SALES',
        target ? target.name : personId,
        `Admin menghapus sales person "${target ? target.name : personId}" (${target?.employeeCode || '-'}) dari sistem GTM Karawang`
      );
    }
  };

  // Halaman Utama Awal: Tampilkan LoginPage jika pengguna belum login
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-10 font-sans">
      {/* Top Bar Header with Indofood Snack Time Branding (Biru, Putih, Kuning) */}
      <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-blue-100 px-4 sm:px-6 flex items-center justify-between shadow-2xs">
        {/* Zone 1: Logo & Brand Wordmark with Dropdown for Admin */}
        <div className="relative flex items-center gap-3">
          {userRole === 'admin' ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAdminMenuDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 p-1 -m-1 rounded-xl hover:bg-slate-100/90 active:bg-slate-200/80 transition-colors cursor-pointer group"
                aria-label="Menu Dropdown Admin Indofood Snack Time"
                aria-expanded={isAdminMenuDropdownOpen}
              >
                <IndofoodSnackTimeLogo size="sm" />
                <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-100 text-amber-900 group-hover:bg-amber-200 transition-colors shrink-0">
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isAdminMenuDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Admin Navigation Dropdown (Mobile, Tablet, and Desktop Accessible) */}
              {isAdminMenuDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-2xs"
                    onClick={() => setIsAdminMenuDropdownOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Menu Admin GTM Karawang
                      </p>
                      <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                        {session?.displayName || currentUser?.email || 'Admin Indofood'}
                      </p>
                    </div>

                    <div className="py-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSection('admin');
                          setIsAdminMenuDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          activeSection === 'admin'
                            ? 'bg-blue-900 text-amber-300'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Dashboard Admin</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveSection('orders');
                          setIsAdminMenuDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          activeSection === 'orders'
                            ? 'bg-blue-700 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <ShoppingBag className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>Monitoring Order</span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                            activeSection === 'orders'
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {visits.filter((v) => v.purchaseOrder).length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveSection('stores');
                          setIsAdminMenuDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          activeSection === 'stores'
                            ? 'bg-blue-700 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <StoreIcon className="w-4 h-4 text-teal-600 shrink-0" />
                          <span>Direktori Toko</span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                            activeSection === 'stores'
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {stores.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveSection('products');
                          setIsAdminMenuDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          activeSection === 'products'
                            ? 'bg-blue-700 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Package className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Koleksi /Product</span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                            activeSection === 'products'
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {liveProductDocs.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveSection('sales_team');
                          setIsAdminMenuDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          activeSection === 'sales_team'
                            ? 'bg-blue-700 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Daftar Sales Person</span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                            activeSection === 'sales_team'
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {salesTeam.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveSection('audit_logs');
                          setIsAdminMenuDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          activeSection === 'audit_logs'
                            ? 'bg-blue-700 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <History className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>Log Histori Admin</span>
                        </div>
                        {adminAuditLogs.length > 0 && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                              activeSection === 'audit_logs'
                                ? 'bg-amber-400 text-blue-950'
                                : 'bg-indigo-100 text-indigo-900'
                            }`}
                          >
                            {adminAuditLogs.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setActiveSection('sales_dashboard')}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity text-left cursor-pointer"
            >
              <IndofoodSnackTimeLogo size="sm" />
            </button>
          )}
        </div>

        {/* Zone 2: Navigation Links (Dipisahkan Ketat Berdasarkan Role Pengguna) */}
        <nav className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-slate-600">
          {userRole === 'admin' ? (
            /* Navigasi Khusus Admin GTM: Tanpa Dashboard Sales, Rute, atau Kunjungan */
            <>
              <button
                type="button"
                onClick={() => setActiveSection('admin')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeSection === 'admin'
                    ? 'bg-blue-900 text-amber-300 shadow-xs'
                    : 'hover:text-blue-950 hover:bg-blue-50 text-blue-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Dashboard Admin</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('orders')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeSection === 'orders'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'hover:text-blue-900 hover:bg-blue-50'
                }`}
              >
                Monitoring Order ({visits.filter((v) => v.purchaseOrder).length})
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('stores')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeSection === 'stores'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'hover:text-blue-900 hover:bg-blue-50'
                }`}
              >
                Direktori Toko ({stores.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('products')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeSection === 'products'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'hover:text-blue-900 hover:bg-blue-50'
                }`}
              >
                Koleksi /Product ({liveProductDocs.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('sales_team')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSection === 'sales_team'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'hover:text-blue-900 hover:bg-blue-50 text-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Daftar Sales ({salesTeam.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('audit_logs')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeSection === 'audit_logs'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'hover:text-blue-900 hover:bg-blue-50'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Log Histori Admin</span>
                {adminAuditLogs.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-blue-950 font-bold font-mono">
                    {adminAuditLogs.length}
                  </span>
                )}
              </button>
            </>
          ) : (
            /* Navigasi Khusus Sales Representative: Tanpa Dashboard Admin */
            <>
              <button
                type="button"
                onClick={() => setActiveSection('sales_dashboard')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeSection === 'sales_dashboard'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'hover:text-blue-900 hover:bg-blue-50'
                }`}
              >
                Dashboard Sales
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('visits')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeSection === 'visits'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'hover:text-blue-900 hover:bg-blue-50'
                }`}
              >
                Visit (Kunjungan)
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('orders')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeSection === 'orders'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'hover:text-blue-900 hover:bg-blue-50'
                }`}
              >
                Order ({visibleVisits.filter((v) => v.purchaseOrder).length})
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('stores')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeSection === 'stores'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'hover:text-blue-900 hover:bg-blue-50'
                }`}
              >
                Direktori Toko ({stores.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('profile')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeSection === 'profile'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'hover:text-blue-900 hover:bg-blue-50'
                }`}
              >
                Profile
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: Actions (Role Badge, User Chip, Keluar Button, Record Visit) */}
        <div className="flex items-center gap-2">
          {/* Active Role Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold shadow-2xs ${
              userRole === 'admin'
                ? 'bg-blue-950 text-amber-300 border-blue-900'
                : 'bg-blue-50 text-blue-900 border-blue-200'
            }`}
          >
            {userRole === 'admin' ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin GTM</span>
              </>
            ) : (
              <>
                <User className="w-3.5 h-3.5 text-blue-700" />
                <span>Sales Rep</span>
              </>
            )}
          </div>

          {/* Logged in User Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="max-w-[120px] truncate">
              {session?.displayName || currentUser?.email?.split('@')[0] || 'Pengguna'}
            </span>
          </div>

          {/* Tombol Keluar (Log Out) */}
          <button
            type="button"
            onClick={handleSignOut}
            className="min-h-[38px] px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Keluar dari akun dan kembali ke halaman login"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="hidden sm:inline">Keluar</span>
          </button>

          {/* Record Visit Primary CTA Button (Hanya Ditampilkan untuk Sales Representative) */}
          {userRole === 'sales' && (
            <button
              type="button"
              onClick={() => handleOpenVisitRecorder()}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-blue-950 text-xs font-black hover:from-amber-300 hover:to-yellow-300 active:scale-95 transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm border border-amber-300 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Record Visit</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content View Container */}
      <main
        className={`${
          activeSection === 'admin' || activeSection === 'sales_team'
            ? 'max-w-7xl'
            : 'max-w-5xl'
        } mx-auto px-4 sm:px-6 pt-5 space-y-5`}
      >
        {/* 1. DASHBOARD SALES VIEW - Khusus Role Sales (Hanya Melihat Data Sales yang Login) */}
        {userRole === 'sales' && activeSection === 'sales_dashboard' && (
          <SalesDashboardView
            salesRep={activeSalesRep}
            currentUserEmail={activeSalesRep.email}
            currentUserName={activeSalesRep.name}
            visits={visibleVisits}
            stores={stores}
            routeStops={routeStops}
            selectedDate={selectedDate}
            onOpenVisitRecorder={(storeId) => handleOpenVisitRecorder(storeId)}
            onNavigateSection={(sec) => setActiveSection(sec)}
            onViewInvoice={(v) => setSelectedInvoiceVisit(v)}
          />
        )}

        {/* 2. DASHBOARD ADMIN VIEW - Khusus Role Admin (Dapat Melihat Seluruh Record dari Semua Sales) */}
        {userRole === 'admin' && activeSection === 'admin' && (
          <AdminDashboardView
            currentUserEmail={currentUser?.email}
            currentUserName={currentUser?.displayName}
            stores={stores}
            visits={visits}
            liveProductDocs={liveProductDocs}
            activeProductCatalog={activeProductCatalog}
            areaList={areaList}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onDeleteOrder={handleDeleteOrder}
            onOpenVisitRecorder={() => handleOpenVisitRecorder()}
            onSignOut={handleSignOut}
            onClearAllSalesRecords={handleClearAllSalesRecords}
            onNavigateSection={(sec) => setActiveSection(sec as ActiveSection)}
          />
        )}

        {/* 3. PROFILE VIEW - Khusus Role Sales */}
        {userRole === 'sales' && activeSection === 'profile' && (
          <SalesProfileView
            salesRep={activeSalesRep}
            currentUser={currentUser}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
            onOpenFirebaseSheet={() => setIsFirebaseSheetOpen(true)}
            onSignOut={handleSignOut}
            onUpdateName={handleUpdateProfileName}
            totalVisitsCount={visibleVisits.length}
            totalOrdersCount={visibleVisits.filter((v) => v.outcome === VisitOutcome.ORDER).length}
            totalSalesIdr={visibleVisits.reduce(
              (sum, v) => sum + (v.purchaseOrder?.netAmountIdr || 0),
              0
            )}
          />
        )}

        {/* 4. PRODUCT COLLECTION VERIFICATION VIEW */}
        {activeSection === 'products' && (
          <ProductVerificationView
            currentUser={currentUser}
            authReady={authReady}
            onProductsLoaded={setLiveProductDocs}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
            userRole={userRole}
            onLogAction={logAdminAction}
          />
        )}

        {/* 5. VISIT (KUNJUNGAN) VIEW - Khusus Role Sales */}
        {userRole === 'sales' && activeSection === 'visits' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Daftar Kunjungan Toko (Visit Log)
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span>{activeSalesRep.name}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="text-blue-700 font-medium">{activeSalesRep.email}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="font-mono">{ACTIVE_FIREBASE_PROJECT_ID}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{visibleVisits.length} Total Riwayat Kunjungan</span>
                </p>
              </div>

              {/* Horizontal Date Scroller */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {SCHEDULE_DATES.map((d) => {
                  const isSelected = d.date === selectedDate;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => setSelectedDate(d.date)}
                      className={`min-h-[44px] min-w-[56px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex flex-col items-center justify-center shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-700 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:text-blue-900'
                      }`}
                    >
                      <span className="text-[10px] opacity-80">{d.dayShort}</span>
                      <span className="font-mono font-bold tabular-nums">
                        {d.dayNum}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setVisitFilter('ALL')}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    visitFilter === 'ALL'
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({visitsForDate.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVisitFilter('ORDER')}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    visitFilter === 'ORDER'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Beli (PO) ({kpiMetrics.orderCount})
                </button>
                <button
                  type="button"
                  onClick={() => setVisitFilter('NO_ORDER')}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    visitFilter === 'NO_ORDER'
                      ? 'bg-white text-amber-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tidak Beli ({kpiMetrics.noOrderCount})
                </button>
                <button
                  type="button"
                  onClick={() => setVisitFilter('ROUTE')}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    visitFilter === 'ROUTE'
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sisa Rute ({pendingRouteStores.length})
                </button>
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama toko, pemilik, atau area..."
                  className="w-full min-h-[40px] pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Visit Items List */}
            {visitFilter === 'ROUTE' ? (
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Toko Belum Dikunjungi di Rute Karawang Hari Ini
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {pendingRouteStores.length} toko tersisa
                  </span>
                </div>
                {pendingRouteStores.length === 0 ? (
                  <div className="p-10 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-900">
                      Semua target rute hari ini sudah dikunjungi!
                    </p>
                  </div>
                ) : (
                  pendingRouteStores.map(({ stop, store }) => (
                    <div
                      key={stop.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-800 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          #{stop.sequence}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {store.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            <span>{store.district}</span>
                            <span aria-hidden="true"> · </span>
                            <span>{store.category}</span>
                            <span aria-hidden="true"> · </span>
                            <span>{stop.reasonForVisit}</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {store.address}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenVisitRecorder(store.id)}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 transition-colors whitespace-nowrap self-end sm:self-center cursor-pointer shadow-xs"
                      >
                        Check-In & Record
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                {displayedVisits.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Belum ada kunjungan pada tanggal {selectedDate}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Klik tombol "Record Visit" untuk mencatat kunjungan toko baru atau transaksi.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenVisitRecorder()}
                      className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Catat Kunjungan Sekarang</span>
                    </button>
                  </div>
                ) : (
                  displayedVisits.map((visit) => {
                    const isOrder = visit.outcome === VisitOutcome.ORDER;
                    return (
                      <div
                        key={visit.id}
                        className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <button
                          type="button"
                          onClick={() => setInspectedVisit(visit)}
                          className="flex items-start gap-3.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isOrder
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isOrder ? (
                              <ShoppingBag className="w-5 h-5" />
                            ) : (
                              <AlertTriangle className="w-5 h-5" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {visit.storeName}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              <span>{visit.district}</span>
                              <span aria-hidden="true"> · </span>
                              <span>{visit.storeCategory}</span>
                              <span aria-hidden="true"> · </span>
                              <span className="font-mono">
                                {visit.checkInTime}–{visit.checkOutTime} WIB
                              </span>
                            </p>

                            {isOrder && visit.purchaseOrder ? (
                              <p className="text-xs text-slate-600 mt-1 truncate">
                                <span className="font-mono font-bold text-blue-900">
                                  {visit.purchaseOrder.poNumber}
                                </span>
                                {' · '}
                                {visit.purchaseOrder.items.length} SKUs (
                                {visit.purchaseOrder.totalItemsCount} unit)
                              </p>
                            ) : (
                              <p className="text-xs text-amber-800 mt-1 truncate">
                                <span className="font-semibold">
                                  Tidak Beli: {visit.noPurchaseDetail?.reasonLabel}
                                </span>
                              </p>
                            )}
                          </div>
                        </button>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pl-13 sm:pl-0 shrink-0">
                          {isOrder && visit.purchaseOrder ? (
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm font-mono font-black text-slate-900">
                                  {formatIdr(visit.purchaseOrder.netAmountIdr)}
                                </p>
                                <span className="text-[10px] text-emerald-700 font-semibold">
                                  {visit.purchaseOrder.status}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedInvoiceVisit(visit)}
                                className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Kwitansi</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              No Order
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setInspectedVisit(visit)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        {/* 6. STORE DIRECTORY VIEW */}
        {activeSection === 'stores' && (
          <StoreDirectoryView
            stores={stores}
            visits={userRole === 'admin' ? visits : visibleVisits}
            areaList={areaList}
            onStartVisitForStore={(storeId) => handleOpenVisitRecorder(storeId)}
            onAddStore={handleAddStore}
            onEditStore={handleEditStore}
            onDeleteStore={handleDeleteStore}
            userRole={userRole}
            onOpenNewStoreModal={() => handleOpenVisitRecorder()}
          />
        )}

        {/* 7. ORDERS & BARRIERS VIEW */}
        {activeSection === 'orders' && (
          <OrdersAndBarriersView
            mode="orders"
            userRole={userRole}
            visits={userRole === 'admin' ? visits : visibleVisits}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onDeleteOrder={handleDeleteOrder}
            onStartFollowUpVisit={(storeId) => handleOpenVisitRecorder(storeId)}
            onOpenNewVisit={() => handleOpenVisitRecorder()}
            onViewInvoice={(visit) => setSelectedInvoiceVisit(visit)}
          />
        )}

        {activeSection === 'no_orders' && (
          <OrdersAndBarriersView
            mode="no_orders"
            userRole={userRole}
            visits={userRole === 'admin' ? visits : visibleVisits}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onDeleteOrder={handleDeleteOrder}
            onStartFollowUpVisit={(storeId) => handleOpenVisitRecorder(storeId)}
            onOpenNewVisit={() => handleOpenVisitRecorder()}
          />
        )}

        {/* 8. ADMIN AUDIT LOGS VIEW (Log Histori Perubahan oleh Admin) */}
        {userRole === 'admin' && activeSection === 'audit_logs' && (
          <AdminAuditLogsView
            logs={adminAuditLogs}
            onClearLogs={handleClearAuditLogs}
          />
        )}

        {/* 9. DAFTAR SALES PERSON VIEW - Khusus Role Admin */}
        {userRole === 'admin' && activeSection === 'sales_team' && (
          <SalesTeamManagementView
            salesTeam={salesTeam}
            visits={visits}
            stores={stores}
            availableAreas={areaList}
            selectedDate={selectedDate}
            onAddSalesPerson={handleAddSalesPerson}
            onEditSalesPerson={handleEditSalesPerson}
            onDeleteSalesPerson={handleDeleteSalesPerson}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation Bar for Mobile Thumb Zone */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 items-center px-1"
      >
        {userRole === 'admin' ? (
          <>
            <button
              type="button"
              onClick={() => setActiveSection('admin')}
              className={`min-h-[48px] flex flex-col items-center justify-center cursor-pointer ${
                activeSection === 'admin'
                  ? 'text-blue-900 font-bold'
                  : 'text-slate-500'
              }`}
            >
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              <span className="text-[10px] font-semibold mt-0.5">Admin</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('orders')}
              className={`min-h-[48px] flex flex-col items-center justify-center cursor-pointer ${
                activeSection === 'orders'
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-500'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Order</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('stores')}
              className={`min-h-[48px] flex flex-col items-center justify-center cursor-pointer ${
                activeSection === 'stores'
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-500'
              }`}
            >
              <StoreIcon className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Toko</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('products')}
              className={`min-h-[48px] flex flex-col items-center justify-center cursor-pointer ${
                activeSection === 'products'
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-500'
              }`}
            >
              <Package className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Produk</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('audit_logs')}
              className={`min-h-[48px] flex flex-col items-center justify-center cursor-pointer ${
                activeSection === 'audit_logs'
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-500'
              }`}
            >
              <History className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Histori</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setActiveSection('sales_dashboard')}
              className={`min-h-[48px] flex flex-col items-center justify-center cursor-pointer ${
                activeSection === 'sales_dashboard'
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-500'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-1">Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('visits')}
              className={`min-h-[48px] flex flex-col items-center justify-center cursor-pointer ${
                activeSection === 'visits'
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-500'
              }`}
            >
              <Compass className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-1">Visit</span>
            </button>

            {/* Center Primary Action Trigger in Natural Thumb Zone */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => handleOpenVisitRecorder()}
                className="w-12 h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 text-blue-950 shadow-md flex items-center justify-center active:scale-95 transition-transform border border-amber-300 cursor-pointer"
                aria-label="Record New Visit"
              >
                <Plus className="w-6 h-6 stroke-[3]" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveSection('orders')}
              className={`min-h-[48px] flex flex-col items-center justify-center cursor-pointer ${
                activeSection === 'orders'
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-500'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-1">Order</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('profile')}
              className={`min-h-[48px] flex flex-col items-center justify-center cursor-pointer ${
                activeSection === 'profile'
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-500'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-1">Profile</span>
            </button>
          </>
        )}
      </nav>

      {/* Visit Detail Inspection Sheet */}
      {inspectedVisit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[88vh] flex flex-col overflow-hidden">
            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {inspectedVisit.storeName}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {inspectedVisit.visitCode} · {inspectedVisit.date} (
                  {inspectedVisit.checkInTime}–{inspectedVisit.checkOutTime} WIB)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedVisit(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-slate-500">Pemilik & Kategori</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {inspectedVisit.storeOwner} · {inspectedVisit.storeCategory}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Area Karawang</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    Kec. {inspectedVisit.district}
                  </p>
                </div>
                <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200/80">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-700" />
                    <span>
                      GPS ({inspectedVisit.coordinates.lat},{' '}
                      {inspectedVisit.coordinates.lng})
                    </span>
                  </span>
                  <span className="font-medium text-slate-700">
                    Display & POSM Terpasang
                  </span>
                </div>
              </div>

              {inspectedVisit.outcome === VisitOutcome.ORDER &&
              inspectedVisit.purchaseOrder ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-blue-50/70 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-blue-900 font-mono">
                      {inspectedVisit.purchaseOrder.poNumber}
                    </span>
                    <span className="font-semibold text-blue-800">
                      {inspectedVisit.purchaseOrder.paymentTerm} ·{' '}
                      {inspectedVisit.purchaseOrder.status}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {inspectedVisit.purchaseOrder.items.map((item) => (
                      <div
                        key={`${item.skuId}-${item.unit}`}
                        className="px-4 py-2.5 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {item.productName}
                          </p>
                          <p className="text-slate-500 font-mono">
                            {item.quantity} {item.unit} × {formatIdr(item.unitPriceIdr)}
                          </p>
                        </div>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {formatIdr(item.subtotalIdr)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                    <span>Total Pembayaran Faktur</span>
                    <span className="text-sm font-mono font-bold tabular-nums text-amber-300">
                      {formatIdr(inspectedVisit.purchaseOrder.netAmountIdr)}
                    </span>
                  </div>
                </div>
              ) : (
                inspectedVisit.noPurchaseDetail && (
                  <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                    <p className="font-bold text-amber-900">
                      Alasan Tidak Beli: {inspectedVisit.noPurchaseDetail.reasonLabel}
                    </p>
                    <p className="text-slate-700">
                      {inspectedVisit.noPurchaseDetail.notes}
                    </p>
                  </div>
                )
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setInspectedVisit(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
              {inspectedVisit.purchaseOrder && (
                <button
                  type="button"
                  onClick={() => {
                    const v = inspectedVisit;
                    setInspectedVisit(null);
                    setSelectedInvoiceVisit(v);
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-400 text-blue-950 font-bold text-xs hover:bg-amber-500 transition-colors cursor-pointer"
                >
                  Cetak / Unduh Kwitansi
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record Store Visit Modal */}
      <VisitRecorderModal
        isOpen={isVisitRecorderOpen}
        onClose={() => setIsVisitRecorderOpen(false)}
        stores={stores}
        salesRep={activeSalesRep}
        preselectedStoreId={preselectedStoreId}
        selectedDate={selectedDate}
        onSaveVisit={handleSaveVisit}
        productCatalog={activeProductCatalog}
        areaList={areaList}
      />

      {/* Kwitansi Modal */}
      {selectedInvoiceVisit?.purchaseOrder && (
        <InvoiceReceiptModal
          isOpen={Boolean(selectedInvoiceVisit)}
          onClose={() => setSelectedInvoiceVisit(null)}
          order={selectedInvoiceVisit.purchaseOrder}
          visit={selectedInvoiceVisit}
          store={stores.find((s) => s.id === selectedInvoiceVisit.storeId)}
          salesRepName={activeSalesRep.name}
        />
      )}

      {/* Sales Account Login & Authentication Testing Modal */}
      <SalesLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={() => {
          // Keep active view on current tab
        }}
      />

      {/* Existing Firebase Project & Auth Architecture Sheet */}
      <FirebaseConnectionSheet
        isOpen={isFirebaseSheetOpen}
        onClose={() => setIsFirebaseSheetOpen(false)}
        firebaseConfig={firebaseConfig}
        onUpdateFirebaseConfig={setFirebaseConfig}
        salesRep={activeSalesRep}
        isSignedInPreview={Boolean(currentUser)}
        onToggleSignInPreview={() => setActiveSection('products')}
      />
    </div>
  );
}
