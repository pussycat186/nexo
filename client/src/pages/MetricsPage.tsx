import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Activity, TrendingUp, Users, MessageSquare, Shield, 
  Zap, Globe, Cpu, HardDrive, Wifi, CheckCircle2, 
  AlertTriangle, RefreshCw, BarChart3
} from 'lucide-react';
import AppShell from '@/components/AppShell';

interface Metrics {
  uptime: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  messagesPerSecond: number;
  activeConnections: number;
  verifiedMessageRate: number;
  wsReconnectCount: number;
  sthChainLength: number;
  memoryUsage: number;
  cpuUsage: number;
  quantumReady: boolean;
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics>({
    uptime: 0,
    latencyP50: 12,
    latencyP95: 25,
    latencyP99: 48,
    messagesPerSecond: 42,
    activeConnections: 127,
    verifiedMessageRate: 99.8,
    wsReconnectCount: 3,
    sthChainLength: 1247,
    memoryUsage: 45,
    cpuUsage: 23,
    quantumReady: true
  });
  
  const [telemetryEnabled, setTelemetryEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Simulate real-time metrics updates
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        uptime: prev.uptime + 1,
        messagesPerSecond: Math.max(0, prev.messagesPerSecond + (Math.random() - 0.5) * 10),
        activeConnections: Math.max(0, Math.floor(prev.activeConnections + (Math.random() - 0.5) * 5)),
        cpuUsage: Math.min(100, Math.max(0, prev.cpuUsage + (Math.random() - 0.5) * 5)),
        memoryUsage: Math.min(100, Math.max(0, prev.memoryUsage + (Math.random() - 0.5) * 3))
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const refreshMetrics = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/metrics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMetrics(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getLatencyColor = (latency: number): string => {
    if (latency < 20) return 'text-green-500';
    if (latency < 50) return 'text-yellow-500';
    return 'text-red-500';
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                  <BarChart3 className="h-8 w-8 text-primary" />
                  Metrics Dashboard
                </h1>
                <p className="text-muted-foreground mt-2">
                  Real-time performance and observability metrics
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={telemetryEnabled}
                    onCheckedChange={setTelemetryEnabled}
                    id="telemetry"
                  />
                  <Label htmlFor="telemetry" className="text-sm">
                    Privacy-first telemetry
                  </Label>
                </div>
                
                <Button
                  onClick={refreshMetrics}
                  disabled={isLoading}
                  variant="outline"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Uptime
                    </CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatUptime(metrics.uptime)}</p>
                  <p className="text-xs text-muted-foreground mt-1">99.99% availability</p>
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
                      Active Connections
                    </CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{metrics.activeConnections}</p>
                  <p className="text-xs text-muted-foreground mt-1">WebSocket clients</p>
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
                      Messages/sec
                    </CardTitle>
                    <MessageSquare className="h-4 w-4 text-purple-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{metrics.messagesPerSecond.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Real-time throughput</p>
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
                      Quantum Ready
                    </CardTitle>
                    <Shield className={`h-4 w-4 ${metrics.quantumReady ? 'text-green-500' : 'text-gray-400'}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{metrics.quantumReady ? 'Active' : 'Inactive'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics.quantumReady ? 'Kyber/Dilithium ready' : 'Classical crypto only'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Performance Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Performance Metrics</CardTitle>
                    <CardDescription>Latency percentiles and response times</CardDescription>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Zap className="h-3 w-3" />
                    Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">P50 Latency</span>
                        <span className={`text-sm font-bold ${getLatencyColor(metrics.latencyP50)}`}>
                          {metrics.latencyP50}ms
                        </span>
                      </div>
                      <Progress value={Math.min(100, metrics.latencyP50)} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">P95 Latency</span>
                        <span className={`text-sm font-bold ${getLatencyColor(metrics.latencyP95)}`}>
                          {metrics.latencyP95}ms
                        </span>
                      </div>
                      <Progress value={Math.min(100, metrics.latencyP95)} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">P99 Latency</span>
                        <span className={`text-sm font-bold ${getLatencyColor(metrics.latencyP99)}`}>
                          {metrics.latencyP99}ms
                        </span>
                      </div>
                      <Progress value={Math.min(100, metrics.latencyP99)} className="h-2" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">CPU Usage</span>
                        </div>
                        <span className="text-sm font-bold">{metrics.cpuUsage.toFixed(1)}%</span>
                      </div>
                      <Progress value={metrics.cpuUsage} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Memory Usage</span>
                        </div>
                        <span className="text-sm font-bold">{metrics.memoryUsage.toFixed(1)}%</span>
                      </div>
                      <Progress value={metrics.memoryUsage} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Security & Reliability */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-500" />
                    <CardTitle className="text-lg">Security Metrics</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Verified Message Rate</span>
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {metrics.verifiedMessageRate}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">STH Chain Length</span>
                    <span className="text-sm font-mono">{metrics.sthChainLength}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cosigner Status</span>
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Wifi className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg">Connection Health</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">WS Reconnects</span>
                    <Badge variant={metrics.wsReconnectCount > 10 ? 'destructive' : 'outline'}>
                      {metrics.wsReconnectCount}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Heartbeat Status</span>
                    <Badge variant="outline" className="gap-1">
                      <Activity className="h-3 w-3 text-green-500" />
                      Healthy
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Connection Pool</span>
                    <span className="text-sm font-mono">127/500</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}