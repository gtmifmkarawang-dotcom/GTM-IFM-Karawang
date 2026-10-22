import {
  NoPurchaseCategory,
  OrderStatus,
  PaymentTerm,
  PlannedRouteStop,
  ProductSKU,
  SalesRepresentative,
  Store,
  StoreCategory,
  StoreVisit,
  VisitOutcome,
  VisitType,
} from '../types/gtm';

export const DEFAULT_FIREBASE_AREAS: string[] = [
  'Desa Batu Jaya',
  'Desa Banyu Sari',
  'Desa Cilamaya',
  'Desa Citarik',
  'Desa Karang Mulya',
  'Desa Karang Mulya 2',
  'Desa Klari',
  'Desa Kondang Jaya',
  'Desa Majalaya',
  'Desa Pangkalan',
  'Desa Parung Mulya',
  'Desa Rengas Dengklok 1',
  'Desa Rengas Dengklok 2',
  'Desa Telaga Sari',
  'Jalan Lingkar Tanjung Pura',
  'Kelurahan Adiarsa',
  'Kelurahan Karawang Kulon',
  'Kelurahan Palumbon Sari',
  'Kelurahan Tanjung Pura 1',
  'Kelurahan Tanjung Pura 2',
  'Kelurahan Teluk Jambe Timur',
  'Lalamatan',
];

export const KARAWANG_AREAS: string[] = DEFAULT_FIREBASE_AREAS;
export const KARAWANG_DISTRICTS: string[] = DEFAULT_FIREBASE_AREAS;

export const NO_PURCHASE_REASON_CATALOG: {
  category: NoPurchaseCategory;
  label: string;
  idLabel: string;
  description: string;
  requiresCompetitorInfo?: boolean;
  requiresStockEstimate?: boolean;
}[] = [
  {
    category: NoPurchaseCategory.STOCK_FULL,
    label: 'Stock Still Sufficient',
    idLabel: 'Stok Masih Banyak',
    description: 'Store still has inventory from the previous order cycle.',
    requiresStockEstimate: true,
  },
  {
    category: NoPurchaseCategory.COMPETITOR_PRICE,
    label: 'Competitor Price / Promo',
    idLabel: 'Harga Kompetitor Lebih Murah',
    description: 'Competing distributor or brand offered lower wholesale price or trade promo.',
    requiresCompetitorInfo: true,
  },
  {
    category: NoPurchaseCategory.OWNER_ABSENT,
    label: 'Decision Maker Absent',
    idLabel: 'Pemilik / Pengambil Keputusan Tidak Ada',
    description: 'Store owner or purchasing manager was not on site during visit.',
  },
  {
    category: NoPurchaseCategory.BUDGET_ISSUE,
    label: 'Cashflow / Credit Limit',
    idLabel: 'Kendala Modal / Tagihan Belum Lunas',
    description: 'Store requested credit extension or lacks cash on hand today.',
  },
  {
    category: NoPurchaseCategory.LOW_DEMAND,
    label: 'Slow Product Turnover',
    idLabel: 'Perputaran Barang Lambat',
    description: 'End-consumer sell-through has slowed in this sub-district.',
  },
  {
    category: NoPurchaseCategory.STORE_CLOSED,
    label: 'Store Temporarily Closed',
    idLabel: 'Toko Tutup Sementara',
    description: 'Outlet was closed at the time of field visit.',
  },
  {
    category: NoPurchaseCategory.OTHER,
    label: 'Other Operational Reason',
    idLabel: 'Alasan Lainnya',
    description: 'Specific store renovation, owner event, or custom remark.',
  },
];

/**
 * Otomatis mengekstrak nama lengkap/sales yang rapi dari alamat email
 * Contoh:
 * - 'gtmifmkarawang@gmail.com' -> 'GTM IFM Karawang'
 * - 'rizky.pratama@indofood.co.id' -> 'Rizky Pratama'
 * - 'budi_santoso@gmail.com' -> 'Budi Santoso'
 * - 'sales.karawang@yahoo.com' -> 'Sales Karawang'
 * - 'admin.karawang@indofood.co.id' -> 'Administrator GTM Karawang'
 */
