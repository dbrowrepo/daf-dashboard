import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  variation?: number | null;
  variant?: 'default' | 'positive' | 'negative';
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  variation,
  variant = 'default',
}: KpiCardProps) {
  const valueColor =
    variant === 'positive'
      ? 'text-emerald-400'
      : variant === 'negative'
        ? 'text-red-400'
        : 'text-text-primary';

  return (
    <div className="bg-card border border-card-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-text-secondary text-sm font-medium">{title}</span>
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <Icon size={20} className="text-accent" />
        </div>
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      {variation !== undefined && variation !== null && (
        <div className="flex items-center gap-1 mt-2">
          {variation >= 0 ? (
            <TrendingUp size={13} className="text-emerald-400" />
          ) : (
            <TrendingDown size={13} className="text-red-400" />
          )}
          <span
            className={`text-xs font-medium ${variation >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {variation >= 0 ? '+' : ''}
            {variation.toFixed(1)}% vs mois préc.
          </span>
        </div>
      )}
      {trend && !variation && (
        <p className="text-xs text-text-secondary mt-2">{trend}</p>
      )}
    </div>
  );
}
