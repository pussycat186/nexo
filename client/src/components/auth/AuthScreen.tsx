import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authManager } from "@/lib/auth";
import { deviceKeys } from "@/lib/crypto";

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [handle, setHandle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [challenge, setChallenge] = useState<{ nonce: string; exp: number } | null>(null);
  const { toast } = useToast();

  const handleRegister = async () => {
    if (!handle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a handle",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Load existing keys or generate new ones
      deviceKeys.loadKeys();
      
      const challengeData = await authManager.register(handle.trim().toLowerCase());
      setChallenge(challengeData);
      
      toast({
        title: "Success",
        description: "Device registered. Verifying signature...",
      });

      // Auto-verify after a short delay
      setTimeout(async () => {
        try {
          await authManager.verify(challengeData.nonce);
          toast({
            title: "Success",
            description: "Authentication successful!",
          });
          onAuthenticated();
        } catch (error) {
          toast({
            title: "Error",
            description: "Verification failed. Please try again.",
            variant: "destructive"
          });
        } finally {
          setIsLoading(false);
        }
      }, 1000);

    } catch (error) {
      toast({
        title: "Error",
        description: "Registration failed. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center" data-testid="auth-screen">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-lock text-primary-foreground text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to Nexo</h1>
          <p className="text-muted-foreground">Secure, end-to-end encrypted messaging</p>
        </div>

        <Card className="border border-border">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="handle" className="text-sm font-medium mb-2 block">
                  Choose your handle
                </Label>
                <Input
                  id="handle"
                  type="text"
                  placeholder="@username"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="bg-input border-border"
                  disabled={isLoading}
                  data-testid="input-handle"
                />
              </div>
              
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-start gap-2 text-sm">
                  <i className="fas fa-info-circle text-primary mt-0.5"></i>
                  <div>
                    <p className="mb-1">Your device will generate cryptographic keys:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Ed25519 for identity verification</li>
                      <li>• X25519 for message encryption</li>
                      <li>• Keys never leave your device</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={handleRegister}
                disabled={isLoading || !handle.trim()}
                className="w-full bg-primary text-primary-foreground font-medium"
                data-testid="button-register"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
                    {challenge ? "Verifying..." : "Generating Keys..."}
                  </>
                ) : (
                  <>
                    <i className="fas fa-key mr-2"></i>
                    Generate Keys & Register
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground">
            Already have an account? 
            <button className="text-primary hover:underline ml-1">
              Sign in with existing device
            </button>
          </p>
        </div>
      </div>

      {/* Loading overlay for encryption operations */}
      {isLoading && challenge && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-8 flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="font-medium mb-2">Establishing Encryption</h3>
            <p className="text-sm text-muted-foreground text-center">
              Performing X25519 key exchange and deriving encryption keys...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
