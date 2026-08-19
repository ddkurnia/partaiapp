export interface DistrictGeo {
  districtId: string;
  districtName: string;
  lat: number;
  lng: number;
  zoom: number;
}

export interface VillageGeo {
  villageId: string;
  villageName: string;
  districtId: string;
  lat: number;
  lng: number;
}

// Approximate centroids for Kepulauan Meranti kecamatan
export const DISTRICT_GEO: DistrictGeo[] = [
  { districtId: 'merbau',          districtName: 'Merbau',          lat: 1.1650, lng: 102.5200, zoom: 13 },
  { districtId: 'tebing-tinggi',   districtName: 'Tebing Tinggi',   lat: 1.3200, lng: 102.5700, zoom: 13 },
  { districtId: 'rangsang',         districtName: 'Rangsang',         lat: 1.0800, lng: 102.6100, zoom: 13 },
  { districtId: 'rangsang-barat',  districtName: 'Rangsang Barat',  lat: 0.9800, lng: 102.5300, zoom: 13 },
  { districtId: 'teheran',         districtName: 'Tebing Tinggi Barat', lat: 1.3500, lng: 102.4300, zoom: 13 },
  { districtId: 'pulau-kijang',    districtName: 'Pulau Kijang',    lat: 1.2000, lng: 102.7000, zoom: 13 },
  { districtId: 'katan',           districtName: 'Katan',           lat: 1.2500, lng: 102.6300, zoom: 13 },
  { districtId: 'sungai-tohor',    districtName: 'Sungai Tohor',    lat: 1.1000, lng: 102.4500, zoom: 13 },
];

