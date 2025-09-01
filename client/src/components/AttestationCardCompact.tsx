import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Shield, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function AttestationCardCompact() {
  const [expanded, setExpanded] = useState(false);
  const [attestation] = useState({
    root: '0x' + 'b'.repeat(64),
    validSignatures: 2,
    totalSignatures: 3,
    timestamp: Date.now()
  });

  const copyRoot = () => {
    navigator.clipboard.writeText(attestation.root);
    toast({
      title: 'Copied',
      description: 'Merkle root copied to clipboard'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className="p-3 cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Verified</span>
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {attestation.validSignatures}/{attestation.totalSignatures} sigs
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {attestation.root.substring(0, 16)}...
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                copyRoot();
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Merkle Root</span>
                  <code className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {attestation.root.substring(0, 24)}...
                  </code>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Timestamp</span>
                  <span>{new Date(attestation.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i <= attestation.validSignatures
                          ? 'bg-green-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}