import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Shield, Copy, ExternalLink, Clock, CheckCircle2, 
  AlertCircle, TrendingUp, Users, Activity
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AppShell from '@/components/AppShell';

interface STHEntry {
  id: number;
  root: string;
  timestamp: number;
  signatures: number;
  status: 'valid' | 'pending' | 'invalid';
}

export default function AdminPage() {
  const [sthHistory, setSTHHistory] = useState<STHEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMessages: 1247,
    activeUsers: 42,
    validationRate: 99.8,
    avgResponseTime: 12
  });

  useEffect(() => {
    // Simulate loading STH history
    setTimeout(() => {
      setSTHHistory([
        { id: 1, root: '0xabc123...', timestamp: Date.now() - 3600000, signatures: 3, status: 'valid' },
        { id: 2, root: '0xdef456...', timestamp: Date.now() - 7200000, signatures: 2, status: 'valid' },
        { id: 3, root: '0xghi789...', timestamp: Date.now() - 10800000, signatures: 2, status: 'pending' },
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  const copyRoot = (root: string) => {
    navigator.clipboard.writeText(root);
    toast({
      title: 'Copied',
      description: 'Merkle root copied to clipboard'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-green-500';
      case 'pending': return 'text-yellow-500';
      case 'invalid': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle2 className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'invalid': return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0B0F1A] dark:to-[#151A2A] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Monitor transparency logs and system health
            </p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Messages
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">+12% from last week</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Active Users
                    </CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.activeUsers}</p>
                  <p className="text-xs text-muted-foreground mt-1">Currently online</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Validation Rate
                    </CardTitle>
                    <Shield className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.validationRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Avg Response
                    </CardTitle>
                    <Activity className="h-4 w-4 text-purple-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.avgResponseTime}ms</p>
                  <p className="text-xs text-muted-foreground mt-1">P95 latency</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* STH Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>STH Chain Timeline</CardTitle>
                    <CardDescription>Recent signed tree heads</CardDescription>
                  </div>
                  <Button size="sm" variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-2">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sthHistory.map((sth, index) => (
                        <motion.div
                          key={sth.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                        >
                          <div className={`${getStatusColor(sth.status)}`}>
                            {getStatusIcon(sth.status)}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-sm font-mono">{sth.root}</code>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => copyRoot(sth.root)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{new Date(sth.timestamp).toLocaleString()}</span>
                              <Badge variant="outline" className="text-xs">
                                {sth.signatures}/3 signatures
                              </Badge>
                            </div>
                          </div>
                          
                          <Badge variant={sth.status === 'valid' ? 'default' : 'secondary'}>
                            {sth.status}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}