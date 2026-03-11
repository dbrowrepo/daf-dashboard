'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useSociete } from '@/lib/societe-context';
import { formatEur } from '@/lib/utils';
import { Loading, EmptyState } from '@/components/loading';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  Clock,
  Scale,
} from 'lucide-react';
import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

/* ── Types ── */

interface RawTx {
  date: string;
  amount: number;
  bank_account_id: string | null;
  bank_account_name: string | null;
}

interface WeekData {
  label: string;
  start: string;
  end: string;
  encaissements: number;
  decaissements: number;
  solde: number;
}

interface AccountSolde {
  id: string;
  name: string;
  solde: number;
  pct: number;
}

interface EvoWeek {
  label: string;
  solde: number;
}

interface InvoiceRow {
  customer_name?: string;
  supplier_name?: string;
  amount_incl_tax: number;
  deadline: string;
  status: string | null;
}

interface AttendusData {
  overdueTotal: number;
  upcomingTotal: number;
  overdueCount: number;
  upcomingCount: number;
  top5: InvoiceRow[];
}

/* ── Helpers ── */

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
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/* ── Component ── */

export default function TresoreriePage() {
  const { selectedId } = useSociete();
  const [allTransactions, setAllTransactions] = useState<RawTx[]>([]);
  const [tresorerieActuelle, setTresorerieActuelle] = useState<number | null>(
    null
  );
  const [encAttendus, setEncAttendus] = useState<AttendusData | null>(null);
  const [decAttendus, setDecAttendus] = useState<AttendusData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);

    const todayStr = new Date().toISOString().split('T')[0];
    const j30Str = new Date(Date.now() + 30 * 86400000)
      .toISOString()
      .split('T')[0];

    // Parallel fetch: KPI + customer invoices + supplier invoices
    const [kpiRes, custRes, suppRes] = await Promise.all([
      supabase
        .from('kpi_snapshots')
        .select('tresorerie')
        .eq('societe_id', selectedId)
        .order('date_snapshot', { ascending: false })
        .limit(1),
      supabase
        .from('pl_customer_invoices')
        .select('customer_name, amount_incl_tax, deadline, status')
        .eq('societe_id', selectedId)
        .not('status', 'in', '("paid","cancelled")'),
      supabase
        .from('pl_supplier_invoices')
        .select('supplier_name, amount_incl_tax, deadline, status')
        .eq('societe_id', selectedId)
        .neq('status', 'paid'),
    ]);

    if (kpiRes.data && kpiRes.data.length > 0) {
      setTresorerieActuelle(kpiRes.data[0].tresorerie);
    } else {
      setTresorerieActuelle(null);
    }

    // Process customer invoices (encaissements attendus)
    if (custRes.data) {
      const overdue = custRes.data.filter(
        (f) => f.deadline && f.deadline < todayStr
      );
      const upcoming = custRes.data.filter(
        (f) => f.deadline && f.deadline >= todayStr && f.deadline <= j30Str
      );
      const allUnpaid = [...overdue, ...upcoming].sort(
        (a, b) => (b.amount_incl_tax || 0) - (a.amount_incl_tax || 0)
      );
      setEncAttendus({
        overdueTotal: overdue.reduce(
          (s, f) => s + (f.amount_incl_tax || 0),
          0
        ),
        upcomingTotal: upcoming.reduce(
          (s, f) => s + (f.amount_incl_tax || 0),
          0
        ),
        overdueCount: overdue.length,
        upcomingCount: upcoming.length,
        top5: allUnpaid.slice(0, 5),
      });
    }

    // Process supplier invoices (décaissements attendus)
    if (suppRes.data) {
      const overdue = suppRes.data.filter(
        (f) => f.deadline && f.deadline < todayStr
      );
      const upcoming = suppRes.data.filter(
        (f) => f.deadline && f.deadline >= todayStr && f.deadline <= j30Str
      );
      const allUnpaid = [...overdue, ...upcoming].sort(
        (a, b) => (b.amount_incl_tax || 0) - (a.amount_incl_tax || 0)
      );
      setDecAttendus({
        overdueTotal: overdue.reduce(
          (s, f) => s + (f.amount_incl_tax || 0),
          0
        ),
        upcomingTotal: upcoming.reduce(
          (s, f) => s + (f.amount_incl_tax || 0),
          0
        ),
        overdueCount: overdue.length,
        upcomingCount: upcoming.length,
        top5: allUnpaid.slice(0, 5),
      });
    }

    // Paginated fetch of ALL transactions for solde par compte
    let allTxns: RawTx[] = [];
    let offset = 0;
    while (true) {
      const { data: batch } = await supabase
        .from('pl_bank_transactions')
        .select('date, amount, bank_account_id, bank_account_name')
        .eq('societe_id', selectedId)
        .order('date', { ascending: true })
        .range(offset, offset + 999);
      if (!batch || batch.length === 0) break;
      allTxns = allTxns.concat(batch);
      offset += batch.length;
      if (batch.length < 1000) break;
    }

    setAllTransactions(allTxns);
    setLoading(false);
  }, [selectedId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter last 100 days for the 13-week view
  const recentTransactions = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 100);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return allTransactions.filter((tx) => tx.date >= cutoffStr);
  }, [allTransactions]);

  /* ── 1. Solde par compte bancaire ── */
  const accountSoldes: AccountSolde[] = useMemo(() => {
    if (allTransactions.length === 0) return [];
    const byAccount = new Map<string, { name: string; sum: number }>();
    allTransactions.forEach((tx) => {
      const id = tx.bank_account_id || 'unknown';
      const name = tx.bank_account_name || `Compte ${id}`;
      const existing = byAccount.get(id);
      if (existing) {
        existing.sum += tx.amount;
      } else {
        byAccount.set(id, { name, sum: tx.amount });
      }
    });

    const entries = Array.from(byAccount.entries()).map(([id, v]) => ({
      id,
      name: v.name,
      solde: Math.round(v.sum * 100) / 100,
      pct: 0,
    }));

    const total = entries.reduce((s, e) => s + Math.abs(e.solde), 0);
    entries.forEach((e) => {
      e.pct = total > 0 ? Math.round((Math.abs(e.solde) / total) * 1000) / 10 : 0;
    });

    // Sort by solde descending
    entries.sort((a, b) => b.solde - a.solde);
    return entries;
  }, [allTransactions]);

  const totalComptes = accountSoldes.reduce((s, a) => s + a.solde, 0);

  /* ── 2. 13 semaines glissantes ── */
  const weeklyData: WeekData[] = useMemo(() => {
    if (recentTransactions.length === 0) return [];

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

    const weekTotals = weeks.map((w) => {
      const startStr = w.start.toISOString().split('T')[0];
      const endStr = w.end.toISOString().split('T')[0];
      let enc = 0;
      let dec = 0;
      recentTransactions.forEach((tx) => {
        if (tx.date >= startStr && tx.date <= endStr) {
          if (tx.amount > 0) enc += tx.amount;
          else dec += Math.abs(tx.amount);
        }
      });
      return { enc, dec };
    });

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
  }, [recentTransactions, tresorerieActuelle]);

  /* ── 3. Courbe d'évolution trésorerie 90j par semaine ── */
  const evoData: EvoWeek[] = useMemo(() => {
    if (allTransactions.length === 0 || tresorerieActuelle === null) return [];

    const today = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const txns90 = allTransactions.filter((tx) => tx.date >= cutoffStr);

    // Build ~13 weeks
    const currentMonday = getMonday(today);
    const weeks: { start: Date; end: Date }[] = [];
    for (let i = 12; i >= 0; i--) {
      const start = new Date(currentMonday);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      weeks.push({ start, end });
    }

    const weekNets = weeks.map((w) => {
      const startStr = w.start.toISOString().split('T')[0];
      const endStr = w.end.toISOString().split('T')[0];
      let net = 0;
      txns90.forEach((tx) => {
        if (tx.date >= startStr && tx.date <= endStr) {
          net += tx.amount;
        }
      });
      return net;
    });

    const totalNet90 = weekNets.reduce((s, n) => s + n, 0);
    const startSolde = tresorerieActuelle - totalNet90;

    let solde = startSolde;
    return weeks.map((w, i) => {
      solde += weekNets[i];
      return {
        label: `S${formatWeekLabel(w.start)}`,
        solde: Math.round(solde * 100) / 100,
      };
    });
  }, [allTransactions, tresorerieActuelle]);

  /* ── KPI summary ── */
  const totalEnc = weeklyData.reduce((s, w) => s + w.encaissements, 0);
  const totalDec = weeklyData.reduce((s, w) => s + w.decaissements, 0);

  /* ── Solde net attendu J+30 ── */
  const encTotal =
    (encAttendus?.overdueTotal ?? 0) + (encAttendus?.upcomingTotal ?? 0);
  const decTotal =
    (decAttendus?.overdueTotal ?? 0) + (decAttendus?.upcomingTotal ?? 0);
  const soldeNetAttendu = encTotal - decTotal;

  if (loading) return <Loading />;

  /* ── Colors for accounts ── */
  const accountColors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

  function formatDeadline(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  }

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
            <p className="text-sm text-text-secondary">
              Encaissements (13 sem.)
            </p>
            <p className="text-xl font-bold text-emerald-400">
              {formatEur(totalEnc)}
            </p>
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
            <TrendingDown size={20} className="text-red-400" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">
              Décaissements (13 sem.)
            </p>
            <p className="text-xl font-bold text-red-400">
              {formatEur(totalDec)}
            </p>
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Wallet size={20} className="text-accent" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Solde actuel</p>
            <p
              className={`text-xl font-bold ${(tresorerieActuelle ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {formatEur(tresorerieActuelle ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Solde par compte bancaire ── */}
      {accountSoldes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Landmark size={18} className="text-text-secondary" />
            Détail par compte bancaire
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accountSoldes.map((account, i) => (
              <div
                key={account.id}
                className="bg-card border border-card-border rounded-xl p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        accountColors[i % accountColors.length],
                    }}
                  />
                  <p className="text-sm text-text-secondary truncate">
                    {account.name}
                  </p>
                </div>
                <p
                  className={`text-xl font-bold ${account.solde >= 0 ? 'text-text-primary' : 'text-red-400'}`}
                >
                  {formatEur(account.solde)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(account.pct, 100)}%`,
                        backgroundColor:
                          accountColors[i % accountColors.length],
                      }}
                    />
                  </div>
                  <span className="text-xs text-text-secondary">
                    {account.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          {/* Total check */}
          <p className="text-xs text-text-secondary text-right">
            Somme des comptes : {formatEur(totalComptes)}
          </p>
        </div>
      )}

      {/* ── Encaissements & Décaissements attendus ── */}
      {(encAttendus || decAttendus) && (
        <div className="space-y-4">
          {/* Résumé solde net attendu */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-1">
              <Scale size={18} className="text-accent" />
              <h3 className="text-lg font-semibold text-text-primary">
                Flux attendus J+30
              </h3>
            </div>
            <div className="flex items-center gap-6 mt-3">
              <div className="flex items-center gap-2">
                <ArrowDownCircle size={16} className="text-emerald-400" />
                <span className="text-sm text-text-secondary">
                  Encaissements :
                </span>
                <span className="text-sm font-bold text-emerald-400">
                  +{formatEur(encTotal)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpCircle size={16} className="text-red-400" />
                <span className="text-sm text-text-secondary">
                  Décaissements :
                </span>
                <span className="text-sm font-bold text-red-400">
                  -{formatEur(decTotal)}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-text-secondary">
                  Solde net attendu :
                </span>
                <span
                  className={`text-lg font-bold ${soldeNetAttendu >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {soldeNetAttendu >= 0 ? '+' : ''}
                  {formatEur(soldeNetAttendu)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Encaissements attendus (clients) */}
            {encAttendus && (
              <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <ArrowDownCircle size={18} className="text-emerald-400" />
                  <h4 className="text-base font-semibold text-text-primary">
                    Encaissements attendus
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle size={13} className="text-red-400" />
                      <span className="text-xs text-red-400 font-medium">
                        En retard
                      </span>
                    </div>
                    <p className="text-lg font-bold text-red-400">
                      {formatEur(encAttendus.overdueTotal)}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {encAttendus.overdueCount} facture
                      {encAttendus.overdueCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock size={13} className="text-emerald-400" />
                      <span className="text-xs text-emerald-400 font-medium">
                        À venir J+30
                      </span>
                    </div>
                    <p className="text-lg font-bold text-emerald-400">
                      {formatEur(encAttendus.upcomingTotal)}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {encAttendus.upcomingCount} facture
                      {encAttendus.upcomingCount > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {encAttendus.top5.length > 0 && (
                  <div>
                    <p className="text-xs text-text-secondary mb-2 font-medium">
                      Top 5 montants
                    </p>
                    <div className="space-y-1.5">
                      {encAttendus.top5.map((inv, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-white/[0.02]"
                        >
                          <span className="text-text-primary truncate max-w-[160px]">
                            {inv.customer_name || 'Client inconnu'}
                          </span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-text-secondary">
                              {inv.deadline
                                ? formatDeadline(inv.deadline)
                                : '—'}
                            </span>
                            <span className="font-bold text-emerald-400">
                              {formatEur(inv.amount_incl_tax || 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Décaissements attendus (fournisseurs) */}
            {decAttendus && (
              <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <ArrowUpCircle size={18} className="text-red-400" />
                  <h4 className="text-base font-semibold text-text-primary">
                    Décaissements attendus
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle size={13} className="text-red-400" />
                      <span className="text-xs text-red-400 font-medium">
                        En retard
                      </span>
                    </div>
                    <p className="text-lg font-bold text-red-400">
                      {formatEur(decAttendus.overdueTotal)}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {decAttendus.overdueCount} facture
                      {decAttendus.overdueCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock size={13} className="text-orange-400" />
                      <span className="text-xs text-orange-400 font-medium">
                        À venir J+30
                      </span>
                    </div>
                    <p className="text-lg font-bold text-orange-400">
                      {formatEur(decAttendus.upcomingTotal)}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {decAttendus.upcomingCount} facture
                      {decAttendus.upcomingCount > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {decAttendus.top5.length > 0 && (
                  <div>
                    <p className="text-xs text-text-secondary mb-2 font-medium">
                      Top 5 montants
                    </p>
                    <div className="space-y-1.5">
                      {decAttendus.top5.map((inv, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-white/[0.02]"
                        >
                          <span className="text-text-primary truncate max-w-[160px]">
                            {inv.supplier_name || 'Fournisseur inconnu'}
                          </span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-text-secondary">
                              {inv.deadline
                                ? formatDeadline(inv.deadline)
                                : '—'}
                            </span>
                            <span className="font-bold text-red-400">
                              {formatEur(inv.amount_incl_tax || 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Courbe d'évolution trésorerie 90j ── */}
      {evoData.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Évolution de la trésorerie — 90 jours
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evoData}>
                <defs>
                  <linearGradient
                    id="soldeGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" />
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
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
                  formatter={(value: number) => [formatEur(value), 'Trésorerie']}
                />
                <Area
                  type="monotone"
                  dataKey="solde"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#soldeGradient)"
                  dot={{ fill: '#10b981', r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
                      name === 'encaissements'
                        ? 'Encaissements'
                        : name === 'decaissements'
                          ? 'Décaissements'
                          : 'Solde cumulé',
                    ]}
                  />
                  <Legend
                    formatter={(value) =>
                      value === 'encaissements'
                        ? 'Encaissements'
                        : value === 'decaissements'
                          ? 'Décaissements'
                          : 'Solde cumulé'
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
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-4">
                      Semaine
                    </th>
                    <th className="text-right text-xs font-medium text-text-secondary px-6 py-4">
                      Encaissements
                    </th>
                    <th className="text-right text-xs font-medium text-text-secondary px-6 py-4">
                      Décaissements
                    </th>
                    <th className="text-right text-xs font-medium text-text-secondary px-6 py-4">
                      Net
                    </th>
                    <th className="text-right text-xs font-medium text-text-secondary px-6 py-4">
                      Solde cumulé
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyData.map((row, i) => {
                    const net = row.encaissements - row.decaissements;
                    return (
                      <tr
                        key={i}
                        className="border-b border-card-border/50 hover:bg-white/[0.02]"
                      >
                        <td className="px-6 py-4 text-sm text-text-primary">
                          {row.start} → {row.end}
                        </td>
                        <td className="px-6 py-4 text-sm text-emerald-400 text-right">
                          {row.encaissements > 0
                            ? `+${formatEur(row.encaissements)}`
                            : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-red-400 text-right">
                          {row.decaissements > 0
                            ? `-${formatEur(row.decaissements)}`
                            : '—'}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm text-right font-medium ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                        >
                          {net >= 0 ? '+' : ''}
                          {formatEur(net)}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm text-right font-bold ${row.solde >= 0 ? 'text-text-primary' : 'text-red-400'}`}
                        >
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
