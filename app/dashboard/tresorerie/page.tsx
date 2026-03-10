'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useSociete } from '@/lib/societe-context';
import { formatEur } from '@/lib/utils';
import { Loading, EmptyState } from '@/components/loading';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
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
  ComposedChart,
  Legend,
} from 'recharts';

interface WeekData {
  label: string;
  start: string;
  end: string;
  encaissements: number;
  decaissements: number;
  solde: number;
}

/** Returns the Monday (start of ISO week) for a given date */
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatWeekLabel(d: Date): string {
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
}

function formatFullDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function TresoreriePage() {
  const { selectedId } = useSociete();
  const [transactions, setTransactions] = useState<{ date: string; amount: number }[]>([]);
  const [tresorerieActuelle, setTresorerieActuelle] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);

    // Fetch last ~100 days of transactions and current treasury
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 100);
    const dateFromStr = dateFrom.toISOString().split('T')[0];

    const [txRes, kpiRes] = await Promise.all([
      supabase
        .from('pl_bank_transactions')
        .select('date, amount')
        .eq('societe_id', selectedId)
        .gte('date', dateFromStr)
        .order('date', { ascending: true }),
      supabase
        .from('kpi_snapshots')
        .select('tresorerie')
        .eq('societe_id', selectedId)
        .order('date_snapshot', { ascending: false })
        .limit(1),
    ]);

    if (txRes.data) setTransactions(txRes.data);
    if (kpiRes.data && kpiRes.data.length > 0) {
      setTresorerieActuelle(kpiRes.data[0].tresorerie);
    }
    setLoading(false);
  }, [selectedId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const weeklyData: WeekData[] = useMemo(() => {
    if (transactions.length === 0) return [];

    // Build 13 weeks ending with the current week
    const today = new Date();
    const currentMonday = getMonday(today);
    const weeks: { start: Date; end: Date }[] = [];

    for (let i = 12; i >= 0; i--) {
      const start = new Date(currentMonday);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      weeks.push({ start, end });
    }

    // Group transactions by week
    const weekTotals = weeks.map((w) => {
      const startStr = w.start.toISOString().split('T')[0];
      const endStr = w.end.toISOString().split('T')[0];

      let enc = 0;
      let dec = 0;
      transactions.forEach((tx) => {
        if (tx.date >= startStr && tx.date <= endStr) {
          if (tx.amount > 0) enc += tx.amount;
          else dec += Math.abs(tx.amount);
        }
      });

      return { enc, dec };
    });

    // Calculate cumulative balance
    // Start from current treasury and work backwards to find the starting balance
    const totalNet = weekTotals.reduce((sum, w) => sum + w.enc - w.dec, 0);
    const startingSolde = (tresorerieActuelle ?? 0) - totalNet;

    let solde = startingSolde;
    return weeks.map((w, i) => {
      solde += weekTotals[i].enc - weekTotals[i].dec;
      return {
        label: `S${formatWeekLabel(w.start)}`,
        start: formatFullDate(w.start),
        end: formatFullDate(w.end),
        encaissements: Math.round(weekTotals[i].enc * 100) / 100,
        decaissements: Math.round(weekTotals[i].dec * 100) / 100,
        solde: Math.round(solde * 100) / 100,
      };
    });
  }, [transactions, tresorerieActuelle]);

  // KPI summary
  const totalEnc = weeklyData.reduce((s, w) => s + w.encaissements, 0);
  const totalDec = weeklyData.reduce((s, w) => s + w.decaissements, 0);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-text-primary">
        Trésorerie — 13 semaines glissantes
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Encaissements (13 sem.)</p>
            <p className="text-xl font-bold text-emerald-400">{formatEur(totalEnc)}</p>
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
            <TrendingDown size={20} className="text-red-400" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Décaissements (13 sem.)</p>
            <p className="text-xl font-bold text-red-400">{formatEur(totalDec)}</p>
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Wallet size={20} className="text-accent" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Solde actuel</p>
            <p className={`text-xl font-bold ${(tresorerieActuelle ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatEur(tresorerieActuelle ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {weeklyData.length === 0 ? (
        <EmptyState message="Aucune transaction bancaire" />
      ) : (
        <>
          {/* Chart: Barres groupées + courbe solde */}
          <div className="bg-card border border-card-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Encaissements / Décaissements par semaine
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" />
                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="bars"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) =>
                      new Intl.NumberFormat('fr-FR', {
                        notation: 'compact',
                        compactDisplay: 'short',
                      }).format(v)
                    }
                  />
                  <YAxis
                    yAxisId="line"
                    orientation="right"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) =>
                      new Intl.NumberFormat('fr-FR', {
                        notation: 'compact',
                        compactDisplay: 'short',
                      }).format(v)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e2330',
                      border: '1px solid #2d3548',
                      borderRadius: '8px',
                      color: '#e2e8f0',
                    }}
                    formatter={(value: number, name: string) => [
                      formatEur(value),
                      name === 'encaissements' ? 'Encaissements' :
                      name === 'decaissements' ? 'Décaissements' : 'Solde cumulé',
                    ]}
                  />
                  <Legend
                    formatter={(value) =>
                      value === 'encaissements' ? 'Encaissements' :
                      value === 'decaissements' ? 'Décaissements' : 'Solde cumulé'
                    }
                  />
                  <Bar
                    yAxisId="bars"
                    dataKey="encaissements"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                  />
                  <Bar
                    yAxisId="bars"
                    dataKey="decaissements"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                  />
                  <Line
                    yAxisId="line"
                    type="monotone"
                    dataKey="solde"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tableau 13 semaines */}
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-card-border">
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-4">Semaine</th>
                    <th className="text-right text-xs font-medium text-text-secondary px-6 py-4">Encaissements</th>
                    <th className="text-right text-xs font-medium text-text-secondary px-6 py-4">Décaissements</th>
                    <th className="text-right text-xs font-medium text-text-secondary px-6 py-4">Net</th>
                    <th className="text-right text-xs font-medium text-text-secondary px-6 py-4">Solde cumulé</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyData.map((row, i) => {
                    const net = row.encaissements - row.decaissements;
                    return (
                      <tr key={i} className="border-b border-card-border/50 hover:bg-white/[0.02]">
                        <td className="px-6 py-4 text-sm text-text-primary">
                          {row.start} → {row.end}
                        </td>
                        <td className="px-6 py-4 text-sm text-emerald-400 text-right">
                          {row.encaissements > 0 ? `+${formatEur(row.encaissements)}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-red-400 text-right">
                          {row.decaissements > 0 ? `-${formatEur(row.decaissements)}` : '—'}
                        </td>
                        <td className={`px-6 py-4 text-sm text-right font-medium ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {net >= 0 ? '+' : ''}{formatEur(net)}
                        </td>
                        <td className={`px-6 py-4 text-sm text-right font-bold ${row.solde >= 0 ? 'text-text-primary' : 'text-red-400'}`}>
                          {formatEur(row.solde)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
