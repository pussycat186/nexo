import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Activity, Shield, RefreshCw } from 'lucide-react';

export default function KeyHealthCompact() {
  const [score] = useState(95);
  const [isRotating, setIsRotating] = useState(false);

  const getColor = () => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const rotateKeys = () => {
    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="cursor-pointer"
    >
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className={`h-4 w-4 ${getColor()}`} />
            <span className="font-medium text-sm">Key Health</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{score}%</span>
            <motion.button
              whileTap={{ rotate: 360 }}
              onClick={rotateKeys}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <RefreshCw className={`h-3 w-3 ${isRotating ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
        </div>
        <Progress value={score} className="h-1.5" />
        <div className="flex items-center gap-2 mt-2">
          <Shield className="h-3 w-3 text-green-500" />
          <span className="text-xs text-muted-foreground">Last rotated 3 days ago</span>
        </div>
      </Card>
    </motion.div>
  );
}