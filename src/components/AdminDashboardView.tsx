import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Layers,
  LogOut,
  MapPin,
  Package,
  Plus,
  Quote,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store as StoreIcon,
  Tag,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Trash2,
} from 'lucide-react';
import { RawFirestoreDoc } from './ProductVerificationView';
import { KARAWANG_DISTRICTS, formatIdr } from '../data/karawangData';
import {
  OrderStatus,
  ProductSKU,
  Store,
  StoreVisit,
  VisitOutcome,
} from '../types/gtm';
import { IndofoodSnackTimeLogo } from './IndofoodSnackTimeLogo';
import { ExcelExportModal } from './ExcelExportModal';

interface AdminDashboardViewProps {
  currentUserEmail?: string | null;
  currentUserName?: string | null;
  stores: Store[];
  visits: StoreVisit[];
  liveProductDocs?: RawFirestoreDoc[];
  activeProductCatalog?: ProductSKU[];
  onOpenLoginModal?: () => void;
  onUpdateOrderStatus?: (orderId: string, status: OrderStatus) => void;
  onDeleteOrder?: (orderOrVisitId: string) => void;
  onOpenVisitRecorder?: () => void;
  onSignOut?: () => void;
  onClearAllSalesRecords?: () => void;
  areaList?: string[];
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUserEmail,
  currentUserName,
  stores,
  visits,
  liveProductDocs = [],
  activeProductCatalog = [],
  onOpenLoginModal,
  onUpdateOrderStatus,
  onDeleteOrder,
  onOpenVisitRecorder,
  onSignOut,
  onClearAllSalesRecords,
  areaList,
}) => {
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const availableAreas = useMemo(() => {
    return areaList && areaList.length > 0 ? areaList : KARAWANG_DISTRICTS;
  }, [areaList]);

  const [selectedPeriod, setSelectedPeriod] = useState<'hari_ini' | 'minggu_ini' | 'bulan_ini'>('hari_ini');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // 1. Tanggal hari ini secara otomatis
  const now = new Date();
  const autoDateIndonesian = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Waktu sapaan
  const currentHour = now.getHours();
  const timeGreeting =
    currentHour < 11
      ? 'Selamat Pagi'
      : currentHour < 15
      ? 'Selamat Siang'
      : currentHour < 18
      ? 'Selamat Sore'
      : 'Selamat Malam';

  // 2. Sapaan Admin
  const adminName =
    currentUserName ||
    (currentUserEmail ? currentUserEmail.split('@')[0] : 'Administrator GTM Karawang');

  // 3. Kutipan resmi
  const quoteText =
    'Bekerja dengan hati melahirkan prestasi, bekerja dengan ikhlas membawa keberkahan';

  // Filter kunjungan berdasarkan area jika dipilih
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (selectedAreaFilter !== 'ALL' && v.district !== selectedAreaFilter) {
        return false;
      }
      return true;
    });
  }, [visits, selectedAreaFilter]);

  // 2. Metrik Ringkasan Eksekutif Admin:
  // - Total Sales (Harga Jual Toko)
  // - Total Visit
  // - Total Order
  // - Total No Order
  // - Total New Store (NOO)
  // - Total Selisih Harga
  const summaryMetrics = useMemo(() => {
    const totalVisit = filteredVisits.length;
    const totalOrder = filteredVisits.filter(
      (v) => v.outcome === VisitOutcome.ORDER
    ).length;
    const totalNoOrder = filteredVisits.filter(
      (v) => v.outcome === VisitOutcome.NO_ORDER
    ).length;

    // Total New Store (NOO)
    const totalNewStore = stores.filter(
      (s) =>
        s.storeCode?.includes('NOO') ||
        s.storeCode?.includes('NEW') ||
        s.registeredAt >= '2026-09-01'
    ).length;

    let totalStoreSales = 0;
    let totalCompanySales = 0;

    filteredVisits.forEach((v) => {
      if (!v.purchaseOrder) return;
      if (v.purchaseOrder.totalStoreAmountIdr) {
        totalStoreSales += v.purchaseOrder.totalStoreAmountIdr;
      } else {
        totalStoreSales += v.purchaseOrder.netAmountIdr;
      }

      if (v.purchaseOrder.totalCompanyAmountIdr) {
        totalCompanySales += v.purchaseOrder.totalCompanyAmountIdr;
      } else {
        totalCompanySales += v.purchaseOrder.items.reduce(
          (sum, it) =>
            sum +
            (it.companyPriceIdr ?? it.unitPriceIdr) *
              it.quantity,
          0
        );
      }
    });

    const totalReturnAmount = filteredVisits.reduce((sum, v) => {
      return (
        sum +
        (v.totalReturnAmountIdr ||
          v.purchaseOrder?.totalReturnAmountIdr ||
          (v.returns ? v.returns.reduce((rSum, r) => rSum + (r.subtotalReturnIdr || 0), 0) : 0))
      );
    }, 0);

    const netStoreSales = Math.max(0, totalStoreSales - totalReturnAmount);
    // Selisih harga bersih (bisa negatif jika sales tombok)
    const totalSelisihHarga = totalStoreSales - totalCompanySales;

    return {
      totalVisit,
      totalOrder,
      totalNoOrder,
      totalNewStore,
      totalStoreSales,
      totalCompanySales,
      totalSelisihHarga,
      totalReturnAmount,
      netStoreSales,
    };
  }, [filteredVisits, stores]);

  // 3. GRAFIK: Produk Terlaris
  const topProductsChart = useMemo(() => {
    const map = new Map<string, { name: string; sku: string; qty: number; revenue: number }>();

    filteredVisits.forEach((v) => {
      if (!v.purchaseOrder) return;
      v.purchaseOrder.items.forEach((item) => {
        const key = item.skuId || item.productName;
        const existing = map.get(key) || {
          name: item.productName,
          sku: item.skuCode,
          qty: 0,
          revenue: 0,
        };
        existing.qty += item.quantity;
        existing.revenue += (item.storePriceIdr ?? item.unitPriceIdr) * item.quantity;
        map.set(key, existing);
      });
    });

    const sorted = Array.from(map.values()).sort((a, b) => b.qty - a.qty);
    const maxQty = sorted[0]?.qty || 1;
    return { list: sorted, maxQty };
  }, [filteredVisits]);

  // 3. GRAFIK: Penjualan berdasarkan Nama Sales
  const salesByRepChart = useMemo(() => {
    const map = new Map<
      string,
      {
        salesName: string;
        ordersCount: number;
        visitsCount: number;
        revenue: number;
      }
    >();

    filteredVisits.forEach((v) => {
      const repName = v.salesRepName || 'Sales Representative';
      const existing = map.get(repName) || {
        salesName: repName,
        ordersCount: 0,
        visitsCount: 0,
        revenue: 0,
      };
      existing.visitsCount += 1;
      if (v.outcome === VisitOutcome.ORDER) {
        existing.ordersCount += 1;
        existing.revenue +=
          v.purchaseOrder?.totalStoreAmountIdr ??
          v.purchaseOrder?.netAmountIdr ??
          0;
      }
      map.set(repName, existing);
    });

    const list = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
    const maxRevenue = Math.max(...list.map((r) => r.revenue), 1);
    return { list, maxRevenue };
  }, [filteredVisits]);

  // 3. GRAFIK: Penjualan berdasarkan Area
  const salesByAreaChart = useMemo(() => {
    const map = new Map<string, { area: string; storeCount: number; revenue: number }>();

    filteredVisits.forEach((v) => {
      const area = v.district || availableAreas[0] || 'Desa Batu Jaya';
      const existing = map.get(area) || { area, storeCount: 0, revenue: 0 };
      existing.storeCount += 1;
      if (v.purchaseOrder) {
        existing.revenue +=
          v.purchaseOrder.totalStoreAmountIdr ?? v.purchaseOrder.netAmountIdr;
      }
      map.set(area, existing);
    });

    const list = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
    const maxRevenue = Math.max(...list.map((a) => a.revenue), 1);
    return { list, maxRevenue };
  }, [filteredVisits, availableAreas]);

  const handleExportCSV = () => {
    const headers = [
      'ID Kunjungan',
      'Tanggal',
      'Nama Toko',
      'Area',
      'Sales',
      'Status',
      'No PO',
      'HPP Perusahaan',
      'Harga Jual Toko',
      'Selisih Margin',
    ];

    const rows = filteredVisits.map((v) => {
      const po = v.purchaseOrder;
      const comp = po?.totalCompanyAmountIdr || 0;
      const storeTotal = po?.totalStoreAmountIdr || po?.netAmountIdr || 0;
      const diff = storeTotal - comp;
      return [
        v.visitCode || v.id,
        v.date,
        `"${v.storeName}"`,
        `"${v.district}"`,
        `"${v.salesRepName}"`,
        v.outcome,
        po?.poNumber || '-',
        comp,
        storeTotal,
        diff,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap-GTM-Karawang-${now.toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Admin Executive Header (Biru, Putih, Kuning) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white shadow-xl border border-blue-700/50 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            {/* Header Badge & Otomatis Tanggal */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-blue-950 uppercase tracking-wider shadow-xs">
                Role: Administrator
              </span>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-blue-100">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>{autoDateIndonesian}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Firestore Live: sales-gtm-karawang</span>
              </div>
            </div>

            {/* Sapaan Admin */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
                {timeGreeting}, <span className="text-amber-400">{adminName}</span>
              </h1>
              <p className="text-xs sm:text-sm text-blue-200 mt-1">
                Dasbor Kontrol Operasional Penjualan Snack Indofood · Area Karawang
              </p>
            </div>

            {/* Kutipan Resmi */}
            <div className="flex items-start gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-blue-900/60 border border-blue-700/40 max-w-2xl">
              <Quote className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-blue-100 font-medium italic leading-relaxed">
                “{quoteText}”
              </p>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md border border-emerald-400/30"
              title="Download laporan sales dan visit toko dalam format Excel (.xls)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Ekspor Excel (.xls)</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Ekspor CSV</span>
            </button>



            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="px-3.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Keluar dari akun Admin"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Keluar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. ENAM KARTU RINGKASAN SESUAI PROMPT */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Total Sales */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 text-white shadow-xs col-span-2 sm:col-span-1 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
              Total Sales
            </span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-white truncate">
            {formatIdr(summaryMetrics.totalStoreSales)}
          </p>
          <p className="text-[10px] text-blue-200 mt-1">Harga Jual ke Toko</p>
        </div>

        {/* 2. Total Visit */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-blue-100 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Visit
            </span>
            <StoreIcon className="w-4 h-4 text-blue-700" />
          </div>
          <p className="text-2xl font-black font-mono text-blue-950">
            {summaryMetrics.totalVisit}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Kunjungan Toko</p>
        </div>

        {/* 3. Total Order */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Total Order
            </span>
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black font-mono text-emerald-700">
            {summaryMetrics.totalOrder}
          </p>
          <p className="text-[10px] text-emerald-600 mt-1">Toko Beli</p>
        </div>

        {/* 4. Total No Order */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-100 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
              Total No Order
            </span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black font-mono text-amber-700">
            {summaryMetrics.totalNoOrder}
          </p>
          <p className="text-[10px] text-amber-600 mt-1">Tidak Beli</p>
        </div>

        {/* 5. Total New Store (NOO) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-purple-100 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
              Total NOO
            </span>
            <Building2 className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black font-mono text-purple-700">
            {summaryMetrics.totalNewStore}
          </p>
          <p className="text-[10px] text-purple-600 mt-1">Toko Baru Terdaftar</p>
        </div>

        {/* 6. Total Selisih Harga */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border shadow-xs col-span-2 sm:col-span-1 lg:col-span-1 ${
            summaryMetrics.totalSelisihHarga < 0
              ? 'bg-amber-50 border-amber-300'
              : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                summaryMetrics.totalSelisihHarga < 0
                  ? 'text-amber-800'
                  : 'text-emerald-800'
              }`}
            >
              Selisih {summaryMetrics.totalSelisihHarga < 0 ? '(Tombok)' : '(Margin)'}
            </span>
            <Tag
              className={`w-4 h-4 ${
                summaryMetrics.totalSelisihHarga < 0
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              }`}
            />
          </div>
          <p
            className={`text-xl sm:text-2xl font-black font-mono truncate ${
              summaryMetrics.totalSelisihHarga < 0
                ? 'text-amber-800'
                : 'text-emerald-800'
            }`}
          >
            {summaryMetrics.totalSelisihHarga < 0
              ? `- ${formatIdr(Math.abs(summaryMetrics.totalSelisihHarga))}`
              : `+ ${formatIdr(summaryMetrics.totalSelisihHarga)}`}
          </p>
          <p
            className={`text-[10px] mt-1 ${
              summaryMetrics.totalSelisihHarga < 0
                ? 'text-amber-700 font-semibold'
                : 'text-emerald-700'
            }`}
          >
            {summaryMetrics.totalSelisihHarga < 0 ? 'Tombok Sales' : 'Margin Toko - HPP'}
          </p>
        </div>
      </div>

      {/* 3. TIGA GRAFIK UTAMA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik 1: Produk Terlaris */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-blue-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-700" />
                Produk Terlaris (Top SKU)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800">
                Volume
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 mb-4">
              Peringkat produk snack Indofood berdasarkan volume pesanan
            </p>

            <div className="space-y-3.5">
              {topProductsChart.list.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  Belum ada data transaksi produk
                </div>
              ) : (
                topProductsChart.list.slice(0, 5).map((item, idx) => {
                  const percent = Math.round((item.qty / topProductsChart.maxQty) * 100);
                  return (
                    <div key={item.sku || idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 truncate max-w-[180px]">
                          {idx + 1}. {item.name}
                        </span>
                        <span className="font-mono font-bold text-blue-950">
                          {item.qty} Unit ({formatIdr(item.revenue)})
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-700 to-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Sinkron data dari /Product</span>
            <span className="font-bold text-blue-700">
              {liveProductDocs.length > 0 ? `${liveProductDocs.length} SKU Firestore` : 'Katalog Master'}
            </span>
          </div>
        </div>

        {/* Grafik 2: Penjualan berdasarkan Nama Sales */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-blue-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-700" />
                Penjualan per Nama Sales
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                Omzet
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 mb-4">
              Kinerja omzet dan rasio pesanan per sales representative
            </p>

            <div className="space-y-3.5">
              {salesByRepChart.list.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  Belum ada data penjualan sales
                </div>
              ) : (
                salesByRepChart.list.slice(0, 5).map((rep) => {
                  const percent = Math.round((rep.revenue / salesByRepChart.maxRevenue) * 100);
                  return (
                    <div key={rep.salesName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">
                          {rep.salesName}
                        </span>
                        <span className="font-mono font-bold text-emerald-700">
                          {formatIdr(rep.revenue)}
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{rep.visitsCount} Kunjungan</span>
                        <span>{rep.ordersCount} Berhasil Order</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Target Tim Lapangan</span>
            <span className="font-bold text-emerald-700">Karawang Coverage</span>
          </div>
        </div>

        {/* Grafik 3: Penjualan berdasarkan Area */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-blue-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-700" />
                Penjualan per Area
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
                Karawang
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 mb-4">
              Distribusi realisasi penjualan di tiap Area
            </p>

            <div className="space-y-3.5">
              {salesByAreaChart.list.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  Belum ada data penjualan per area
                </div>
              ) : (
                salesByAreaChart.list.slice(0, 5).map((area) => {
                  const percent = Math.round((area.revenue / salesByAreaChart.maxRevenue) * 100);
                  return (
                    <div key={area.area} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 truncate">
                          {area.area}
                        </span>
                        <span className="font-mono font-bold text-blue-950">
                          {formatIdr(area.revenue)}
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {area.storeCount} Toko dikunjungi
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Total Area</span>
            <span className="font-bold text-blue-900">{availableAreas.length} Area Terdaftar</span>
          </div>
        </div>
      </div>

      {/* Tabel Real-Time Order & Validasi Admin */}
      <div className="rounded-3xl bg-white border border-blue-100 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-700" />
              Monitoring Pesanan & Approval Real-Time
            </h3>
            <p className="text-xs text-slate-500">
              Daftar transaksi masuk dari kunjungan sales di lapangan
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onClearAllSalesRecords && visits.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Apakah Anda yakin ingin menghapus semua record sales (kunjungan & pesanan)?'
                    )
                  ) {
                    onClearAllSalesRecords();
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Hapus semua record sales"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Reset/Hapus Semua Record Sales</span>
              </button>
            )}
            <span className="text-xs text-slate-500">
              Total {filteredVisits.filter((v) => v.purchaseOrder).length} Pesanan
            </span>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">No PO / Tanggal</th>
                <th className="px-4 py-3">Toko & Area</th>
                <th className="px-4 py-3">Sales Rep</th>
                <th className="px-4 py-3 text-right">Harga Pabrik</th>
                <th className="px-4 py-3 text-right">Total Toko</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredVisits.filter((v) => v.purchaseOrder).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Belum ada transaksi pesanan yang tercatat
                  </td>
                </tr>
              ) : (
                filteredVisits
                  .filter((v) => v.purchaseOrder)
                  .slice(0, 8)
                  .map((visit) => {
                  const po = visit.purchaseOrder!;
                  const companyAmount =
                    po.totalCompanyAmountIdr ??
                    po.items.reduce(
                      (s, i) =>
                        s +
                        (i.companyPriceIdr ?? i.unitPriceIdr) *
                          i.quantity,
                      0
                    );
                  const storeAmount = po.totalStoreAmountIdr ?? po.netAmountIdr;

                  return (
                    <tr key={po.id || visit.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 font-mono">
                          {po.poNumber}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {po.date}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{visit.storeName}</p>
                        <p className="text-[10px] text-slate-500">{visit.district}</p>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {visit.salesRepName}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {formatIdr(companyAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-900">
                        {formatIdr(storeAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            po.status === OrderStatus.APPROVED
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : po.status === OrderStatus.DELIVERED
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {po.status === OrderStatus.APPROVED
                            ? 'Approved (Setoran Beres)'
                            : po.status === OrderStatus.DELIVERED
                            ? 'Delivered (Siap Setor Uang)'
                            : 'Submitted'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {po.status !== OrderStatus.APPROVED && onUpdateOrderStatus && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateOrderStatus(po.id, OrderStatus.APPROVED)
                              }
                              title="Konfirmasi bahwa sales sudah menyetorkan uang hasil penjualan pesanan ini ke Admin"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Setujui</span>
                            </button>
                          )}
                          {po.status === OrderStatus.APPROVED && (
                            <span className="text-[11px] text-emerald-700 font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Approved
                            </span>
                          )}

                          {onDeleteOrder && (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Apakah Anda yakin ingin menghapus pesanan ${po.poNumber} (${visit.storeName})?`
                                  )
                                ) {
                                  onDeleteOrder(po.id || visit.id);
                                }
                              }}
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                              title="Hapus Pesanan (Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Excel Export Modal (.xls) with Daily, Weekly, Monthly, Annual filters */}
      <ExcelExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        visits={visits}
      />
    </div>
  );
};
