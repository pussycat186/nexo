import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SecurityInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SecurityInfoModal({ isOpen, onClose }: SecurityInfoModalProps) {
  const deviceFingerprint = "7F4A:B2C9:E8D1:5A3F:9C2E:4B7A:1D8F:6E5C";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="modal-security-info">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Security Information
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-security">
              <i className="fas fa-times text-muted-foreground"></i>
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-accent/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-shield-alt text-accent"></i>
              <span className="font-medium text-sm">End-to-End Encryption</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Messages are encrypted with X25519 + XChaCha20-Poly1305
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-sm mb-2">Encryption Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Key Exchange:</span>
                <span>X25519</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Encryption:</span>
                <span>XChaCha20-Poly1305</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Key Derivation:</span>
                <span>HKDF-SHA256</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Message Integrity:</span>
                <span>STH Chain</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">Device Fingerprint</h4>
            <div className="bg-muted rounded p-3 font-mono text-xs break-all" data-testid="text-device-fingerprint">
              {deviceFingerprint}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
