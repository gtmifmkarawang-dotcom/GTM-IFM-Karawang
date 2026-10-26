import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building,
  Check,
  CheckCircle2,
  ChevronRight,
  Compass,
  Crosshair,
  Download,
  ExternalLink,
  FileText,
  MapPin,
  Minus,
  Navigation,
  Package,
  PackageCheck,
  Plus,
  Printer,
  RotateCcw,
  RotateCw,
  Search,
  ShoppingBag,
  Store as StoreIcon,
  Trash2,
  X,
} from 'lucide-react';
import {
  KARAWANG_DISTRICTS,
  NO_PURCHASE_REASON_CATALOG,
  PRODUCT_SKU_CATALOG,
  formatIdr,
} from '../data/karawangData';
import {
  NoPurchaseCategory,
  OrderStatus,
  OrderUnit,
  PaymentTerm,
  ProductSKU,
  PurchaseOrderItem,
  ReturnItem,
  ReturnReason,
  ReturnUnit,
  SalesRepresentative,
  Store,
  StoreCategory,
  StoreVisit,
  VisitOutcome,
  VisitType,
} from '../types/gtm';
import { IndofoodSnackTimeLogo } from './IndofoodSnackTimeLogo';
import { InvoiceReceiptModal } from './InvoiceReceiptModal';

interface VisitRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: Store[];
  salesRep: SalesRepresentative;
  preselectedStoreId?: string | null;
  selectedDate: string;
  onSaveVisit: (visit: StoreVisit, newStore?: Store) => void;
  productCatalog?: ProductSKU[];
  areaList?: string[];
}

interface DraftOrderLine {
  skuId: string;
  unit: OrderUnit;
  quantity: number;
  companyPriceIdr: number;
  storePriceIdr: number;
  discountIdr: number;
}

const PREVIOUS_SUPPLIERS = [
  'Indomarco',
  'Grosir',
  'Motoris IFM',
  'Lainnya',
] as const;

