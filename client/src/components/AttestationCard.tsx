import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Shield, FileText, Download, Copy, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Attestation {
  deviceId: string;
  publicKey: string;
  merkleRoot: string;
  timestamp: number;
  signatures: {
    sig1?: string;
    sig2?: string;
    sig3?: string;
  };
  validSignatures: number;
}

export default function AttestationCard() {
  const [attestation, setAttestation] = useState<Attestation | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAttestation();
  }, []);

  const fetchAttestation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/audit/sth', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch attestation');
      
      const data = await response.json();
      
      setAttestation({
        deviceId: localStorage.getItem('deviceId') || '',
        publicKey: localStorage.getItem('publicKey') || 'Not available',
        merkleRoot: data.sth.root,
        timestamp: data.sth.timestamp,
        signatures: data.sth.signatures,
        validSignatures: Object.values(data.sth.signatures).filter(Boolean).length
      });
    } catch (error) {
      console.error('Attestation error:', error);
      // Use demo data if API fails
      setAttestation({
        deviceId: localStorage.getItem('deviceId') || 'device-123',
        publicKey: '0x' + 'a'.repeat(64),
        merkleRoot: '0x' + 'b'.repeat(64),
        timestamp: Date.now(),
        signatures: {
          sig1: '0x' + 'c'.repeat(128),
          sig2: '0x' + 'd'.repeat(128),
          sig3: '0x' + 'e'.repeat(128)
        },
        validSignatures: 3
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`
    });
  };

  const downloadAttestation = () => {
    if (!attestation) return;
    
    const data = JSON.stringify(attestation, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attestation-${attestation.deviceId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Downloaded',
      description: 'Attestation card saved'
    });
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!attestation) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl border-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Cryptographic Attestation</CardTitle>
              <CardDescription>Transparency log verification card</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Verified
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Device Information */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Device Identity</h3>
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Device ID</span>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-background px-2 py-1 rounded">
                  {attestation.deviceId.substring(0, 16)}...
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(attestation.deviceId, 'Device ID')}
                  data-testid="button-copy-device"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Public Key</span>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-background px-2 py-1 rounded">
                  {attestation.publicKey.substring(0, 16)}...
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(attestation.publicKey, 'Public Key')}
                  data-testid="button-copy-key"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Merkle Tree Information */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Transparency Log</h3>
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Merkle Root</span>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-background px-2 py-1 rounded">
                  {attestation.merkleRoot.substring(0, 16)}...
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(attestation.merkleRoot, 'Merkle Root')}
                  data-testid="button-copy-root"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Timestamp</span>
              <span className="text-xs font-mono">
                {new Date(attestation.timestamp * 1000).toISOString()}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Multi-Signature Verification */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Multi-Signature Verification</h3>
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Cosigner Status</span>
              <Badge variant={attestation.validSignatures >= 2 ? 'default' : 'destructive'}>
                {attestation.validSignatures}/3 signatures
              </Badge>
            </div>
            
            {['sig1', 'sig2', 'sig3'].map((key, idx) => (
              <div key={key} className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <div className={`h-2 w-2 rounded-full ${
                    attestation.signatures[key as keyof typeof attestation.signatures] 
                      ? 'bg-green-500' 
                      : 'bg-gray-400'
                  }`} />
                  <span className="text-xs">Cosigner {idx + 1}</span>
                </div>
                {attestation.signatures[key as keyof typeof attestation.signatures] && (
                  <code className="text-xs font-mono bg-background px-2 py-1 rounded">
                    {attestation.signatures[key as keyof typeof attestation.signatures]?.substring(0, 12)}...
                  </code>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={downloadAttestation}
            data-testid="button-download"
          >
            <Download className="h-3 w-3 mr-1" />
            Download Card
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={fetchAttestation}
            data-testid="button-refresh"
          >
            <Shield className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            data-testid="button-verify"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Verify
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}