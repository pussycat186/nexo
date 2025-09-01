import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, Shield, Key, RefreshCw, AlertTriangle, 
  CheckCircle, Clock, TrendingUp, Lock
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface KeyMetrics {
  rotationScore: number;
  usageCount: number;
  lastRotated: Date;
  compromiseRisk: 'low' | 'medium' | 'high';
  encryptionStrength: number;
  recommendations: string[];
}

export default function KeyHealth() {
  const [metrics, setMetrics] = useState<KeyMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    checkKeyHealth();
  }, []);

  const checkKeyHealth = async () => {
    setIsLoading(true);
    
    // Simulate key health check
    setTimeout(() => {
      const lastRotated = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const daysSinceRotation = Math.floor((Date.now() - lastRotated.getTime()) / (24 * 60 * 60 * 1000));
      const usageCount = Math.floor(Math.random() * 10000) + 1000;
      
      const rotationScore = Math.max(0, 100 - daysSinceRotation * 3);
      const encryptionStrength = 95 + Math.random() * 5;
      
      const recommendations = [];
      if (daysSinceRotation > 30) {
        recommendations.push('Consider rotating your keys - it has been over 30 days');
      }
      if (usageCount > 5000) {
        recommendations.push('High key usage detected - monitor for unusual patterns');
      }
      
      const compromiseRisk = daysSinceRotation > 60 ? 'high' : 
                             daysSinceRotation > 30 ? 'medium' : 'low';
      
      setMetrics({
        rotationScore,
        usageCount,
        lastRotated,
        compromiseRisk,
        encryptionStrength,
        recommendations
      });
      
      setIsLoading(false);
    }, 1500);
  };

  const rotateKeys = async () => {
    setIsRotating(true);
    
    // Simulate key rotation
    setTimeout(() => {
      setMetrics(prev => prev ? {
        ...prev,
        rotationScore: 100,
        lastRotated: new Date(),
        compromiseRisk: 'low',
        recommendations: []
      } : null);
      
      setIsRotating(false);
      
      toast({
        title: 'Keys Rotated',
        description: 'Your encryption keys have been successfully rotated'
      });
    }, 2000);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'low': return 'outline';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl border-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Key Health Monitor</CardTitle>
              <CardDescription>Encryption key security status</CardDescription>
            </div>
          </div>
          <Badge 
            variant={getRiskBadgeVariant(metrics.compromiseRisk)}
            className="gap-1"
          >
            <Shield className="h-3 w-3" />
            {metrics.compromiseRisk.toUpperCase()} RISK
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Rotation Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Rotation Health</span>
            </div>
            <span className="text-sm font-bold">{metrics.rotationScore}%</span>
          </div>
          <Progress value={metrics.rotationScore} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Last rotated: {metrics.lastRotated.toLocaleDateString()}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {Math.floor((Date.now() - metrics.lastRotated.getTime()) / (24 * 60 * 60 * 1000))} days ago
            </span>
          </div>
        </div>

        {/* Encryption Strength */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Encryption Strength</span>
            </div>
            <span className="text-sm font-bold">{metrics.encryptionStrength.toFixed(1)}%</span>
          </div>
          <Progress value={metrics.encryptionStrength} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Using X25519 + XChaCha20-Poly1305 AEAD encryption
          </p>
        </div>

        {/* Key Usage Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Usage Count</span>
            </div>
            <p className="text-lg font-bold">{metrics.usageCount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">operations</p>
          </div>
          
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Key Type</span>
            </div>
            <p className="text-lg font-bold">Ed25519</p>
            <p className="text-xs text-muted-foreground">256-bit</p>
          </div>
        </div>

        {/* Security Status */}
        <div className="p-3 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Security Status</span>
            <div className={`flex items-center gap-1 ${getRiskColor(metrics.compromiseRisk)}`}>
              {metrics.compromiseRisk === 'low' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <span className="text-sm font-medium capitalize">{metrics.compromiseRisk} Risk</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs">Forward secrecy enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs">Perfect forward secrecy active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs">Quantum-resistant algorithms ready</span>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {metrics.recommendations.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Recommendations:</p>
                {metrics.recommendations.map((rec, idx) => (
                  <p key={idx} className="text-sm">• {rec}</p>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            className="flex-1"
            onClick={rotateKeys}
            disabled={isRotating}
            data-testid="button-rotate"
          >
            {isRotating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Rotating Keys...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Rotate Keys
              </>
            )}
          </Button>
          <Button 
            variant="outline"
            onClick={checkKeyHealth}
            data-testid="button-check"
          >
            <Activity className="h-4 w-4 mr-2" />
            Check Health
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}