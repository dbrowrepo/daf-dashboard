'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSociete } from '@/lib/societe-context';
import { Zap, AlertTriangle } from 'lucide-react';

type Freshness = 'fresh' | 'stale' | 'old';

function getFreshness(date: Date): Freshness {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  if (diffH < 24) return 'fresh';
  if (diffH < 72) return 'stale';
  return 'old';
}

const freshnessConfig: Record<
  Freshness,
  { dotClass: string; textClass: string; label: string }
> = {
  fresh: {
    dotClass: 'bg-emerald-400',
    textClass: 'text-emerald-400',
    label: 'À jour',
  },
  stale: {
    dotClass: 'bg-orange-400',
    textClass: 'text-orange-400',
    label: 'Données > 24h',
  },
  old: {
    dotClass: 'bg-red-400',
    textClass: 'text-red-400',
    label: 'Données > 72h',
  },
};

function formatFrenchDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }) +
    ' à ' +
    date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
}

export function DataFreshness() {
  const { selectedId } = useSociete();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLastUpdate = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('kpi_snapshots')
      .select('date_snapshot')
      .eq('societe_id', selectedId)
      .order('date_snapshot', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      setLastUpdate(new Date(data[0].date_snapshot));
    } else {
      setLastUpdate(null);
    }
    setLoading(false);
  }, [selectedId]);

  useEffect(() => {
    fetchLastUpdate();
  }, [fetchLastUpdate]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary animate-pulse">
        <div className="w-2 h-2 rounded-full bg-slate-500" />
        Chargement…
      </div>
    );
  }

  if (!lastUpdate) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary">
        <AlertTriangle size={13} className="text-slate-500" />
        Aucune donnée
      </div>
    );
  }

  const freshness = getFreshness(lastUpdate);
  const config = freshnessConfig[freshness];
  const Icon = freshness === 'fresh' ? Zap : AlertTriangle;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${
        freshness === 'fresh'
          ? 'bg-emerald-500/10 border-emerald-500/20'
          : freshness === 'stale'
            ? 'bg-orange-500/10 border-orange-500/20'
            : 'bg-red-500/10 border-red-500/20'
      }`}
    >
      <Icon size={13} className={config.textClass} />
      <span className={config.textClass + ' font-medium'}>{config.label}</span>
      <span className="text-text-secondary">
        Données au {formatFrenchDate(lastUpdate)}
      </span>
    </div>
  );
}
