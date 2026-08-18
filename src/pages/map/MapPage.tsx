import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getDistrictStats, getVillageStats, type DistrictMapStats } from '@/services/map/mapService';
import { DISTRICT_GEO, KABUPATEN_CENTER, KABUPATEN_ZOOM } from '@/constants/mapData';
import { getDistrictOptions, getDistrictName, getVillageName } from '@/constants/regions';
import { Skeleton } from '@/components/ui/Skeleton';
import { MapPin, Users, ShieldCheck, TrendingUp, Layers, Filter, X, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

// Fix leaflet default marker icon
const markerIcon = new L.DivIcon({
  html: `<div style="background:#10b981;width:36px;height:36px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;">P</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  className: '',
});

const villageIcon = new L.DivIcon({
  html: `<div style="background:#0f172a;width:20px;height:20px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.2);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  className: '',
});

export default function MapPage() {
  const [stats, setStats] = useState<DistrictMapStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [villageStats, setVillageStats] = useState<{ villageId: string; total: number; verified: number }[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [mapMode, setMapMode] = useState<'district' | 'village'>('district');
  const [mapCenter, setMapCenter] = useState<[number, number]>(KABUPATEN_CENTER);
  const [mapZoom, setMapZoom] = useState(KABUPATEN_ZOOM);

  useEffect(() => {
    loadDistrictStats();
  }, []);

  useEffect(() => {
    if (selectedDistrict) {
      loadVillageData(selectedDistrict);
      const geo = DISTRICT_GEO.find(d => d.districtId === selectedDistrict);
      if (geo) { setMapCenter([geo.lat, geo.lng]); setMapZoom(geo.zoom); }
    }
  }, [selectedDistrict]);

  async function loadDistrictStats() {
    setLoading(true);
    try {
      const data = await getDistrictStats();
      setStats(data);
    } catch { toast.error('Gagal memuat data peta'); }
    setLoading(false);
  }

  async function loadVillageData(districtId: string) {
    try {
      const data = await getVillageStats(districtId);
      setVillageStats(data);
      setMapMode('village');
    } catch { /* */ }
  }

  const statsMap = useMemo(() => {
 const m: Record<string, DistrictMapStats> = {};
    stats.forEach(s => { m[s.districtId] = s; });
    return m;
  }, [stats]);

  const totalAll = useMemo(() => stats.reduce((s, d) => s + d.total, 0), [stats]);

  function handleBack() {
    setSelectedDistrict(null);
    setMapMode('district');
    setVillageStats([]);
    setMapCenter(KABUPATEN_CENTER);
    setMapZoom(KABUPATEN_ZOOM);
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary">Peta Wilayah</h2>
          <p className="text-sm text-muted-foreground">Kabupaten Kepulauan Meranti{selectedDistrict ? ` — ${getDistrictName(selectedDistrict)}` : ''}</p>
        </div>
        <div className="flex gap-2">
          {selectedDistrict && (
            <button onClick={handleBack} className="btn-outline h-10 px-3 text-sm flex items-center gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Kembali
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      {!selectedDistrict && !loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3 text-center">
            <p className="text-lg font-bold text-primary">{totalAll.toLocaleString('id-ID')}</p>
            <p className="text-[10px] text-muted-foreground">Total Anggota</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-lg font-bold text-emerald-500">{stats.filter(d => d.validPercent >= 80).length}</p>
            <p className="text-[10px] text-muted-foreground">Kec. Data Valid ≥80%</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-lg font-bold text-blue-500">{DISTRICT_GEO.length}</p>
            <p className="text-[10px] text-muted-foreground">Kecamatan</p>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="card overflow-hidden" style={{ height: 'calc(100vh - 240px)', minHeight: '400px' }}>
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center"><div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-sm text-muted-foreground">Memuat data peta...</p></div>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            zoomControl={false}
            className="w-full h-full"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ZoomControl position="bottomright" />
            <MapController center={mapCenter} zoom={mapZoom} />

            {mapMode === 'district' && DISTRICT_GEO.map(district => {
              const s = statsMap[district.districtId];
              const total = s?.total || 0;
              const radius = Math.max(12, Math.min(40, Math.sqrt(total) * 1.8));
              const color = total > 2000 ? '#ef4444' : total > 1000 ? '#f59e0b' : total > 500 ? '#3b82f6' : '#10b981';

              return (
                <CircleMarker
                  key={district.districtId}
                  center={[district.lat, district.lng]}
                  radius={radius}
                  pathOptions={{
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    fillOpacity: 0.85,
                  }}
                  eventHandlers={{
                    click: () => setSelectedDistrict(district.districtId),
                  }}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <h3 className="font-bold text-sm text-gray-900">Kec. {district.districtName}</h3>
                      {s ? (
                        <div className="mt-2 space-y-1.5 text-xs text-gray-600">
                          <div className="flex justify-between"><span>Anggota</span><strong>{s.total.toLocaleString('id-ID')}</strong></div>
                          <div className="flex justify-between"><span>Data Valid</span><strong className="text-emerald-600">{s.validPercent}%</strong></div>
                          <div className="flex justify-between"><span>Laki-laki</span><strong>{s.male}</strong></div>
                          <div className="flex justify-between"><span>Perempuan</span><strong>{s.female}</strong></div>
                          <div className="mt-2 pt-2 border-t border-gray-200 text-center">
                            <span className="text-[10px] text-gray-400">Klik untuk detail desa</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1">Belum ada data</p>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {mapMode === 'village' && selectedDistrict && DISTRICT_GEO.find(d => d.districtId === selectedDistrict) && (
              <>
                {/* District marker */}
                <Marker position={[DISTRICT_GEO.find(d => d.districtId === selectedDistrict)!.lat, DISTRICT_GEO.find(d => d.districtId === selectedDistrict)!.lng]} icon={markerIcon}>
                  <Popup>
                    <div className="text-center"><strong>{getDistrictName(selectedDistrict)}</strong><br /><span className="text-xs text-gray-500">Klik desa di peta</span></div>
                  </Popup>
                </Marker>
                {/* Village markers - offset slightly for visibility */}
                {villageStats.map((v, i) => {
                  const base = DISTRICT_GEO.find(d => d.districtId === selectedDistrict)!;
                  const angle = (i / Math.max(villageStats.length, 1)) * Math.PI * 2;
                  const dist = 0.015 + (i % 3) * 0.008;
                  const lat = base.lat + Math.cos(angle) * dist;
                  const lng = base.lng + Math.sin(angle) * dist;
                  const pct = v.total > 0 ? Math.round(v.verified / v.total * 100) : 0;
                  return (
                    <CircleMarker
                      key={v.villageId}
                      center={[lat, lng]}
                      radius={Math.max(8, Math.min(25, Math.sqrt(v.total) * 1.5))}
                      pathOptions={{
                        fillColor: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444',
                        color: '#fff', weight: 2, fillOpacity: 0.85,
                      }}
                    >
                      <Popup>
                        <div className="min-w-[160px]">
                          <h3 className="font-bold text-sm text-gray-900">{getVillageName(selectedDistrict, v.villageId)}</h3>
                          <div className="mt-1.5 space-y-1 text-xs text-gray-600">
                            <div className="flex justify-between"><span>Anggota</span><strong>{v.total}</strong></div>
                            <div className="flex justify-between"><span>Valid</span><strong className="text-emerald-600">{v.verified} ({pct}%)</strong></div>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </>
            )}

            {/* Legend */}
            <div className="leaflet-bottom leaflet-left" style={{ marginBottom: 30 }}>
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-gray-200 text-xs">
                <p className="font-semibold text-gray-700 mb-1.5">Legend</p>
                {mapMode === 'district' ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-gray-600">&lt; 500</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-gray-600">500 - 1.000</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-gray-600">1.000 - 2.000</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-gray-600">&gt; 2.000</span></div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-gray-600">Valid ≥80%</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-gray-600">Valid 50-79%</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-gray-600">Valid &lt;50%</span></div>
                  </div>
                )}
              </div>
            </div>
          </MapContainer>
        )}
      </div>

      {/* District list below map (mobile) */}
      {mapMode === 'district' && !loading && (
        <div className="lg:hidden space-y-2">
          <h3 className="text-sm font-semibold text-primary">Daftar Kecamatan</h3>
          {DISTRICT_GEO.map(d => {
            const s = statsMap[d.districtId];
            return (
              <button
                key={d.districtId}
                onClick={() => { setSelectedDistrict(d.districtId); }}
                className="card p-3 w-full text-left flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">Kec. {d.districtName}</p>
                  <p className="text-xs text-muted-foreground">{s ? `${s.total} anggota · ${s.validPercent}% valid` : 'Belum ada data'}</p>
                </div>
                <TrendingUp className={`w-4 h-4 ${s && s.validPercent >= 80 ? 'text-emerald-500' : 'text-amber-500'}`} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1 });
  }, [center, zoom, map]);
  return null;
}