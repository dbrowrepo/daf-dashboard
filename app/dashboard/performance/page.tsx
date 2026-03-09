'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSociete } from '@/lib/societe-context';
import { KpiSnapshot } from '@/lib/types';
import { formatEur } from '@/lib/utils';
import { Loading, EmptyState } from '@/components/loading';
import { Modal } from '@/components/modal';
import { TrendingUp, TrendingDown, ArrowRight, Plus } from 'lucide-react';

export default function PerformancePage() {
  const { selectedId } = useSociete();
  const [snapshots, setSnapshots] = useState<KpiSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    tresorerie: '',
    burn_mensuel: '',
    runway_mois: '',
    ca_mtd: '',
    charges_mtd: '',
    resultat_mtd: '',
    commentaire: '',
  });

  const fetchData = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    const { data } = await supabase
      .from('kpi_snapshots')
      .select('*')
      .eq('societe_id', selectedId)
      .order('date_snapshot', { ascending: false })
      .limit(2);
    if (data) setSnapshots(data);
    setLoading(false);
  }, [selectedId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('kpi_snapshots').insert({
      societe_id: selectedId,
      date_snapshot: new Date().toISOString().split('T')[0],
      tresorerie: parseFloat(form.tresorerie),
      burn_mensuel: parseFloat(form.burn_mensuel),
      runway_mois: parseFloat(form.runway_mois),
      ca_mtd: parseFloat(form.ca_mtd),
      charges_mtd: parseFloat(form.charges_mtd),
      resultat_mtd: parseFloat(form.resultat_mtd),
      commentaire: form.commentaire || null,
    });
    setModalOpen(false);
    setForm({
      tresorerie: '',
      burn_mensuel: '',
      runway_mois: '',
      ca_mtd: '',
      charges_mtd: '',
      resultat_mtd: '',
      commentaire: '',
    });
    fetchData();
  }

  const current = snapshots[0] || null;
  const previous = snapshots[1] || null;

  function variation(currentVal: number, previousVal: number | undefined) {
    if (!previousVal || previousVal === 0) return null;
    return ((currentVal - previousVal) / Math.abs(previousVal)) * 100;
  }

  if (loading) return <Loading />;

  if (!current) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-text-primary">Performance</h2>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} />
            Nouveau snapshot
          </button>
        </div>
        <EmptyState message="Aucune donnée disponible" />
        <SnapshotModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
        />
      </div>
    );
  }

  const caVar = variation(current.ca_mtd, previous?.ca_mtd);
  const chargesVar = variation(current.charges_mtd, previous?.charges_mtd);
  const resultatVar = variation(current.resultat_mtd, previous?.resultat_mtd);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-primary">Performance</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Plus size={16} />
          Nouveau snapshot
        </button>
      </div>

      {/* 3 cartes performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PerformanceCard
          title="CA du mois"
          value={formatEur(current.ca_mtd)}
          variation={caVar}
          positive={true}
        />
        <PerformanceCard
          title="Charges du mois"
          value={formatEur(current.charges_mtd)}
          variation={chargesVar}
          positive={false}
        />
        <PerformanceCard
          title="Résultat du mois"
          value={formatEur(current.resultat_mtd)}
          variation={resultatVar}
          positive={current.resultat_mtd >= 0}
        />
      </div>

      {/* Commentaire */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-3">
          Commentaire du mois
        </h3>
        <p className="text-text-secondary text-sm leading-relaxed">
          {current.commentaire || 'Aucun commentaire pour ce snapshot.'}
        </p>
        <p className="text-xs text-text-secondary mt-4">
          Snapshot du{' '}
          {new Intl.DateTimeFormat('fr-FR').format(
            new Date(current.date_snapshot)
          )}
        </p>
      </div>

      <SnapshotModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function PerformanceCard({
  title,
  value,
  variation,
  positive,
}: {
  title: string;
  value: string;
  variation: number | null;
  positive: boolean;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-6">
      <p className="text-sm text-text-secondary font-medium mb-2">{title}</p>
      <p
        className={`text-2xl font-bold ${positive ? 'text-emerald-400' : 'text-red-400'}`}
      >
        {value}
      </p>
      {variation !== null && (
        <div className="flex items-center gap-1 mt-2">
          {variation >= 0 ? (
            <TrendingUp size={14} className="text-emerald-400" />
          ) : (
            <TrendingDown size={14} className="text-red-400" />
          )}
          <span
            className={`text-xs font-medium ${variation >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {variation >= 0 ? '+' : ''}
            {variation.toFixed(1)}% vs précédent
          </span>
        </div>
      )}
    </div>
  );
}

function SnapshotModal({
  open,
  onClose,
  form,
  setForm,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  form: { tresorerie: string; burn_mensuel: string; runway_mois: string; ca_mtd: string; charges_mtd: string; resultat_mtd: string; commentaire: string };
  setForm: React.Dispatch<React.SetStateAction<{ tresorerie: string; burn_mensuel: string; runway_mois: string; ca_mtd: string; charges_mtd: string; resultat_mtd: string; commentaire: string }>>;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const fields = [
    { key: 'tresorerie', label: 'Trésorerie (€)' },
    { key: 'burn_mensuel', label: 'Burn mensuel (€)' },
    { key: 'runway_mois', label: 'Runway (mois)' },
    { key: 'ca_mtd', label: 'CA du mois (€)' },
    { key: 'charges_mtd', label: 'Charges du mois (€)' },
    { key: 'resultat_mtd', label: 'Résultat du mois (€)' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Nouveau snapshot KPI">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm text-text-secondary mb-1">
                {label}
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          ))}
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">
            Commentaire
          </label>
          <textarea
            rows={3}
            value={form.commentaire}
            onChange={(e) => setForm({ ...form, commentaire: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          Enregistrer le snapshot
        </button>
      </form>
    </Modal>
  );
}
