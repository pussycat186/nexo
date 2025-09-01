import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, Upload, CheckCircle2, XCircle, 
  AlertCircle, Search, Download, Shield
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AppShell from '@/components/AppShell';

interface ProofResult {
  valid: boolean;
  messageHash: string;
  root: string;
  timestamp: number;
  reason?: string;
}

export default function AuditPage() {
  const [proofInput, setProofInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<ProofResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!proofInput.trim()) {
      toast({
        title: 'No proof provided',
        description: 'Please paste a proof or upload a file',
        variant: 'destructive'
      });
      return;
    }

    setIsVerifying(true);
    
    // Simulate verification
    setTimeout(() => {
      const isValid = Math.random() > 0.3;
      setVerifyResult({
        valid: isValid,
        messageHash: '0x' + 'a'.repeat(64),
        root: '0x' + 'b'.repeat(64),
        timestamp: Date.now(),
        reason: isValid ? undefined : 'Invalid signature on proof path'
      });
      setIsVerifying(false);
    }, 1500);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProofInput(e.target?.result as string);
        toast({
          title: 'File loaded',
          description: 'Proof data ready for verification'
        });
      };
      reader.readAsText(file);
    }
  };

  const downloadSampleProof = () => {
    const sampleProof = JSON.stringify({
      messageHash: '0x' + 'a'.repeat(64),
      proof: ['0x' + 'c'.repeat(64), '0x' + 'd'.repeat(64)],
      root: '0x' + 'b'.repeat(64),
      index: 0
    }, null, 2);
    
    const blob = new Blob([sampleProof], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-proof.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0B0F1A] dark:to-[#151A2A] p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold tracking-tight">Audit & Verification</h1>
            <p className="text-muted-foreground mt-2">
              Verify message proofs and audit transparency logs
            </p>
          </motion.div>

          {/* Verification Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Proof Verification</CardTitle>
                <CardDescription>
                  Paste a proof JSON or upload a transcript file to verify message integrity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder='Paste your proof JSON here, e.g., {"messageHash": "0x...", "proof": [...], "root": "0x..."}'
                    value={proofInput}
                    onChange={(e) => setProofInput(e.target.value)}
                    className="min-h-[150px] font-mono text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleVerify}
                    disabled={isVerifying || !proofInput}
                    className="flex-1"
                  >
                    {isVerifying ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Search className="h-4 w-4 mr-2" />
                      </motion.div>
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Verify Proof
                  </Button>
                  
                  <Button variant="outline" asChild>
                    <label className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                      <input
                        type="file"
                        accept=".json,.jsonl"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </Button>
                  
                  <Button variant="outline" onClick={downloadSampleProof}>
                    <Download className="h-4 w-4 mr-2" />
                    Sample
                  </Button>
                </div>

                {/* Verification Result */}
                {verifyResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Alert className={verifyResult.valid ? 'border-green-500' : 'border-red-500'}>
                      <div className="flex items-center gap-2">
                        {verifyResult.valid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <AlertDescription>
                          <div className="space-y-2">
                            <p className="font-medium">
                              {verifyResult.valid 
                                ? 'Proof verified successfully!' 
                                : 'Verification failed'}
                            </p>
                            {verifyResult.reason && (
                              <p className="text-sm text-muted-foreground">
                                Reason: {verifyResult.reason}
                              </p>
                            )}
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Hash:</span>
                                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                                  {verifyResult.messageHash.substring(0, 16)}...
                                </code>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Root:</span>
                                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                                  {verifyResult.root.substring(0, 16)}...
                                </code>
                              </div>
                            </div>
                          </div>
                        </AlertDescription>
                      </div>
                    </Alert>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg">How It Works</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>1. Every message is hashed and added to a Merkle tree</p>
                  <p>2. The tree root is signed by multiple cosigners</p>
                  <p>3. Proofs verify message inclusion in the tree</p>
                  <p>4. This ensures message integrity and non-repudiation</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-500" />
                    <CardTitle className="text-lg">Proof Format</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Proofs must be valid JSON containing:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>messageHash: The message's SHA-256 hash</li>
                    <li>proof: Array of sibling hashes</li>
                    <li>root: The Merkle tree root</li>
                    <li>index: Message position in tree</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}