'use client';

import { useEffect, useState, useCallback } from 'react';
import { getKpiMonthly } from '@/lib/supabase';
import { useSociete } from '@/lib/societe-context';
import { KpiMonthly } from '@/lib/types';
import { formatEur } from '@/lib/utils';
import { Loading, EmptyState } from '@/components/loading';
import { TrendingUp, TrendingDown, BarChart3, Trophy } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';

function formatMois(mois: string): string {
  const [year, month] = mois.split('-');
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('fr-FR', {
    month: 'short',
    year: 'numeric',
  });
}

function formatMoisLong(mois: string): string {
  const [year, month] = mois.split('-');
  const names = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  return `${names[Number(month)]} ${year}`;
}

const compactFormatter = (v: number) =>
  new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(v);

const tooltipStyle = {
  backgroundColor: '#1e2330',
  border: '1px solid #2d3548',
  borderRadius: '8px',
  color: '#e2e8f0',
};

export default function PerformancePage() {
  const { selectedId } = useSociete();
  const [data, setData] = useState<KpiMonthly[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const rows = await getKpiMonthly(selectedId);
      setData(rows);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, [selectedId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <Loading />;

  if (data.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-text-primary">Performance</h2>
        <EmptyState message="Aucune donnée de performance disponible" />
      </div>
    );
  }

  // Chart data
  const chartData = data.map((row) => ({
    mois: formatMois(row.mois),
    ca: row.ca_mtd,
    charges: row.charges_mtd,
    resultat: row.resultat_mtd,
    tresorerie: row.tresorerie,
  }));

  // KPI synthesis
  const avgCA = data.reduce((s, r) => s + r.ca_mtd, 0) / data.length;
  const avgCharges = data.reduce((s, r) => s + r.charges_mtd, 0) / data.length;
  const avgResultat = data.reduce((s, r) => s + r.resultat_mtd, 0) / data.length;
  const bestMonth = data.reduce((best, r) => (r.ca_mtd > best.ca_mtd ? r : best), data[0]);

  const fewMonths = data.length < 2;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-text-primary">Performance</h2>

      {/* Section 4 — KPI cards synthèse */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SynthCard
          title="CA moyen mensuel"
          value={formatEur(avgCA)}
          icon={<TrendingUp size={20} className="text-emerald-400" />}
          iconBg="bg-emerald-500/10"
        />
        <SynthCard
          title="Charges moyennes"
          value={formatEur(avgCharges)}
          icon={<TrendingDown size={20} className="text-orange-400" />}
          iconBg="bg-orange-500/10"
        />
        <SynthCard
          title="Résultat moyen"
          value={formatEur(avgResultat)}
          icon={<BarChart3 size={20} className={avgResultat >= 0 ? 'text-emerald-400' : 'text-red-400'} />}
          iconBg={avgResultat >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}
          valueClass={avgResultat >= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
        <SynthCard
          title="Meilleur mois (CA)"
          value={formatMoisLong(bestMonth.mois)}
          subtitle={formatEur(bestMonth.ca_mtd)}
          icon={<Trophy size={20} className="text-amber-400" />}
          iconBg="bg-amber-500/10"
        />
      </div>

      {/* Section 1 — CA vs Charges */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          CA vs Charges — Évolution mensuelle
        </h3>
        {fewMonths && (
          <p className="text-sm text-text-secondary mb-4">
            Les données s&apos;enrichiront chaque mois
          </p>
        )}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" />
              <XAxis dataKey="mois" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={compactFormatter} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatEur(value)} />
              <Legend wrapperStyle={{ color: '#64748b', fontSize: '12px' }} />
              <ReferenceLine y={0} stroke="#2d3548" />
              <Bar dataKey="ca" name="CA" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="charges" name="Charges" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Line
                dataKey="resultat"
                name="Résultat"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
                type="monotone"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section 2 — Évolution trésorerie */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Évolution de la trésorerie
        </h3>
        {fewMonths && (
          <p className="text-sm text-text-secondary mb-4">
            Le graphique s&apos;enrichira automatiquement chaque mois
          </p>
        )}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" />
              <XAxis dataKey="mois" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={compactFormatter} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatEur(value)} />
              <Line
                type="monotone"
                dataKey="tresorerie"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                name="Trésorerie"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section 3 — Tableau récapitulatif */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="p-6 pb-4">
          <h3 className="text-lg font-semibold text-text-primary">
            Récapitulatif mensuel
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-card-border">
                <th className="text-left text-xs font-medium text-text-secondary px-6 py-3">Mois</th>
                <th className="text-right text-xs font-medium text-text-secondary px-6 py-3">CA</th>
                <th className="text-right text-xs font-medium text-text-secondary px-6 py-3">Charges</th>
                <th className="text-right text-xs font-medium text-text-secondary px-6 py-3">Résultat</th>
                <th className="text-right text-xs font-medium text-text-secondary px-6 py-3">Trésorerie</th>
                <th className="text-right text-xs font-medium text-text-secondary px-6 py-3">Runway</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((row, i) => (
                <tr
                  key={row.mois}
                  className={`border-b border-card-border/50 hover:bg-white/[0.02] ${i === 0 ? 'bg-white/[0.02]' : ''}`}
                >
                  <td className="px-6 py-4 text-sm text-text-primary font-medium">
                    {formatMoisLong(row.mois)}
                    {i === 0 && (
                      <span className="ml-2 text-[10px] text-accent font-normal">actuel</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-emerald-400 text-right font-medium">
                    {formatEur(row.ca_mtd)}
                  </td>
                  <td className="px-6 py-4 text-sm text-orange-400 text-right font-medium">
                    {formatEur(row.charges_mtd)}
                  </td>
                  <td className={`px-6 py-4 text-sm text-right font-bold ${row.resultat_mtd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {row.resultat_mtd >= 0 ? '+' : ''}{formatEur(row.resultat_mtd)}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-primary text-right">
                    {formatEur(row.tresorerie)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium">
                    <RunwayBadge value={row.runway_mois} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SynthCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  valueClass,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-text-secondary">{title}</p>
        <p className={`text-xl font-bold truncate ${valueClass || 'text-text-primary'}`}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function RunwayBadge({ value }: { value: number }) {
  let colorClass: string;
  if (value < 2) {
    colorClass = 'text-red-400 bg-red-500/20 border-red-500/30';
  } else if (value <= 4) {
    colorClass = 'text-orange-400 bg-orange-500/20 border-orange-500/30';
  } else {
    colorClass = 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {value} mois
    </span>
  );
}
