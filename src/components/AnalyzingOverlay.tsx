import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const AnalyzingOverlay = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="w-full max-w-md mx-auto text-center py-16"
  >
    <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-primary/10 flex items-center justify-center animate-pulse-glow">
      <Sparkles className="h-12 w-12 text-primary animate-float" />
    </div>
    <h3 className="font-display text-xl font-semibold text-foreground mb-2">
      Analyzing your document…
    </h3>
    <p className="text-muted-foreground text-sm mb-6">
      Our AI is reading through your assignment
    </p>
    <div className="flex gap-1.5 justify-center">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-primary"
          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  </motion.div>
);

export default AnalyzingOverlay;
