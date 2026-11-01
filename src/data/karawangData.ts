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
  address: 'Jl. Ahmad Yani No. 45, RT 02/RW 04, Karawang Barat, Kab. Karawang',
  photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
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
  monthlyVisitTarget: 625,
  monthlyOrderTargetIdr: 60000000,
  isActive: true,
  joinDate: '2024-01-15',
};

export const INITIAL_SALES_REPRESENTATIVES: SalesRepresentative[] = [
  INITIAL_SALES_REP,
  {
    id: 'rep-krw-02',
    employeeCode: 'GTM-KRW-019',
    name: 'Rizky Pratama',
    email: 'rizky.pratama@indofood.co.id',
    phone: '0813-1122-3344',
    address: 'Jl. Surotokunto No. 12, Adiarsa Timur, Karawang Timur, Kab. Karawang',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    role: 'Sales Representative',
    assignedDistricts: [
      'Desa Kondang Jaya',
      'Desa Citarik',
      'Desa Karang Mulya',
      'Desa Karang Mulya 2',
    ],
    dailyVisitTarget: 25,
    dailyOrderTargetIdr: 2400000,
    monthlyVisitTarget: 625,
    monthlyOrderTargetIdr: 60000000,
    isActive: true,
    joinDate: '2024-03-01',
  },
  {
    id: 'rep-krw-03',
    employeeCode: 'GTM-KRW-020',
    name: 'Budi Santoso',
    email: 'budi.santoso@indofood.co.id',
    phone: '0857-4433-2211',
    address: 'Jl. Raya Klari Kosambi No. 88, Klari, Kab. Karawang',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    role: 'Sales Representative',
    assignedDistricts: [
      'Desa Rengas Dengklok 1',
      'Desa Rengas Dengklok 2',
      'Desa Batu Jaya',
    ],
    dailyVisitTarget: 25,
    dailyOrderTargetIdr: 2400000,
    monthlyVisitTarget: 625,
    monthlyOrderTargetIdr: 60000000,
    isActive: true,
    joinDate: '2024-04-10',
  },
  {
    id: 'rep-krw-04',
    employeeCode: 'GTM-KRW-021',
    name: 'Hendra Setiawan',
    email: 'hendra.setiawan@indofood.co.id',
    phone: '0878-9988-7766',
    address: 'Jl. Raya Telagasari No. 24, Telagasari, Kab. Karawang',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
    role: 'Sales Representative',
    assignedDistricts: [
      'Desa Telaga Sari',
      'Desa Cilamaya',
      'Desa Banyu Sari',
      'Desa Pangkalan',
    ],
    dailyVisitTarget: 25,
    dailyOrderTargetIdr: 2400000,
    monthlyVisitTarget: 625,
    monthlyOrderTargetIdr: 60000000,
    isActive: true,
    joinDate: '2024-05-20',
  },
];

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

/**
 * Menghitung jumlah hari kerja efektif dalam satu bulan (Senin - Sabtu, hari Minggu libur).
 * Digunakan untuk pembagian Target Sales Bulanan menjadi Target Sales Harian.
 */
export function getEffectiveWorkingDaysInMonth(dateOrYearMonth?: string | Date): {
  year: number;
  monthIndex: number; // 0-11
  monthName: string; // e.g. "November 2026"
  totalDays: number;
  effectiveWorkingDays: number; // Senin s/d Sabtu
  sundaysCount: number;
} {
  let targetDate: Date;
  if (!dateOrYearMonth) {
    targetDate = new Date();
  } else if (typeof dateOrYearMonth === 'string') {
    const parts = dateOrYearMonth.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    targetDate = new Date(
      isNaN(y) ? new Date().getFullYear() : y,
      isNaN(m) ? new Date().getMonth() : m,
      1
    );
  } else {
    targetDate = dateOrYearMonth;
  }

  const year = targetDate.getFullYear();
  const monthIndex = targetDate.getMonth();
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();

  let effectiveWorkingDays = 0;
  let sundaysCount = 0;

  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, monthIndex, day);
    const dayOfWeek = d.getDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
    if (dayOfWeek === 0) {
      sundaysCount++;
    } else {
      effectiveWorkingDays++;
    }
  }

  if (effectiveWorkingDays <= 0) effectiveWorkingDays = 25;

  const monthName = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, monthIndex, 1));

  return {
    year,
    monthIndex,
    monthName,
    totalDays,
    effectiveWorkingDays,
    sundaysCount,
  };
}

/**
 * Menghitung Target Sales Harian otomatis dari Target Sales Bulanan
 * Rumus: Target Sales Bulanan / Total Hari Efektif (Senin - Sabtu)
 */
export function calculateDailyTargetFromMonthly(
  monthlyTargetIdr: number,
  effectiveWorkingDaysOrDate?: number | string | Date
): number {
  if (!monthlyTargetIdr || monthlyTargetIdr <= 0) return 0;

  let effectiveDays = 25;
  if (typeof effectiveWorkingDaysOrDate === 'number') {
    if (effectiveWorkingDaysOrDate > 0) {
      effectiveDays = effectiveWorkingDaysOrDate;
    }
  } else if (effectiveWorkingDaysOrDate instanceof Date || typeof effectiveWorkingDaysOrDate === 'string') {
    effectiveDays = getEffectiveWorkingDaysInMonth(effectiveWorkingDaysOrDate).effectiveWorkingDays;
  } else {
    effectiveDays = getEffectiveWorkingDaysInMonth().effectiveWorkingDays;
  }

  if (effectiveDays <= 0) return monthlyTargetIdr;
  return Math.round(monthlyTargetIdr / effectiveDays);
}
