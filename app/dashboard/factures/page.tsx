'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSociete } from '@/lib/societe-context';
import { formatEur, formatDate } from '@/lib/utils';
import { Loading, EmptyState } from '@/components/loading';
import { AlertTriangle, FileText } from 'lucide-react';

type Tab = 'clients' | 'fournisseurs';

const PAID_STATUSES = ['paid', 'cancelled'];

function isUnpaid(inv: { status: string | null }) {
  return inv.status !== null && !PAID_STATUSES.includes(inv.status);
}

export default function FacturesPage() {
  const { selectedId } = useSociete();
  const [tab, setTab] = useState<Tab>('clients');
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedId) return;
    async function fetchData() {
      setLoading(true);
      const [customersRes, suppliersRes] = await Promise.all([
        supabase
          .from('pl_customer_invoices')
          .select('*')
          .eq('societe_id', selectedId)
          .order('deadline', { ascending: true }),
        supabase
          .from('pl_supplier_invoices')
          .select('*')
          .eq('societe_id', selectedId)
          .order('deadline', { ascending: true }),
      ]);

      if (customersRes.data) setCustomerInvoices(customersRes.data);
      if (suppliersRes.data) setSupplierInvoices(suppliersRes.data);
      setLoading(false);
    }

    fetchData();
  }, [selectedId]);

  const unpaidClientsList = customerInvoices.filter(isUnpaid);
  const unpaidClients = unpaidClientsList.reduce((sum, inv) => sum + (inv.amount_incl_tax || 0), 0);
  const unpaidClientsCount = unpaidClientsList.length;

  const unpaidSuppliersList = supplierInvoices.filter(isUnpaid);
  const unpaidSuppliers = unpaidSuppliersList.reduce((sum, inv) => sum + (inv.amount_incl_tax || 0), 0);
  const unpaidSuppliersCount = unpaidSuppliersList.length;
  const hasSupplierStatus = supplierInvoices.some((inv) => inv.status !== null);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-text-primary">
        Factures & Échéances
      </h2>

      {/* Totaux impayés */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <AlertTriangle size={20} className="text-orange-400" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Impayés clients</p>
            <p className="text-xl font-bold text-orange-400">
              {formatEur(unpaidClients)}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              {unpaidClientsCount} facture{unpaidClientsCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-5 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasSupplierStatus ? 'bg-red-500/10' : 'bg-slate-500/10'}`}>
            <FileText size={20} className={hasSupplierStatus ? 'text-red-400' : 'text-slate-400'} />
          </div>
          <div>
            <p className="text-sm text-text-secondary">
              {hasSupplierStatus ? 'Impayés fournisseurs' : 'Total fournisseurs TTC'}
            </p>
            <p className={`text-xl font-bold ${hasSupplierStatus ? 'text-red-400' : 'text-text-primary'}`}>
              {formatEur(hasSupplierStatus ? unpaidSuppliers : supplierInvoices.reduce((s, inv) => s + (inv.amount_incl_tax || 0), 0))}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              {hasSupplierStatus
                ? `${unpaidSuppliersCount} facture${unpaidSuppliersCount > 1 ? 's' : ''}`
                : `${supplierInvoices.length} facture${supplierInvoices.length > 1 ? 's' : ''} · statut indisponible`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-card border border-card-border rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('clients')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'clients'
              ? 'bg-accent text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Clients ({customerInvoices.length})
        </button>
        <button
          onClick={() => setTab('fournisseurs')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'fournisseurs'
              ? 'bg-accent text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Fournisseurs ({supplierInvoices.length})
        </button>
      </div>

      {/* Tableau Clients */}
      {tab === 'clients' && (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          {customerInvoices.length === 0 ? (
            <EmptyState message="Aucune facture client" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-card-border">
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-4">Client</th>
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-4">N° Facture</th>
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-4">Date</th>
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-4">Échéance</th>
                    <th className="text-right text-xs font-medium text-text-secondary px-6 py-4">Montant HT</th>
                    <th className="text-right text-xs font-medium text-text-secondary px-6 py-4">Montant TTC</th>
                    <th className="text-center text-xs font-medium text-text-secondary px-6 py-4">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {customerInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-card-border/50 hover:bg-white/[0.02]">
                      <td className="px-6 py-4 text-sm text-text-primary">
                        {inv.customer_name || <span className="text-text-secondary italic">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">{inv.invoice_number}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary">{formatDate(inv.date)}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary">{formatDate(inv.deadline)}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary text-right">{formatEur(inv.amount_excl_tax || 0)}</td>
                      <td className="px-6 py-4 text-sm text-text-primary font-medium text-right">{formatEur(inv.amount_incl_tax || 0)}</td>
                      <td className="px-6 py-4 text-center"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tableau Fournisseurs */}
      {tab === 'fournisseurs' && (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          {supplierInvoices.length === 0 ? (
            <EmptyState message="Aucune facture fournisseur" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-card-border">
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-4">Fournisseur</th>
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-4">N° Facture</th>
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-4">Date</th>
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-4">Échéance</th>
                    <th className="text-right text-xs font-medium text-text-secondary px-6 py-4">Montant HT</th>
                    <th className="text-right text-xs font-medium text-text-secondary px-6 py-4">Montant TTC</th>
                    <th className="text-center text-xs font-medium text-text-secondary px-6 py-4">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-card-border/50 hover:bg-white/[0.02]">
                      <td className="px-6 py-4 text-sm text-text-primary">
                        {inv.supplier_name || <span className="text-text-secondary italic">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">{inv.invoice_number}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary">{formatDate(inv.date)}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary">{formatDate(inv.deadline)}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary text-right">{formatEur(inv.amount_excl_tax || 0)}</td>
                      <td className="px-6 py-4 text-sm text-text-primary font-medium text-right">{formatEur(inv.amount_incl_tax || 0)}</td>
                      <td className="px-6 py-4 text-center"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const styles: Record<string, string> = {
    paid: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    posted: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    pending: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    late: 'bg-red-500/20 text-red-400 border-red-500/30',
    overdue: 'bg-red-500/20 text-red-400 border-red-500/30',
    partially_paid: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
    draft: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    archived: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const labels: Record<string, string> = {
    paid: 'Payée',
    posted: 'Émise',
    pending: 'En attente',
    late: 'En retard',
    overdue: 'En retard',
    partially_paid: 'Partiel',
    cancelled: 'Annulée',
    draft: 'Brouillon',
    archived: 'Archivée',
  };

  if (!status) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-orange-500/20 text-orange-400 border-orange-500/30">
        Non traitée
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.draft}`}
    >
      {labels[status] || status}
    </span>
  );
}
