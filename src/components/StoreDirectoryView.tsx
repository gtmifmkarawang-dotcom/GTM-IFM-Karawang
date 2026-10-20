import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  MapPin,
  Phone,
  Plus,
  Search,
  Store as StoreIcon,
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
}

export const StoreDirectoryView: React.FC<StoreDirectoryViewProps> = ({
  stores,
  visits,
  onStartVisitForStore,
  onAddStore,
  areaList,
}) => {
  const availableAreas = useMemo(() => {
    return areaList && areaList.length > 0 ? areaList : KARAWANG_DISTRICTS;
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
  const [formError, setFormError] = useState<string | null>(null);

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

  const handleCreateStore = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !ownerName.trim() || !address.trim()) {
      setFormError('Store Name, Owner Name, and Full Address are required.');
      return;
    }

    const codeNum = String(stores.length + 1).padStart(3, '0');
    const newStore: Store = {
      id: `store-krw-${Date.now()}`,
      storeCode: `KRW-STR-${codeNum}`,
      name: name.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim() || '0812-0000-0000',
      category,
      district,
      subdistrict: subdistrict.trim() || district,
      address: address.trim(),
      coordinates: {
        lat: Number((-6.308 + (Math.random() - 0.5) * 0.05).toFixed(4)),
        lng: Number((107.305 + (Math.random() - 0.5) * 0.05).toFixed(4)),
      },
      creditLimitIdr: Number(creditLimit) || 3000000,
      isActive: true,
      registeredAt: '2026-09-30',
      notes: notes.trim() || undefined,
    };

    onAddStore(newStore);
    setName('');
    setOwnerName('');
    setPhone('');
    setSubdistrict('');
    setAddress('');
    setNotes('');
    setIsAddModalOpen(false);
  };

  const storeVisitsForActive = useMemo(() => {
    if (!activeStore) return [];
    return visits.filter((v) => v.storeId === activeStore.id);
  }, [activeStore, visits]);

  return (
    <div className="space-y-5">
      {/* Header & Add Store CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Karawang Store Directory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {stores.length} toko terdaftar di {availableAreas.length} Area
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Store</span>
        </button>
      </div>

      {/* Search & District / Category Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search store name, code, owner..."
              className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
            />
          </div>

          <div>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700"
            >
              <option value="ALL">Semua Area</option>
              {availableAreas.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700"
            >
              <option value="ALL">All Store Categories</option>
              {Object.values(StoreCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Store List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 overflow-hidden">
        {filteredStores.length === 0 ? (
          <div className="p-10 text-center">
            <StoreIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">
              No matching stores found
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Try clearing district filters or register a new outlet in Karawang.
            </p>
          </div>
        ) : (
          filteredStores.map((store) => {
            const storeVisits = visits.filter((v) => v.storeId === store.id);
            const totalOrderValue = storeVisits.reduce(
              (acc, v) => acc + (v.purchaseOrder?.netAmountIdr || 0),
              0
            );

            return (
              <div
                key={store.id}
                className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={() => setActiveStore(store)}
                  className="text-left flex items-start gap-3.5 min-w-0 flex-1"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <StoreIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {store.name}
                    </p>
                    {/* Clean unboxed metadata with typographic separators */}
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      <span className="font-mono">{store.storeCode}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{store.district}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{store.category}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{store.ownerName}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {store.address}
                    </p>
                  </div>
                </button>

                <div className="flex items-center justify-between sm:justify-end gap-3 pl-13 sm:pl-0 shrink-0">
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-mono font-semibold text-slate-900 tabular-nums">
                      {totalOrderValue > 0
                        ? formatIdr(totalOrderValue)
                        : 'No PO Today'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {store.lastVisitDate
                        ? `Last visit ${store.lastVisitDate}`
                        : 'Not visited yet'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onStartVisitForStore(store.id)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    Check-In
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStore(store)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                    aria-label="Inspect store details"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Store Detail Bottom Sheet / Drawer */}
      {activeStore && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[88vh] flex flex-col overflow-hidden">
            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeStore.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {activeStore.storeCode} · {activeStore.district}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveStore(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-start gap-2.5">
                  <User className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-500">Owner / PIC</p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {activeStore.ownerName}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-500">Phone / WhatsApp</p>
                    <p className="font-mono font-semibold text-slate-900 mt-0.5">
                      {activeStore.phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 sm:col-span-2">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-500">Address & Coordinates</p>
                    <p className="font-medium text-slate-900 mt-0.5">
                      {activeStore.address} ({activeStore.subdistrict},{' '}
                      {activeStore.district})
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <a
                        href={`https://www.google.com/maps?q=${activeStore.coordinates.lat},${activeStore.coordinates.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-blue-700 hover:text-blue-900 font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200"
                        title="Buka lokasi toko di Google Maps"
                      >
                        <span>GPS: {activeStore.coordinates.lat}, {activeStore.coordinates.lng}</span>
                        <ExternalLink className="w-3 h-3 text-blue-600" />
                      </a>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono text-xs text-slate-500">
                        Limit: {formatIdr(activeStore.creditLimitIdr)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {activeStore.notes && (
                <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-800">Field Note: </span>
                  {activeStore.notes}
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-slate-800 mb-2">
                  Recent Visit History ({storeVisitsForActive.length})
                </h4>
                {storeVisitsForActive.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-xl">
                    No visits recorded for this store yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                    {storeVisitsForActive.map((v) => (
                      <div key={v.id} className="p-3 text-xs flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {v.date} · {v.checkInTime} WIB
                          </p>
                          <p className="text-slate-500 mt-0.5">
                            {v.outcome === VisitOutcome.ORDER
                              ? `Purchase Order ${v.purchaseOrder?.poNumber}`
                              : `No Order: ${v.noPurchaseDetail?.reasonLabel}`}
                          </p>
                        </div>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {v.outcome === VisitOutcome.ORDER && v.purchaseOrder
                            ? formatIdr(v.purchaseOrder.netAmountIdr)
                            : 'Rp 0'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveStore(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = activeStore.id;
                  setActiveStore(null);
                  onStartVisitForStore(id);
                }}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Start Visit at {activeStore.name}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register New Store Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Register New Store (NOO)
                </h3>
                <p className="text-xs text-slate-500">
                  Add a new retail or wholesale store to Karawang territory
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="p-5 overflow-y-auto space-y-3.5">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Store Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Toko Sembako Jaya Abadi"
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g., Bpk. Wahyu"
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0813-xxxx-xxxx"
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Store Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as StoreCategory)}
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700"
                  >
                    {Object.values(StoreCategory).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Area *
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700"
                  >
                    {availableAreas.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subdistrict (Kelurahan / Desa)
                  </label>
                  <input
                    type="text"
                    value={subdistrict}
                    onChange={(e) => setSubdistrict(e.target.value)}
                    placeholder="e.g., Adiarsa Barat"
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Recommended Credit Limit (IDR)
                  </label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Street Address *
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Raya Tuparev No. 88..."
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Store Delivery / Merchandising Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional operational remarks..."
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800"
                >
                  Save Store Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
