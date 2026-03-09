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
  niveau: 'haute' | 'moyenne' | 'info';
  created_at: string;
}

export interface Action {
  id?: string;
  societe_id: string;
  titre: string;
  description: string;
  statut: 'à faire' | 'en cours' | 'fait';
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

export interface PlCustomerInvoice {
  id?: string;
  societe_id: string;
  invoice_number: string;
  date: string;
  deadline: string;
  customer_name: string;
  amount_incl_tax: number;
  status: 'paid' | 'posted' | 'draft';
}

export interface PlSupplierInvoice {
  id?: string;
  societe_id: string;
  invoice_number: string;
  date: string;
  deadline: string;
  supplier_name: string;
  amount_incl_tax: number;
  status: 'paid' | 'posted' | 'draft';
}

export interface PlBankTransaction {
  id?: string;
  societe_id: string;
  date: string;
  label: string;
  amount: number;
  bank_account_name: string;
}
