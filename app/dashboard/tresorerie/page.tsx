'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSociete } from '@/lib/societe-context';
import { Tresorerie13Semaines } from '@/lib/types';
import { formatEur, formatDate } from '@/lib/utils';
import { Loading, EmptyState } from '@/components/loading';
import { Modal } from '@/components/modal';
import { Plus } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function TresoreriePage() {
  const { selectedId } = useSociete();
  const [data, setData] = useState<Tresorerie13Semaines[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    semaine_debut: '',
    semaine_fin: '',
    encaissements_prevus: '',
    decaissements_prevus: '',
    solde_prev: '',
  });

  const fetchData = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    const { data } = await supabase
      .from('tresorerie_13_semaines')
      .select('*')
      .eq('societe_id', selectedId)
      .order('semaine_debut', { ascending: true });
    if (data) setData(data);
    setLoading(false);
  }, [selectedId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('tresorerie_13_semaines').insert({
      societe_id: selectedId,
      semaine_debut: form.semaine_debut,
      semaine_fin: form.semaine_fin,
      encaissements_prevus: parseFloat(form.encaissements_prevus),
      decaissements_prevus: parseFloat(form.decaissements_prevus),
      solde_prev: parseFloat(form.solde_prev),
    });
    setModalOpen(false);
    setForm({
      semaine_debut: '',
      semaine_fin: '',
      encaissements_prevus: '',
      decaissements_prevus: '',
      solde_prev: '',
    });
    fetchData();
  }

  const chartData = data.map((d) => ({
    name: formatDate(d.semaine_debut),
    solde: d.solde_prev,
    encaissements: d.encaissements_prevus,
    decaissements: d.decaissements_prevus,
  }));

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-primary">
          Trésorerie prévisionnelle
        </h2>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Plus size={16} />
          Ajouter une semaine
        </button>
      </div>

      {data.length === 0 ? (
        <EmptyState message="Aucune donnée disponible" />
      ) : (
        <>
          {/* Graphique */}
          <div className="bg-card border border-card-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Évolution du solde prévisionnel (13 semaines)
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
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
                    formatter={(value: number) => formatEur(value)}
                  />
                  <Line
                    type="monotone"
                    dataKey="solde"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    name="Solde prévu"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tableau */}
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
                      Solde prévu
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-card-border/50 hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4 text-sm text-text-primary">
                        {formatDate(row.semaine_debut)} →{' '}
                        {formatDate(row.semaine_fin)}
                      </td>
                      <td className="px-6 py-4 text-sm text-emerald-400 text-right">
                        {formatEur(row.encaissements_prevus)}
                      </td>
                      <td className="px-6 py-4 text-sm text-red-400 text-right">
                        {formatEur(row.decaissements_prevus)}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-primary font-medium text-right">
                        {formatEur(row.solde_prev)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Ajouter */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ajouter une semaine"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Début de semaine
              </label>
              <input
                type="date"
                required
                value={form.semaine_debut}
                onChange={(e) =>
                  setForm({ ...form, semaine_debut: e.target.value })
                }
                className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Fin de semaine
              </label>
              <input
                type="date"
                required
                value={form.semaine_fin}
                onChange={(e) =>
                  setForm({ ...form, semaine_fin: e.target.value })
                }
                className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Encaissements prévus (€)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={form.encaissements_prevus}
              onChange={(e) =>
                setForm({ ...form, encaissements_prevus: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Décaissements prévus (€)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={form.decaissements_prevus}
              onChange={(e) =>
                setForm({ ...form, decaissements_prevus: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Solde prévisionnel (€)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={form.solde_prev}
              onChange={(e) =>
                setForm({ ...form, solde_prev: e.target.value })
              }
              className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            Ajouter
          </button>
        </form>
      </Modal>
    </div>
  );
}
