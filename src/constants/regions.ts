export interface DistrictData {
  districtId: string;
  districtName: string;
  villages: { villageId: string; villageName: string }[];
}

export const KEPULAUAN_MERANTI: DistrictData[] = [
  {
    districtId: 'merbau',
    districtName: 'Merbau',
    villages: [
      { villageId: 'merbau-kota', villageName: 'Merbau Kota' },
      { villageId: 'tanjung-permai', villageName: 'Tanjung Permai' },
      { villageId: 'pematang-rebak', villageName: 'Pematang Rebak' },
      { villageId: 'lungga-nangka', villageName: 'Lungga Nangka' },
      { villageId: 'sungaipiring', villageName: 'Sungaipiring' },
      { villageId: 'serumpun', villageName: 'Serumpun' },
      { villageId: 'pantar-kiri', villageName: 'Pantar Kiri' },
      { villageId: 'pantar-kanan', villageName: 'Pantar Kanan' },
      { villageId: 'teluk-beling', villageName: 'Teluk Beling' },
      { villageId: 'pancur', villageName: 'Pancur' },
    ],
  },
  {
    districtId: 'tebing-tinggi',
    districtName: 'Tebing Tinggi',
    villages: [
      { villageId: 'tebing-tinggi-kota', villageName: 'Tebing Tinggi Kota' },
      { villageId: 'tanjung-sipayang', villageName: 'Tanjung Sipayang' },
      { villageId: 'basung', villageName: 'Basung' },
      { villageId: 'pangkalan-sesai', villageName: 'Pangkalan Sesai' },
      { villageId: 'gemuruh', villageName: 'Gemuruh' },
      { villageId: 'tanah-sari', villageName: 'Tanah Sari' },
      { villageId: 'sungaipakning', villageName: 'Sungaipakning' },
      { villageId: 'selat-panjang', villageName: 'Selat Panjang Kota' },
    ],
  },
  {
    districtId: 'rangsang',
    districtName: 'Rangsang',
    villages: [
      { villageId: 'rangsang-barat-kota', villageName: 'Rangsang Barat' },
      { villageId: 'tanjung-medang', villageName: 'Tanjung Medang' },
      { villageId: 'tanjung-samak', villageName: 'Tanjung Samak' },
      { villageId: 'mungkal', villageName: 'Mungkal' },
      { villageId: 'sonsog', villageName: 'Sonsog' },
      { villageId: 'tebanga', villageName: 'Tebanga' },
      { villageId: 'teluk-buntal', villageName: 'Teluk Buntal' },
    ],
  },
  {
    districtId: 'rangsang-barat',
    districtName: 'Rangsang Barat',
    villages: [
      { villageId: 'rangsang-pesisir', villageName: 'Rangsang Pesisir' },
      { villageId: 'meranti-bunting', villageName: 'Meranti Bunting' },
      { villageId: 'tanah-putih', villageName: 'Tanah Putih' },
      { villageId: 'pengalihan', villageName: 'Pengalihan' },
      { villageId: 'simpang-tiga', villageName: 'Simpang Tiga' },
      { villageId: 'bandul', villageName: 'Bandul' },
    ],
  },
  {
    districtId: 'teheran',
    districtName: 'Tebing Tinggi Barat',
    villages: [
      { villageId: 'tebing-tinggi-barat-kota', villageName: 'Tebing Tinggi Barat' },
      { villageId: 'kampung-baru', villageName: 'Kampung Baru' },
      { villageId: 'sekata', villageName: 'Sekata' },
      { villageId: 'pangkalan-bayur', villageName: 'Pangkalan Bayur' },
      { villageId: 'beting', villageName: 'Beting' },
      { villageId: 'bengkalis', villageName: 'Bengkalis' },
    ],
  },
  {
    districtId: 'pulau-kijang',
    districtName: 'Pulau Kijang',
    villages: [
      { villageId: 'pulau-kijang-kota', villageName: 'Pulau Kijang Kota' },
      { villageId: 'kijang-jaya', villageName: 'Kijang Jaya' },
      { villageId: 'cemara', villageName: 'Cemara' },
      { villageId: 'permai', villageName: 'Permai' },
      { villageId: 'bukit-harapan', villageName: 'Bukit Harapan' },
      { villageId: 'sri-gemilang', villageName: 'Sri Gemilang' },
    ],
  },
  {
    districtId: 'katan',
    districtName: 'Katan',
    villages: [
      { villageId: 'katan-kota', villageName: 'Katan' },
      { villageId: 'sungaian', villageName: 'Sungaian' },
      { villageId: 'sungaililin', villageName: 'Sungaililin' },
      { villageId: 'sri-pelayaran', villageName: 'Sri Pelayaran' },
      { villageId: 'makmur-jaya', villageName: 'Makmur Jaya' },
    ],
  },
  {
    districtId: 'sungai-tohor',
    districtName: 'Sungai Tohor',
    villages: [
      { villageId: 'sungai-tohor-kota', villageName: 'Sungai Tohor' },
      { villageId: 'teluk-kecil', villageName: 'Teluk Kecil' },
      { villageId: 'paya-laut', villageName: 'Paya Laut' },
      { villageId: 'bakau', villageName: 'Bakau' },
      { villageId: 'sari-makmur', villageName: 'Sari Makmur' },
    ],
  },
];

export function getDistrictById(id: string): DistrictData | undefined {
  return KEPULAUAN_MERANTI.find(d => d.districtId === id);
}

export function getDistrictName(id: string): string {
  return getDistrictById(id)?.districtName || id;
}

export function getVillageName(districtId: string, villageId: string): string {
  const district = getDistrictById(districtId);
  return district?.villages.find(v => v.villageId === villageId)?.villageName || villageId;
}

export function getVillagesByDistrict(districtId: string): { villageId: string; villageName: string }[] {
  return getDistrictById(districtId)?.villages || [];
}

export function getDistrictOptions() {
  return KEPULAUAN_MERANTI.map(d => ({
    value: d.districtId,
    label: d.districtName,
  }));
}

export function getVillageOptions(districtId: string) {
  return getVillagesByDistrict(districtId).map(v => ({
    value: v.villageId,
    label: v.villageName,
  }));
}