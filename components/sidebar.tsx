'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSociete } from '@/lib/societe-context';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  FileText,
  ListChecks,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Accueil', icon: LayoutDashboard },
  { href: '/dashboard/tresorerie', label: 'Trésorerie', icon: Wallet },
  { href: '/dashboard/performance', label: 'Performance', icon: TrendingUp },
  { href: '/dashboard/factures', label: 'Factures', icon: FileText },
  { href: '/dashboard/actions', label: 'Plan d\'action', icon: ListChecks },
];

export function Sidebar() {
  const pathname = usePathname();
  const { societes, selectedId, setSelectedId, loading } = useSociete();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedSociete = societes.find((s) => s.id === selectedId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-card-border flex flex-col z-50">
      <div className="p-6 border-b border-card-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-lg">
            D
          </div>
          <div>
            <h1 className="font-semibold text-text-primary text-lg">DAF Externe</h1>
            <p className="text-xs text-text-secondary">Tableau de bord</p>
          </div>
        </div>
      </div>

      {/* Sélecteur de société */}
      <div className="px-4 pt-4" ref={dropdownRef}>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 bg-background border border-card-border rounded-lg text-sm hover:border-accent/50 transition-colors"
          >
            <Building2 size={16} className="text-accent shrink-0" />
            <span className="text-text-primary truncate flex-1 text-left">
              {loading ? 'Chargement…' : selectedSociete?.nom || 'Sélectionner'}
            </span>
            <ChevronDown
              size={14}
              className={`text-text-secondary shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {dropdownOpen && societes.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-card-border rounded-lg shadow-xl overflow-hidden z-10">
              {societes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedId(s.id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                    s.id === selectedId
                      ? 'bg-accent/10 text-accent'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${s.id === selectedId ? 'bg-accent' : 'bg-transparent'}`} />
                  {s.nom}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <div className="relative">
                <Icon size={20} />
                {isActive && (
                  <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-accent rounded-full" />
                )}
              </div>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-card-border">
        <p className="text-xs text-text-secondary text-center">
          DAF Dashboard v1.0
        </p>
      </div>
    </aside>
  );
}
