import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  FileText,
  Info,
  Lock,
  Package,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { NO_PURCHASE_REASON_CATALOG, formatIdr } from '../data/karawangData';
import {
  OrderStatus,
  PurchaseOrder,
  StoreVisit,
  VisitOutcome,
} from '../types/gtm';

interface OrdersAndBarriersViewProps {
  mode: 'orders' | 'no_orders';
  userRole?: 'sales' | 'admin';
  visits: StoreVisit[];
  onUpdateOrderStatus: (visitId: string, nextStatus: OrderStatus) => void;
  onDeleteOrder?: (orderOrVisitId: string) => void;
  onStartFollowUpVisit: (storeId: string) => void;
  onOpenNewVisit: () => void;
}

export const OrdersAndBarriersView: React.FC<OrdersAndBarriersViewProps> = ({
  mode,
  userRole = 'sales',
  visits,
  onUpdateOrderStatus,
  onDeleteOrder,
  onStartFollowUpVisit,
  onOpenNewVisit,
}) => {
  const [selectedOrderVisit, setSelectedOrderVisit] = useState<StoreVisit | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const orderVisits = useMemo(
    () =>
      visits.filter(
        (v) => v.outcome === VisitOutcome.ORDER && Boolean(v.purchaseOrder)
      ),
    [visits]
  );

  const filteredOrderVisits = useMemo(() => {
    if (statusFilter === 'ALL') return orderVisits;
    return orderVisits.filter((v) => v.purchaseOrder?.status === statusFilter);
  }, [orderVisits, statusFilter]);

  const noOrderVisits = useMemo(
    () =>
      visits.filter(
        (v) => v.outcome === VisitOutcome.NO_ORDER && Boolean(v.noPurchaseDetail)
      ),
    [visits]
  );

  const totalRevenueIdr = useMemo(
    () =>
      orderVisits.reduce(
        (sum, v) => sum + (v.purchaseOrder?.netAmountIdr || 0),
        0
      ),
    [orderVisits]
  );

  const reasonDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    noOrderVisits.forEach((v) => {
      const cat = v.noPurchaseDetail?.category || 'OTHER';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return NO_PURCHASE_REASON_CATALOG.map((item) => {
      const count = counts[item.category] || 0;
      const pct =
        noOrderVisits.length > 0
          ? Math.round((count / noOrderVisits.length) * 100)
          : 0;
      return {
        ...item,
        count,
        pct,
      };
    }).filter((r) => r.count > 0);
  }, [noOrderVisits]);

  const counts = useMemo(() => {
    return {
      all: orderVisits.length,
      submitted: orderVisits.filter(
        (v) => v.purchaseOrder?.status === OrderStatus.SUBMITTED
      ).length,
      delivered: orderVisits.filter(
        (v) => v.purchaseOrder?.status === OrderStatus.DELIVERED
      ).length,
      approved: orderVisits.filter(
        (v) => v.purchaseOrder?.status === OrderStatus.APPROVED
      ).length,
    };
  }, [orderVisits]);

  if (mode === 'orders') {
    return (
      <div className="space-y-5">
        {/* Header Title & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                Penjualan Langsung & Pesanan Toko
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-200 uppercase">
                {userRole === 'admin' ? 'Akses Admin' : 'Akses Sales'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              PT Indofood Fortuna Makmur (IFM) · {orderVisits.length} transaksi · Total Nilai Net{' '}
              <span className="font-mono font-semibold text-slate-800">
                {formatIdr(totalRevenueIdr)}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenNewVisit}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-800 text-white text-xs font-semibold hover:bg-blue-900 transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Transaksi Visit</span>
          </button>
        </div>



        {/* Interactive Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl w-fit max-w-full overflow-x-auto">
          {(
            [
              { id: 'ALL', label: `Semua Pesanan (${counts.all})` },
              { id: OrderStatus.SUBMITTED, label: `Submitted (${counts.submitted})` },
              { id: OrderStatus.DELIVERED, label: `Delivered (${counts.delivered})` },
              { id: OrderStatus.APPROVED, label: `Approved (${counts.approved})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white text-blue-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Purchase Orders List */}
        <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-2xs">
          {filteredOrderVisits.length === 0 ? (
            <div className="p-10 text-center">
              <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">
                Tidak ada pesanan dalam filter ini
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Catat kunjungan toko dengan transaksi pembelian untuk melihat datanya di sini.
              </p>
            </div>
          ) : (
            filteredOrderVisits.map((visit) => {
              const po = visit.purchaseOrder as PurchaseOrder;
              const isSubmitted = po.status === OrderStatus.SUBMITTED;
              const isDelivered = po.status === OrderStatus.DELIVERED;
              const isApproved = po.status === OrderStatus.APPROVED;

              return (
                <div
                  key={visit.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedOrderVisit(visit)}
                    className="text-left flex items-start gap-3.5 min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0 mt-0.5 border border-blue-100">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {visit.storeName}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        <span className="font-mono font-medium text-slate-700">
                          {po.poNumber}
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span>{visit.district}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-semibold text-slate-700">{po.paymentTerm}</span>
                        <span aria-hidden="true"> · </span>
                        <span>
                          {po.items.length} SKUs ({po.totalItemsCount} unit)
                        </span>
                      </p>
                      {po.deliveryNotes && (
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          Catatan: {po.deliveryNotes}
                        </p>
                      )}
                    </div>
                  </button>

                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-3 pl-13 sm:pl-0 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                        {formatIdr(po.netAmountIdr)}
                      </p>
                      <div className="mt-0.5 flex items-center sm:justify-end gap-1">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Approved (Setoran Beres)
                          </span>
                        )}
                        {isDelivered && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            <Truck className="w-3 h-3 text-blue-600" />
                            Delivered (Siap Setor Uang)
                          </span>
                        )}
                        {isSubmitted && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            Submitted (Belum Diserahkan)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Role-Specific Direct Action Buttons */}
                    {userRole === 'sales' && isSubmitted && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateOrderStatus(visit.id, OrderStatus.DELIVERED);
                        }}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        title="Sales menyerahkan barang langsung ke customer toko"
                      >
                        <PackageCheck className="w-3.5 h-3.5 text-amber-300" />
                        <span>Tandai Delivered</span>
                      </button>
                    )}

                    {userRole === 'admin' && (isDelivered || isSubmitted) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateOrderStatus(visit.id, OrderStatus.APPROVED);
                        }}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        title="Admin mengesahkan pesanan setelah sales menyetorkan uang"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Setujui (Approve)</span>
                      </button>
                    )}

                    {userRole === 'admin' && onDeleteOrder && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              `Apakah Anda yakin ingin menghapus pesanan ${
                                visit.purchaseOrder?.poNumber || ''
                              } (${visit.storeName})?`
                            )
                          ) {
                            onDeleteOrder(visit.id);
                          }
                        }}
                        className="min-h-[40px] px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        title="Hapus pesanan ini (Kewenangan Admin)"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Hapus</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedOrderVisit(visit)}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap cursor-pointer"
                    >
                      Detail
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* PO Detail Sheet Modal */}
        {selectedOrderVisit && selectedOrderVisit.purchaseOrder && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
            <div className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[88vh] flex flex-col overflow-hidden">
              <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-mono">
                    {selectedOrderVisit.purchaseOrder.poNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedOrderVisit.storeName} · Kec. {selectedOrderVisit.district}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrderVisit(null)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <p className="text-slate-500">Tanggal & Waktu</p>
                    <p className="font-mono font-semibold text-slate-900 mt-0.5">
                      {selectedOrderVisit.date} ({selectedOrderVisit.checkOutTime})
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Metode Pembayaran</p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {selectedOrderVisit.purchaseOrder.paymentTerm}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Status Saat Ini</p>
                    <p className="font-bold text-blue-900 mt-0.5">
                      {selectedOrderVisit.purchaseOrder.status}
                    </p>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Produk Snack IFM</span>
                    <span>Subtotal</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {selectedOrderVisit.purchaseOrder.items.map((item) => (
                      <div
                        key={`${item.skuId}-${item.unit}`}
                        className="px-4 py-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {item.productName}
                          </p>
                          <p className="text-slate-500 font-mono mt-0.5">
                            {item.skuCode} · {item.quantity} {item.unit} ×{' '}
                            {formatIdr(item.unitPriceIdr)}
                            {item.discountIdr > 0
                              ? ` (-${formatIdr(item.discountIdr)} disc)`
                              : ''}
                          </p>
                        </div>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                          {formatIdr(item.subtotalIdr)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">
                      Total Penjualan ke Toko
                    </span>
                    <span className="text-base font-mono font-bold tabular-nums">
                      {formatIdr(selectedOrderVisit.purchaseOrder.netAmountIdr)}
                    </span>
                  </div>
                </div>

                {/* Status Progression Controls - DIATUR KETAT SESUAI ROLE */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Kontrol Status Pesanan & Serah Terima
                  </label>

                  {userRole === 'sales' ? (
                    /* PANDUAN & KONTROL UNTUK AKUN SALES */
                    <div className="space-y-3">
                      {selectedOrderVisit.purchaseOrder.status === OrderStatus.SUBMITTED && (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateOrderStatus(
                                selectedOrderVisit.id,
                                OrderStatus.DELIVERED
                              );
                              setSelectedOrderVisit((prev) =>
                                prev && prev.purchaseOrder
                                  ? {
                                      ...prev,
                                      purchaseOrder: {
                                        ...prev.purchaseOrder,
                                        status: OrderStatus.DELIVERED,
                                      },
                                    }
                                  : null
                              );
                            }}
                            className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <PackageCheck className="w-4 h-4 text-amber-300" />
                            <span>Tandai Barang Telah Diserahkan ke Toko (Delivered)</span>
                          </button>
                          <p className="text-[11px] text-slate-500 leading-snug">
                            Sales membawa barang langsung saat visit. Klik tombol di atas setelah barang fisik diserahkan ke pemilik toko dan pembayaran (COD/Transfer) selesai.
                          </p>

                          {/* Penjelasan bahwa sales tidak bisa approve */}
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 mt-2">
                            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Status 'Approved' Khusus Kewenangan Admin</p>
                              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                                Akun sales tidak bisa mengubah status menjadi Approved. Status Approved akan disahkan oleh Admin setelah Anda menyetorkan uang hasil penjualan toko ini ke Admin.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedOrderVisit.purchaseOrder.status === OrderStatus.DELIVERED && (
                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs space-y-2.5">
                          <div className="flex items-center gap-2 text-blue-950 font-bold">
                            <Truck className="w-4 h-4 text-blue-700" />
                            <span>Barang Telah Diserahkan (Delivered) · Siap Setor Uang ke Admin</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed text-[11px]">
                            Anda telah menyerahkan barang langsung ke customer toko. Silakan segera setorkan uang hasil penjualan (COD Tunai / Bukti Transfer) ke Admin. Status akan diubah menjadi <strong className="text-emerald-700 font-bold">Approved</strong> oleh Admin setelah uang penjualan diserahkan.
                          </p>
                          <div className="pt-2 border-t border-blue-100 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateOrderStatus(
                                  selectedOrderVisit.id,
                                  OrderStatus.SUBMITTED
                                );
                                setSelectedOrderVisit((prev) =>
                                  prev && prev.purchaseOrder
                                    ? {
                                        ...prev,
                                        purchaseOrder: {
                                          ...prev.purchaseOrder,
                                          status: OrderStatus.SUBMITTED,
                                        },
                                      }
                                    : null
                                );
                              }}
                              className="text-[11px] text-slate-500 hover:text-slate-700 underline font-medium cursor-pointer"
                            >
                              Koreksi: Kembalikan ke Submitted
                            </button>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Lock className="w-3 h-3 text-amber-600" /> Approved: Khusus Admin
                            </span>
                          </div>
                        </div>
                      )}

                      {selectedOrderVisit.purchaseOrder.status === OrderStatus.APPROVED && (
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                          <div className="flex items-center gap-2 text-emerald-950 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Disetujui Admin (Approved) · Setoran Uang Penjualan Telah Diterima</span>
                          </div>
                          <p className="text-emerald-800 text-[11px] leading-relaxed">
                            Admin telah mengonfirmasi bahwa uang penjualan toko ini telah disetor oleh sales. Status transaksi telah rampung dan tidak dapat diubah lagi oleh sales.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* PANDUAN & KONTROL UNTUK AKUN ADMIN */
                    <div className="space-y-3">
                      {selectedOrderVisit.purchaseOrder.status !== OrderStatus.APPROVED ? (
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                              <ShieldCheck className="w-4 h-4 text-emerald-700" />
                              <span>Kewenangan Admin: Persetujuan Setoran Uang Penjualan</span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                selectedOrderVisit.purchaseOrder.status ===
                                OrderStatus.DELIVERED
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {selectedOrderVisit.purchaseOrder.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {selectedOrderVisit.purchaseOrder.status ===
                            OrderStatus.DELIVERED
                              ? 'Sales telah menyerahkan barang fisik ke customer. Klik Approve setelah sales menyetorkan uang hasil penjualan toko ini (COD Tunai / Bukti Transfer).'
                              : 'Pesanan dicatat sales. Anda dapat menyetujui jika setoran uang penjualan sudah diserahkan.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateOrderStatus(
                                selectedOrderVisit.id,
                                OrderStatus.APPROVED
                              );
                              setSelectedOrderVisit((prev) =>
                                prev && prev.purchaseOrder
                                  ? {
                                      ...prev,
                                      purchaseOrder: {
                                        ...prev.purchaseOrder,
                                        status: OrderStatus.APPROVED,
                                      },
                                    }
                                  : null
                              );
                            }}
                            className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                            <span>Setujui Pesanan (Approve) — Setoran Uang Telah Diterima</span>
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-950 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Pesanan Telah Disetujui Admin (Setoran Uang Sah)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateOrderStatus(
                                selectedOrderVisit.id,
                                OrderStatus.DELIVERED
                              );
                              setSelectedOrderVisit((prev) =>
                                prev && prev.purchaseOrder
                                  ? {
                                      ...prev,
                                      purchaseOrder: {
                                        ...prev.purchaseOrder,
                                        status: OrderStatus.DELIVERED,
                                      },
                                    }
                                  : null
                              );
                            }}
                            className="text-[11px] text-slate-500 hover:text-slate-700 underline font-medium cursor-pointer"
                          >
                            Koreksi ke Delivered
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {userRole === 'admin' && onDeleteOrder && (
                    <div className="pt-4 border-t border-slate-200 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Apakah Anda yakin ingin menghapus pesanan ${
                                selectedOrderVisit.purchaseOrder?.poNumber || ''
                              } (${selectedOrderVisit.storeName})?`
                            )
                          ) {
                            onDeleteOrder(selectedOrderVisit.id);
                            setSelectedOrderVisit(null);
                          }
                        }}
                        className="min-h-[42px] px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                        <span>Hapus Pesanan Ini (Kewenangan Admin)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Non-Purchase Reasons View
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Reasons for Not Purchasing (No-Order Log)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Field barrier tracking and competitor price intelligence across Karawang outlets
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewVisit}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Log Non-Purchase Visit</span>
        </button>
      </div>

      {/* Barrier Distribution Summary */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Non-Purchase Barrier Distribution
          </h2>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {noOrderVisits.length} non-purchasing visits recorded
          </span>
        </div>

        {reasonDistribution.length === 0 ? (
          <p className="text-xs text-slate-500">
            No non-purchase visits recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {reasonDistribution.map((r) => (
              <div key={r.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">
                    {r.label} <span className="font-normal text-slate-500">· {r.idLabel}</span>
                  </span>
                  <span className="font-mono font-semibold text-slate-700 tabular-nums">
                    {r.count} store{r.count > 1 ? 's' : ''} ({r.pct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-600 rounded-full transition-all"
                    style={{ width: `${Math.max(8, r.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Non-Purchase Store Log */}
      <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 overflow-hidden">
        {noOrderVisits.length === 0 ? (
          <div className="p-10 text-center">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">
              All visited stores placed an order
            </p>
          </div>
        ) : (
          noOrderVisits.map((visit) => {
            const detail = visit.noPurchaseDetail!;
            return (
              <div
                key={visit.id}
                className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {visit.storeName}
                    </p>
                    <p className="text-xs text-slate-500">
                      <span>{visit.district}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{visit.storeCategory}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono">{visit.checkInTime} WIB</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-semibold text-amber-700">
                        {detail.reasonLabel}
                      </span>
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {detail.notes}
                    </p>
                    {detail.competitorBrand && (
                      <p className="text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80">
                        <span className="font-semibold text-slate-800">
                          Competitor Note ({detail.competitorBrand}):{' '}
                        </span>
                        {detail.competitorPriceNote || 'Price promotion observed'}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 flex items-center gap-2 pt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Est. Stock:{' '}
                        <strong className="font-mono text-slate-700">
                          {detail.estimatedStockDays ?? '-'} days
                        </strong>
                        {' · '}Follow-up scheduled:{' '}
                        <strong className="font-mono text-slate-700">
                          {detail.followUpDate || 'TBD'}
                        </strong>
                      </span>
                    </p>
                  </div>
                </div>

                <div className="pl-13 sm:pl-0 shrink-0">
                  <button
                    type="button"
                    onClick={() => onStartFollowUpVisit(visit.storeId)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    Follow-Up Visit
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
