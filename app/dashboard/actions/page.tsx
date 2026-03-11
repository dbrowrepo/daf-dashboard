'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSociete } from '@/lib/societe-context';
import { Action } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { Loading, EmptyState } from '@/components/loading';
import { Modal } from '@/components/modal';
import { Plus, ClipboardList } from 'lucide-react';

const PRIORITY_ORDER: Record<string, number> = {
  haute: 0,
  moyenne: 1,
  basse: 2,
};

function sortActions(actions: Action[]): Action[] {
  return [...actions].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priorite] ?? 9;
    const pb = PRIORITY_ORDER[b.priorite] ?? 9;
    if (pa !== pb) return pa - pb;
    if (!a.echeance) return 1;
    if (!b.echeance) return -1;
    return a.echeance.localeCompare(b.echeance);
  });
}

export default function ActionsPage() {
  const { selectedId } = useSociete();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    titre: '',
    description: '',
    statut: 'todo' as Action['statut'],
    priorite: 'moyenne' as Action['priorite'],
    assignee: '',
    echeance: '',
  });

  const fetchData = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    const { data } = await supabase
      .from('actions')
      .select('*')
      .eq('societe_id', selectedId);
    if (data) setActions(sortActions(data));
    setLoading(false);
  }, [selectedId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('actions').insert({
      societe_id: selectedId,
      titre: form.titre,
      description: form.description,
      statut: form.statut,
      priorite: form.priorite,
      assignee: form.assignee,
      echeance: form.echeance || null,
    });
    setModalOpen(false);
    setForm({
      titre: '',
      description: '',
      statut: 'todo',
      priorite: 'moyenne',
      assignee: '',
      echeance: '',
    });
    fetchData();
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/20 rounded-lg">
            <ClipboardList className="text-accent" size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-primary">
              Plan d&apos;action
            </h2>
            <p className="text-sm text-text-secondary">
              {actions.length} action{actions.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Plus size={16} />
          Ajouter une action
        </button>
      </div>

      {/* Tableau */}
      {actions.length === 0 ? (
        <EmptyState message="Aucune action pour cette société" />
      ) : (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border bg-white/[0.02]">
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">
                    Titre
                  </th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">
                    Description
                  </th>
                  <th className="text-center px-4 py-3 text-text-secondary font-medium">
                    Statut
                  </th>
                  <th className="text-center px-4 py-3 text-text-secondary font-medium">
                    Priorité
                  </th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">
                    Assigné
                  </th>
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">
                    Échéance
                  </th>
                </tr>
              </thead>
              <tbody>
                {actions.map((action, i) => {
                  const isOverdue =
                    action.echeance &&
                    action.statut !== 'done' &&
                    new Date(action.echeance) < new Date();
                  return (
                    <tr
                      key={action.id ?? i}
                      className="border-b border-card-border last:border-b-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 text-text-primary font-medium max-w-[200px]">
                        {action.titre}
                      </td>
                      <td className="px-4 py-3 text-text-secondary max-w-[280px] truncate">
                        {action.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatutBadge statut={action.statut} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <PrioriteBadge priorite={action.priorite} />
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {action.assignee || '—'}
                      </td>
                      <td
                        className={`px-4 py-3 ${isOverdue ? 'text-red-400 font-medium' : 'text-text-secondary'}`}
                      >
                        {action.echeance ? formatDate(action.echeance) : '—'}
                        {isOverdue && (
                          <span className="ml-1 text-[10px] text-red-400">
                            En retard
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal formulaire */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ajouter une action"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Titre *
            </label>
            <input
              type="text"
              required
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              placeholder="Ex: Relancer le client Dupont"
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
              placeholder="Détails complémentaires..."
              className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Statut
              </label>
              <select
                value={form.statut}
                onChange={(e) =>
                  setForm({
                    ...form,
                    statut: e.target.value as Action['statut'],
                  })
                }
                className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="todo">À faire</option>
                <option value="in_progress">En cours</option>
                <option value="done">Fait</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Priorité
              </label>
              <select
                value={form.priorite}
                onChange={(e) =>
                  setForm({ ...form, priorite: e.target.value as Action['priorite'] })
                }
                className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="haute">Haute</option>
                <option value="moyenne">Moyenne</option>
                <option value="basse">Basse</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Assigné à *
              </label>
              <input
                type="text"
                required
                value={form.assignee}
                onChange={(e) =>
                  setForm({ ...form, assignee: e.target.value })
                }
                placeholder="Nom ou initiales"
                className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Échéance
              </label>
              <input
                type="date"
                value={form.echeance}
                onChange={(e) =>
                  setForm({ ...form, echeance: e.target.value })
                }
                className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
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

/* ── Badges ── */

function StatutBadge({ statut }: { statut: string }) {
  const config: Record<string, { style: string; label: string }> = {
    todo: {
      style: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      label: 'À faire',
    },
    in_progress: {
      style: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      label: 'En cours',
    },
    done: {
      style: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      label: 'Fait',
    },
  };
  const c = config[statut] || config.todo;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.style}`}
    >
      {c.label}
    </span>
  );
}

function PrioriteBadge({ priorite }: { priorite: string }) {
  const config: Record<string, { style: string; label: string }> = {
    haute: {
      style: 'bg-red-500/20 text-red-400 border-red-500/30',
      label: 'Haute',
    },
    moyenne: {
      style: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      label: 'Moyenne',
    },
    basse: {
      style: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      label: 'Basse',
    },
  };
  const c = config[priorite] || config.basse;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.style}`}
    >
      {c.label}
    </span>
  );
}
