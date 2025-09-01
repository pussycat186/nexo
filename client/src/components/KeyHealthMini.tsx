import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Activity, Shield } from 'lucide-react';

export default function KeyHealthMini() {
  const [score, setScore] = useState(95);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setScore(prev => Math.min(100, Math.max(85, prev + (Math.random() - 0.5) * 5)));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const getColor = () => {
    if (score >= 90) return 'text-green-500 bg-green-50 dark:bg-green-950/30';
    if (score >= 70) return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30';
    return 'text-red-500 bg-red-50 dark:bg-red-950/30';
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="cursor-pointer"
      title={`Key Health: ${score}%`}
    >
      <Badge variant="outline" className={`gap-1.5 px-2 py-1 ${getColor()}`}>
        <Activity className="h-3 w-3" />
        <span className="font-medium text-xs">{score}%</span>
        <Shield className="h-2.5 w-2.5" />
      </Badge>
    </motion.div>
  );
}