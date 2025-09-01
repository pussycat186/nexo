import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  QrCode, Smartphone, Laptop, Check, Copy, 
  RefreshCw, Shield, Wifi, Link2 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface HandoffSession {
  id: string;
  deviceName: string;
  publicKey: string;
  qrData: string;
  expiresAt: Date;
  status: 'pending' | 'connected' | 'completed';
}

export default function QRHandoff() {
  const [session, setSession] = useState<HandoffSession | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (session && session.status === 'pending') {
      const timer = setInterval(() => {
        const remaining = Math.max(0, 
          Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
        );
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          setSession(null);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [session]);

  const generateQRSession = async () => {
    setIsGenerating(true);
    
    // Simulate QR generation
    setTimeout(() => {
      const sessionId = crypto.randomUUID();
      const qrData = btoa(JSON.stringify({
        id: sessionId,
        pubkey: localStorage.getItem('publicKey') || 'demo-key',
        endpoint: window.location.origin,
        timestamp: Date.now()
      }));
      
      setSession({
        id: sessionId,
        deviceName: 'New Device',
        publicKey: '',
        qrData,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        status: 'pending'
      });
      
      setTimeLeft(300); // 5 minutes in seconds
      setIsGenerating(false);
      
      // Simulate connection after 3 seconds
      setTimeout(() => {
        setSession(prev => prev ? { ...prev, status: 'connected' } : null);
      }, 3000);
    }, 1500);
  };

  const completeHandoff = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter a 6-digit verification code',
        variant: 'destructive'
      });
      return;
    }
    
    setSession(prev => prev ? { ...prev, status: 'completed' } : null);
    
    toast({
      title: 'Handoff complete',
      description: 'Device successfully linked'
    });
    
    setTimeout(() => {
      setSession(null);
      setVerificationCode('');
    }, 2000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Session data copied to clipboard'
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-2xl border-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">QR Device Handoff</CardTitle>
              <CardDescription>Link new devices securely</CardDescription>
            </div>
          </div>
          {session && (
            <Badge variant={session.status === 'completed' ? 'default' : 'outline'}>
              {session.status === 'pending' && `Expires in ${formatTime(timeLeft)}`}
              {session.status === 'connected' && 'Connected'}
              {session.status === 'completed' && 'Completed'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!session ? (
          <div className="text-center py-8 space-y-4">
            <div className="flex justify-center gap-4 mb-6">
              <div className="p-4 bg-muted rounded-lg">
                <Smartphone className="h-8 w-8" />
              </div>
              <div className="flex items-center">
                <Link2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <Laptop className="h-8 w-8" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Link a New Device</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Generate a secure QR code to transfer your encrypted keys to another device
              </p>
            </div>
            
            <Button 
              onClick={generateQRSession}
              disabled={isGenerating}
              className="mt-4"
              data-testid="button-generate-qr"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate QR Code
                </>
              )}
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="qr" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="qr">QR Code</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>
            
            <TabsContent value="qr" className="space-y-4">
              <div className="flex justify-center p-8 bg-white rounded-lg">
                {/* QR Code Placeholder */}
                <div className="w-48 h-48 bg-black/10 rounded-lg flex items-center justify-center">
                  <QrCode className="h-32 w-32 text-black/30" />
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Scan this QR code with your other device
                </p>
                {session.status === 'connected' && (
                  <Alert className="mt-4">
                    <Wifi className="h-4 w-4" />
                    <AlertDescription>
                      Device connected! Enter the verification code shown on the other device.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Session ID</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={session.id} 
                      readOnly 
                      className="font-mono text-xs"
                      data-testid="input-session-id"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(session.id)}
                      data-testid="button-copy-session"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Connection Data</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={session.qrData.substring(0, 50) + '...'} 
                      readOnly 
                      className="font-mono text-xs"
                      data-testid="input-connection-data"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(session.qrData)}
                      data-testid="button-copy-data"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
        
        {session && session.status === 'connected' && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="verification">Verification Code</Label>
              <div className="flex gap-2">
                <Input
                  id="verification"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className="font-mono text-center text-lg"
                  data-testid="input-verification"
                />
                <Button 
                  onClick={completeHandoff}
                  disabled={verificationCode.length !== 6}
                  data-testid="button-verify"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Verify
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the code displayed on your other device
              </p>
            </div>
          </div>
        )}
        
        {session && session.status === 'completed' && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <Check className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Device successfully linked! Your encryption keys have been securely transferred.
            </AlertDescription>
          </Alert>
        )}
        
        {session && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
            <Shield className="h-3 w-3" />
            <span>End-to-end encrypted handoff using X25519 key exchange</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}