export function extractNameFromEmail(email: string, role?: string): string {
  if (!email || typeof email !== 'string') {
    return role === 'admin' ? 'Administrator GTM Karawang' : 'GTM IFM Karawang';
  }
  const cleanEmail = email.trim().toLowerCase();

  // Akun resmi IFM Karawang
  if (cleanEmail === 'gtmifmkarawang@gmail.com' || cleanEmail.includes('gtmifmkarawang')) {
    return 'GTM IFM Karawang';
  }
  if (cleanEmail === 'admin.karawang@indofood.co.id' || (role === 'admin' && cleanEmail.includes('admin'))) {
    return 'Administrator GTM Karawang';
  }

  // Ambil bagian sebelum @
  const localPart = cleanEmail.split('@')[0] || '';
  if (!localPart) {
    return role === 'admin' ? 'Administrator GTM Karawang' : 'GTM IFM Karawang';
  }

  // Singkatan umum yang harus huruf kapital semua
  const uppercaseSet = new Set(['gtm', 'ifm', 'pt', 'cv', 'krw', 'hq', 'spv', 'asm', 'rsm']);

  // Pisahkan berdasarkan titik, underscore, strip, plus, atau angka
  const tokens = localPart
    .replace(/[0-9]+/g, ' ')
    .split(/[\._\-\+\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return role === 'admin' ? 'Administrator GTM Karawang' : 'Sales Representative';
  }

  const formattedWords = tokens.map((word) => {
    const lower = word.toLowerCase();
    if (uppercaseSet.has(lower)) {
      return lower.toUpperCase();
    }
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });

  return formattedWords.join(' ');
}

export const INITIAL_SALES_REP: SalesRepresentative = {
  id: 'rep-krw-01',
  employeeCode: 'GTM-KRW-018',
  name: 'GTM IFM Karawang',
  email: 'gtmifmkarawang@gmail.com',
  phone: '0812-8841-9201',
  role: 'Sales Representative',
  assignedDistricts: [
    'Kelurahan Teluk Jambe Timur',
    'Kelurahan Karawang Kulon',
    'Kelurahan Adiarsa',
    'Desa Klari',
    'Desa Majalaya',
  ],
  dailyVisitTarget: 25,
  dailyOrderTargetIdr: 2400000,
};

export const PRODUCT_SKU_CATALOG: ProductSKU[] = [
  {
    id: '8lHDuKMxloguHtvPedRL',
    skuCode: 'SNK-CHT-SP-35',
    name: 'Chitato Sapi Panggang 35 gr',
    category: 'Potato Chips',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 195000, companyPriceIdr: 183500, storePriceIdr: 195000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 24375, companyPriceIdr: 22938, storePriceIdr: 24375, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 195000, companyPriceIdr: 183500, storePriceIdr: 195000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: '7EMMsfSHl2JVSlS5XgSP',
    skuCode: 'SNK-CHT-RL-35',
    name: 'Chitato Lite Rumput Laut 35 gr',
    category: 'Potato Chips',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 195000, companyPriceIdr: 183500, storePriceIdr: 195000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 24375, companyPriceIdr: 22938, storePriceIdr: 24375, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 195000, companyPriceIdr: 183500, storePriceIdr: 195000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: 'Osl5iunOJFQNhVFWIo8k',
    skuCode: 'SNK-CHT-SP-68',
    name: 'Chitato Sapi Panggang 68 gr',
    category: 'Potato Chips',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 260000, companyPriceIdr: 245500, storePriceIdr: 260000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 32500, companyPriceIdr: 30688, storePriceIdr: 32500, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 260000, companyPriceIdr: 245500, storePriceIdr: 260000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: 'SqXBEUlgMXApJgJG1JVV',
    skuCode: 'SNK-CHT-RL-68',
    name: 'Chitato Lite Rumput Laut 68 gr',
    category: 'Potato Chips',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 260000, companyPriceIdr: 245500, storePriceIdr: 260000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 32500, companyPriceIdr: 30688, storePriceIdr: 32500, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 260000, companyPriceIdr: 245500, storePriceIdr: 260000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: '13ZscMxtac4QSZfEmDZF',
    skuCode: 'SNK-QTL-BBQ-60',
    name: 'Qtela Barbeque 60 gr',
    category: 'Cassava Chips',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 152000, companyPriceIdr: 143000, storePriceIdr: 152000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 19000, companyPriceIdr: 17875, storePriceIdr: 19000, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 152000, companyPriceIdr: 143000, storePriceIdr: 152000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: 'ABqcFewUhhTRnX2DoBR6',
    skuCode: 'SNK-MXC-JB-55',
    name: 'Maxicorn Jagung Bakar 55 gr',
    category: 'Corn Chips',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 152000, companyPriceIdr: 143000, storePriceIdr: 152000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 19000, companyPriceIdr: 17875, storePriceIdr: 19000, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 152000, companyPriceIdr: 143000, storePriceIdr: 152000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: '8VQ5FeQVQcGRVqvJvMcu',
    skuCode: 'SNK-CHT-SP-15',
    name: 'Chitato Sapi Panggang 15 gr',
    category: 'Potato Chips',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 109000, companyPriceIdr: 102400, storePriceIdr: 109000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 13625, companyPriceIdr: 12800, storePriceIdr: 13625, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 109000, companyPriceIdr: 102400, storePriceIdr: 109000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: 'qEhPAfGENkJQK3iccVDW',
    skuCode: 'SNK-CHT-RL-14',
    name: 'Chitato Lite Rumput Laut 14 gr',
    category: 'Potato Chips',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 109000, companyPriceIdr: 102400, storePriceIdr: 109000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 13625, companyPriceIdr: 12800, storePriceIdr: 13625, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 109000, companyPriceIdr: 102400, storePriceIdr: 109000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: '5HxEB6oNqcp6wTndE4GD',
    skuCode: 'SNK-MXC-JB-20',
    name: 'Maxicorn Jagung Bakar 20 gr',
    category: 'Corn Chips',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 107000, companyPriceIdr: 100250, storePriceIdr: 107000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 13375, companyPriceIdr: 12531, storePriceIdr: 13375, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 107000, companyPriceIdr: 100250, storePriceIdr: 107000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: 'P63hb2urP5lWmBfUWHHR',
    skuCode: 'SNK-QTL-BBQ-20',
    name: 'Qtela Barbeque 20 gr',
    category: 'Cassava Chips',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 107000, companyPriceIdr: 100250, storePriceIdr: 107000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 13375, companyPriceIdr: 12531, storePriceIdr: 13375, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 107000, companyPriceIdr: 100250, storePriceIdr: 107000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: 'Y9EVVaUeOqulCkSLabTE',
    skuCode: 'SNK-QTL-BLD-20',
    name: 'Qtela Balado 20 gr',
    category: 'Cassava Chips',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 107000, companyPriceIdr: 100250, storePriceIdr: 107000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 13375, companyPriceIdr: 12531, storePriceIdr: 13375, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 107000, companyPriceIdr: 100250, storePriceIdr: 107000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: 'IUis3Cq0z4lVbjBFYkBU',
    skuCode: 'SNK-CHK-AYM-16',
    name: 'Chiki Balls Ayam 16 gr',
    category: 'Extruded Snacks',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 105000, companyPriceIdr: 98750, storePriceIdr: 105000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 13125, companyPriceIdr: 12344, storePriceIdr: 13125, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 105000, companyPriceIdr: 98750, storePriceIdr: 105000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: 'meMncVBzmoWPjBRSa9B0',
    skuCode: 'SNK-CHK-KJ-16',
    name: 'Chiki Balls Keju 16 gr',
    category: 'Extruded Snacks',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 105000, companyPriceIdr: 98750, storePriceIdr: 105000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 13125, companyPriceIdr: 12344, storePriceIdr: 13125, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 105000, companyPriceIdr: 98750, storePriceIdr: 105000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: 'fkDD5QF8kIOEBbVcOTQ1',
    skuCode: 'SNK-CHK-CK-16',
    name: 'Chiki Balls Coklat 16 gr',
    category: 'Extruded Snacks',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 105000, companyPriceIdr: 98750, storePriceIdr: 105000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 13125, companyPriceIdr: 12344, storePriceIdr: 13125, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 105000, companyPriceIdr: 98750, storePriceIdr: 105000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: 'PSfu5Ya5w6SHHzEzvrAJ',
    skuCode: 'SNK-CHK-TW-PM-20',
    name: 'Chiki Twist Pedas Manis 20 gr',
    category: 'Extruded Snacks',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 105000, companyPriceIdr: 98750, storePriceIdr: 105000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 13125, companyPriceIdr: 12344, storePriceIdr: 13125, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 105000, companyPriceIdr: 98750, storePriceIdr: 105000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: 'kdF8WnWrAmeHaoEBiSxg',
    skuCode: 'SNK-CHK-TW-JB-22',
    name: 'Chiki Twist Jagung Bakar 22,5 gr',
    category: 'Extruded Snacks',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 105000, companyPriceIdr: 98750, storePriceIdr: 105000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 13125, companyPriceIdr: 12344, storePriceIdr: 13125, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 105000, companyPriceIdr: 98750, storePriceIdr: 105000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: 'GH4Pndcv4nYfyojGOakz',
    skuCode: 'SNK-JTZ-SW-18',
    name: 'JetZ Sweet 18 gr',
    category: 'Extruded Snacks',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 105000, companyPriceIdr: 98750, storePriceIdr: 105000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 13125, companyPriceIdr: 12344, storePriceIdr: 13125, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 105000, companyPriceIdr: 98750, storePriceIdr: 105000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: 'jftK5yG8dAHQpOtbi24g',
    skuCode: 'SNK-JTZ-TRT-20',
    name: 'JetZ Tortilla 20 gr',
    category: 'Extruded Snacks',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 105000, companyPriceIdr: 98750, storePriceIdr: 105000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 13125, companyPriceIdr: 12344, storePriceIdr: 13125, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 105000, companyPriceIdr: 98750, storePriceIdr: 105000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: 'tXBIaXDCRSd4xSYiB7mv',
    skuCode: 'SNK-JTZ-CRS-15',
    name: 'JetZ Croissant 15 gr',
    category: 'Extruded Snacks',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 105000, companyPriceIdr: 98750, storePriceIdr: 105000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 13125, companyPriceIdr: 12344, storePriceIdr: 13125, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 105000, companyPriceIdr: 98750, storePriceIdr: 105000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: '45puEGaXGrb6l5ItOlU1',
    skuCode: 'SNK-JTZ-TRT-140',
    name: 'JetZ Tortilla 140 gr',
    category: 'Extruded Snacks',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 195000, companyPriceIdr: 183500, storePriceIdr: 195000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 24375, companyPriceIdr: 22938, storePriceIdr: 24375, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 195000, companyPriceIdr: 183500, storePriceIdr: 195000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: 'VrGYCDIrZCrExqmBtPhd',
    skuCode: 'SNK-CHK-TW-JB-75',
    name: 'Chiki Twist Jagung Bakar 75 gr',
    category: 'Extruded Snacks',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 152000, companyPriceIdr: 143000, storePriceIdr: 152000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 19000, companyPriceIdr: 17875, storePriceIdr: 19000, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 152000, companyPriceIdr: 143000, storePriceIdr: 152000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
  {
    id: 'mMWV7fnauEXPVnOIgYY6',
    skuCode: 'SNK-CHK-KJ-55',
    name: 'Chiki Balls Keju 55 gr',
    category: 'Extruded Snacks',
    defaultUnit: 'CTN',
    units: [
      { unit: 'CTN', priceIdr: 152000, companyPriceIdr: 143000, storePriceIdr: 152000, pcsPerUnit: 40 },
      { unit: 'RCG', priceIdr: 19000, companyPriceIdr: 17875, storePriceIdr: 19000, pcsPerUnit: 10 },
      { unit: 'Karton', priceIdr: 152000, companyPriceIdr: 143000, storePriceIdr: 152000, pcsPerUnit: 40 },
    ],
    stockAvailable: true,
  },
];

export const INITIAL_STORES: Store[] = [];

export const INITIAL_VISITS: StoreVisit[] = [];

export const INITIAL_PLANNED_ROUTE: PlannedRouteStop[] = [];

export function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
