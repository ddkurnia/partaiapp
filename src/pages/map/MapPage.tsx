import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getDistrictStats, getVillageStats, getDistrictComparison, type DistrictMapStats, type VillageMapStats, type DistrictComparison } from '@/services/map/mapService';
import { DISTRICT_GEO, KABUPATEN_CENTER, KABUPATEN_ZOOM, getVillageGeo } from '@/constants/mapData';
import { getDistrictName } from '@/constants/regions';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  MapPin, Users, ShieldCheck, TrendingUp, TrendingDown, Minus,
  ChevronLeft, X, UserCheck, Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Fix leaflet default marker icon
const districtIcon = new L.DivIcon({
  html: `<div style="background:#10b981;width:36px;height:36px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;">K</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  className: '',
});

const villageIcon = new L.DivIcon({
  html: `<div style="background:#0f172a;width:18px;height:18px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  className: '',
});

type MapLayer = 'district' | 'village' | 'kader';

export default function MapPage() {
  const [stats, setStats] = useState<DistrictMapStats[]>([]);
  const [comparison, setComparison] = useState<DistrictComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [villageStats, setVillageStats] = useState<VillageMapStats[]>([]);
  const [mapMode, setMapMode] = useState<MapLayer>('district');
  const [mapCenter, setMapCenter] = useState<[number, number]>(KABUPATEN_CENTER);
  const [mapZoom, setMapZoom] = useState(KABUPATEN_ZOOM);
  const [showPanel, setShowPanel] = useState(false);
  const [panelTab, setPanelTab] = useState<'detail' | 'compare'>('detail');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [dStats, comp] = await Promise.all([getDistrictStats(), getDistrictComparison()]);
      setStats(dStats);
      setComparison(comp);
    } catch { toast.error('Gagal memuat data peta'); }
    setLoading(false);
  }

  useEffect(() => {
    if (selectedDistrict) {
      loadVillageData(selectedDistrict);
      const geo = DISTRICT_GEO.find(d => d.districtId === selectedDistrict);
      if (geo) { setMapCenter([geo.lat, geo.lng]); setMapZoom(geo.zoom); }
      setShowPanel(true);
      setPanelTab('detail');
    }
  }, [selectedDistrict]);

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
  const totalVerified = useMemo(() => stats.reduce((s, d) => s + d.verified, 0), [stats]);
  const totalKader = useMemo(() => stats.reduce((s, d) => s + d.kaderCount, 0), [stats]);
  const selectedStats = selectedDistrict ? statsMap[selectedDistrict] : null;

  function handleBack() {
    setSelectedDistrict(null);
    setMapMode('district');
    setVillageStats([]);
    setMapCenter(KABUPATEN_CENTER);
    setMapZoom(KABUPATEN_ZOOM);
    setShowPanel(false);
  }

  function handleLayerChange(layer: MapLayer) {
    setMapMode(layer);
    if (layer === 'kader') {
      setSelectedDistrict(null);
      setMapCenter(KABUPATEN_CENTER);
      setMapZoom(KABUPATEN_ZOOM);
      setShowPanel(true);
      setPanelTab('compare');
    } else if (layer === 'district') {
      setSelectedDistrict(null);
      setMapCenter(KABUPATEN_CENTER);
      setMapZoom(KABUPATEN_ZOOM);
      setShowPanel(false);
    }
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary">Peta Wilayah</h2>
          <p className="text-sm text-muted-foreground">
            Kabupaten Kepulauan Meranti
            {selectedDistrict ? ` — ${getDistrictName(selectedDistrict)}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedDistrict && (
            <button onClick={handleBack} className="btn-outline h-10 px-3 text-sm flex items-center gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Kembali
            </button>
          )}
        </div>
      </div>

      {!selectedDistrict && !loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniStat icon={<Users className="w-4 h-4" />} bg="bg-accent/10" color="text-accent" value={totalAll.toLocaleString('id-ID')} label="Total Anggota" />
          <MiniStat icon={<ShieldCheck className="w-4 h-4" />} bg="bg-emerald-500/10" color="text-emerald-500" value={totalAll > 0 ? `${Math.round(totalVerified / totalAll * 100)}%` : '0%'} label="Data Valid" />
          <MiniStat icon={<UserCheck className="w-4 h-4" />} bg="bg-blue-500/10" color="text-blue-500" value={totalKader.toLocaleString('id-ID')} label="Total Kader" />
          <MiniStat icon={<Activity className="w-4 h-4" />} bg="bg-amber-500/10" color="text-amber-500" value={stats.filter(d => d.growthPercent > 0).length.toString()} label="Kec. Tumbuh" />
        </div>
      )}

      <div className="flex gap-2">
        {([['district', 'Kecamatan'], ['village', 'Desa'], ['kader', 'Kader']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => handleLayerChange(key)}
            className={`h-9 px-3.5 rounded-xl text-xs font-medium transition-colors ${
              mapMode === key
                ? 'bg-accent text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-4" style={{ height: 'calc(100vh - 280px)', minHeight: '420px' }}>
        <div className="card overflow-hidden flex-1 relative">
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
                const radius = Math.max(14, Math.min(42, Math.sqrt(total) * 1.8));
                const color = total > 2000 ? '#ef4444' : total > 1000 ? '#f59e0b' : total > 500 ? '#3b82f6' : '#10b981';

                return (
                  <CircleMarker
                    key={district.districtId}
                    center={[district.lat, district.lng]}
                    radius={radius}
                    pathOptions={{ fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.85 }}
                    eventHandlers={{ click: () => setSelectedDistrict(district.districtId) }}
                  >
                    <Popup>
                      <div className="min-w-[220px]">
                        <h3 className="font-bold text-sm text-gray-900">Kec. {district.districtName}</h3>
                        {s ? (
                          <div className="mt-2 space-y-1.5 text-xs text-gray-600">
                            <div className="flex justify-between"><span>Anggota</span><strong>{s.total.toLocaleString('id-ID')}</strong></div>
                            <div className="flex justify-between"><span>Data Valid</span><strong className="text-emerald-600">{s.validPercent}%</strong></div>
                            <div className="flex justify-between"><span>Laki-laki</span><strong>{s.male} ({s.malePercent}%)</strong></div>
                            <div className="flex justify-between"><span>Perempuan</span><strong>{s.female} ({s.femalePercent}%)</strong></div>
                            <div className="flex justify-between"><span>Kader</span><strong>{s.kaderCount}</strong></div>
                            <div className="flex justify-between"><span>Pertumbuhan</span><GrowthBadge value={s.growthPercent} /></div>
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

              {mapMode === 'village' && selectedDistrict && (() => {
                const geo = DISTRICT_GEO.find(d => d.districtId === selectedDistrict);
                if (!geo) return null;
                const villageGeo = getVillageGeo(selectedDistrict);
                const villageMap = Object.fromEntries(villageStats.map(v => [v.villageId, v]));

                return (
                  <>
                    <Marker position={[geo.lat, geo.lng]} icon={districtIcon}>
                      <Popup>
                        <div className="text-center"><strong>{getDistrictName(selectedDistrict)}</strong></div>
                      </Popup>
                    </Marker>
                    {villageGeo.map(vg => {
                      const vs = villageMap[vg.villageId];
                      const total = vs?.total || 0;
                      const pct = vs?.validPercent || 0;
                      const radius = Math.max(6, Math.min(22, Math.sqrt(total) * 1.5));
                      const color = total === 0 ? '#94a3b8' : pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                      return (
                        <CircleMarker
                          key={vg.villageId}
                          center={[vg.lat, vg.lng]}
                          radius={radius}
                          pathOptions={{ fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.85 }}
                        >
                          <Popup>
                            <div className="min-w-[170px]">
                              <h3 className="font-bold text-sm text-gray-900">{vg.villageName}</h3>
                              {vs ? (
                                <div className="mt-1.5 space-y-1 text-xs text-gray-600">
                                  <div className="flex justify-between"><span>Anggota</span><strong>{total}</strong></div>
                                  <div className="flex justify-between"><span>Valid</span><strong className="text-emerald-600">{vs.verified} ({pct}%)</strong></div>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 mt-1">Belum ada data</p>
                              )}
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    })}
                  </>
                );
              })()}

              {mapMode === 'kader' && DISTRICT_GEO.map(district => {
                const s = statsMap[district.districtId];
                const kaderCount = s?.kaderCount || 0;
                const memberPerKader = kaderCount > 0 ? Math.round((s?.total || 0) / kaderCount) : 0;
                const radius = Math.max(10, Math.min(38, kaderCount * 2.5));
                const color = kaderCount >= 30 ? '#10b981' : kaderCount >= 15 ? '#f59e0b' : '#ef4444';

                return (
                  <CircleMarker
                    key={district.districtId}
                    center={[district.lat, district.lng]}
                    radius={radius}
                    pathOptions={{ fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.85 }}
                  >
                    <Popup>
                      <div className="min-w-[200px]">
                        <h3 className="font-bold text-sm text-gray-900">Kec. {district.districtName}</h3>
                        <div className="mt-2 space-y-1.5 text-xs text-gray-600">
                          <div className="flex justify-between"><span>Kader</span><strong>{kaderCount}</strong></div>
                          <div className="flex justify-between"><span>Rasio Anggota/Kader</span><strong>1:{memberPerKader}</strong></div>
                          <div className="flex justify-between"><span>Total Anggota</span><strong>{s?.total || 0}</strong></div>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
              <div className="leaflet-bottom leaflet-left" style={{ marginBottom: 30 }}>
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-gray-200 text-xs">
                  <p className="font-semibold text-gray-700 mb-1.5">Legenda</p>
                  {mapMode === 'district' ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-gray-600">{'<'} 500</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-gray-600">500 - 1.000</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-gray-600">1.000 - 2.000</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-gray-600">{'>'} 2.000</span></div>
                    </div>
                  ) : mapMode === 'village' ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-gray-600">Valid {'>='}80%</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-gray-600">Valid 50-79%</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-gray-600">Valid {'<'}50%</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-400" /><span className="text-gray-600">Belum ada data</span></div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-gray-600">{'>='} 30 kader</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-gray-600">15 - 29 kader</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-gray-600">{'<'} 15 kader</span></div>
                    </div>
                  )}
                </div>
              </div>
            </MapContainer>
          )}
        </div>

        {showPanel && !loading && (
          <div className="hidden lg:block w-80 flex-shrink-0 card overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex gap-1">
                {selectedDistrict && (
                  <button
                    onClick={() => setPanelTab('detail')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${panelTab === 'detail' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-muted'}`}
                  >Detail</button>
                )}
                <button
                  onClick={() => setPanelTab('compare')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${panelTab === 'compare' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-muted'}`}
                >Perbandingan</button>
              </div>
              <button onClick={() => { setShowPanel(false); if (!selectedDistrict) handleBack(); }} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              {panelTab === 'detail' && selectedStats && (
                <DistrictDetailPanel stats={selectedStats} />
              )}
              {panelTab === 'compare' && (
                <ComparisonTable data={comparison} />
              )}
            </div>
          </div>
        )}
      </div>

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
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>{s ? `${s.total} anggota` : '-'}</span>
                    <span>{s ? `${s.validPercent}% valid` : '-'}</span>
                    <span>{s ? `${s.kaderCount} kader` : '-'}</span>
                  </div>
                </div>
                <GrowthIcon value={s?.growthPercent || 0} />
              </button>
            );
          })}
        </div>
      )}

      {mapMode === 'village' && selectedDistrict && !loading && (
        <div className="lg:hidden space-y-2">
          <h3 className="text-sm font-semibold text-primary">Desa — {getDistrictName(selectedDistrict)}</h3>
          {villageStats.length === 0 ? (
            <EmptyState title="Belum ada data desa" />
          ) : villageStats.sort((a, b) => b.total - a.total).map(v => (
            <div key={v.villageId} className="card p-3 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                v.validPercent >= 80 ? 'bg-emerald-500/10 text-emerald-500' : v.validPercent >= 50 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
              }`}>
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">{v.villageName}</p>
                <p className="text-xs text-muted-foreground">{v.total} anggota · {v.validPercent}% valid</p>
              </div>
              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
                <div className={`h-full rounded-full ${v.validPercent >= 80 ? 'bg-emerald-500' : v.validPercent >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${v.validPercent}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {mapMode === 'kader' && !loading && (
        <div className="lg:hidden space-y-2">
          <h3 className="text-sm font-semibold text-primary">Kader per Kecamatan</h3>
          {stats.sort((a, b) => b.kaderCount - a.kaderCount).map(s => (
            <div key={s.districtId} className="card p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary">Kec. {s.districtName}</p>
                <p className="text-xs text-muted-foreground">{s.kaderCount} kader · 1:{s.kaderCount > 0 ? Math.round(s.total / s.kaderCount) : 0} rasio</p>
              </div>
              <span className="text-lg font-bold text-primary">{s.kaderCount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DistrictDetailPanel({ stats }: { stats: DistrictMapStats }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-primary">{stats.districtName}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Kecamatan</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-xl bg-muted/50">
          <p className="text-lg font-bold text-primary">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">Anggota</p>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-500/5">
          <p className="text-lg font-bold text-emerald-500">{stats.validPercent}%</p>
          <p className="text-[10px] text-muted-foreground">Data Valid</p>
        </div>
        <div className="p-2.5 rounded-xl bg-blue-500/5">
          <p className="text-lg font-bold text-blue-500">{stats.kaderCount}</p>
          <p className="text-[10px] text-muted-foreground">Kader</p>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-500/5">
          <div className="flex items-center gap-1">
            <GrowthIcon value={stats.growthPercent} />
            <span className="text-lg font-bold text-primary">{stats.growthPercent > 0 ? '+' : ''}{stats.growthPercent}%</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Pertumbuhan</p>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Komposisi Gender</p>
        <div className="flex h-3 rounded-full overflow-hidden bg-muted">
          {stats.total > 0 && (
            <>
              <div className="bg-blue-500 transition-all" style={{ width: `${stats.malePercent}%` }} />
              <div className="bg-pink-500 transition-all" style={{ width: `${stats.femalePercent}%` }} />
            </>
          )}
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
          <span>L: {stats.male} ({stats.malePercent}%)</span>
          <span>P: {stats.female} ({stats.femalePercent}%)</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Status Anggota</p>
        <div className="space-y-2">
          <StatusRow label="Aktif" value={stats.active} total={stats.total} color="bg-emerald-500" />
          <StatusRow label="Tidak Aktif" value={stats.inactive} total={stats.total} color="bg-gray-400" />
          <StatusRow label="Ditangguhkan" value={stats.suspended} total={stats.total} color="bg-red-500" />
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Kader</p>
        <div className="p-3 rounded-xl bg-blue-500/5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Jumlah Kader</span>
            <strong className="text-primary">{stats.kaderCount}</strong>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">Rasio Anggota/Kader</span>
            <strong className="text-primary">1:{stats.kaderCount > 0 ? Math.round(stats.total / stats.kaderCount) : 0}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-primary">{value} ({pct}%)</span>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ComparisonTable({ data }: { data: DistrictComparison[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Peringkat Kecamatan</p>
      {data.map(d => (
        <div key={d.districtId} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            d.rank <= 3 ? 'bg-amber-400 text-white' : 'bg-muted text-muted-foreground'
          }`}>
            {d.rank}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary truncate">{d.districtName}</p>
            <p className="text-[10px] text-muted-foreground">{d.kaderCount} kader · {d.validPercent}% valid</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-primary">{d.total.toLocaleString('id-ID')}</p>
            <GrowthIcon value={d.growthPercent} />
          </div>
        </div>
      ))}
    </div>
  );
}

function GrowthIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (value < 0) return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-gray-400" />;
}

function GrowthBadge({ value }: { value: number }) {
  const color = value > 0 ? 'text-emerald-600' : value < 0 ? 'text-red-600' : 'text-gray-500';
  return <strong className={color}>{value > 0 ? '+' : ''}{value}%</strong>;
}

function MiniStat({ icon, bg, color, value, label }: { icon: React.ReactNode; bg: string; color: string; value: string; label: string }) {
  return (
    <div className="card p-3">
      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-1.5 ${color}`}>{icon}</div>
      <p className="text-lg font-bold text-primary leading-tight">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
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