// Approximate village positions as offsets from district centroids
export const VILLAGE_GEO: VillageGeo[] = [
  // Merbau
  { villageId: 'merbau-kota',      villageName: 'Merbau Kota',       districtId: 'merbau', lat: 1.1650, lng: 102.5200 },
  { villageId: 'tanjung-permai',   villageName: 'Tanjung Permai',    districtId: 'merbau', lat: 1.1780, lng: 102.5350 },
  { villageId: 'pematang-rebak',   villageName: 'Pematang Rebak',    districtId: 'merbau', lat: 1.1520, lng: 102.5050 },
  { villageId: 'lungga-nangka',    villageName: 'Lungga Nangka',     districtId: 'merbau', lat: 1.1400, lng: 102.5280 },
  { villageId: 'sungaipiring',     villageName: 'Sungaipiring',      districtId: 'merbau', lat: 1.1750, lng: 102.5000 },
  { villageId: 'serumpun',         villageName: 'Serumpun',          districtId: 'merbau', lat: 1.1550, lng: 102.5450 },
  { villageId: 'pantar-kiri',      villageName: 'Pantar Kiri',       districtId: 'merbau', lat: 1.1300, lng: 102.5150 },
  { villageId: 'pantar-kanan',     villageName: 'Pantar Kanan',      districtId: 'merbau', lat: 1.1850, lng: 102.5100 },
  { villageId: 'teluk-beling',     villageName: 'Teluk Beling',      districtId: 'merbau', lat: 1.1480, lng: 102.5380 },
  { villageId: 'pancur',           villageName: 'Pancur',            districtId: 'merbau', lat: 1.1920, lng: 102.5280 },
  // Tebing Tinggi
  { villageId: 'tebing-tinggi-kota', villageName: 'Tebing Tinggi Kota', districtId: 'tebing-tinggi', lat: 1.3200, lng: 102.5700 },
  { villageId: 'tanjung-sipayang',  villageName: 'Tanjung Sipayang', districtId: 'tebing-tinggi', lat: 1.3350, lng: 102.5550 },
  { villageId: 'basung',            villageName: 'Basung',           districtId: 'tebing-tinggi', lat: 1.3080, lng: 102.5850 },
  { villageId: 'pangkalan-sesai',   villageName: 'Pangkalan Sesai',  districtId: 'tebing-tinggi', lat: 1.3000, lng: 102.5600 },
  { villageId: 'gemuruh',           villageName: 'Gemuruh',           districtId: 'tebing-tinggi', lat: 1.3400, lng: 102.5800 },
  { villageId: 'tanah-sari',        villageName: 'Tanah Sari',       districtId: 'tebing-tinggi', lat: 1.3100, lng: 102.5500 },
  { villageId: 'sungaipakning',     villageName: 'Sungaipakning',    districtId: 'tebing-tinggi', lat: 1.3250, lng: 102.5950 },
  { villageId: 'selat-panjang',     villageName: 'Selat Panjang Kota', districtId: 'tebing-tinggi', lat: 1.3380, lng: 102.5650 },
  // Rangsang
  { villageId: 'rangsang-barat-kota', villageName: 'Rangsang Barat', districtId: 'rangsang', lat: 1.0800, lng: 102.6100 },
  { villageId: 'tanjung-medang',     villageName: 'Tanjung Medang', districtId: 'rangsang', lat: 1.0650, lng: 102.6250 },
  { villageId: 'tanjung-samak',      villageName: 'Tanjung Samak',  districtId: 'rangsang', lat: 1.0950, lng: 102.5950 },
  { villageId: 'mungkal',            villageName: 'Mungkal',         districtId: 'rangsang', lat: 1.0750, lng: 102.6350 },
  { villageId: 'sonsog',             villageName: 'Sonsog',          districtId: 'rangsang', lat: 1.1000, lng: 102.6200 },
  { villageId: 'tebanga',            villageName: 'Tebanga',         districtId: 'rangsang', lat: 1.0600, lng: 102.6000 },
  { villageId: 'teluk-buntal',       villageName: 'Teluk Buntal',   districtId: 'rangsang', lat: 1.0850, lng: 102.6400 },
  // Rangsang Barat
  { villageId: 'rangsang-pesisir',  villageName: 'Rangsang Pesisir', districtId: 'rangsang-barat', lat: 0.9800, lng: 102.5300 },
  { villageId: 'meranti-bunting',   villageName: 'Meranti Bunting',  districtId: 'rangsang-barat', lat: 0.9650, lng: 102.5450 },
  { villageId: 'tanah-putih',      villageName: 'Tanah Putih',      districtId: 'rangsang-barat', lat: 0.9950, lng: 102.5200 },
  { villageId: 'pengalihan',       villageName: 'Pengalihan',       districtId: 'rangsang-barat', lat: 0.9750, lng: 102.5100 },
  { villageId: 'simpang-tiga',     villageName: 'Simpang Tiga',     districtId: 'rangsang-barat', lat: 0.9900, lng: 102.5500 },
  { villageId: 'bandul',           villageName: 'Bandul',           districtId: 'rangsang-barat', lat: 1.0050, lng: 102.5350 },
  // Tebing Tinggi Barat
  { villageId: 'tebing-tinggi-barat-kota', villageName: 'Tebing Tinggi Barat', districtId: 'teheran', lat: 1.3500, lng: 102.4300 },
  { villageId: 'kampung-baru',     villageName: 'Kampung Baru',    districtId: 'teheran', lat: 1.3650, lng: 102.4150 },
  { villageId: 'sekata',           villageName: 'Sekata',           districtId: 'teheran', lat: 1.3380, lng: 102.4450 },
  { villageId: 'pangkalan-bayur',  villageName: 'Pangkalan Bayur', districtId: 'teheran', lat: 1.3400, lng: 102.4200 },
  { villageId: 'beting',           villageName: 'Beting',           districtId: 'teheran', lat: 1.3550, lng: 102.4400 },
  { villageId: 'bengkalis',        villageName: 'Bengkalis',        districtId: 'teheran', lat: 1.3280, lng: 102.4100 },
  // Pulau Kijang
  { villageId: 'pulau-kijang-kota', villageName: 'Pulau Kijang Kota', districtId: 'pulau-kijang', lat: 1.2000, lng: 102.7000 },
  { villageId: 'kijang-jaya',       villageName: 'Kijang Jaya',       districtId: 'pulau-kijang', lat: 1.2150, lng: 102.7150 },
  { villageId: 'cemara',            villageName: 'Cemara',            districtId: 'pulau-kijang', lat: 1.1880, lng: 102.7100 },
  { villageId: 'permai',            villageName: 'Permai',            districtId: 'pulau-kijang', lat: 1.2050, lng: 102.6850 },
  { villageId: 'bukit-harapan',     villageName: 'Bukit Harapan',     districtId: 'pulau-kijang', lat: 1.1920, lng: 102.6900 },
  { villageId: 'sri-gemilang',      villageName: 'Sri Gemilang',      districtId: 'pulau-kijang', lat: 1.2100, lng: 102.7250 },
  // Katan
  { villageId: 'katan-kota',       villageName: 'Katan',             districtId: 'katan', lat: 1.2500, lng: 102.6300 },
  { villageId: 'sungaian',         villageName: 'Sungaian',          districtId: 'katan', lat: 1.2650, lng: 102.6150 },
  { villageId: 'sungaililin',      villageName: 'Sungaililin',       districtId: 'katan', lat: 1.2380, lng: 102.6450 },
  { villageId: 'sri-pelayaran',    villageName: 'Sri Pelayaran',    districtId: 'katan', lat: 1.2550, lng: 102.6500 },
  { villageId: 'makmur-jaya',      villageName: 'Makmur Jaya',       districtId: 'katan', lat: 1.2420, lng: 102.6200 },
  // Sungai Tohor
  { villageId: 'sungai-tohor-kota', villageName: 'Sungai Tohor',     districtId: 'sungai-tohor', lat: 1.1000, lng: 102.4500 },
  { villageId: 'teluk-kecil',       villageName: 'Teluk Kecil',       districtId: 'sungai-tohor', lat: 1.1150, lng: 102.4650 },
  { villageId: 'paya-laut',         villageName: 'Paya Laut',         districtId: 'sungai-tohor', lat: 1.0880, lng: 102.4400 },
  { villageId: 'bakau',             villageName: 'Bakau',             districtId: 'sungai-tohor', lat: 1.1050, lng: 102.4350 },
  { villageId: 'sari-makmur',       villageName: 'Sari Makmur',       districtId: 'sungai-tohor', lat: 1.0920, lng: 102.4600 },
];

export function getVillageGeo(districtId: string): VillageGeo[] {
  return VILLAGE_GEO.filter(v => v.districtId === districtId);
}

export function getVillageLatLng(districtId: string, villageId: string): [number, number] | null {
  const v = VILLAGE_GEO.find(g => g.districtId === districtId && g.villageId === villageId);
  return v ? [v.lat, v.lng] : null;
}

export const KABUPATEN_CENTER: [number, number] = [1.15, 102.55];
export const KABUPATEN_ZOOM = 10;

export const DISTRICT_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  'merbau':         [[1.10, 102.45], [1.25, 102.58]],
  'tebing-tinggi':  [[1.25, 102.50], [1.40, 102.65]],
  'rangsang':       [[1.00, 102.55], [1.15, 102.68]],
  'rangsang-barat':[[0.90, 102.45], [1.05, 102.60]],
  'teheran':        [[1.28, 102.35], [1.42, 102.50]],
  'pulau-kijang':  [[1.12, 102.62], [1.28, 102.78]],
  'katan':          [[1.18, 102.55], [1.32, 102.70]],
  'sungai-tohor':  [[1.02, 102.38], [1.18, 102.52]],
};
