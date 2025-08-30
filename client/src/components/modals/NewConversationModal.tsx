import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authManager } from "@/lib/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversation: any) => void;
}

export default function NewConversationModal({ 
  isOpen, 
  onClose, 
  onConversationCreated 
}: NewConversationModalProps) {
  const [handle, setHandle] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createConversationMutation = useMutation({
    mutationFn: async (peerHandle: string) => {
      const response = await apiRequest('POST', '/api/conversations', {
        peer_handle: peerHandle
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Conversation created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      onConversationCreated(data);
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create conversation",
        variant: "destructive"
      });
    }
  });

  const handleStartConversation = () => {
    if (!handle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a user handle",
        variant: "destructive"
      });
      return;
    }

    createConversationMutation.mutate(handle.trim().toLowerCase());
  };

  const handleClose = () => {
    setHandle("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" data-testid="modal-new-conversation">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Start New Conversation
            <Button variant="ghost" size="sm" onClick={handleClose} data-testid="button-close-new-conversation">
              <i className="fas fa-times text-muted-foreground"></i>
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="peer-handle" className="block text-sm font-medium mb-2">
              Enter user handle
            </Label>
            <Input
              id="peer-handle"
              type="text"
              placeholder="@username"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="w-full bg-input border-border"
              disabled={createConversationMutation.isPending}
              data-testid="input-peer-handle"
            />
          </div>
          
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm">
              <i className="fas fa-info-circle text-primary"></i>
              <span>Conversations are automatically encrypted with X25519 key exchange</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={createConversationMutation.isPending}
              data-testid="button-cancel-conversation"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleStartConversation}
              disabled={createConversationMutation.isPending || !handle.trim()}
              data-testid="button-start-conversation"
            >
              {createConversationMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </>
              ) : (
                'Start Chat'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
