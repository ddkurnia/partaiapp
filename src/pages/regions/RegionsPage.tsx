import { KEPULAUAN_MERANTI, type DistrictData } from '@/constants/regions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { MapPin, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function RegionsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalVillages = KEPULAUAN_MERANTI.reduce((acc, d) => acc + d.villages.length, 0);

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h2 className="text-xl font-bold text-primary">Wilayah</h2>
        <p className="text-sm text-muted-foreground">
          Kabupaten Kepulauan Meranti — {KEPULAUAN_MERANTI.length} kecamatan, {totalVillages} desa/kelurahan
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
            <MapPin className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl font-bold text-primary">{KEPULAUAN_MERANTI.length}</p>
          <p className="text-xs text-muted-foreground">Kecamatan</p>
        </div>
        <div className="card p-4">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center mb-2">
            <MapPin className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-primary">{totalVillages}</p>
          <p className="text-xs text-muted-foreground">Desa/Kelurahan</p>
        </div>
      </div>

      <div className="space-y-2">
        {KEPULAUAN_MERANTI.map(district => (
          <DistrictCard
            key={district.districtId}
            district={district}
            expanded={expanded === district.districtId}
            onToggle={() => setExpanded(expanded === district.districtId ? null : district.districtId)}
          />
        ))}
      </div>
    </div>
  );
}

function DistrictCard({ district, expanded, onToggle }: {
  district: DistrictData; expanded: boolean; onToggle: () => void;
}) {
  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-primary">Kec. {district.districtName}</p>
          <p className="text-xs text-muted-foreground">{district.villages.length} desa/kelurahan</p>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="border-t border-border px-4 pb-3 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          {district.villages.map(v => (
            <div key={v.villageId} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
              <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
              <span className="text-sm text-primary">{v.villageName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
