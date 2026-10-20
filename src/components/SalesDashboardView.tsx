import React from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  MapPin,
  Package,
  Plus,
  Quote,
  ShieldCheck,
  ShoppingBag,
  Store as StoreIcon,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { extractNameFromEmail, formatIdr } from '../data/karawangData';
import {
  PlannedRouteStop,
  SalesRepresentative,
  Store,
  StoreVisit,
  VisitOutcome,
} from '../types/gtm';
import { IndofoodSnackTimeLogo } from './IndofoodSnackTimeLogo';

interface SalesDashboardViewProps {
  salesRep: SalesRepresentative;
  currentUserEmail?: string | null;
  currentUserName?: string | null;
  visits: StoreVisit[];
  stores: Store[];
  routeStops: PlannedRouteStop[];
  selectedDate: string;
  onOpenVisitRecorder: (storeId?: string) => void;
  onNavigateSection: (section: 'visits' | 'orders' | 'profile' | 'stores') => void;
  onViewInvoice?: (visit: StoreVisit) => void;
}

export const SalesDashboardView: React.FC<SalesDashboardViewProps> = ({
  salesRep,
  currentUserEmail,
  currentUserName,
  visits,
  stores,
  routeStops,
  selectedDate,
  onOpenVisitRecorder,
  onNavigateSection,
  onViewInvoice,
}) => {
  // 1. Tanggal hari ini secara otomatis dalam bahasa Indonesia
  const now = new Date();
  const autoDateIndonesian = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Waktu sapaan (Pagi/Siang/Sore/Malam)
  const currentHour = now.getHours();
  const timeGreeting =
    currentHour < 11
      ? 'Selamat Pagi'
      : currentHour < 15
      ? 'Selamat Siang'
      : currentHour < 18
      ? 'Selamat Sore'
      : 'Selamat Malam';

  // 2. Sapaan menggunakan nama sales yang otomatis diambil dari email
  const displayName =
    currentUserName ||
    salesRep.name ||
    extractNameFromEmail(currentUserEmail || salesRep.email || '', 'sales');

  // 3. Kutipan resmi
  const quoteText =
    'Bekerja dengan hati melahirkan prestasi, bekerja dengan ikhlas membawa keberkahan';

  // Metrics for Visits & Orders
  const todayVisits = visits.filter(
    (v) => v.date === selectedDate || v.salesRepId === salesRep.id
  );
  const totalVisitsCount = todayVisits.length;
  const totalOrdersCount = todayVisits.filter(
    (v) => v.outcome === VisitOutcome.ORDER
  ).length;
  const totalNoOrdersCount = todayVisits.filter(
    (v) => v.outcome === VisitOutcome.NO_ORDER
  ).length;

  // 6. Total Sales berdasarkan harga perusahaan dan harga jual ke toko
  const totalCompanySales = todayVisits.reduce((acc, v) => {
    if (!v.purchaseOrder) return acc;
    if (v.purchaseOrder.totalCompanyAmountIdr) {
      return acc + v.purchaseOrder.totalCompanyAmountIdr;
    }
    return (
      acc +
      v.purchaseOrder.items.reduce(
        (sum, item) =>
          sum +
          (item.companyPriceIdr ?? item.unitPriceIdr) *
            item.quantity,
        0
      )
    );
  }, 0);

  const totalStoreSales = todayVisits.reduce((acc, v) => {
    if (!v.purchaseOrder) return acc;
    if (v.purchaseOrder.totalStoreAmountIdr) {
      return acc + v.purchaseOrder.totalStoreAmountIdr;
    }
    return acc + v.purchaseOrder.netAmountIdr;
  }, 0);

  const totalPriceDifference = Math.max(0, totalStoreSales - totalCompanySales);

  const targetAchievementPercent = Math.min(
    100,
    Math.round((totalStoreSales / salesRep.dailyOrderTargetIdr) * 100)
  );

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Hero Welcome Card (Warna utama Biru, Putih, Kuning) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white shadow-xl border border-blue-700/50 p-6 sm:p-8">
        {/* Decorative Golden & White Glow Orbs */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            {/* 1. Hari & Tanggal Otomatis */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-blue-100 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{autoDateIndonesian}</span>
              <span className="w-1 h-1 rounded-full bg-amber-400" />
              <span className="text-amber-300 font-mono">Area Karawang</span>
            </div>

            {/* 2. Sapaan dengan field Nama */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
                {timeGreeting}, <span className="text-amber-400">{displayName}</span>!
              </h1>
              <p className="text-xs sm:text-sm text-blue-200 mt-1 flex items-center gap-2">
                <span>{salesRep.role}</span>
                <span>·</span>
                <span className="text-blue-100">{salesRep.email}</span>
              </p>
            </div>

            {/* 3. Kutipan */}
            <div className="flex items-start gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-blue-950/60 border border-blue-700/40 max-w-2xl">
              <Quote className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-blue-100 font-medium italic leading-relaxed">
                “{quoteText}”
              </p>
            </div>
          </div>

          {/* 4. Tombol Record Visit yang Jelas & Menonjol */}
          <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onOpenVisitRecorder()}
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-blue-950 font-black text-sm tracking-wide shadow-lg hover:shadow-xl hover:from-amber-300 hover:to-yellow-300 active:scale-95 transition-all flex items-center justify-center gap-2.5 border border-amber-200 cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-xl bg-blue-900 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <span className="uppercase text-xs sm:text-sm tracking-wider">
                Record Visit Toko
              </span>
            </button>

            <span className="text-[11px] text-blue-200 text-center md:text-right">
              Target Kunjungan: <strong className="text-white">{salesRep.dailyVisitTarget} Toko / Hari</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 5. Kartu Total Visit, Total Order, Total No Order */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Visit */}
        <div className="p-5 rounded-2xl bg-white border border-blue-100 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Visit
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <StoreIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-950 font-mono">
              {totalVisitsCount}
            </span>
            <span className="text-xs text-slate-500">
              / target {salesRep.dailyVisitTarget} toko
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <span className="text-slate-500">Pencapaian Kunjungan</span>
            <span className="font-bold text-blue-700">
              {Math.round((totalVisitsCount / salesRep.dailyVisitTarget) * 100)}%
            </span>
          </div>
        </div>

        {/* Total Order */}
        <div className="p-5 rounded-2xl bg-white border border-emerald-100 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Total Order
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-700 font-mono">
              {totalOrdersCount}
            </span>
            <span className="text-xs text-emerald-600 font-medium">Toko Beli</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <span className="text-slate-500">Strike Rate (Konversi)</span>
            <span className="font-bold text-emerald-700">
              {totalVisitsCount > 0
                ? `${Math.round((totalOrdersCount / totalVisitsCount) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Total No Order */}
        <div className="p-5 rounded-2xl bg-white border border-amber-100 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Total No Order
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-700 font-mono">
              {totalNoOrdersCount}
            </span>
            <span className="text-xs text-amber-600 font-medium">Tidak Beli</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <span className="text-slate-500">Rasio Kendala Lapangan</span>
            <span className="font-bold text-amber-700">
              {totalVisitsCount > 0
                ? `${Math.round((totalNoOrdersCount / totalVisitsCount) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Total Sales berdasarkan Harga Perusahaan dan Harga Jual Toko */}
      <div className="rounded-3xl bg-white border border-blue-100 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-blue-950 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-700" />
              Realisasi Penjualan Hari Ini
            </h2>
            <p className="text-xs text-slate-500">
              Perbandingan HPP Perusahaan vs Harga Faktur Jual ke Toko
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-bold font-mono">
              Target: {formatIdr(salesRep.dailyOrderTargetIdr)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Harga Jual ke Toko (Invoice Omzet) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 text-white space-y-1">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
              Total Sales (Harga Jual Toko)
            </span>
            <p className="text-2xl font-black font-mono text-white">
              {formatIdr(totalStoreSales)}
            </p>
            <p className="text-[11px] text-blue-200 pt-1">
              Nilai kuitansi pesanan yang ditagihkan ke outlet
            </p>
          </div>

          {/* Harga Perusahaan (HPP Distributor) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Sales (Harga Perusahaan)
            </span>
            <p className="text-2xl font-black font-mono text-slate-800">
              {formatIdr(totalCompanySales)}
            </p>
            <p className="text-[11px] text-slate-500 pt-1">
              Harga pokok dari pabrik PT Indofood Fortuna Makmur (IFM) Karawang
            </p>
          </div>

          {/* Selisih Harga (Margin) */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Total Selisih Harga (Margin Toko)
            </span>
            <p className="text-2xl font-black font-mono text-emerald-700">
              + {formatIdr(totalPriceDifference)}
            </p>
            <p className="text-[11px] text-emerald-700/80 pt-1">
              Estimasi selisih margin perputaran barang
            </p>
          </div>
        </div>

        {/* Progress Bar Target */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600">Pencapaian Target Harian:</span>
            <span className="font-mono text-blue-900 font-bold">
              {targetAchievementPercent}% ({formatIdr(totalStoreSales)} / {formatIdr(salesRep.dailyOrderTargetIdr)})
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-700 via-blue-600 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${targetAchievementPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards (Visit, Order, Profile) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigateSection('visits')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-600 text-left transition-all hover:shadow-md cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
            Daftar Kunjungan (Visit)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Lihat riwayat rute, status GPS, dan jadwal kunjungan toko Karawang.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateSection('orders')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-600 text-left transition-all hover:shadow-md cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
            Daftar Order & Kwitansi
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Pantau purchase order, status approval, dan cetak ulang kwitansi.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateSection('profile')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-600 text-left transition-all hover:shadow-md cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <User className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
            Profil Sales & Akun
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Informasi wilayah penugasan Karawang, target, dan login akun sales.
          </p>
        </button>
      </div>

      {/* Aktivitas Kunjungan Terbaru Hari Ini */}
      <div className="rounded-3xl bg-white border border-blue-100 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <StoreIcon className="w-4 h-4 text-blue-700" />
              Kunjungan & Transaksi Terakhir
            </h3>
            <p className="text-xs text-slate-500">
              Daftar toko yang telah dikunjungi oleh {displayName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateSection('visits')}
            className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayVisits.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
            <StoreIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">
              Belum ada kunjungan toko yang tercatat hari ini.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Klik tombol "Record Visit Toko" di atas untuk memulai pencatatan.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {todayVisits.slice(0, 5).map((visit) => {
              const isOrder = visit.outcome === VisitOutcome.ORDER;
              return (
                <div
                  key={visit.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors px-2 rounded-xl"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isOrder
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isOrder ? (
                        <ShoppingBag className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {visit.storeName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {visit.district} · Jam {visit.checkInTime} · Pemilik: {visit.storeOwner}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="text-left sm:text-right">
                      {isOrder ? (
                        <>
                          <span className="text-xs font-mono font-bold text-emerald-700 block">
                            {formatIdr(visit.purchaseOrder?.netAmountIdr || 0)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {visit.purchaseOrder?.items.length || 0} SKU Pesanan
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {visit.noPurchaseDetail?.reasonLabel || 'Tidak Beli'}
                        </span>
                      )}
                    </div>

                    {isOrder && onViewInvoice && (
                      <button
                        type="button"
                        onClick={() => onViewInvoice(visit)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Kwitansi</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
