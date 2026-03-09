'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { KpiSnapshot, Alerte, Action } from '@/lib/types';
import { formatEur } from '@/lib/utils';
import { KpiCard } from '@/components/kpi-card';
import { AlerteBadge } from '@/components/alerte-badge';
import { Loading, EmptyState } from '@/components/loading';
import { Wallet, Clock, TrendingUp, BarChart3 } from 'lucide-react';

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState<KpiSnapshot | null>(null);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [snapshotRes, alertesRes, actionsRes] = await Promise.all([
        supabase
          .from('kpi_snapshots')
          .select('*')
          .order('date_snapshot', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('alertes')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('actions')
          .select('*')
          .neq('statut', 'fait')
          .order('priorite', { ascending: true }),
      ]);

      if (snapshotRes.data) setSnapshot(snapshotRes.data);
      if (alertesRes.data) setAlertes(alertesRes.data);
      if (actionsRes.data) setActions(actionsRes.data);
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-text-primary">Tableau de bord</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Trésorerie"
          value={snapshot ? formatEur(snapshot.tresorerie) : '—'}
          icon={Wallet}
        />
        <KpiCard
          title="Autonomie"
          value={snapshot ? `${snapshot.runway_mois} mois` : '—'}
          icon={Clock}
        />
        <KpiCard
          title="CA du mois"
          value={snapshot ? formatEur(snapshot.ca_mtd) : '—'}
          icon={TrendingUp}
        />
        <KpiCard
          title="Résultat MTD"
          value={snapshot ? formatEur(snapshot.resultat_mtd) : '—'}
          icon={BarChart3}
          variant={
            snapshot
              ? snapshot.resultat_mtd >= 0
                ? 'positive'
                : 'negative'
              : 'default'
          }
        />
      </div>

      {/* Alertes + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertes */}
        <div className="bg-card border border-card-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Alertes ouvertes
          </h3>
          {alertes.length === 0 ? (
            <EmptyState message="Aucune alerte" />
          ) : (
            <div className="space-y-3">
              {alertes.map((alerte, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between p-3 rounded-lg bg-background/50"
                >
                  <div className="flex-1 mr-3">
                    <p className="text-sm font-medium text-text-primary">
                      {alerte.titre}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      {alerte.description}
                    </p>
                  </div>
                  <AlerteBadge niveau={alerte.niveau} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions prioritaires */}
        <div className="bg-card border border-card-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Actions prioritaires
          </h3>
          {actions.length === 0 ? (
            <EmptyState message="Aucune action en cours" />
          ) : (
            <div className="space-y-3">
              {actions.map((action, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between p-3 rounded-lg bg-background/50"
                >
                  <div className="flex-1 mr-3">
                    <p className="text-sm font-medium text-text-primary">
                      {action.titre}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      {action.assignee} · Échéance :{' '}
                      {new Intl.DateTimeFormat('fr-FR').format(
                        new Date(action.echeance)
                      )}
                    </p>
                  </div>
                  <PrioriteBadge priorite={action.priorite} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PrioriteBadge({ priorite }: { priorite: string }) {
  const styles: Record<string, string> = {
    haute: 'bg-red-500/20 text-red-400 border-red-500/30',
    moyenne: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    basse: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[priorite] || styles.basse}`}
    >
      {priorite}
    </span>
  );
}
