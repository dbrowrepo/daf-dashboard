'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSociete } from '@/lib/societe-context';
import { PlCustomerInvoice, PlSupplierInvoice } from '@/lib/types';
import { formatEur, formatDate } from '@/lib/utils';
import { Loading, EmptyState } from '@/components/loading';

type Tab = 'clients' | 'fournisseurs';

export default function FacturesPage() {
  const { selectedId } = useSociete();
  const [tab, setTab] = useState<Tab>('clients');
  const [customerInvoices, setCustomerInvoices] = useState<PlCustomerInvoice[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<PlSupplierInvoice[]>([]);
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

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-text-primary">
        Factures & Échéances
      </h2>

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
          Clients
        </button>
        <button
          onClick={() => setTab('fournisseurs')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'fournisseurs'
              ? 'bg-accent text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Fournisseurs
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
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-4">
                      Client
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-4">
                      N° Facture
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-4">
                      Date
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-4">
                      Échéance
                    </th>
                    <th className="text-right text-xs font-medium text-text-secondary px-6 py-4">
                      Montant TTC
                    </th>
                    <th className="text-center text-xs font-medium text-text-secondary px-6 py-4">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customerInvoices.map((inv, i) => (
                    <tr
                      key={i}
                      className="border-b border-card-border/50 hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4 text-sm text-text-primary">
                        {inv.customer_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {inv.invoice_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {formatDate(inv.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {formatDate(inv.deadline)}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-primary font-medium text-right">
                        {formatEur(inv.amount_incl_tax)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
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
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-4">
                      Fournisseur
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-4">
                      N° Facture
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-4">
                      Date
                    </th>
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-4">
                      Échéance
                    </th>
                    <th className="text-right text-xs font-medium text-text-secondary px-6 py-4">
                      Montant TTC
                    </th>
                    <th className="text-center text-xs font-medium text-text-secondary px-6 py-4">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {supplierInvoices.map((inv, i) => (
                    <tr
                      key={i}
                      className="border-b border-card-border/50 hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4 text-sm text-text-primary">
                        {inv.supplier_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {inv.invoice_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {formatDate(inv.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {formatDate(inv.deadline)}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-primary font-medium text-right">
                        {formatEur(inv.amount_incl_tax)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    posted: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    draft: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const labels: Record<string, string> = {
    paid: 'Payée',
    posted: 'Émise',
    draft: 'Brouillon',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.draft}`}
    >
      {labels[status] || status}
    </span>
  );
}
