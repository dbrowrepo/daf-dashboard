'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSociete } from '@/lib/societe-context';
import { Action } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { Loading, EmptyState } from '@/components/loading';
import { Modal } from '@/components/modal';
import { Plus, User, Calendar } from 'lucide-react';

type Filter = 'tous' | 'à faire' | 'en cours' | 'fait';

export default function ActionsPage() {
  const { selectedId } = useSociete();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('tous');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    titre: '',
    description: '',
    assignee: '',
    echeance: '',
    priorite: 'moyenne',
  });

  const fetchData = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    const { data } = await supabase
      .from('actions')
      .select('*')
      .eq('societe_id', selectedId)
      .order('priorite', { ascending: true });
    if (data) setActions(data);
    setLoading(false);
  }, [selectedId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function toggleStatut(action: Action) {
    const nextStatut: Record<string, string> = {
      'à faire': 'en cours',
      'en cours': 'fait',
      fait: 'à faire',
    };
    await supabase
      .from('actions')
      .update({ statut: nextStatut[action.statut] })
      .eq('id', action.id);
    fetchData();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('actions').insert({
      societe_id: selectedId,
      titre: form.titre,
      description: form.description,
      assignee: form.assignee,
      echeance: form.echeance,
      priorite: form.priorite,
      statut: 'à faire',
    });
    setModalOpen(false);
    setForm({
      titre: '',
      description: '',
      assignee: '',
      echeance: '',
      priorite: 'moyenne',
    });
    fetchData();
  }

  const filtered =
    filter === 'tous'
      ? actions
      : actions.filter((a) => a.statut === filter);

  const filters: { value: Filter; label: string }[] = [
    { value: 'tous', label: 'Tous' },
    { value: 'à faire', label: 'À faire' },
    { value: 'en cours', label: 'En cours' },
    { value: 'fait', label: 'Fait' },
  ];

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-primary">
          Plan d&apos;action
        </h2>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Plus size={16} />
          Nouvelle action
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-1 bg-card border border-card-border rounded-lg p-1 w-fit">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Actions */}
      {filtered.length === 0 ? (
        <EmptyState message="Aucune action" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((action, i) => (
            <div
              key={i}
              onClick={() => toggleStatut(action)}
              className="bg-card border border-card-border rounded-xl p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-sm font-semibold text-text-primary flex-1 mr-2">
                  {action.titre}
                </h4>
                <div className="flex gap-2">
                  <PrioriteBadge priorite={action.priorite} />
                  <StatutBadge statut={action.statut} />
                </div>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                {action.description}
              </p>
              <div className="flex items-center gap-4 text-xs text-text-secondary">
                <span className="flex items-center gap-1">
                  <User size={12} />
                  {action.assignee}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDate(action.echeance)}
                </span>
              </div>
              <p className="text-[10px] text-text-secondary mt-2 opacity-60">
                Cliquer pour changer le statut
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouvelle action"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Titre
            </label>
            <input
              type="text"
              required
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Assigné à
              </label>
              <input
                type="text"
                required
                value={form.assignee}
                onChange={(e) =>
                  setForm({ ...form, assignee: e.target.value })
                }
                className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Échéance
              </label>
              <input
                type="date"
                required
                value={form.echeance}
                onChange={(e) =>
                  setForm({ ...form, echeance: e.target.value })
                }
                className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Priorité
            </label>
            <select
              value={form.priorite}
              onChange={(e) =>
                setForm({ ...form, priorite: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="haute">Haute</option>
              <option value="moyenne">Moyenne</option>
              <option value="basse">Basse</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            Créer l&apos;action
          </button>
        </form>
      </Modal>
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
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[priorite] || styles.basse}`}
    >
      {priorite}
    </span>
  );
}

function StatutBadge({ statut }: { statut: string }) {
  const styles: Record<string, string> = {
    'à faire': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    'en cours': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    fait: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[statut] || styles['à faire']}`}
    >
      {statut}
    </span>
  );
}
