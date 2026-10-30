import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  History,
  Layers,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Store as StoreIcon,
  Tag,
  Trash2,
  User,
  SlidersHorizontal,
} from 'lucide-react';
import { AdminAuditLog, AdminActionCategory } from '../types/gtm';

interface AdminAuditLogsViewProps {
  logs: AdminAuditLog[];
  onRefreshLogs?: () => void;
  onClearLogs?: () => void;
  isLoading?: boolean;
}

export const AdminAuditLogsView: React.FC<AdminAuditLogsViewProps> = ({
  logs,
  onRefreshLogs,
  onClearLogs,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Category filter
      if (selectedCategory !== 'ALL') {
        if (selectedCategory === 'TOKO' && !log.actionType.includes('TOKO')) return false;
        if (selectedCategory === 'PRODUK' && !log.actionType.includes('PRODUK')) return false;
        if (selectedCategory === 'ORDER' && !log.actionType.includes('ORDER')) return false;
        if (selectedCategory === 'SISTEM' && !log.actionType.includes('SISTEM')) return false;
      }

      // Search filter
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        log.adminEmail.toLowerCase().includes(q) ||
        log.adminName.toLowerCase().includes(q) ||
        log.actionType.toLowerCase().includes(q) ||
        log.targetTitle.toLowerCase().includes(q) ||
        (log.targetId ? log.targetId.toLowerCase().includes(q) : false) ||
        log.details.toLowerCase().includes(q)
      );
    });
  }, [logs, selectedCategory, searchQuery]);

  const getActionBadge = (type: AdminActionCategory) => {
    switch (type) {
      case 'TAMBAH_TOKO':
        return {
          label: 'Tambah Toko',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: <Plus className="w-3.5 h-3.5 text-emerald-700" />,
        };
      case 'EDIT_TOKO':
        return {
          label: 'Edit Toko',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <StoreIcon className="w-3.5 h-3.5 text-blue-700" />,
        };
      case 'HAPUS_TOKO':
        return {
          label: 'Hapus Toko',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-700" />,
        };
      case 'TAMBAH_PRODUK':
        return {
          label: 'Tambah Produk',
          color: 'bg-teal-100 text-teal-800 border-teal-200',
          icon: <Plus className="w-3.5 h-3.5 text-teal-700" />,
        };
      case 'EDIT_PRODUK':
        return {
          label: 'Edit Produk',
          color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          icon: <Package className="w-3.5 h-3.5 text-indigo-700" />,
        };
      case 'HAPUS_PRODUK':
        return {
          label: 'Hapus Produk',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-700" />,
        };
      case 'APPROVE_ORDER':
        return {
          label: 'Setujui Pesanan',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />,
        };
      case 'REVERT_ORDER':
        return {
          label: 'Koreksi Order',
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: <RotateCcw className="w-3.5 h-3.5 text-amber-700" />,
        };
      case 'HAPUS_ORDER':
        return {
          label: 'Hapus Pesanan',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-700" />,
        };
      case 'PENGATURAN_SISTEM':
      default:
        return {
          label: 'Pengaturan Sistem',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: <SlidersHorizontal className="w-3.5 h-3.5 text-purple-700" />,
        };
    }
  };

  const formatTimestampIndo = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  const handleExportCsv = () => {
    const headers = ['Waktu', 'Admin Email', 'Admin Nama', 'Tipe Aksi', 'Target', 'Nama Target', 'Detail Perubahan'];
    const rows = filteredLogs.map((l) => [
      `"${formatTimestampIndo(l.timestamp)}"`,
      `"${l.adminEmail}"`,
      `"${l.adminName}"`,
      `"${l.actionType}"`,
      `"${l.targetType}"`,
      `"${l.targetTitle.replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Log-Histori-Admin-IFM-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-900 text-amber-400 flex items-center justify-center font-bold shadow-xs">
              <History className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Log Histori Perubahan oleh Admin
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-blue-950 border border-amber-300">
              {logs.length} Aktivitas
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Rekam jejak audit trail seluruh tindakan admin (tambah, edit, hapus toko, produk, persetujuan setoran order)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefreshLogs && (
            <button
              type="button"
              onClick={onRefreshLogs}
              disabled={isLoading}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-700 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Muat Ulang</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kata kunci, email admin, nama toko, SKU produk, atau nomor PO..."
            className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-700 focus:bg-white text-slate-900"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'Semua Kategori', count: logs.length },
            { id: 'TOKO', label: 'Toko & Outlet', count: logs.filter((l) => l.actionType.includes('TOKO')).length },
            { id: 'PRODUK', label: 'Produk & SKU', count: logs.filter((l) => l.actionType.includes('PRODUK')).length },
            { id: 'ORDER', label: 'Order & Transaksi', count: logs.filter((l) => l.actionType.includes('ORDER')).length },
            { id: 'SISTEM', label: 'Sistem', count: logs.filter((l) => l.actionType.includes('SISTEM')).length },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {/* Log Entries List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
            <History className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              Belum ada riwayat aktivitas yang sesuai
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tidak ada catatan perubahan admin yang sesuai dengan pencarian atau filter yang dipilih.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const badge = getActionBadge(log.actionType);

            return (
              <div
                key={log.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-300 p-4 sm:p-5 shadow-2xs transition-all flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.color}`}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>

                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      Target: {log.targetType}
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono">
                      ID: {log.targetId}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      {log.targetTitle}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {log.details}
                    </p>
                  </div>
                </div>

                <div className="md:text-right shrink-0 space-y-1.5 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                  <div className="flex items-center md:justify-end gap-1.5 text-xs font-semibold text-slate-700">
                    <User className="w-3.5 h-3.5 text-blue-700" />
                    <span>{log.adminName}</span>
                  </div>
                  <p className="text-[11px] text-blue-900 font-mono">
                    {log.adminEmail}
                  </p>
                  <div className="flex items-center md:justify-end gap-1.5 text-[11px] text-slate-500 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{formatTimestampIndo(log.timestamp)}</span>
                  </div>
                  <div className="md:flex md:justify-end">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Tercatat Permanen
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
