export interface DistrictGeo {
  districtId: string;
  districtName: string;
  lat: number;
  lng: number;
  zoom: number;
}

// Approximate centroids for Kepulauan Meranti kecamatan
// Based on geographic knowledge of the regency
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
