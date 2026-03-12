export interface Societe {
  id: string;
  nom: string;
}

export interface KpiSnapshot {
  societe_id: string;
  date_snapshot: string;
  tresorerie: number;
  burn_mensuel: number;
  runway_mois: number;
  ca_mtd: number;
  charges_mtd: number;
  resultat_mtd: number;
  commentaire: string | null;
}

export interface Alerte {
  id?: string;
  societe_id: string;
  titre: string;
  description: string;
  niveau: 'haute' | 'moyenne' | 'basse';
  created_at: string;
}

export interface Action {
  id?: string;
  societe_id: string;
  titre: string;
  description: string;
  statut: 'todo' | 'in_progress' | 'done';
  priorite: 'haute' | 'moyenne' | 'basse';
  assignee: string;
  echeance: string;
}

export interface Tresorerie13Semaines {
  id?: string;
  societe_id: string;
  semaine_debut: string;
  semaine_fin: string;
  encaissements_prevus: number;
  decaissements_prevus: number;
  solde_prev: number;
}

export interface KpiMonthly {
  societe_id: string;
  mois: string;
  ca_mtd: number;
  charges_mtd: number;
  resultat_mtd: number;
  tresorerie: number;
  burn_mensuel: number;
  runway_mois: number;
  date_snapshot: string;
}

export interface PlCustomerInvoice {
  id?: string;
  societe_id: string;
  invoice_number: string;
  date: string;
  deadline: string;
  customer_name: string;
  amount_excl_tax: number;
  amount_incl_tax: number;
  status: string;
  currency: string;
  synced_at: string;
}

export interface PlSupplierInvoice {
  id?: string;
  societe_id: string;
  invoice_number: string;
  date: string;
  deadline: string;
  supplier_name: string;
  amount_excl_tax: number;
  amount_incl_tax: number;
  status: string | null;
  currency: string;
  synced_at: string;
}

export interface PlBankTransaction {
  id?: string;
  societe_id: string;
  date: string;
  label: string;
  amount: number;
  currency: string;
  bank_account_id: string;
  bank_account_name: string;
  synced_at: string;
}
