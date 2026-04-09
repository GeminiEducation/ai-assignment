import { motion } from 'framer-motion';

interface CircleProgressProps {
  value: number;
  label: string;
  color: 'primary' | 'secondary' | 'accent';
}

const colorMap = {
  primary: { stroke: 'hsl(190 95% 50%)', glow: 'hsl(190 95% 50% / 0.3)' },
  secondary: { stroke: 'hsl(260 80% 60%)', glow: 'hsl(260 80% 60% / 0.3)' },
  accent: { stroke: 'hsl(320 80% 55%)', glow: 'hsl(320 80% 55% / 0.3)' },
};

const CircleProgress = ({ value, label, color }: CircleProgressProps) => {
  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  const c = colorMap[color];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(225 15% 18%)" strokeWidth={strokeWidth} />
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
            className="font-display text-3xl font-bold text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {Math.round(value)}%
          </motion.span>
        </div>
      </div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
};

export default CircleProgress;
