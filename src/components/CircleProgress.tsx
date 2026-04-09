import { motion } from 'framer-motion';

interface CircleProgressProps {
  value: number;
  label: string;
  color: 'primary' | 'secondary' | 'accent' | 'warning';
}

const colorMap = {
  primary: { stroke: 'hsl(160 84% 39%)', glow: 'hsl(160 84% 39% / 0.3)' },
  secondary: { stroke: 'hsl(230 70% 60%)', glow: 'hsl(230 70% 60% / 0.3)' },
  accent: { stroke: 'hsl(350 80% 55%)', glow: 'hsl(350 80% 55% / 0.3)' },
  warning: { stroke: 'hsl(38 92% 50%)', glow: 'hsl(38 92% 50% / 0.3)' },
};

const CircleProgress = ({ value, label, color }: CircleProgressProps) => {
  const size = 120;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  const c = colorMap[color];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={c.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${c.glow})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className="font-display text-2xl font-bold text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {Math.round(value)}%
          </motion.span>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground text-center">{label}</span>
    </div>
  );
};

export default CircleProgress;
