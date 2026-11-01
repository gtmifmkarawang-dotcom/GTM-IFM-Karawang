import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Edit3,
  Eye,
  KeyRound,
  Lock,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { formatIdr } from '../data/karawangData';
import { AdminActionCategory } from '../types/gtm';
import {
  ACTIVE_FIREBASE_APP_ID,
  ACTIVE_FIREBASE_PROJECT_ID,
  ACTIVE_FIRESTORE_DATABASE_ID,
  EXISTING_COLLECTIONS,
  ExistingCollectionName,
  auth,
  db,
} from '../lib/firebase';

export interface RawFirestoreDoc {
  id: string;
  data: Record<string, unknown>;
}

interface ProductVerificationViewProps {
  currentUser: FirebaseUser | null;
  authReady: boolean;
  onProductsLoaded?: (docs: RawFirestoreDoc[]) => void;
  onOpenLoginModal?: () => void;
  userRole?: 'sales' | 'admin';
  onLogAction?: (category: AdminActionCategory, targetTitle: string, details: string) => void;
}

/**
 * Extracts product name with top priority on the user's exact field: `namaProduct`
 */
export function extractProductName(docItem: RawFirestoreDoc): string {
  const data = docItem.data;

  // 1. Highest priority: exact field `namaProduct` as specified by user
  if (typeof data.namaProduct === 'string' && data.namaProduct.trim()) {
    return data.namaProduct.trim();
  }
  if (typeof data['nama_product'] === 'string' && (data['nama_product'] as string).trim()) {
    return (data['nama_product'] as string).trim();
  }

  // 2. Common alternatives
  const candidateKeys = [
    'namaProduk',
    'nama_produk',
    'productName',
    'product_name',
    'Product_Name',
    'name',
    'nama',
    'Nama',
    'NamaProduct',
    'NamaProduk',
    'nama_barang',
    'namaBarang',
    'produk',
    'product',
    'title',
    'label',
    'item_name',
    'itemName',
  ];

  for (const key of candidateKeys) {
    const val = data[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }

  // 3. Case-insensitive search
  for (const [k, v] of Object.entries(data)) {
    const lower = k.toLowerCase();
    if (
      (lower.includes('namaproduct') ||
        lower.includes('namaproduk') ||
        lower.includes('productname') ||
        lower.includes('nama') ||
        lower.includes('name') ||
        lower.includes('produk') ||
        lower.includes('product')) &&
      typeof v === 'string' &&
      v.trim().length > 0
    ) {
      return v.trim();
    }
  }

  // 4. Fallback to first non-empty string
  for (const v of Object.values(data)) {
    if (typeof v === 'string' && v.trim().length > 0) {
      return v.trim();
    }
  }

  return docItem.id;
}

function extractProductActive(data: Record<string, unknown>): boolean | null {
  if (typeof data.active === 'boolean') {
    return data.active;
  }
  if (typeof data.isActive === 'boolean') {
    return data.isActive;
  }
  if (typeof data.active === 'string') {
    return data.active.toLowerCase() === 'true' || data.active === '1';
  }
  return null;
}

function pickStringField(
  data: Record<string, unknown>,
  candidates: string[]
): string | null {
  for (const key of candidates) {
    const val = data[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
    if (typeof val === 'number') {
      return String(val);
    }
  }
  return null;
}

function pickNumberField(
  data: Record<string, unknown>,
  candidates: string[]
): number | null {
  for (const key of candidates) {
    const val = data[key];
    if (typeof val === 'number' && !Number.isNaN(val)) {
      return val;
    }
    if (typeof val === 'string' && val.trim() !== '') {
      const cleaned = Number(val.replace(/[^0-9.-]+/g, ''));
      if (!Number.isNaN(cleaned) && cleaned > 0) {
        return cleaned;
      }
    }
  }
  return null;
}

function formatFieldValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (
    typeof val === 'object' &&
    val !== null &&
    'seconds' in val &&
    typeof (val as { seconds: unknown }).seconds === 'number'
  ) {
    return new Date((val as { seconds: number }).seconds * 1000).toLocaleString(
      'id-ID'
    );
  }
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

export const ProductVerificationView: React.FC<
  ProductVerificationViewProps
> = ({
  currentUser,
  authReady,
  onProductsLoaded,
  onOpenLoginModal,
  userRole = 'sales',
  onLogAction,
}) => {
  const [selectedCollection, setSelectedCollection] =
    useState<ExistingCollectionName>('Product');
  const [docs, setDocs] = useState<RawFirestoreDoc[]>([]);
  const [productDocsCache, setProductDocsCache] = useState<RawFirestoreDoc[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectedDoc, setInspectedDoc] = useState<RawFirestoreDoc | null>(
    null
  );
  const [showAuthPanel, setShowAuthPanel] = useState<boolean>(false);

  // Email/Password Authentication State
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState<string>('gtmifmkarawang@gmail.com');
  const [password, setPassword] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Add Product Modal & Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addLoading, setAddLoading] = useState<boolean>(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    namaProduct: '',
    skuCode: '',
    category: 'Snack Ekstrudat',
    harga: 140000,
    harga_perusahaan_rcg: 17500,
    harga_perusahaan_pcs: 3500,
    harga_jual: 150000,
    unit: 'CTN',
    supplier: 'PT Indofood Fortuna Makmur (IFM)',
  });

  // Edit Product Modal & Form State
  const [editingProduct, setEditingProduct] = useState<{
    id: string;
    namaProduct: string;
    skuCode: string;
    category: string;
    harga: number; // HPP per CTN/Karton
    harga_perusahaan_rcg: number; // HPP per RCG
    harga_perusahaan_pcs: number; // HPP per Pcs
    harga_jual: number;
    unit: string;
    supplier: string;
    active: boolean;
  } | null>(null);
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleOpenEditProduct = (docItem: RawFirestoreDoc) => {
    const data = docItem.data;
    const name = extractProductName(docItem);
    const sku = pickStringField(data, ['skuCode', 'sku', 'code', 'kode', 'barcode']) || '';
    const cat = pickStringField(data, ['category', 'kategori']) || 'Snack Indofood';
    const hpp = pickNumberField(data, ['harga', 'harga_perusahaan', 'price', 'hargaPerusahaan']) || 120000;
    const hppRcg =
      pickNumberField(data, [
        'harga_perusahaan_rcg',
        'harga_rcg',
        'hargaRcg',
        'companyPriceRcg',
        'harga_renceng',
      ]) ?? Math.round(hpp / 8);
    const hppPcs =
      pickNumberField(data, [
        'harga_perusahaan_pcs',
        'harga_pcs',
        'hargaPcs',
        'companyPricePcs',
      ]) ?? Math.round(hpp / 40);
    const hj = pickNumberField(data, ['harga_jual', 'hargaJual']) || Math.round((hpp * 1.065) / 500) * 500;
    const unit = pickStringField(data, ['unit', 'satuan', 'uom']) || 'CTN';
    const supplier = pickStringField(data, ['supplier', 'nama_supplier']) || 'PT Indofood Fortuna Makmur (IFM)';
    const active = extractProductActive(data) ?? true;

    setEditingProduct({
      id: docItem.id,
      namaProduct: name,
      skuCode: sku,
      category: cat,
      harga: hpp,
      harga_perusahaan_rcg: hppRcg,
      harga_perusahaan_pcs: hppPcs,
      harga_jual: hj,
      unit: unit,
      supplier: supplier,
      active: active,
    });
    setEditError(null);
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editingProduct.namaProduct.trim()) {
      setEditError('Nama produk wajib diisi.');
      return;
    }
    setEditLoading(true);
    setEditError(null);

    try {
      const hpp = Number(editingProduct.harga) || 120000;
      const hppRcg =
        Number(editingProduct.harga_perusahaan_rcg) || Math.round(hpp / 8);
      const hppPcs =
        Number(editingProduct.harga_perusahaan_pcs) || Math.round(hpp / 40);
      const hj = Number(editingProduct.harga_jual) || Math.round((hpp * 1.065) / 500) * 500;

      const updateData: Record<string, unknown> = {
        namaProduct: editingProduct.namaProduct.trim(),
        name: editingProduct.namaProduct.trim(),
        nama_product: editingProduct.namaProduct.trim(),
        skuCode: editingProduct.skuCode.trim(),
        code: editingProduct.skuCode.trim(),
        category: editingProduct.category.trim(),
        harga: hpp,
        harga_perusahaan: hpp,
        harga_perusahaan_rcg: hppRcg,
        harga_rcg: hppRcg,
        harga_perusahaan_pcs: hppPcs,
        harga_pcs: hppPcs,
        harga_jual: hj,
        unit: editingProduct.unit,
        satuan: editingProduct.unit,
        supplier: editingProduct.supplier,
        active: editingProduct.active,
        isActive: editingProduct.active,
        updatedAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'Product', editingProduct.id), updateData, { merge: true });
      } catch (fsErr) {
        console.warn('Firestore setDoc fallback:', fsErr);
      }

      const updated = docs.map((d) =>
        d.id === editingProduct.id
          ? { id: d.id, data: { ...d.data, ...updateData } }
          : d
      );

      setDocs(updated);
      setProductDocsCache(updated);
      if (onProductsLoaded) {
        onProductsLoaded(updated);
      }

      if (onLogAction) {
        onLogAction(
          'EDIT_PRODUK',
          editingProduct.namaProduct.trim(),
          `Admin mengubah produk "${editingProduct.namaProduct.trim()}" (HPP CTN: Rp ${hpp.toLocaleString('id-ID')}, HPP RCG: Rp ${hppRcg.toLocaleString('id-ID')}, HPP Pcs: Rp ${hppPcs.toLocaleString('id-ID')}, Jual: Rp ${hj.toLocaleString('id-ID')})`
        );
      }

      setEditingProduct(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal memperbarui produk.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.namaProduct.trim()) {
      setAddError('Nama produk wajib diisi.');
      return;
    }
    setAddLoading(true);
    setAddError(null);
    try {
      const hpp = Number(addForm.harga) || 120000;
      const hppRcg =
        Number(addForm.harga_perusahaan_rcg) || Math.round(hpp / 8);
      const hppPcs =
        Number(addForm.harga_perusahaan_pcs) || Math.round(hpp / 40);
      const hargaJual =
        Number(addForm.harga_jual) || Math.round((hpp * 1.065) / 500) * 500;

      const newDocData: Record<string, unknown> = {
        namaProduct: addForm.namaProduct.trim(),
        name: addForm.namaProduct.trim(),
        nama_product: addForm.namaProduct.trim(),
        skuCode:
          addForm.skuCode.trim() ||
          `IFM-${addForm.namaProduct.trim().slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        code:
          addForm.skuCode.trim() ||
          `IFM-${addForm.namaProduct.trim().slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        category: addForm.category.trim() || 'Snack Indofood',
        harga: hpp,
        harga_perusahaan: hpp,
        harga_perusahaan_rcg: hppRcg,
        harga_rcg: hppRcg,
        harga_perusahaan_pcs: hppPcs,
        harga_pcs: hppPcs,
        harga_jual: hargaJual,
        unit: addForm.unit || 'CTN',
        satuan: addForm.unit || 'CTN',
        supplier: addForm.supplier || 'PT Indofood Fortuna Makmur (IFM)',
        active: true,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      let newDocId = `prod-${Date.now()}`;
      try {
        const addedRef = await addDoc(collection(db, 'Product'), newDocData);
        newDocId = addedRef.id;
      } catch (fsErr) {
        console.warn('Firestore addDoc fallback:', fsErr);
      }

      const newRawDoc: RawFirestoreDoc = {
        id: newDocId,
        data: newDocData,
      };

      setDocs((prev) => [newRawDoc, ...prev]);
      setProductDocsCache((prev) => [newRawDoc, ...prev]);
      if (onProductsLoaded) {
        onProductsLoaded([newRawDoc, ...docs]);
      }

      if (onLogAction) {
        onLogAction(
          'TAMBAH_PRODUK',
          addForm.namaProduct.trim(),
          `Admin menambahkan produk baru "${addForm.namaProduct.trim()}" (ID: ${newDocId}, HPP: Rp ${hpp.toLocaleString('id-ID')}, Jual: Rp ${hargaJual.toLocaleString('id-ID')})`
        );
      }

      setIsAddModalOpen(false);
      setAddForm({
        namaProduct: '',
        skuCode: '',
        category: 'Snack Ekstrudat',
        harga: 140000,
        harga_perusahaan_rcg: 17500,
        harga_perusahaan_pcs: 3500,
        harga_jual: 150000,
        unit: 'CTN',
        supplier: 'PT Indofood Fortuna Makmur (IFM)',
      });
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : 'Gagal menambahkan produk baru.'
      );
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteProduct = async (docId: string, productName: string) => {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus produk "${productName}" dari koleksi /Product?`
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'Product', docId));
    } catch (err) {
      console.warn('Firestore deleteDoc notice:', err);
    }

    const updated = docs.filter((d) => d.id !== docId);
    setDocs(updated);
    setProductDocsCache(updated);
    if (onProductsLoaded) {
      onProductsLoaded(updated);
    }

    if (onLogAction) {
      onLogAction(
        'HAPUS_PRODUK',
        productName,
        `Admin menghapus produk "${productName}" (ID: ${docId}) dari database`
      );
    }
  };

  /**
   * Directly queries collection using getDocs(collection(db, collectionName))
   * with strict try / catch / finally to ensure loading always settles.
   */
  const fetchCollectionDocs = useCallback(
    async (collectionName: ExistingCollectionName) => {
      setLoading(true);
      setReadError(null);

      try {
        const colRef = collection(db, collectionName);
        const snap = await getDocs(colRef);
        const fetched: RawFirestoreDoc[] = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          data: docSnap.data() as Record<string, unknown>,
        }));

        setDocs(fetched);
        setLastFetchedAt(new Date().toLocaleTimeString('id-ID'));

        if (collectionName === 'Product') {
          setProductDocsCache(fetched);
          if (onProductsLoaded) {
            onProductsLoaded(fetched);
          }
        }
      } catch (err: unknown) {
        console.warn('Gagal membaca collection ' + collectionName + ':', err);
        const rawMsg = err instanceof Error ? err.message : String(err);
        const friendlyMsg =
          rawMsg.includes('Could not reach Cloud Firestore backend') ||
          rawMsg.includes('offline')
            ? 'Backend Firestore belum dapat dijangkau (mode offline aktif). Periksa koneksi internet Anda atau coba lagi beberapa saat lagi.'
            : rawMsg;
        setReadError(friendlyMsg);
        setDocs([]);
      } finally {
        setLoading(false);
      }
    },
    [onProductsLoaded]
  );

  // Automatically read collection when authReady is true or currentUser changes
  useEffect(() => {
    if (!authReady) return;
    fetchCollectionDocs(selectedCollection);
  }, [authReady, currentUser, selectedCollection, fetchCollectionDocs]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email.trim() || !password) {
      setAuthError('Silakan masukkan email dan password.');
      return;
    }
    setAuthLoading(true);
    try {
      if (authMode === 'signin') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
      setPassword('');
      setShowAuthPanel(false);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Autentikasi gagal. Silakan periksa email dan password.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowAuthPanel(false);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Google Sign-In gagal.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    try {
      await signOut(auth);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-out gagal.');
    }
  };

  // Detected fields
  const detectedKeys = useMemo(() => {
    const keySet = new Set<string>();
    docs.forEach((d) => {
      Object.keys(d.data).forEach((k) => keySet.add(k));
    });
    return Array.from(keySet);
  }, [docs]);

  // Filtered docs based on search
  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => {
      if (d.id.toLowerCase().includes(q)) return true;
      const pName = extractProductName(d).toLowerCase();
      if (pName.includes(q)) return true;
      return Object.entries(d.data).some(([k, v]) => {
        return (
          k.toLowerCase().includes(q) ||
          formatFieldValue(v).toLowerCase().includes(q)
        );
      });
    });
  }, [docs, searchQuery]);

  // Prepared Product List for top highlight
  const productItems = useMemo(() => {
    const source =
      selectedCollection === 'Product' ? docs : productDocsCache;
    return source.map((docItem, index) => {
      const pName = extractProductName(docItem);
      const isActive = extractProductActive(docItem.data);
      return {
        index: index + 1,
        id: docItem.id,
        namaProduct: pName,
        active: isActive,
        raw: docItem.data,
      };
    });
  }, [selectedCollection, docs, productDocsCache]);

  return (
    <div className="space-y-5">
      {/* Top Connection & Status Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-teal-700 shrink-0" />
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                Koneksi Firebase & Pembacaan Collection /Product
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              <span>Project ID: </span>
              <strong className="font-mono text-slate-800">
                {ACTIVE_FIREBASE_PROJECT_ID}
              </strong>
              <span aria-hidden="true"> · </span>
              <span>Database: </span>
              <strong className="font-mono text-slate-800">
                {ACTIVE_FIRESTORE_DATABASE_ID}
              </strong>
              <span aria-hidden="true"> · </span>
              <span>Status: </span>
              <strong className="text-teal-700 font-semibold">
                Read-Only (Tidak Ada Data yang Diubah)
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (onOpenLoginModal) {
                  onOpenLoginModal();
                } else {
                  setShowAuthPanel((prev) => !prev);
                }
              }}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <KeyRound className="w-3.5 h-3.5 text-teal-700" />
              <span>
                {currentUser ? 'Akun Sales Aktif' : 'Test Log In Akun Sales'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => fetchCollectionDocs(selectedCollection)}
              disabled={loading}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-xs"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
              <span>Refresh /{selectedCollection}</span>
            </button>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900">
                Status Firebase
              </p>
              <p className="text-xs text-slate-600 font-mono truncate mt-0.5">
                {ACTIVE_FIREBASE_PROJECT_ID} ({ACTIVE_FIRESTORE_DATABASE_ID})
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <Package
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                readError ? 'text-amber-600' : 'text-teal-700'
              }`}
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900">
                Collection /{selectedCollection}
              </p>
              <p className="text-xs text-slate-600 font-mono mt-0.5">
                {loading
                  ? 'Sedang membaca dokumen...'
                  : readError
                  ? 'Periksa izin akses / login'
                  : `${docs.length} dokumen berhasil dibaca${
                      lastFetchedAt ? ` (${lastFetchedAt} WIB)` : ''
                    }`}
              </p>
            </div>
          </div>

          <div
            onClick={() => onOpenLoginModal && onOpenLoginModal()}
            className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 cursor-pointer hover:bg-slate-100/80 transition-colors"
          >
            <UserCheck
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                currentUser ? 'text-teal-700' : 'text-slate-400'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-900">
                  Status User
                </p>
                <span className="text-[10px] text-teal-700 font-bold underline">
                  {currentUser ? 'Kelola Akun' : 'Test Log In'}
                </span>
              </div>
              <p className="text-xs text-slate-600 truncate mt-0.5">
                {currentUser
                  ? `Authenticated: ${currentUser.email || currentUser.uid}`
                  : 'Belum login (klik untuk test log in akun sales)'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PROMINENT PRODUCT NAMES DISPLAY CARD (Special Highlight for 3 Products) */}
      <div className="bg-white rounded-2xl border-2 border-teal-600/30 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-teal-700" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Nama Produk dari Collection /Product
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Data asli dari Cloud Firestore database{' '}
              <span className="font-mono font-semibold text-slate-700">
                (default)
              </span>{' '}
              project{' '}
              <span className="font-mono font-semibold text-slate-700">
                {ACTIVE_FIREBASE_PROJECT_ID}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAddError(null);
                setIsAddModalOpen(true);
              }}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Tambah Produk</span>
            </button>
            <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 whitespace-nowrap">
              {productItems.length} Produk
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center space-y-3">
            <RefreshCw className="w-7 h-7 text-teal-700 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-800">
              Sedang memuat data dari collection /Product...
            </p>
            <p className="text-xs text-slate-500">
              Menghubungi Cloud Firestore database (default)
            </p>
          </div>
        ) : readError ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
              <span>Gagal membaca collection /Product</span>
            </div>
            <p className="text-xs text-amber-800 font-mono">{readError}</p>
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => fetchCollectionDocs('Product')}
                className="px-3 py-1.5 rounded-lg bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800"
              >
                Coba Lagi
              </button>
              {!currentUser && (
                <button
                  type="button"
                  onClick={() => setShowAuthPanel(true)}
                  className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-900 text-xs font-semibold hover:bg-amber-100"
                >
                  Buka Form Login
                </button>
              )}
            </div>
          </div>
        ) : productItems.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">
              Tidak ada dokumen ditemukan di collection /Product
            </p>
            <p className="text-xs text-slate-500">
              Pastikan nama collection adalah Product di database (default) project sales-gtm-karawang.
            </p>
            <button
              type="button"
              onClick={() => fetchCollectionDocs('Product')}
              className="mt-2 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800"
            >
              Refresh Data
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {productItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-50/80 hover:bg-teal-50/30 border border-slate-200/90 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {item.index}
                  </span>
                  {item.active !== null ? (
                    <span
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded-md ${
                        item.active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.active ? 'Aktif' : 'Non-aktif'}
                    </span>
                  ) : null}
                </div>

                <div>
                  <p className="text-xs text-slate-500 font-medium">
                    Nama Produk:
                  </p>
                  <p className="text-base font-bold text-slate-900 leading-snug">
                    {item.namaProduct}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 text-xs space-y-1.5 text-slate-500">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[11px]">Doc ID: {item.id}</p>
                    {userRole === 'admin' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const matchingDoc = docs.find((d) => d.id === item.id) || {
                              id: item.id,
                              data: item.raw,
                            };
                            handleOpenEditProduct(matchingDoc);
                          }}
                          className="px-2 py-0.5 rounded-lg border border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Edit produk ini (Admin)"
                        >
                          <Edit3 className="w-3 h-3 text-amber-700" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(item.id, item.namaProduct)}
                          className="px-2 py-0.5 rounded-lg border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Hapus produk ini"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    )}
                  </div>
                  {item.raw.harga !== undefined || item.raw.price !== undefined ? (
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                        <span>Harga Perusahaan:</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-teal-100 text-teal-800 font-semibold">Firebase</span>
                      </span>
                      <span className="text-teal-900 font-bold font-mono text-xs">
                        {formatIdr(Number(item.raw.harga ?? item.raw.price ?? 0))}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auth Panel (if needed to sign in or view user) */}
      {(showAuthPanel || (!currentUser && readError)) && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
          {currentUser ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Login Berhasil ke {ACTIVE_FIREBASE_PROJECT_ID}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    Email: {currentUser.email || 'N/A'} · UID: {currentUser.uid}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-teal-700" />
                    <span>
                      Login Firebase Email / Password ({ACTIVE_FIREBASE_PROJECT_ID})
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gunakan akun Firebase Authentication yang terdaftar untuk mengakses database Firestore.
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setAuthError(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      authMode === 'signin'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setAuthError(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      authMode === 'register'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Daftar Akun Baru
                  </button>
                </div>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <form
                onSubmit={handleEmailAuth}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (e.g. gtmifmkarawang@gmail.com)"
                  className="min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password Firebase"
                  className="min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="min-h-[44px] flex-1 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {authLoading
                        ? 'Memproses...'
                        : authMode === 'signin'
                        ? 'Login & Baca Data'
                        : 'Buat Akun'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={authLoading}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors whitespace-nowrap"
                  >
                    Google
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Explorer / Table of Documents from Selected Collection */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {EXISTING_COLLECTIONS.map((colName) => {
              const isSelected = selectedCollection === colName;
              return (
                <button
                  key={colName}
                  type="button"
                  onClick={() => setSelectedCollection(colName)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {colName}
                  {colName === 'Product' ? ' (Aktif)' : ''}
                </button>
              );
            })}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Cari dokumen di /${selectedCollection}...`}
              className="w-full min-h-[40px] pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
            />
          </div>
        </div>

        {detectedKeys.length > 0 && (
          <div className="text-xs text-slate-500 px-1">
            <span className="font-semibold text-slate-700">
              Field Terdeteksi pada /{selectedCollection} ({detectedKeys.length}):{' '}
            </span>
            <span className="font-mono text-slate-600">
              {detectedKeys.join(' · ')}
            </span>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-teal-700 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-700">
              Membaca dokumen /{selectedCollection} dari {ACTIVE_FIREBASE_PROJECT_ID}...
            </p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-10 text-center space-y-1">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-1" />
            <p className="text-sm font-semibold text-slate-800">
              {docs.length === 0
                ? `Tidak ada dokumen di collection /${selectedCollection}`
                : 'Tidak ada dokumen yang cocok dengan pencarian'}
            </p>
            <p className="text-xs text-slate-500">
              Terhubung ke project {ACTIVE_FIREBASE_PROJECT_ID} · database{' '}
              {ACTIVE_FIRESTORE_DATABASE_ID}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {filteredDocs.map((docItem) => {
              const title = extractProductName(docItem);
              const isActive = extractProductActive(docItem.data);

              const code = pickStringField(docItem.data, [
                'code',
                'kode',
                'sku',
                'skuCode',
                'kode_produk',
                'productCode',
                'barcode',
              ]);

              const categoryOrSupplier = pickStringField(docItem.data, [
                'category',
                'kategori',
                'supplier',
                'nama_supplier',
                'supplierName',
                'brand',
                'merek',
              ]);

              const unit = pickStringField(docItem.data, [
                'unit',
                'satuan',
                'uom',
                'kemasan',
              ]);

              const price = pickNumberField(docItem.data, [
                'harga',
                'harga_perusahaan',
                'hargaPerusahaan',
                'price',
                'harga_jual',
                'hargaJual',
                'unitPrice',
                'priceIdr',
                'total',
              ]);

              const entries = Object.entries(docItem.data);

              return (
                <div
                  key={docItem.id}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {title}
                      </p>
                      {isActive !== null && (
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 truncate">
                      <span className="font-mono text-slate-700">
                        ID: {docItem.id}
                      </span>
                      {code && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono">Kode: {code}</span>
                        </>
                      )}
                      {categoryOrSupplier && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>{categoryOrSupplier}</span>
                        </>
                      )}
                      {unit && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>Satuan: {unit}</span>
                        </>
                      )}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-slate-600">
                      {entries.map(([k, v]) => (
                        <span key={k} className="truncate max-w-xs">
                          <strong className="font-medium text-slate-700">
                            {k}:
                          </strong>{' '}
                          <span className="font-mono">
                            {formatFieldValue(v)}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      {price !== null && (
                        <>
                          <p className="text-sm font-mono font-bold text-teal-800 tabular-nums">
                            {formatIdr(price)}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            per {unit || 'CTN'}
                          </p>
                        </>
                      )}
                      {Boolean(
                        docItem.data.harga_perusahaan_rcg ||
                          docItem.data.harga_rcg ||
                          docItem.data.harga_perusahaan_pcs ||
                          docItem.data.harga_pcs
                      ) && (
                        <div className="flex sm:justify-end gap-1 mt-1 text-[10px] font-mono">
                          {Boolean(docItem.data.harga_perusahaan_rcg || docItem.data.harga_rcg) && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                              RCG: {formatIdr(Number(docItem.data.harga_perusahaan_rcg || docItem.data.harga_rcg))}
                            </span>
                          )}
                          {Boolean(docItem.data.harga_perusahaan_pcs || docItem.data.harga_pcs) && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                              Pcs: {formatIdr(Number(docItem.data.harga_perusahaan_pcs || docItem.data.harga_pcs))}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {userRole === 'admin' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEditProduct(docItem)}
                            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
                            title="Edit data produk (khusus Admin)"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(docItem.id, title)}
                            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
                            title="Hapus produk ini dari database"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Hapus</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => setInspectedDoc(docItem)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Raw JSON</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Raw Document Inspector Modal */}
      {inspectedDoc && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-mono">
                  /{selectedCollection}/{inspectedDoc.id}
                </h3>
                <p className="text-xs text-slate-500">
                  Data dokumen Firestore dari project {ACTIVE_FIREBASE_PROJECT_ID}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedDoc(null)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
                {JSON.stringify(
                  { id: inspectedDoc.id, ...inspectedDoc.data },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PRODUK BARU (/Product) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-gradient-to-r from-teal-900 to-teal-950 text-white p-5 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-teal-300" />
                  <h3 className="text-base font-bold text-white">
                    Tambah Produk Baru ke /Product
                  </h3>
                </div>
                <p className="text-xs text-teal-200">
                  Database Firestore {ACTIVE_FIREBASE_PROJECT_ID} · PT Indofood Fortuna Makmur
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="p-5 space-y-4 overflow-y-auto flex-1">
              {addError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Produk <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.namaProduct}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, namaProduct: e.target.value }))
                  }
                  placeholder="Contoh: Chiki Twist Jagung Bakar 40g"
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kode SKU / Produk
                  </label>
                  <input
                    type="text"
                    value={addForm.skuCode}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, skuCode: e.target.value }))
                    }
                    placeholder="Contoh: CHK-TW-JB40"
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kategori Produk
                  </label>
                  <select
                    value={addForm.category}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
                  >
                    <option value="Snack Ekstrudat">Snack Ekstrudat (Chiki/Cheetos)</option>
                    <option value="Keripik Kentang">Keripik Kentang (Chitato/Lay's)</option>
                    <option value="Keripik Singkong">Keripik Singkong (Qtela)</option>
                    <option value="Biskuit & Cookies">Biskuit & Cookies</option>
                    <option value="Kacang & Biji">Kacang & Camilan</option>
                    <option value="Wafer & Cokelat">Wafer & Cokelat</option>
                    <option value="Snack Indofood">Snack Indofood Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Group: HPP Perusahaan per Kemasan */}
              <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-950 uppercase tracking-wider">
                    Harga Perusahaan / HPP (Sesuai Kemasan)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-200 text-teal-900 font-mono">
                    HPP Indofood
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      HPP per Karton (CTN) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        required
                        min={0}
                        step={500}
                        value={addForm.harga}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setAddForm((prev) => ({
                            ...prev,
                            harga: val,
                            harga_perusahaan_rcg: Math.round(val / 8),
                            harga_perusahaan_pcs: Math.round(val / 40),
                            harga_jual: Math.round((val * 1.065) / 500) * 500,
                          }));
                        }}
                        className="w-full min-h-[42px] pl-8 pr-2.5 py-1.5 text-xs bg-white border border-teal-300 rounded-xl focus:outline-none focus:border-teal-700 font-mono font-bold"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">1 Dus (40 pcs)</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        HPP per RCG <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAddForm((prev) => ({
                            ...prev,
                            harga_perusahaan_rcg: Math.round(prev.harga / 8),
                          }));
                        }}
                        className="text-[9px] text-blue-700 hover:underline font-bold cursor-pointer"
                      >
                        Auto (÷8)
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={addForm.harga_perusahaan_rcg}
                        onChange={(e) =>
                          setAddForm((prev) => ({
                            ...prev,
                            harga_perusahaan_rcg: Number(e.target.value) || 0,
                          }))
                        }
                        className="w-full min-h-[42px] pl-8 pr-2.5 py-1.5 text-xs bg-white border border-teal-300 rounded-xl focus:outline-none focus:border-teal-700 font-mono font-bold"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">1 Renceng (10 pcs)</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        HPP per Pcs <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAddForm((prev) => ({
                            ...prev,
                            harga_perusahaan_pcs: Math.round(prev.harga / 40),
                          }));
                        }}
                        className="text-[9px] text-blue-700 hover:underline font-bold cursor-pointer"
                      >
                        Auto (÷40)
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={addForm.harga_perusahaan_pcs}
                        onChange={(e) =>
                          setAddForm((prev) => ({
                            ...prev,
                            harga_perusahaan_pcs: Number(e.target.value) || 0,
                          }))
                        }
                        className="w-full min-h-[42px] pl-8 pr-2.5 py-1.5 text-xs bg-white border border-teal-300 rounded-xl focus:outline-none focus:border-teal-700 font-mono font-bold"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">1 Satuan eceran</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Harga Jual ke Toko per CTN <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    required
                    min={0}
                    step={500}
                    value={addForm.harga_jual}
                    onChange={(e) =>
                      setAddForm((prev) => ({
                        ...prev,
                        harga_jual: Number(e.target.value),
                      }))
                    }
                    className="w-full min-h-[44px] pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white font-mono font-bold text-teal-800"
                  />
                </div>
                <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                  Margin CTN: +{formatIdr(Math.max(0, Number(addForm.harga_jual) - Number(addForm.harga)))}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Satuan Kemasan (UoM)
                  </label>
                  <select
                    value={addForm.unit}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, unit: e.target.value }))
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white font-semibold"
                  >
                    <option value="CTN">CTN (Karton Dus)</option>
                    <option value="RCG">RCG (Renceng)</option>
                    <option value="Karton">Karton</option>
                    <option value="Pack">Pack</option>
                    <option value="Box">Box</option>
                    <option value="Pcs">Pcs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Supplier Perusahaan
                  </label>
                  <input
                    type="text"
                    value={addForm.supplier}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, supplier: e.target.value }))
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{addLoading ? 'Menyimpan...' : 'Simpan Produk ke /Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal (Admin Role Only) */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-amber-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Edit Produk (Admin)
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {editingProduct.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="p-5 space-y-4">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Produk <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.namaProduct}
                  onChange={(e) =>
                    setEditingProduct((prev) =>
                      prev ? { ...prev, namaProduct: e.target.value } : null
                    )
                  }
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600 focus:bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    SKU / Kode Produk
                  </label>
                  <input
                    type="text"
                    value={editingProduct.skuCode}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, skuCode: e.target.value } : null
                      )
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kategori Produk
                  </label>
                  <input
                    type="text"
                    value={editingProduct.category}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, category: e.target.value } : null
                      )
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Group: Harga Pokok / HPP Perusahaan Berdasarkan Kemasan */}
              <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-teal-700" />
                    <span className="text-xs font-bold text-teal-950 uppercase tracking-wider">
                      Harga Perusahaan / HPP (Sesuai Kemasan)
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-200/70 text-teal-900 font-mono">
                    HPP Indofood
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1. Harga Perusahaan per CTN */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      HPP per CTN (Karton) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={editingProduct.harga}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setEditingProduct((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  harga: val,
                                }
                              : null
                          );
                        }}
                        className="w-full min-h-[42px] pl-8 pr-2.5 py-1.5 text-xs font-mono font-bold text-teal-900 bg-white border border-teal-300 rounded-xl focus:outline-none focus:border-teal-700"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      1 Karton Dus (40 pcs)
                    </span>
                  </div>

                  {/* 2. Harga Perusahaan per RCG (Renceng) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        HPP per RCG (Renceng) <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const autoVal = Math.round(editingProduct.harga / 8);
                          setEditingProduct((prev) =>
                            prev ? { ...prev, harga_perusahaan_rcg: autoVal } : null
                          );
                        }}
                        className="text-[9px] text-blue-700 hover:underline font-bold cursor-pointer"
                        title="Hitung otomatis dari CTN ÷ 8"
                      >
                        Auto (÷8)
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={editingProduct.harga_perusahaan_rcg}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setEditingProduct((prev) =>
                            prev ? { ...prev, harga_perusahaan_rcg: val } : null
                          );
                        }}
                        className="w-full min-h-[42px] pl-8 pr-2.5 py-1.5 text-xs font-mono font-bold text-teal-900 bg-white border border-teal-300 rounded-xl focus:outline-none focus:border-teal-700"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      1 Renceng (10 pcs / 1/8 ctn)
                    </span>
                  </div>

                  {/* 3. Harga Perusahaan per Pcs */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        HPP per Pcs (Satuan) <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const autoVal = Math.round(editingProduct.harga / 40);
                          setEditingProduct((prev) =>
                            prev ? { ...prev, harga_perusahaan_pcs: autoVal } : null
                          );
                        }}
                        className="text-[9px] text-blue-700 hover:underline font-bold cursor-pointer"
                        title="Hitung otomatis dari CTN ÷ 40"
                      >
                        Auto (÷40)
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={editingProduct.harga_perusahaan_pcs}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setEditingProduct((prev) =>
                            prev ? { ...prev, harga_perusahaan_pcs: val } : null
                          );
                        }}
                        className="w-full min-h-[42px] pl-8 pr-2.5 py-1.5 text-xs font-mono font-bold text-teal-900 bg-white border border-teal-300 rounded-xl focus:outline-none focus:border-teal-700"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      1 Pcs Satuan (1/40 ctn)
                    </span>
                  </div>
                </div>
              </div>

              {/* Harga Jual Standar Toko */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Harga Jual Standar ke Toko per CTN (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editingProduct.harga_jual}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, harga_jual: Number(e.target.value) || 0 } : null
                      )
                    }
                    className="w-full min-h-[44px] pl-9 pr-3.5 py-2 text-sm font-mono font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
                <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                  Estimasi Margin CTN: +{formatIdr(Math.max(0, editingProduct.harga_jual - editingProduct.harga))}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Satuan Kemasan (UoM)
                  </label>
                  <select
                    value={editingProduct.unit}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev ? { ...prev, unit: e.target.value } : null
                      )
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600 focus:bg-white font-semibold"
                  >
                    <option value="CTN">CTN (Karton Dus)</option>
                    <option value="RCG">RCG (Renceng)</option>
                    <option value="Karton">Karton</option>
                    <option value="Pack">Pack</option>
                    <option value="Box">Box</option>
                    <option value="Pcs">Pcs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status Produk
                  </label>
                  <label className="min-h-[44px] px-3.5 py-2 flex items-center gap-2.5 bg-slate-50 border border-slate-300 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProduct.active}
                      onChange={(e) =>
                        setEditingProduct((prev) =>
                          prev ? { ...prev, active: e.target.checked } : null
                        )
                      }
                      className="w-4 h-4 rounded text-teal-700 focus:ring-teal-700 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      {editingProduct.active ? 'Produk Aktif (Dapat Dipesan)' : 'Produk Non-Aktif'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{editLoading ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
