import { createClient } from '@supabase/supabase-js';
import type {
  Societe,
  KpiSnapshot,
  PlCustomerInvoice,
  PlSupplierInvoice,
  PlBankTransaction,
  Alerte,
} from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Liste des sociétés */
export async function getSocietes(): Promise<Societe[]> {
  const { data } = await supabase.from('societes').select('*').order('nom');
  return data ?? [];
}

/** Dernier snapshot KPI de la société */
export async function getKpiSnapshot(
  societeId: string
): Promise<KpiSnapshot | null> {
  const { data } = await supabase
    .from('kpi_snapshots')
    .select('*')
    .eq('societe_id', societeId)
    .order('date_snapshot', { ascending: false })
    .limit(1)
    .single();
  return data;
}

/** Toutes les factures clients */
export async function getCustomerInvoices(
  societeId: string
): Promise<PlCustomerInvoice[]> {
  const { data } = await supabase
    .from('pl_customer_invoices')
    .select('*')
    .eq('societe_id', societeId)
    .order('date', { ascending: false });
  return data ?? [];
}

/** Toutes les factures fournisseurs */
export async function getSupplierInvoices(
  societeId: string
): Promise<PlSupplierInvoice[]> {
  const { data } = await supabase
    .from('pl_supplier_invoices')
    .select('*')
    .eq('societe_id', societeId)
    .order('date', { ascending: false });
  return data ?? [];
}

/** Dernières transactions bancaires (paginated si > 1000) */
export async function getTransactions(
  societeId: string,
  limit?: number
): Promise<PlBankTransaction[]> {
  let query = supabase
    .from('pl_bank_transactions')
    .select('*')
    .eq('societe_id', societeId)
    .order('date', { ascending: false });

  if (limit) {
    query = query.limit(limit);
    const { data } = await query;
    return data ?? [];
  }

  // Fetch all with pagination
  const all: PlBankTransaction[] = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data } = await supabase
      .from('pl_bank_transactions')
      .select('*')
      .eq('societe_id', societeId)
      .order('date', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

/** Alertes non résolues */
export async function getAlertes(societeId: string): Promise<Alerte[]> {
  const { data } = await supabase
    .from('alertes')
    .select('*')
    .eq('societe_id', societeId)
    .is('resolved_at', null)
    .order('created_at', { ascending: false });
  return data ?? [];
}
