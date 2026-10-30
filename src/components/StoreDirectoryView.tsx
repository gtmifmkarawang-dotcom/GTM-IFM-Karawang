import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Edit3,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Search,
  Store as StoreIcon,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { KARAWANG_DISTRICTS, formatIdr } from '../data/karawangData';
import {
  Store,
  StoreCategory,
  StoreVisit,
  VisitOutcome,
} from '../types/gtm';

interface StoreDirectoryViewProps {
  stores: Store[];
  visits: StoreVisit[];
  onStartVisitForStore: (storeId: string) => void;
  onAddStore: (newStore: Store) => void;
  areaList?: string[];
  onOpenNewStoreModal?: () => void;
  userRole?: 'sales' | 'admin';
  onEditStore?: (store: Store) => void;
  onDeleteStore?: (storeId: string) => void;
}

export const StoreDirectoryView: React.FC<StoreDirectoryViewProps> = ({
  stores,
  visits,
  onStartVisitForStore,
  onAddStore,
  areaList,
  onOpenNewStoreModal,
  userRole = 'sales',
  onEditStore,
  onDeleteStore,
}) => {
  const availableAreas = useMemo(() => {
    const raw = areaList && areaList.length > 0 ? areaList : KARAWANG_DISTRICTS;
    return Array.from(
      new Set(
        raw.filter(
          (a): a is string => typeof a === 'string' && a.trim().length > 0
        )
      )
    );
  }, [areaList]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New store form state
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<StoreCategory>(StoreCategory.RETAIL);
  const [district, setDistrict] = useState<string>(() => availableAreas[0] || 'Desa Batu Jaya');
  const [subdistrict, setSubdistrict] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('5000000');
  const [notes, setNotes] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit store form state (Khusus Admin)
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editName, setEditName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCategory, setEditCategory] = useState<StoreCategory>(StoreCategory.RETAIL);
  const [editDistrict, setEditDistrict] = useState<string>(() => availableAreas[0] || 'Desa Batu Jaya');
  const [editSubdistrict, setEditSubdistrict] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCreditLimit, setEditCreditLimit] = useState('5000000');
  const [editNotes, setEditNotes] = useState('');
  const [editCoordinates, setEditCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isEditGettingGps, setIsEditGettingGps] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  useEffect(() => {
    if (availableAreas.length > 0 && !availableAreas.includes(district)) {
      setDistrict(availableAreas[0]);
    }
  }, [availableAreas, district]);

  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const matchesDistrict =
        selectedDistrict === 'ALL' || store.district === selectedDistrict;
      const matchesCategory =
        selectedCategory === 'ALL' || store.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        store.name.toLowerCase().includes(q) ||
        store.ownerName.toLowerCase().includes(q) ||
        store.storeCode.toLowerCase().includes(q) ||
        store.district.toLowerCase().includes(q) ||
        store.address.toLowerCase().includes(q);
      return matchesDistrict && matchesCategory && matchesSearch;
    });
  }, [stores, selectedDistrict, selectedCategory, searchQuery]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser tidak mendukung pendeteksian lokasi GPS.');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setIsGettingGps(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsGettingGps(false);
        // Fallback default coordinates in Karawang center
        setCoordinates({ lat: -6.3048, lng: 107.3025 });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCreateStore = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !ownerName.trim() || !address.trim()) {
      setFormError('Nama Toko, Nama Pemilik, dan Alamat Lengkap wajib diisi.');
      return;
    }

    const codeNum = String(stores.length + 1).padStart(3, '0');
    const newStore: Store = {
      id: `store-krw-${Date.now()}`,
      storeCode: `KRW-NOO-${codeNum}`,
      name: name.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim() || '0812-0000-0000',
      category,
      district,
      subdistrict: subdistrict.trim() || district,
      address: address.trim(),
      coordinates: coordinates || { lat: -6.3048, lng: 107.3025 },
      creditLimitIdr: Number(creditLimit) || 5000000,
      isActive: true,
      registeredAt: new Date().toISOString().split('T')[0],
      notes: notes.trim() || 'Pendaftaran toko baru (NOO) via Direktori Toko Karawang.',
    };

    onAddStore(newStore);
    setIsAddModalOpen(false);

    // Reset form
    setName('');
    setOwnerName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setCoordinates(null);
  };

  const handleOpenEdit = (store: Store) => {
    setEditingStore(store);
    setEditName(store.name);
    setEditOwnerName(store.ownerName);
    setEditPhone(store.phone);
    setEditCategory(store.category);
    setEditDistrict(store.district);
    setEditSubdistrict(store.subdistrict || store.district);
    setEditAddress(store.address);
    setEditNotes(store.notes || '');
    setEditCreditLimit(String(store.creditLimitIdr || 5000000));
    setEditCoordinates(store.coordinates || null);
    setEditFormError(null);
  };

  const handleGetEditLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser tidak mendukung pendeteksian lokasi GPS.');
      return;
    }
    setIsEditGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEditCoordinates({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setIsEditGettingGps(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsEditGettingGps(false);
        setEditCoordinates({ lat: -6.3048, lng: 107.3025 });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditFormError(null);
    if (!editingStore) return;
    if (!editName.trim() || !editOwnerName.trim() || !editAddress.trim()) {
      setEditFormError('Nama Toko, Nama Pemilik, dan Alamat Lengkap wajib diisi.');
      return;
    }

    const updatedStore: Store = {
      ...editingStore,
      name: editName.trim(),
      ownerName: editOwnerName.trim(),
      phone: editPhone.trim() || '0812-0000-0000',
      category: editCategory,
      district: editDistrict,
      subdistrict: editSubdistrict.trim() || editDistrict,
      address: editAddress.trim(),
      notes: editNotes.trim(),
      creditLimitIdr: Number(editCreditLimit) || 5000000,
      coordinates: editCoordinates || editingStore.coordinates,
    };

    if (onEditStore) {
      onEditStore(updatedStore);
    }
    setEditingStore(null);
    if (activeStore && activeStore.id === updatedStore.id) {
      setActiveStore(updatedStore);
    }
  };

  const handleDeleteStore = (store: Store) => {
    if (
      window.confirm(
        `Apakah Anda yakin ingin menghapus data toko "${store.name}" (${store.storeCode})?\n\nTindakan ini khusus admin dan akan menghapus data toko dari sistem GTM Karawang.`
      )
    ) {
      if (onDeleteStore) {
        onDeleteStore(store.id);
      }
      if (activeStore && activeStore.id === store.id) {
        setActiveStore(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section with branding & stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              Direktori Toko & Outlet
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-100 text-blue-900 border border-blue-200">
              {stores.length} Toko Terdaftar
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            PT Indofood Fortuna Makmur (IFM) · Master data outlet terdaftar di Area Karawang
          </p>
        </div>

        {userRole === 'admin' ? (
          <button
            type="button"
            onClick={() => {
              if (onOpenNewStoreModal) {
                onOpenNewStoreModal();
              } else {
                setIsAddModalOpen(true);
              }
            }}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Tambah Toko Baru (Admin)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (onOpenNewStoreModal) {
                onOpenNewStoreModal();
              } else {
                setIsAddModalOpen(true);
              }
            }}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Daftarkan Toko Baru (NOO)</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama toko, kode outlet, pemilik, atau alamat..."
            className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-700 focus:bg-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-700"
            >
              <option value="ALL">Semua Area ({availableAreas.length} Area)</option>
              {availableAreas.map((dist, idx) => (
                <option key={`filter-area-${dist}-${idx}`} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-700"
            >
              <option value="ALL">Semua Kategori Toko</option>
              {Object.values(StoreCategory).map((cat) => (
                <option key={`filter-cat-${cat}`} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Store List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-2xs">
        {filteredStores.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 mx-auto flex items-center justify-center border border-blue-100">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800">
                {stores.length === 0
                  ? 'Belum Ada Toko Terdaftar'
                  : 'Tidak ada toko yang sesuai filter'}
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {stores.length === 0
                  ? 'Belum ada toko yang diinput. Klik tombol di bawah untuk mendaftarkan outlet pertama Anda (New Outlet Opening - NOO).'
                  : 'Coba ubah kata kunci pencarian atau bersihkan filter area kecamatan.'}
              </p>
            </div>
            {stores.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenNewStoreModal) {
                    onOpenNewStoreModal();
                  } else {
                    setIsAddModalOpen(true);
                  }
                }}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Daftarkan Toko Baru (NOO) Sekarang</span>
              </button>
            )}
          </div>
        ) : (
          filteredStores.map((store, index) => {
            const storeVisits = visits.filter((v) => v.storeId === store.id);
            const totalOrderValue = storeVisits.reduce(
              (acc, v) => acc + (v.purchaseOrder?.netAmountIdr || 0),
              0
            );

            const uniqueStoreKey = `store-card-${store.id || store.storeCode || 'item'}-${index}`;

            return (
              <div
                key={uniqueStoreKey}
                className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={() => setActiveStore(store)}
                  className="text-left flex items-start gap-3.5 min-w-0 flex-1 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0 mt-0.5 border border-blue-100">
                    <StoreIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {store.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      <span className="font-mono text-slate-700 font-semibold">{store.storeCode}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{store.category}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{store.district}</span>
                      <span aria-hidden="true"> · </span>
                      <span>Pemilik: {store.ownerName}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {store.address}
                    </p>
                  </div>
                </button>

                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-2 pl-13 sm:pl-0 shrink-0">
                  <div className="text-left sm:text-right mr-1">
                    <p className="text-xs text-slate-500">
                      {storeVisits.length} kunjungan
                    </p>
                    <p className="text-xs font-mono font-bold text-slate-900">
                      {totalOrderValue > 0 ? formatIdr(totalOrderValue) : 'Rp 0'}
                    </p>
                  </div>

                  {userRole === 'admin' && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(store);
                        }}
                        className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-blue-200 text-blue-700 bg-blue-50/70 hover:bg-blue-100 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Edit data toko (Khusus Admin)"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStore(store);
                        }}
                        className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50/70 hover:bg-rose-100 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Hapus toko (Khusus Admin)"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Hapus</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => onStartVisitForStore(store.id)}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
                  >
                    Kunjungi
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Store Detail Inspection Modal */}
      {activeStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeStore.name}
                </h3>
                <p className="text-xs font-mono text-slate-500">
                  {activeStore.storeCode} · {activeStore.category}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveStore(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-slate-500 block mb-0.5">Pemilik / PIC</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-700" />
                    {activeStore.ownerName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Nomor Telepon</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-700" />
                    {activeStore.phone}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Alamat Lengkap</span>
                <p className="text-slate-800 flex items-start gap-1.5 font-medium leading-relaxed">
                  <MapPin className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  {activeStore.address}, {activeStore.subdistrict}, {activeStore.district}
                </p>
              </div>

              {activeStore.coordinates && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div className="font-mono text-slate-700">
                    <p className="font-bold text-blue-900">Koordinat GPS</p>
                    <p>{activeStore.coordinates.lat}, {activeStore.coordinates.lng}</p>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${activeStore.coordinates.lat},${activeStore.coordinates.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-blue-700 text-white font-semibold flex items-center gap-1 text-[11px] hover:bg-blue-800"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Buka Maps</span>
                  </a>
                </div>
              )}

              {activeStore.notes && (
                <div>
                  <span className="text-slate-500 block mb-1">Catatan Tambahan</span>
                  <p className="text-slate-700 bg-amber-50/70 p-3 rounded-xl border border-amber-200/60 italic">
                    &quot;{activeStore.notes}&quot;
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {userRole === 'admin' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const s = activeStore;
                        handleOpenEdit(s);
                      }}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold hover:bg-blue-100 cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Toko</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const s = activeStore;
                        handleDeleteStore(s);
                      }}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Hapus Toko</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStore(null)}
                  className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sId = activeStore.id;
                    setActiveStore(null);
                    onStartVisitForStore(sId);
                  }}
                  className="min-h-[40px] px-5 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 cursor-pointer shadow-xs"
                >
                  Mulai Kunjungan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Store (NOO) Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Daftarkan Toko Baru (NOO)
                </h3>
                <p className="text-xs text-slate-500">
                  New Outlet Opening · PT Indofood Fortuna Makmur (IFM)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="p-3 text-xs bg-red-50 text-red-800 rounded-xl border border-red-200">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Toko / Outlet *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Toko Sinar Rezeki"
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-700 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Pemilik / PIC *
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Contoh: H. Ahmad Subardjo"
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-700 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp / Telp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-700 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Outlet
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as StoreCategory)}
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-700"
                  >
                    {Object.values(StoreCategory).map((cat) => (
                      <option key={`add-cat-${cat}`} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Area Kecamatan
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-700"
                  >
                    {availableAreas.map((dist, idx) => (
                      <option key={`add-dist-${dist}-${idx}`} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Lengkap Toko *
                </label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Raya / No Rumah / Patokan toko..."
                  className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-700 focus:bg-white"
                />
              </div>

              {/* Titik Koordinat GPS */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Titik Koordinat GPS
                  </label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isGettingGps}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isGettingGps ? 'animate-spin' : ''}`} />
                    <span>{isGettingGps ? 'Mendeteksi...' : 'Ambil Titik GPS Lokasi'}</span>
                  </button>
                </div>
                {coordinates ? (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                    <span className="font-mono text-emerald-800 font-semibold">
                      {coordinates.lat}, {coordinates.lng}
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Cek di Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Klik tombol di atas untuk mencatat koordinat toko saat Anda berada di lokasi.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
                >
                  Simpan Toko Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Store Modal (Khusus Admin) */}
      {editingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-900 via-blue-800 to-blue-950 text-white">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  Edit Data Toko
                </h3>
                <p className="text-xs text-blue-200 font-mono">
                  {editingStore.storeCode} · {editingStore.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStore(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto text-xs">
              {editFormError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {editFormError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nama Toko / Outlet *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nama Pemilik / PIC *</label>
                  <input
                    type="text"
                    required
                    value={editOwnerName}
                    onChange={(e) => setEditOwnerName(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nomor WhatsApp / HP</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="0812xxxx"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Kategori Toko</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as StoreCategory)}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900 font-medium cursor-pointer"
                  >
                    {Object.values(StoreCategory).map((cat) => (
                      <option key={`edit-cat-${cat}`} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Kecamatan / Area Karawang</label>
                  <select
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900 font-medium cursor-pointer"
                  >
                    {availableAreas.map((area, idx) => (
                      <option key={`edit-area-${area}-${idx}`} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Kelurahan / Desa</label>
                  <input
                    type="text"
                    value={editSubdistrict}
                    onChange={(e) => setEditSubdistrict(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Alamat Lengkap Toko *</label>
                <textarea
                  required
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Catatan Tambahan Toko</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Patokan lokasi, jam buka, dll."
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-700 text-slate-900"
                />
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 font-bold">Titik Lokasi GPS</label>
                  <button
                    type="button"
                    onClick={handleGetEditLocation}
                    disabled={isEditGettingGps}
                    className="text-blue-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isEditGettingGps ? 'animate-spin' : ''}`} />
                    <span>{isEditGettingGps ? 'Mendeteksi...' : 'Deteksi GPS Baru'}</span>
                  </button>
                </div>
                {editCoordinates ? (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                    <span className="font-mono text-emerald-800 font-semibold">
                      {editCoordinates.lat}, {editCoordinates.lng}
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${editCoordinates.lat},${editCoordinates.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Cek di Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">Koordinat toko belum disetel.</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStore(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  <span>Simpan Perubahan Toko</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
