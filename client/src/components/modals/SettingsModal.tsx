import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { authManager } from "@/lib/auth";
import { deviceKeys } from "@/lib/crypto";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function SettingsModal({ isOpen, onClose, onLogout }: SettingsModalProps) {
  const [userHandle, setUserHandle] = useState("");
  const [userId, setUserId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [readReceipts, setReadReceipts] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [messageDisappearing, setMessageDisappearing] = useState(false);

  useEffect(() => {
    // Load user data from JWT token
    const token = authManager.getAccessToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserHandle(payload.hdl || 'user');
        setUserId(payload.sub || 'unknown');
      } catch (e) {
        console.error('Failed to parse token:', e);
      }
    }

    // Load device ID
    const storedDeviceId = localStorage.getItem('nexo:device_id');
    if (storedDeviceId) {
      setDeviceId(storedDeviceId);
    }
  }, [isOpen]);

  const handleLogout = () => {
    authManager.logout();
    deviceKeys.loadKeys(); // Clear keys
    onLogout();
    onClose();
  };

  const handleExportData = () => {
    // Mock export functionality
    const data = {
      userHandle,
      userId,
      deviceId,
      exportedAt: new Date().toISOString(),
      conversations: "Encrypted data would be exported here"
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexo-export-${userHandle}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getKeyFingerprint = (keyType: string) => {
    // Mock fingerprint generation
    return "7F4A:B2C9:E8D1:5A3F";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" data-testid="modal-settings">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-xl">
            Settings
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-settings">
              <i className="fas fa-times text-muted-foreground"></i>
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Profile Section */}
          <div>
            <h4 className="font-medium mb-3">Profile</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="handle" className="block text-sm text-muted-foreground mb-1">
                  Handle
                </Label>
                <Input
                  id="handle"
                  type="text"
                  value={userHandle}
                  onChange={(e) => setUserHandle(e.target.value)}
                  className="w-full bg-input border-border"
                  data-testid="input-user-handle"
                />
              </div>
              <div>
                <Label className="block text-sm text-muted-foreground mb-1">
                  User ID
                </Label>
                <div className="bg-muted rounded p-2 font-mono text-xs break-all" data-testid="text-user-id">
                  {userId}
                </div>
              </div>
            </div>
          </div>

          {/* Device Management */}
          <div>
            <h4 className="font-medium mb-3">Device Management</h4>
            <div className="space-y-3">
              <div className="bg-secondary rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-laptop text-primary"></i>
                    <span className="font-medium text-sm">This Device</span>
                    <span className="bg-accent text-accent-foreground px-2 py-0.5 rounded text-xs">
                      Current
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/20 p-1 rounded"
                    data-testid="button-delete-device"
                  >
                    <i className="fas fa-trash text-sm"></i>
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    Device ID: <span className="font-mono" data-testid="text-device-id">{deviceId.slice(0, 12)}</span>
                  </div>
                  <div>
                    Ed25519: <span className="font-mono">{getKeyFingerprint('ed25519')}</span>
                  </div>
                  <div>
                    X25519: <span className="font-mono">{getKeyFingerprint('x25519')}</span>
                  </div>
                </div>
              </div>
              
              <Button
                variant="outline"
                className="w-full border-border"
                data-testid="button-add-device"
              >
                <i className="fas fa-plus mr-2"></i>
                Add New Device
              </Button>
            </div>
          </div>

          {/* Security Settings */}
          <div>
            <h4 className="font-medium mb-3">Security</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Message disappearing</span>
                <Switch
                  checked={messageDisappearing}
                  onCheckedChange={setMessageDisappearing}
                  data-testid="switch-message-disappearing"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Read receipts</span>
                <Switch
                  checked={readReceipts}
                  onCheckedChange={setReadReceipts}
                  data-testid="switch-read-receipts"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Online status</span>
                <Switch
                  checked={onlineStatus}
                  onCheckedChange={setOnlineStatus}
                  data-testid="switch-online-status"
                />
              </div>
            </div>
          </div>

          {/* Export/Backup */}
          <div>
            <h4 className="font-medium mb-3">Data</h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full border-border"
                onClick={handleExportData}
                data-testid="button-export-data"
              >
                <i className="fas fa-download mr-2"></i>
                Export Conversations
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleLogout}
                data-testid="button-delete-data"
              >
                <i className="fas fa-exclamation-triangle mr-2"></i>
                Logout & Delete Local Data
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
