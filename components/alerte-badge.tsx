interface AlerteBadgeProps {
  niveau: 'haute' | 'moyenne' | 'info';
}

const badgeStyles = {
  haute: 'bg-red-500/20 text-red-400 border-red-500/30',
  moyenne: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const badgeLabels = {
  haute: 'Haute',
  moyenne: 'Moyenne',
  info: 'Info',
};

export function AlerteBadge({ niveau }: AlerteBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyles[niveau]}`}
    >
      {badgeLabels[niveau]}
    </span>
  );
}
