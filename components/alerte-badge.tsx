interface AlerteBadgeProps {
  niveau: 'haute' | 'moyenne' | 'basse';
}

const badgeStyles: Record<string, string> = {
  haute: 'bg-red-500/20 text-red-400 border-red-500/30',
  moyenne: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  basse: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const badgeLabels: Record<string, string> = {
  haute: 'Haute',
  moyenne: 'Moyenne',
  basse: 'Basse',
};

export function AlerteBadge({ niveau }: AlerteBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyles[niveau] || badgeStyles.basse}`}
    >
      {badgeLabels[niveau] || niveau}
    </span>
  );
}
