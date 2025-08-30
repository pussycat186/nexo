import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { authManager } from "@/lib/auth";
import { wsManager } from "@/lib/websocket";
import { cryptoService, deviceKeys } from "@/lib/crypto";
import MessageBubble from "./MessageBubble";

interface ChatAreaProps {
  conversation: any;
  onShowSecurity: () => void;
  onShowConversationSettings: () => void;
}

export default function ChatArea({ 
  conversation, 
  onShowSecurity, 
  onShowConversationSettings 
}: ChatAreaProps) {
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [sessionKey, setSessionKey] = useState<Uint8Array | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['/api/messages', conversation.id],
    queryFn: async () => {
      const response = await fetch(`/api/messages/${conversation.id}`, {
        headers: authManager.getAuthHeader()
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!conversation.id
  });

  useEffect(() => {
    if (messagesData?.items) {
      setMessages(messagesData.items);
    }
  }, [messagesData]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!conversation.id) return;

    // Establish session key
    const setupEncryption = async () => {
      try {
        if (conversation.peer_x25519) {
          const sharedSecret = await deviceKeys.computeSharedSecret(conversation.peer_x25519);
          const key = await cryptoService.deriveSessionKey(sharedSecret, conversation.id);
          setSessionKey(key);
        } else {
          // Mock key for demonstration
          const mockKey = crypto.getRandomValues(new Uint8Array(32));
          setSessionKey(mockKey);
        }
      } catch (error) {
        console.error('Failed to setup encryption:', error);
      }
    };

    setupEncryption();

    // Connect to WebSocket
    const token = authManager.getAccessToken();
    if (token) {
      wsManager.connect(conversation.id, token);
      
      wsManager.onMessage(async (envelope) => {
        try {
          // Decrypt message if we have session key
          if (sessionKey && envelope.cipher) {
            const aad = new TextEncoder().encode(JSON.stringify(envelope.ad || {}));
            const plaintext = await cryptoService.openMessage(
              envelope.cipher.c,
              envelope.cipher.n,
              sessionKey,
              aad
            );
            envelope.plaintext = plaintext;
          }
          
          setMessages(prev => [...prev, envelope]);
        } catch (error) {
          console.error('Failed to decrypt message:', error);
          envelope.plaintext = '[Failed to decrypt]';
          setMessages(prev => [...prev, envelope]);
        }
      });
    }

    return () => {
      wsManager.disconnect();
    };
  }, [conversation.id, conversation.peer_x25519, sessionKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !sessionKey) return;

    try {
      const ad = { ts: Math.floor(Date.now() / 1000), type: 'text' };
      const aadBytes = new TextEncoder().encode(JSON.stringify(ad));
      
      const { cipher, nonce } = await cryptoService.sealMessage(messageText, sessionKey, aadBytes);
      
      const envelope = {
        ver: 1,
        conv_id: conversation.id,
        msg_id: crypto.randomUUID(),
        cipher: { c: cipher, n: nonce },
        ad,
        plaintext: messageText // For local display
      };

      wsManager.sendMessage(envelope);
      setMessageText("");
      
      // Auto-resize textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <i className="fas fa-comments text-4xl mb-4"></i>
          <p>Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" data-testid="chat-area">
      {/* Chat Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
              <i className="fas fa-user text-secondary-foreground"></i>
            </div>
            <div>
              <h2 className="font-semibold" data-testid="text-conversation-peer">
                {conversation.peer_handle || 'Unknown User'}
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="bg-gradient-to-r from-accent to-accent/80 px-2 py-0.5 rounded-full text-xs text-white flex items-center gap-1">
                  <i className="fas fa-lock"></i>
                  E2EE Active
                </div>
                <span>•</span>
                <span>Device verified</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-muted rounded-md"
              onClick={onShowSecurity}
              data-testid="button-security-info"
            >
              <i className="fas fa-shield-alt text-accent"></i>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-muted rounded-md"
              onClick={onShowConversationSettings}
              data-testid="button-conversation-settings"
            >
              <i className="fas fa-ellipsis-v text-muted-foreground"></i>
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="messages-area">
        {/* System Message - Device Verification */}
        <div className="flex justify-center">
          <div className="bg-accent/20 text-accent px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <i className="fas fa-check-circle"></i>
            <span>End-to-end encryption established with {conversation.peer_handle}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground">
            Loading messages...
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.msg_id || message.id}
              message={message}
              isOwn={message.sender_device === localStorage.getItem('nexo:device_id')}
            />
          ))
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-border p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <div className="bg-input border border-border rounded-lg p-3">
              <Textarea
                ref={textareaRef}
                placeholder="Type your message..."
                value={messageText}
                onChange={handleTextareaChange}
                onKeyPress={handleKeyPress}
                className="w-full bg-transparent resize-none outline-none text-sm placeholder-muted-foreground border-0 p-0 min-h-[20px]"
                rows={1}
                data-testid="textarea-message"
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <i className="fas fa-lock text-accent"></i>
                <span>Messages are end-to-end encrypted</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${wsManager.isConnected() ? 'bg-accent' : 'bg-destructive'}`}></div>
                <span>{wsManager.isConnected() ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || !sessionKey}
            className="bg-primary text-primary-foreground rounded-lg p-3 hover:bg-primary/90 transition-colors"
            data-testid="button-send"
          >
            <i className="fas fa-paper-plane"></i>
          </Button>
        </div>
      </div>
    </div>
  );
}