export const VisitRecorderModal: React.FC<VisitRecorderModalProps> = ({
  isOpen,
  onClose,
  stores,
  salesRep,
  preselectedStoreId,
  selectedDate,
  onSaveVisit,
  productCatalog,
  areaList,
}) => {
  const availableAreas = useMemo(() => {
    return areaList && areaList.length > 0 ? areaList : KARAWANG_DISTRICTS;
  }, [areaList]);

  const catalogToUse = useMemo(() => {
    const raw =
      productCatalog && productCatalog.length > 0
        ? productCatalog
        : PRODUCT_SKU_CATALOG;

    // Ensure all items have CTN and RCG units available (Box, Pack, and Pcs removed)
    return raw.map((sku) => {
      const units = sku.units.filter(
        (u) => u.unit !== 'Box' && u.unit !== 'Pack' && u.unit !== 'Pcs'
      );
      const hasCtn = units.some((u) => u.unit === 'CTN' || u.unit === 'Karton');
      const hasRcg = units.some((u) => u.unit === 'RCG');

      const basePrice = units[0]?.priceIdr || 120000;
      const baseCompanyPrice =
        units[0]?.companyPriceIdr || basePrice;

      if (!hasCtn) {
        units.unshift({
          unit: 'CTN',
          priceIdr: basePrice,
          companyPriceIdr: baseCompanyPrice,
          storePriceIdr: basePrice,
          pcsPerUnit: 40,
        });
      }
      if (!hasRcg) {
        units.push({
          unit: 'RCG',
          priceIdr: Math.round(basePrice / 8),
          companyPriceIdr: Math.round(baseCompanyPrice / 8),
          storePriceIdr: Math.round(basePrice / 8),
          pcsPerUnit: 10,
        });
      }

      return {
        ...sku,
        units,
      };
    });
  }, [productCatalog]);

  const [step, setStep] = useState<1 | 2>(1);
  const [storeMode, setStoreMode] = useState<'existing' | 'new'>(
    stores.length === 0 ? 'new' : 'existing'
  );
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    preselectedStoreId || stores[0]?.id || ''
  );
  const [storeSearch, setStoreSearch] = useState('');

  // Form Toko Baru (New Store Registration)
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreCategory, setNewStoreCategory] = useState<StoreCategory>(
    StoreCategory.RETAIL
  );
  const [newStoreOwner, setNewStoreOwner] = useState('');
  const [newStorePhone, setNewStorePhone] = useState('');
  const [newStoreAddress, setNewStoreAddress] = useState('');
  const [newStoreDistrict, setNewStoreDistrict] = useState<string>(
    () => availableAreas[0] || 'Desa Batu Jaya'
  );

  useEffect(() => {
    if (availableAreas.length > 0 && !availableAreas.includes(newStoreDistrict)) {
      setNewStoreDistrict(availableAreas[0]);
    }
  }, [availableAreas, newStoreDistrict]);

  const [newStorePreviousSupplier, setNewStorePreviousSupplier] = useState<string>(
    PREVIOUS_SUPPLIERS[0]
  );
  const [customPreviousSupplier, setCustomPreviousSupplier] = useState('');

  // GPS Coordinates & Status
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number }>({
    lat: -6.3085,
    lng: 107.3012,
  });
  const [gpsStatus, setGpsStatus] = useState<'verified' | 'locating'>('verified');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsTimestamp, setGpsTimestamp] = useState<string | null>(null);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);
  const [showManualGpsInput, setShowManualGpsInput] = useState(false);
  const [manualLatInput, setManualLatInput] = useState('-6.308500');
  const [manualLngInput, setManualLngInput] = useState('107.301200');

  // Outcome state: Beli (ORDER) atau Tidak Beli (NO_ORDER)
  const [outcome, setOutcome] = useState<VisitOutcome>(VisitOutcome.ORDER);

  // Purchase Order Lines
  const [skuSearch, setSkuSearch] = useState('');
  const [orderLines, setOrderLines] = useState<Record<string, DraftOrderLine>>({});
  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm>(PaymentTerm.CASH);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Non-Purchase Reasons
  const [noPurchaseCategory, setNoPurchaseCategory] = useState<NoPurchaseCategory>(
    NoPurchaseCategory.STOCK_FULL
  );
  const [customReasonOther, setCustomReasonOther] = useState('');
  const [competitorBrand, setCompetitorBrand] = useState('');
  const [noOrderRemarks, setNoOrderRemarks] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);

  // Kwitansi / Print Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [completedOrderForReceipt, setCompletedOrderForReceipt] =
    useState<StoreVisit | null>(null);

  // Retur Barang Toko (Bad Stock / Expired / Kemasan Rusak)
  const [returns, setReturns] = useState<ReturnItem[]>([]);

  // Reset form secara bersih saat modal dibuka sehingga tidak ada produk default yang terpilih
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      if (preselectedStoreId) {
        setSelectedStoreId(preselectedStoreId);
        setStoreMode('existing');
      } else {
        setSelectedStoreId(stores[0]?.id || '');
        setStoreMode(stores.length === 0 ? 'new' : 'existing');
      }
      setStoreSearch('');
      setNewStoreName('');
      setNewStoreOwner('');
      setNewStorePhone('');
      setNewStoreAddress('');
      setOutcome(VisitOutcome.ORDER);
      setOrderLines({}); // Mulai dari 0 produk terpilih
      setReturns([]); // Kosongkan daftar retur
      setSkuSearch('');
      setPaymentTerm(PaymentTerm.CASH);
      setDeliveryNotes('');
      setValidationError(null);
      setNoPurchaseCategory(NoPurchaseCategory.STOCK_FULL);
      setCustomReasonOther('');
      setCompetitorBrand('');
      setNoOrderRemarks('');
    }
  }, [isOpen, preselectedStoreId, stores]);

  const filteredStores = useMemo(() => {
    const q = storeSearch.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.district.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q) ||
        s.storeCode.toLowerCase().includes(q)
    );
  }, [stores, storeSearch]);

  const filteredSkus = useMemo(() => {
    const q = skuSearch.trim().toLowerCase();
    if (!q) return catalogToUse;
    return catalogToUse.filter(
      (sku) =>
        sku.name.toLowerCase().includes(q) ||
        sku.skuCode.toLowerCase().includes(q) ||
        sku.category.toLowerCase().includes(q)
    );
  }, [skuSearch, catalogToUse]);

  const activeOrderItems: PurchaseOrderItem[] = useMemo(() => {
    const items: PurchaseOrderItem[] = [];
    Object.values(orderLines).forEach((line) => {
      if (line.quantity <= 0) return;
      const sku = catalogToUse.find((p) => p.id === line.skuId);
      if (!sku) return;

      const unitObj =
        sku.units.find(
          (u) =>
            u.unit === line.unit ||
            (line.unit === 'CTN' && u.unit === 'Karton') ||
            (line.unit === 'Karton' && u.unit === 'CTN')
        ) || sku.units[0];

      const compPrice =
        line.companyPriceIdr !== undefined
          ? line.companyPriceIdr
          : unitObj.companyPriceIdr || unitObj.priceIdr;
      const storePrice =
        line.storePriceIdr !== undefined
          ? line.storePriceIdr
          : unitObj.storePriceIdr || unitObj.priceIdr;

      const companySubtotal = compPrice * line.quantity;
      const grossStore = storePrice * line.quantity;
      const discount = Math.min(grossStore, Math.max(0, line.discountIdr || 0));
      const storeSubtotal = grossStore - discount;
      const margin = storeSubtotal - companySubtotal; // Dapat bernilai minus jika harga jual toko lebih rendah

      items.push({
        skuId: sku.id,
        skuCode: sku.skuCode,
        productName: sku.name,
        unit: line.unit,
        quantity: line.quantity,
        unitPriceIdr: storePrice,
        companyPriceIdr: compPrice,
        storePriceIdr: storePrice,
        discountIdr: discount,
        subtotalIdr: storeSubtotal,
        companySubtotalIdr: companySubtotal,
        storeSubtotalIdr: storeSubtotal,
        marginIdr: margin,
        supplier: 'PT Indofood Fortuna Makmur (IFM)',
      });
    });
    return items;
  }, [orderLines, catalogToUse]);

  const orderSummary = useMemo(() => {
    const totalItemsCount = activeOrderItems.reduce((sum, i) => sum + i.quantity, 0);
    const totalCompanyAmountIdr = activeOrderItems.reduce(
      (sum, i) => sum + (i.companySubtotalIdr || 0),
      0
    );
    const totalStoreAmountIdr = activeOrderItems.reduce(
      (sum, i) => sum + (i.storeSubtotalIdr || 0),
      0
    );
    // Selisih harga bersih (bisa negatif jika sales tombok)
    const totalMarginAmountIdr = totalStoreAmountIdr - totalCompanyAmountIdr;

    return {
      totalItemsCount,
      totalCompanyAmountIdr,
      totalStoreAmountIdr,
      totalMarginAmountIdr,
    };
  }, [activeOrderItems]);

  // Kalkulasi Retur Barang (Bad Stock / Expired)
  const totalReturnAmountIdr = useMemo(() => {
    return returns.reduce((sum, r) => sum + (r.subtotalReturnIdr || 0), 0);
  }, [returns]);

  // Sales Achievement bersih setelah dikurangi retur
  const netSalesAfterReturnIdr = Math.max(
    0,
    orderSummary.totalStoreAmountIdr - totalReturnAmountIdr
  );

  const handleAddReturnItem = () => {
    const defaultSku = catalogToUse[0];
    const defaultPrice =
      defaultSku?.units[0]?.companyPriceIdr ||
      defaultSku?.units[0]?.priceIdr ||
      10000;
    const newItem: ReturnItem = {
      id: `ret-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      skuId: defaultSku?.id,
      productName: defaultSku?.name || 'Chitato Sapi Panggang 68g',
      unit: 'Pcs',
      quantity: 1,
      returnPricePerUnitIdr: defaultPrice,
      subtotalReturnIdr: defaultPrice * 1,
      reason: 'Bad Stock',
      notes: '',
    };
    setReturns((prev) => [...prev, newItem]);
  };

  const handleUpdateReturnItem = (id: string, updates: Partial<ReturnItem>) => {
    setReturns((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        const q = updated.quantity || 0;
        const p = updated.returnPricePerUnitIdr || 0;
        updated.subtotalReturnIdr = q * p;
        return updated;
      })
    );
  };

  const handleRemoveReturnItem = (id: string) => {
    setReturns((prev) => prev.filter((item) => item.id !== id));
  };

  if (!isOpen) return null;

  const handleRefreshGps = () => {
    setGpsStatus('locating');
    setGpsErrorMsg(null);
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setGpsCoordinates({ lat, lng });
          setGpsAccuracy(Math.round(pos.coords.accuracy));
          setGpsTimestamp(
            new Date().toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          );
          setManualLatInput(String(lat));
          setManualLngInput(String(lng));
          setGpsStatus('verified');
        },
        (err) => {
          console.warn('Geolocation sensor notice:', err.message);
          setGpsCoordinates((prev) => ({
            lat: prev.lat || -6.3085,
            lng: prev.lng || 107.3012,
          }));
          setGpsErrorMsg(
            err.code === 1
              ? 'Izin GPS browser dinonaktifkan. Anda dapat membuka Google Maps atau memasukkan koordinat manual.'
              : 'Gagal mendeteksi sinyal GPS perangkat secara otomatis. Silakan cek di Google Maps.'
          );
          setGpsStatus('verified');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setGpsErrorMsg('Browser tidak mendukung deteksi lokasi GPS.');
      setGpsStatus('verified');
    }
  };

  const handleApplyManualCoords = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(manualLatInput.replace(',', '.'));
    const lngNum = parseFloat(manualLngInput.replace(',', '.'));
    if (
      !isNaN(latNum) &&
      !isNaN(lngNum) &&
      latNum >= -90 &&
      latNum <= 90 &&
      lngNum >= -180 &&
      lngNum <= 180
    ) {
      setGpsCoordinates({
        lat: Number(latNum.toFixed(6)),
        lng: Number(lngNum.toFixed(6)),
      });
      setGpsAccuracy(null);
      setGpsTimestamp(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
      setGpsStatus('verified');
      setGpsErrorMsg(null);
      setShowManualGpsInput(false);
    } else {
      setGpsErrorMsg('Format koordinat tidak valid. Contoh Latitude: -6.308500, Longitude: 107.301200');
    }
  };

  const handleQuantityChange = (
    skuId: string,
    delta: number,
    defaultUnit: OrderUnit,
    sku: ProductSKU
  ) => {
    setOrderLines((prev) => {
      const existing = prev[skuId];
      const unitObj =
        sku.units.find((u) => u.unit === defaultUnit) || sku.units[0];
      const compPrice =
        existing?.companyPriceIdr ||
        unitObj.companyPriceIdr ||
        unitObj.priceIdr;
      const storePrice =
        existing?.storePriceIdr || unitObj.storePriceIdr || unitObj.priceIdr;

      const currentQty = existing?.quantity || 0;
      const nextQty = Math.max(0, currentQty + delta);

      return {
        ...prev,
        [skuId]: {
          skuId,
          unit: existing?.unit || defaultUnit,
          quantity: nextQty,
          companyPriceIdr: compPrice,
          storePriceIdr: storePrice,
          discountIdr: existing?.discountIdr || 0,
        },
      };
    });
  };

  const handleUnitChange = (skuId: string, unit: OrderUnit, sku: ProductSKU) => {
    const unitObj =
      sku.units.find(
        (u) =>
          u.unit === unit ||
          (unit === 'CTN' && u.unit === 'Karton') ||
          (unit === 'Karton' && u.unit === 'CTN')
      ) || sku.units[0];

    const compPrice =
      unitObj.companyPriceIdr || unitObj.priceIdr;
    const storePrice = unitObj.storePriceIdr || unitObj.priceIdr;

    setOrderLines((prev) => {
      const existing = prev[skuId] || {
        skuId,
        unit,
        quantity: 1,
        companyPriceIdr: compPrice,
        storePriceIdr: storePrice,
        discountIdr: 0,
      };
      return {
        ...prev,
        [skuId]: {
          ...existing,
          unit,
          companyPriceIdr: compPrice,
          storePriceIdr: storePrice,
        },
      };
    });
  };

  const handleStorePriceChange = (
    skuId: string,
    newStorePrice: number,
    sku?: ProductSKU,
    unit?: OrderUnit
  ) => {
    setOrderLines((prev) => {
      const existing = prev[skuId];
      if (!existing && sku) {
        const selUnit =
          unit ||
          ((sku.defaultUnit === 'Karton' ? 'CTN' : sku.defaultUnit) as OrderUnit);
        const unitObj =
          sku.units.find((u) => u.unit === selUnit) || sku.units[0];
        const compPrice = unitObj.companyPriceIdr || unitObj.priceIdr;
        return {
          ...prev,
          [skuId]: {
            skuId,
            unit: selUnit,
            quantity: 0,
            companyPriceIdr: compPrice,
            storePriceIdr: Math.max(0, newStorePrice),
            discountIdr: 0,
          },
        };
      }
      if (!existing) return prev;
      return {
        ...prev,
        [skuId]: {
          ...existing,
          storePriceIdr: Math.max(0, newStorePrice),
        },
      };
    });
  };

  const handleProceedToStep2 = () => {
    setValidationError(null);
    if (storeMode === 'existing' && !selectedStoreId) {
      setValidationError('Pilih toko terdaftar dari daftar toko Karawang.');
      return;
    }
    if (storeMode === 'new') {
      if (!newStoreName.trim()) {
        setValidationError('Nama Toko wajib diisi.');
        return;
      }
      if (!newStoreOwner.trim()) {
        setValidationError('Nama Pemilik wajib diisi.');
        return;
      }
      if (!newStoreAddress.trim()) {
        setValidationError('Alamat Toko wajib diisi.');
        return;
      }
    }
    setStep(2);
  };

  const handleSaveAndSubmit = (e: React.FormEvent, wantReceiptModal = false) => {
    e.preventDefault();
    setValidationError(null);

    let targetStore: Store | undefined = stores.find((s) => s.id === selectedStoreId);
    let createdStore: Store | undefined;

    if (storeMode === 'new') {
      const suffix = String(stores.length + 1).padStart(3, '0');
      const supplierVal =
        newStorePreviousSupplier === 'Lainnya' && customPreviousSupplier.trim()
          ? customPreviousSupplier.trim()
          : newStorePreviousSupplier;

      createdStore = {
        id: `store-krw-${Date.now()}`,
        storeCode: `KRW-NOO-${suffix}`,
        name: newStoreName.trim(),
        ownerName: newStoreOwner.trim(),
        phone: newStorePhone.trim() || '0812-0000-0000',
        category: newStoreCategory,
        district: newStoreDistrict,
        subdistrict: newStoreDistrict,
        address: newStoreAddress.trim(),
        coordinates: gpsCoordinates,
        previousSupplier: supplierVal,
        creditLimitIdr: 3000000,
        isActive: true,
        registeredAt: selectedDate,
        lastVisitDate: selectedDate,
        lastOutcome: outcome,
      };
      targetStore = createdStore;
    }

    if (!targetStore) {
      setValidationError('Data toko tidak ditemukan.');
      return;
    }

    if (outcome === VisitOutcome.ORDER && activeOrderItems.length === 0) {
      setValidationError(
        'Pilih minimal 1 produk pesanan, atau pilih status "Tidak Beli".'
      );
      return;
    }

    if (
      outcome === VisitOutcome.NO_ORDER &&
      noPurchaseCategory === NoPurchaseCategory.OTHER &&
      !customReasonOther.trim()
    ) {
      setValidationError('Mohon isi kolom alasan lainnya.');
      return;
    }

    const now = new Date();
    const checkInStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      Math.max(0, now.getMinutes() - 10)
    ).padStart(2, '0')}`;
    const checkOutStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const visitId = `visit-${Date.now()}`;
    const visitCode = `VST-KRW-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const poNumber = `PO-KRW-${String(Math.floor(100000 + Math.random() * 900000))}`;

    const reasonMeta =
      NO_PURCHASE_REASON_CATALOG.find((r) => r.category === noPurchaseCategory) ||
      NO_PURCHASE_REASON_CATALOG[0];

    const newVisit: StoreVisit = {
      id: visitId,
      visitCode,
      date: selectedDate,
      checkInTime: checkInStr,
      checkOutTime: checkOutStr,
      salesRepId: salesRep.id,
      salesRepName: salesRep.name,
      salesRepEmail: salesRep.email,
      storeId: targetStore.id,
      storeCode: targetStore.storeCode,
      storeName: targetStore.name,
      storeOwner: targetStore.ownerName,
      storeCategory: targetStore.category,
      district: targetStore.district,
      address: targetStore.address,
      visitType: storeMode === 'new' ? VisitType.NEW_ACQUISITION : VisitType.ROUTINE,
      gpsVerified: true,
      coordinates: targetStore.coordinates || gpsCoordinates,
      shelfDisplayChecked: true,
      posmInstalled: true,
      outcome,
      returns: returns.length > 0 ? returns : undefined,
      totalReturnAmountIdr: returns.length > 0 ? totalReturnAmountIdr : undefined,
      purchaseOrder:
        outcome === VisitOutcome.ORDER
          ? {
              id: `po-${Date.now()}`,
              poNumber,
              visitId,
              storeId: targetStore.id,
              storeName: targetStore.name,
              district: targetStore.district,
              salesRepId: salesRep.id,
              salesRepName: salesRep.name,
              salesRepEmail: salesRep.email,
              createdAt: now.toISOString(),
              date: selectedDate,
              items: activeOrderItems,
              totalItemsCount: orderSummary.totalItemsCount,
              grossAmountIdr: orderSummary.totalStoreAmountIdr,
              totalDiscountIdr: 0,
              netAmountIdr: netSalesAfterReturnIdr, // Nilai penjualan bersih setelah dipotong retur
              totalCompanyAmountIdr: orderSummary.totalCompanyAmountIdr,
              totalStoreAmountIdr: orderSummary.totalStoreAmountIdr,
              totalMarginAmountIdr: orderSummary.totalMarginAmountIdr,
              returns: returns.length > 0 ? returns : undefined,
              totalReturnAmountIdr: returns.length > 0 ? totalReturnAmountIdr : undefined,
              netAfterReturnAmountIdr: netSalesAfterReturnIdr,
              paymentTerm,
              status: OrderStatus.SUBMITTED,
              deliveryNotes: deliveryNotes.trim() || undefined,
            }
          : undefined,
      noPurchaseDetail:
        outcome === VisitOutcome.NO_ORDER
          ? {
              category: noPurchaseCategory,
              reasonLabel:
                noPurchaseCategory === NoPurchaseCategory.OTHER && customReasonOther.trim()
                  ? customReasonOther.trim()
                  : reasonMeta.idLabel,
              competitorBrand: competitorBrand.trim() || undefined,
              notes:
                customReasonOther.trim() ||
                noOrderRemarks.trim() ||
                reasonMeta.idLabel,
            }
          : undefined,
    };

    onSaveVisit(newVisit, createdStore);

    // Reset state modal agar siap digunakan kembali dalam kondisi bersih
    setStep(1);
    setOrderLines({});
    setReturns([]);
    setNewStoreName('');
    setNewStoreOwner('');
    setNewStorePhone('');
    setNewStoreAddress('');
    setDeliveryNotes('');

    if (wantReceiptModal && newVisit.purchaseOrder) {
      setCompletedOrderForReceipt(newVisit);
      setReceiptModalOpen(true);
    } else {
      onClose();
    }
  };

  const currentSelectedStore = stores.find((s) => s.id === selectedStoreId);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
        <div className="w-full max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-blue-200 max-h-[94vh] flex flex-col overflow-hidden">
          {/* Mobile Sheet Handle */}
          <div className="w-12 h-1.5 bg-blue-200 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

          {/* Header Brand Bar */}
          <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <IndofoodSnackTimeLogo variant="light" size="sm" />
              <div className="hidden sm:block border-l border-blue-700 pl-3">
                <h2 className="text-sm font-bold text-white">Record Visit & Order</h2>
                <p className="text-[11px] text-blue-200">
                  Langkah {step} dari 2 · {step === 1 ? 'Pilih / Daftar Toko' : 'Status Beli & Input Produk'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="grid grid-cols-2 border-b border-blue-100 bg-blue-50/50 p-1.5 gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                step === 1
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-900 hover:bg-blue-100/50'
              }`}
            >
              <StoreIcon className="w-4 h-4" />
              <span>1. Pilih / Daftar Toko</span>
            </button>
            <button
              type="button"
              onClick={handleProceedToStep2}
              className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                step === 2
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-900 hover:bg-blue-100/50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>2. Transaksi & Status</span>
            </button>
          </div>

          {/* Form Content */}
          <form
            onSubmit={(e) => handleSaveAndSubmit(e, false)}
            className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5"
          >
            {validationError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            {step === 1 ? (
              <div className="space-y-4">
                {/* Toko Terdaftar vs Toko Baru Toggle */}
                <div>
                  <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider mb-2">
                    Langkah 1: Identifikasi Toko
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setStoreMode('existing')}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        storeMode === 'existing'
                          ? 'bg-blue-700 text-white shadow-xs'
                          : 'text-slate-700 hover:text-blue-900'
                      }`}
                    >
                      Pilih Toko Terdaftar ({stores.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStoreMode('new')}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        storeMode === 'new'
                          ? 'bg-amber-400 text-blue-950 shadow-xs'
                          : 'text-slate-700 hover:text-blue-900'
                      }`}
                    >
                      + Daftarkan Toko Baru (NOO)
                    </button>
                  </div>
                </div>

                {storeMode === 'existing' ? (
                  /* Toko Terdaftar: Dropdown & Search */
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={storeSearch}
                        onChange={(e) => setStoreSearch(e.target.value)}
                        placeholder="Cari nama toko, pemilik, atau Area..."
                        className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white"
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-blue-100 rounded-2xl bg-white shadow-xs">
                      {filteredStores.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-xs">
                          <p className="font-semibold text-slate-700">Belum ada toko yang terdaftar</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Silakan pilih tab &quot;+ Daftarkan Toko Baru (NOO)&quot; di atas untuk input toko baru.
                          </p>
                        </div>
                      ) : (
                        filteredStores.map((store) => {
                        const isSelected = store.id === selectedStoreId;
                        return (
                          <button
                            key={store.id}
                            type="button"
                            onClick={() => setSelectedStoreId(store.id)}
                            className={`w-full text-left px-4 py-3 min-h-[58px] flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50/80 border-l-4 border-blue-700'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {store.name}
                              </p>
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {store.district} · {store.category} · Pemilik: {store.ownerName}
                              </p>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                                isSelected
                                  ? 'bg-blue-700 border-blue-700 text-white'
                                  : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                    </div>
                  </div>
                ) : (
                  /* Form Toko Baru Lengkap sesuai brief */
                  <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/40 border border-blue-200 space-y-4">
                    <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                      <Building className="w-4 h-4 text-blue-700" />
                      Formulir Toko Baru (New Outlet Opening - NOO Karawang)
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nama Toko *
                        </label>
                        <input
                          type="text"
                          value={newStoreName}
                          onChange={(e) => setNewStoreName(e.target.value)}
                          placeholder="Contoh: Toko Snack Berkah"
                          className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Kategori Toko *
                        </label>
                        <select
                          value={newStoreCategory}
                          onChange={(e) =>
                            setNewStoreCategory(e.target.value as StoreCategory)
                          }
                          className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                        >
                          {Object.values(StoreCategory).map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nama Pemilik *
                        </label>
                        <input
                          type="text"
                          value={newStoreOwner}
                          onChange={(e) => setNewStoreOwner(e.target.value)}
                          placeholder="Contoh: H. Ahmad Subagio"
                          className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nomor Kontak (WhatsApp / HP)
                        </label>
                        <input
                          type="tel"
                          value={newStorePhone}
                          onChange={(e) => setNewStorePhone(e.target.value)}
                          placeholder="0812-xxxx-xxxx"
                          className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Area *
                        </label>
                        <select
                          value={newStoreDistrict}
                          onChange={(e) => setNewStoreDistrict(e.target.value)}
                          className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                        >
                          {availableAreas.map((dist) => (
                            <option key={dist} value={dist}>
                              {dist}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Supplier Sebelumnya *
                        </label>
                        <select
                          value={newStorePreviousSupplier}
                          onChange={(e) => setNewStorePreviousSupplier(e.target.value)}
                          className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                        >
                          {PREVIOUS_SUPPLIERS.map((sup) => (
                            <option key={sup} value={sup}>
                              {sup}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {newStorePreviousSupplier === 'Lainnya' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nama Supplier Sebelumnya Lainnya
                        </label>
                        <input
                          type="text"
                          value={customPreviousSupplier}
                          onChange={(e) => setCustomPreviousSupplier(e.target.value)}
                          placeholder="Sebutkan distributor atau sumber sebelumnya..."
                          className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Alamat Lengkap Toko *
                      </label>
                      <input
                        type="text"
                        value={newStoreAddress}
                        onChange={(e) => setNewStoreAddress(e.target.value)}
                        placeholder="Jl. Raya Galuh Mas No. 12, RT 01/RW 03..."
                        className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                )}

                {/* Koordinat GPS Card Terintegrasi Google Maps */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-50 border border-blue-200/90 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">
                            {storeMode === 'new'
                              ? 'Titik Koordinat GPS Toko Baru (NOO)'
                              : 'Koordinat GPS Lokasi Kunjungan'}
                          </p>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>GPS Siap</span>
                          </span>
                        </div>

                        <p className="text-xs font-mono font-bold text-blue-900 mt-1 flex items-center gap-2">
                          <span>Lat: {gpsCoordinates.lat}</span>
                          <span className="text-slate-300">·</span>
                          <span>Lng: {gpsCoordinates.lng}</span>
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-500">
                          {gpsAccuracy !== null && (
                            <span className="text-emerald-700 font-medium">Akurasi: ±{gpsAccuracy}m</span>
                          )}
                          {gpsTimestamp && (
                            <span>Diperbarui: {gpsTimestamp}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tombol Aksi: Ambil Titik GPS & Link ke Google Maps */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {/* Tombol Ambil Titik GPS Saat Ini */}
                      <button
                        type="button"
                        onClick={handleRefreshGps}
                        disabled={gpsStatus === 'locating'}
                        className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-95 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                        title="Ambil koordinat GPS lokasi perangkat saat ini"
                      >
                        <Navigation className={`w-3.5 h-3.5 ${gpsStatus === 'locating' ? 'animate-spin' : ''}`} />
                        <span>{gpsStatus === 'locating' ? 'Mendeteksi...' : 'Ambil Titik GPS'}</span>
                      </button>

                      {/* Tombol Buka di Google Maps (Link ke Google Maps Sesuai Koordinat Saat Ini) */}
                      <a
                        href={`https://www.google.com/maps?q=${gpsCoordinates.lat},${gpsCoordinates.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Buka titik koordinat saat ini di Google Maps"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Google Maps</span>
                      </a>
                    </div>
                  </div>

                  {/* Keterangan & Akses Input Manual Koordinat */}
                  <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                    <p className="text-slate-500">
                      Titik koordinat otomatis diambil dari lokasi terkini sales dan tertaut langsung ke Google Maps.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setManualLatInput(String(gpsCoordinates.lat));
                        setManualLngInput(String(gpsCoordinates.lng));
                        setShowManualGpsInput(!showManualGpsInput);
                      }}
                      className="text-blue-700 hover:text-blue-900 font-semibold underline self-start sm:self-auto cursor-pointer"
                    >
                      {showManualGpsInput ? 'Tutup Input Koordinat' : 'Sesuaikan / Paste Koordinat'}
                    </button>
                  </div>

                  {/* Form Koreksi / Paste Koordinat Manual dari Google Maps */}
                  {showManualGpsInput && (
                    <form onSubmit={handleApplyManualCoords} className="p-3 bg-white rounded-xl border border-blue-200 space-y-2.5 mt-2 shadow-xs">
                      <p className="text-xs font-bold text-slate-800">
                        Input / Koreksi Koordinat Google Maps:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Latitude</label>
                          <input
                            type="text"
                            value={manualLatInput}
                            onChange={(e) => setManualLatInput(e.target.value)}
                            placeholder="-6.308500"
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:outline-none focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Longitude</label>
                          <input
                            type="text"
                            value={manualLngInput}
                            onChange={(e) => setManualLngInput(e.target.value)}
                            placeholder="107.301200"
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowManualGpsInput(false)}
                          className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-3.5 py-1 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs cursor-pointer"
                        >
                          Terapkan Titik
                        </button>
                      </div>
                    </form>
                  )}

                  {gpsErrorMsg && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{gpsErrorMsg}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* LANGKAH 2: Beli atau Tidak Beli */
              <div className="space-y-4">
                {/* Store Badge Context */}
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-blue-950 truncate">
                      {storeMode === 'new'
                        ? `${newStoreName} (Toko Baru NOO)`
                        : currentSelectedStore?.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {storeMode === 'new'
                        ? `${newStoreDistrict} · Supplier Lalu: ${newStorePreviousSupplier}`
                        : `${currentSelectedStore?.district} · Pemilik: ${currentSelectedStore?.ownerName}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-bold text-blue-700 hover:underline shrink-0 cursor-pointer"
                  >
                    Ubah Toko
                  </button>
                </div>

                {/* Pilihan Status: Beli atau Tidak Beli */}
                <div>
                  <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider mb-2">
                    Langkah 2: Pilih Status Kunjungan *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setOutcome(VisitOutcome.ORDER)}
                      className={`min-h-[52px] p-3 rounded-2xl border-2 text-left transition-all flex items-center justify-between cursor-pointer ${
                        outcome === VisitOutcome.ORDER
                          ? 'bg-blue-700 text-white border-blue-700 shadow-md'
                          : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-black">Beli (Ada Order)</p>
                        <p
                          className={`text-[10px] ${
                            outcome === VisitOutcome.ORDER
                              ? 'text-blue-100'
                              : 'text-slate-500'
                          }`}
                        >
                          Toko memesan produk snack
                        </p>
                      </div>
                      <ShoppingBag className="w-5 h-5 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setOutcome(VisitOutcome.NO_ORDER)}
                      className={`min-h-[52px] p-3 rounded-2xl border-2 text-left transition-all flex items-center justify-between cursor-pointer ${
                        outcome === VisitOutcome.NO_ORDER
                          ? 'bg-amber-500 text-blue-950 border-amber-500 shadow-md'
                          : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-black">Tidak Beli (No Order)</p>
                        <p
                          className={`text-[10px] ${
                            outcome === VisitOutcome.NO_ORDER
                              ? 'text-blue-950/80 font-medium'
                              : 'text-slate-500'
                          }`}
                        >
                          Catat alasan tidak order
                        </p>
                      </div>
                      <AlertCircle className="w-5 h-5 shrink-0" />
                    </button>
                  </div>
                </div>

                {outcome === VisitOutcome.ORDER ? (
                  /* Form Jika Beli: Daftar Produk, CTN/RCG, Hrg Perusahaan, Hrg Jual Toko, Total */
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={skuSearch}
                        onChange={(e) => setSkuSearch(e.target.value)}
                        placeholder="Cari produk snack Indofood..."
                        className="w-full min-h-[42px] pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white"
                      />
                    </div>

                    <div className="divide-y divide-slate-100 border border-blue-100 rounded-2xl max-h-72 overflow-y-auto bg-white shadow-xs">
                      {filteredSkus.map((sku) => {
                        const line = orderLines[sku.id];
                        const qty = line?.quantity || 0;
                        const selectedUnit =
                          line?.unit === 'RCG' ? 'RCG' : 'CTN';
                        const unitObj =
                          sku.units.find(
                            (u) =>
                              u.unit === selectedUnit ||
                              (selectedUnit === 'CTN' && u.unit === 'Karton')
                          ) || sku.units[0];

                        const compPrice =
                          line?.companyPriceIdr ||
                          unitObj.companyPriceIdr ||
                          unitObj.priceIdr;
                        const storePrice =
                          line?.storePriceIdr ||
                          unitObj.storePriceIdr ||
                          unitObj.priceIdr;

                        const lineTotal = storePrice * qty;

                        return (
                          <div
                            key={sku.id}
                            className={`p-3.5 space-y-2.5 transition-colors ${
                              qty > 0 ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900">
                                  {sku.name}
                                </p>
                                <p className="text-xs text-slate-500 font-mono">
                                  {sku.skuCode} · {sku.category}
                                </p>
                              </div>

                              {/* Stepper Quantity & Unit */}
                              <div className="flex items-center gap-2">
                                <select
                                  value={selectedUnit}
                                  onChange={(e) =>
                                    handleUnitChange(
                                      sku.id,
                                      e.target.value as OrderUnit,
                                      sku
                                    )
                                  }
                                  className="min-h-[38px] px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 text-blue-900 cursor-pointer"
                                >
                                  <option value="CTN">CTN (Karton)</option>
                                  <option value="RCG">RCG (Renceng)</option>
                                </select>

                                <div className="flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleQuantityChange(
                                        sku.id,
                                        -1,
                                        selectedUnit,
                                        sku
                                      )
                                    }
                                    className="min-h-[38px] min-w-[36px] flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 cursor-pointer"
                                    aria-label="Kurangi jumlah"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={qty}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                      setOrderLines((prev) => ({
                                        ...prev,
                                        [sku.id]: {
                                          skuId: sku.id,
                                          unit: selectedUnit,
                                          quantity: val,
                                          companyPriceIdr: compPrice,
                                          storePriceIdr: storePrice,
                                          discountIdr: 0,
                                        },
                                      }));
                                    }}
                                    className="w-12 text-center text-xs font-mono font-bold text-blue-950 border-x border-slate-200 py-1"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleQuantityChange(
                                        sku.id,
                                        1,
                                        selectedUnit,
                                        sku
                                      )
                                    }
                                    className="min-h-[38px] min-w-[36px] flex items-center justify-center text-blue-700 hover:bg-blue-50 active:bg-blue-100 cursor-pointer"
                                    aria-label="Tambah jumlah"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Harga Perusahaan vs Harga Jual Toko */}
                            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <span>Harga Perusahaan:</span>
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100 text-blue-700 font-semibold">Firebase</span>
                                </span>
                                <span className="font-mono text-slate-800 font-bold">
                                  {formatIdr(compPrice)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block">
                                  Harga Jual ke Toko:
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={storePrice === 0 ? '0' : storePrice}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const num = raw === '' ? 0 : parseInt(raw, 10);
                                    handleStorePriceChange(
                                      sku.id,
                                      isNaN(num) ? 0 : Math.max(0, num),
                                      sku,
                                      selectedUnit
                                    );
                                  }}
                                  className="w-full text-xs font-mono font-bold text-blue-900 bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:border-blue-600 focus:bg-white"
                                />
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-500 block">
                                  Total Penjualan:
                                </span>
                                <span className="font-mono font-bold text-blue-950">
                                  {formatIdr(lineTotal)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* SECTION PENCATATAN RETUR BARANG TOKO */}
                    <div className="border border-rose-200 rounded-2xl bg-rose-50/40 p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <RotateCcw className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wide">
                              Pencatatan Retur Barang Toko
                            </h4>
                            <p className="text-[11px] text-rose-700">
                              Barang retur (Bad Stock / Expired / Rusak) mengurangi pencapaian sales
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddReturnItem}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Tambah Retur</span>
                        </button>
                      </div>

                      {returns.length === 0 ? (
                        <div className="text-center py-3.5 border border-dashed border-rose-200 rounded-xl bg-white/70">
                          <p className="text-xs text-rose-900 font-medium">
                            Tidak ada barang retur pada kunjungan ini.
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Klik tombol &quot;+ Tambah Retur&quot; jika toko mengembalikan produk bad stock / kadaluarsa.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {returns.map((retItem, index) => (
                            <div
                              key={retItem.id}
                              className="p-3 bg-white border border-rose-200 rounded-xl shadow-2xs space-y-2.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-rose-900 bg-rose-100 px-2 py-0.5 rounded-md">
                                  Item Retur #{index + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveReturnItem(retItem.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                                  title="Hapus Retur"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Pilih Produk yang Diretur
                                  </label>
                                  <select
                                    value={retItem.productName}
                                    onChange={(e) => {
                                      const skuMatch = catalogToUse.find((p) => p.name === e.target.value);
                                      const defaultPrice = skuMatch?.units[0]?.companyPriceIdr || skuMatch?.units[0]?.priceIdr || 10000;
                                      handleUpdateReturnItem(retItem.id, {
                                        productName: e.target.value,
                                        skuId: skuMatch?.id,
                                        returnPricePerUnitIdr: retItem.returnPricePerUnitIdr || defaultPrice,
                                      });
                                    }}
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-rose-600 font-medium"
                                  >
                                    {catalogToUse.map((sku) => (
                                      <option key={sku.id} value={sku.name}>
                                        {sku.name} ({sku.category})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Alasan Retur Barang *
                                  </label>
                                  <select
                                    value={retItem.reason}
                                    onChange={(e) =>
                                      handleUpdateReturnItem(retItem.id, {
                                        reason: e.target.value as ReturnReason,
                                      })
                                    }
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-rose-600 font-medium"
                                  >
                                    <option value="Bad Stock">Bad Stock (Bungkus Bocor / Alot / Bau)</option>
                                    <option value="Expired">Expired / Kadaluarsa</option>
                                    <option value="Kemasan Rusak">Kemasan Rusak / Sobek Saat Distribusi</option>
                                    <option value="Lainnya">Lainnya</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                                    Satuan Retur
                                  </label>
                                  <select
                                    value={retItem.unit}
                                    onChange={(e) =>
                                      handleUpdateReturnItem(retItem.id, {
                                        unit: e.target.value as ReturnUnit,
                                      })
                                    }
                                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:border-rose-600 text-rose-950"
                                  >
                                    <option value="Pcs">Pcs</option>
                                    <option value="RCG">RCG (Renceng)</option>
                                    <option value="CTN">CTN (Karton)</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                                    Jumlah Barang
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={retItem.quantity}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const val = raw === '' ? 0 : parseInt(raw, 10);
                                      handleUpdateReturnItem(retItem.id, { quantity: isNaN(val) ? 0 : Math.max(0, val) });
                                    }}
                                    className="w-full text-xs font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:border-rose-600"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                                    Harga Retur / Satuan (Rp)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={retItem.returnPricePerUnitIdr === 0 ? '0' : retItem.returnPricePerUnitIdr}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const val = raw === '' ? 0 : parseInt(raw, 10);
                                      handleUpdateReturnItem(retItem.id, {
                                        returnPricePerUnitIdr: isNaN(val) ? 0 : Math.max(0, val),
                                      });
                                    }}
                                    className="w-full text-xs font-mono font-bold text-rose-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:border-rose-600"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                                <span className="text-slate-500 text-[11px]">
                                  Subtotal Nilai Retur:
                                </span>
                                <span className="font-mono font-bold text-rose-700">
                                  - {formatIdr(retItem.subtotalReturnIdr)}
                                </span>
                              </div>
                            </div>
                          ))}

                          <div className="flex items-center justify-between p-2.5 bg-rose-100/70 border border-rose-300 rounded-xl text-xs">
                            <span className="font-bold text-rose-950">
                              Total Pengurang Retur ({returns.length} item):
                            </span>
                            <span className="font-mono font-black text-rose-800 text-sm">
                              - {formatIdr(totalReturnAmountIdr)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pembayaran & Catatan Serah Terima Langsung */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Metode Pembayaran (COD / Transfer)
                        </label>
                        <select
                          value={paymentTerm}
                          onChange={(e) =>
                            setPaymentTerm(e.target.value as PaymentTerm)
                          }
                          className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 font-medium cursor-pointer"
                        >
                          {Object.values(PaymentTerm).map((term) => (
                            <option key={term} value={term}>
                              {term}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Catatan Serah Terima Fisik Barang
                        </label>
                        <input
                          type="text"
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          placeholder="Contoh: COD Tunai diterima / Transfer bank"
                          className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    {/* Informasi Direct Selling (Bukan Pre-Order) */}
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                      <PackageCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[11px]">Sistem Direct Selling (Bukan Pre-Order)</p>
                        <p className="text-[10px] text-blue-800 leading-relaxed mt-0.5">
                          Sales membawa produk langsung ke toko saat visit. Alur: <strong>Visit Toko ➔ Jual Beli (COD/Tf) ➔ Delivered ➔ Setor Uang ke Admin ➔ Admin Approve</strong>.
                        </p>
                      </div>
                    </div>

                    {/* Ringkasan Finansial Beli & Pengurang Retur */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-950 to-slate-900 text-white space-y-3 shadow-md">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-blue-200">
                            Total Pesanan ({orderSummary.totalItemsCount} unit ·{' '}
                            {activeOrderItems.length} SKU)
                          </p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs mt-1">
                            <span className="text-slate-300">
                              HPP: {formatIdr(orderSummary.totalCompanyAmountIdr)}
                            </span>
                            <span
                              className={`font-bold ${
                                orderSummary.totalMarginAmountIdr < 0
                                  ? 'text-amber-400'
                                  : 'text-emerald-300'
                              }`}
                            >
                              Selisih Harga:{' '}
                              {orderSummary.totalMarginAmountIdr < 0
                                ? `- ${formatIdr(
                                    Math.abs(orderSummary.totalMarginAmountIdr)
                                  )} (Tombok Sales)`
                                : `+ ${formatIdr(
                                    orderSummary.totalMarginAmountIdr
                                  )} (Margin)`}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-wider text-amber-300 font-bold">
                            Penjualan Kotor (Gross)
                          </p>
                          <p className="text-lg font-black font-mono text-amber-400">
                            {formatIdr(orderSummary.totalStoreAmountIdr)}
                          </p>
                        </div>
                      </div>

                      {totalReturnAmountIdr > 0 && (
                        <div className="pt-2 border-t border-blue-800/80 flex items-center justify-between text-xs">
                          <span className="text-rose-300 font-medium">
                            Potongan Retur Barang Toko:
                          </span>
                          <span className="font-mono font-bold text-rose-400">
                            - {formatIdr(totalReturnAmountIdr)}
                          </span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-blue-800 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                          Sales Achievement (Net Omset):
                        </span>
                        <span className="text-xl font-black font-mono text-white">
                          {formatIdr(netSalesAfterReturnIdr)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Form Jika Tidak Beli: Dropdown Alasan & Kolom Alasan Lainnya */
                  <div className="space-y-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-200">
                    <div>
                      <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider mb-2">
                        Pilih Alasan Toko Tidak Beli *
                      </label>
                      <select
                        value={noPurchaseCategory}
                        onChange={(e) =>
                          setNoPurchaseCategory(
                            e.target.value as NoPurchaseCategory
                          )
                        }
                        className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-white border border-amber-300 rounded-xl focus:outline-none focus:border-amber-600 font-medium"
                      >
                        {NO_PURCHASE_REASON_CATALOG.map((item) => (
                          <option key={item.category} value={item.category}>
                            {item.idLabel}
                          </option>
                        ))}
                      </select>
                    </div>

                    {noPurchaseCategory === NoPurchaseCategory.COMPETITOR_PRICE && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nama Kompetitor / Sub-Distributor
                        </label>
                        <input
                          type="text"
                          value={competitorBrand}
                          onChange={(e) => setCompetitorBrand(e.target.value)}
                          placeholder="Contoh: Distributor Snack X / Grosir Y"
                          className="w-full min-h-[42px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Kolom Alasan Lainnya / Catatan Tambahan Kunjungan *
                      </label>
                      <textarea
                        rows={3}
                        value={
                          noPurchaseCategory === NoPurchaseCategory.OTHER
                            ? customReasonOther
                            : noOrderRemarks
                        }
                        onChange={(e) => {
                          if (noPurchaseCategory === NoPurchaseCategory.OTHER) {
                            setCustomReasonOther(e.target.value);
                          } else {
                            setNoOrderRemarks(e.target.value);
                          }
                        }}
                        placeholder="Tuliskan kendala di toko, sisa stok pajangan, atau alasan spesifik pemilik toko..."
                        className="w-full p-3 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              {step === 1 ? (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedToStep2}
                    className="min-h-[44px] px-6 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <span>Lanjut ke Status Beli</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Kembali ke Toko
                  </button>

                  <div className="flex items-center gap-2">
                    {outcome === VisitOutcome.ORDER && (
                      <button
                        type="button"
                        onClick={(e) => handleSaveAndSubmit(e, true)}
                        className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-blue-950 bg-amber-400 hover:bg-amber-500 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Simpan & Cetak Kwitansi</span>
                      </button>
                    )}

                    <button
                      type="submit"
                      className="min-h-[44px] px-6 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
                    >
                      {outcome === VisitOutcome.ORDER
                        ? `Simpan Order (${formatIdr(netSalesAfterReturnIdr)})`
                        : 'Simpan Kunjungan Tidak Beli'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Kwitansi Modal */}
      {receiptModalOpen && completedOrderForReceipt?.purchaseOrder && (
        <InvoiceReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => {
            setReceiptModalOpen(false);
            onClose();
          }}
          order={completedOrderForReceipt.purchaseOrder}
          visit={completedOrderForReceipt}
          store={stores.find((s) => s.id === completedOrderForReceipt.storeId)}
          salesRepName={salesRep.name}
        />
      )}
    </>
  );
};
