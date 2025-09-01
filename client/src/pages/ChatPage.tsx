import { useState, useEffect, useRef } from 'react';
import { useLocation, useParams } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Send, Paperclip, Smile, Shield, Check, CheckCheck, 
  Lock, MoreVertical, Info, FileText
} from 'lucide-react';
import AttestationCard from '@/components/AttestationCard';
import KeyHealth from '@/components/KeyHealth';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: number;
  encrypted: boolean;
  verified: boolean;
  delivered: boolean;
  hash?: string;
}

export default function ChatPage() {
  const params = useParams();
  const roomId = params.roomId || 'general';
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [showAttestation, setShowAttestation] = useState(false);
  const [showKeyHealth, setShowKeyHealth] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Demo messages
    setMessages([
      {
        id: '1',
        content: 'Welcome to NEXO! Your messages are end-to-end encrypted.',
        sender: 'system',
        timestamp: Date.now() - 60000,
        encrypted: true,
        verified: true,
        delivered: true
      },
      {
        id: '2',
        content: 'Hey! Thanks for using our secure messaging platform.',
        sender: 'alice',
        timestamp: Date.now() - 30000,
        encrypted: true,
        verified: true,
        delivered: true,
        hash: '0xabc123...'
      }
    ]);

    // Connect WebSocket
    const token = localStorage.getItem('token');
    if (token) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          setMessages(prev => [...prev, {
            id: data.id,
            content: data.content || atob(data.cipher || ''),
            sender: data.sender,
            timestamp: data.timestamp,
            encrypted: !!data.cipher,
            verified: !!data.sig,
            delivered: true,
            hash: data.hash
          }]);
        }
      };

      return () => ws.close();
    }
  }, [roomId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!messageInput.trim()) return;

    const newMessage: Message = {
      id: crypto.randomUUID(),
      content: messageInput,
      sender: 'me',
      timestamp: Date.now(),
      encrypted: isEncrypted,
      verified: false,
      delivered: false
    };

    setMessages(prev => [...prev, newMessage]);

    // Send via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        roomId,
        content: isEncrypted ? undefined : messageInput,
        cipher: isEncrypted ? btoa(messageInput) : undefined
      }));
    }

    setMessageInput('');

    // Simulate delivery confirmation
    setTimeout(() => {
      setMessages(prev => prev.map(m => 
        m.id === newMessage.id ? { ...m, delivered: true, verified: true } : m
      ));
    }, 500);
  };

  const getMessageStatus = (msg: Message) => {
    if (!msg.delivered) return (
      <div className="flex items-center gap-0.5" title="Sent">
        <Check className="h-3 w-3 text-gray-400" />
      </div>
    );
    if (!msg.verified) return (
      <div className="flex items-center gap-0.5" title="Delivered">
        <CheckCheck className="h-3 w-3 text-gray-400" />
      </div>
    );
    return (
      <div className="flex items-center gap-0.5" title="Verified">
        <CheckCheck className="h-3 w-3 text-blue-500" />
        <Shield className="h-2.5 w-2.5 text-green-500" />
      </div>
    );
  };

  if (showAttestation) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0B0F1A] dark:to-[#151A2A]">
        <div className="w-full max-w-2xl">
          <Button 
            variant="ghost" 
            onClick={() => setShowAttestation(false)}
            className="mb-4"
          >
            ← Back to chat
          </Button>
          <AttestationCard />
        </div>
      </div>
    );
  }

  if (showKeyHealth) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0B0F1A] dark:to-[#151A2A]">
        <div className="w-full max-w-2xl">
          <Button 
            variant="ghost" 
            onClick={() => setShowKeyHealth(false)}
            className="mb-4"
          >
            ← Back to chat
          </Button>
          <KeyHealth />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0B0F1A] dark:to-[#151A2A]">
      {/* Chat Header */}
      <div className="px-6 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {roomId[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
            </div>
            <div>
              <h3 className="font-semibold capitalize">{roomId}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {isEncrypted && (
                  <>
                    <Lock className="h-3 w-3 text-green-500" />
                    <span>End-to-end encrypted</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAttestation(true)}
              className="gap-1.5"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Attestation</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowKeyHealth(true)}
              className="gap-1.5"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Keys</span>
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6 py-4">
        <AnimatePresence initial={false}>
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`flex gap-3 ${msg.sender === 'me' ? 'justify-end' : ''}`}
              >
                {msg.sender !== 'me' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {msg.sender === 'system' ? 'S' : msg.sender[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`max-w-[70%] ${msg.sender === 'me' ? 'items-end' : ''}`}>
                  <Card className={`px-4 py-3 ${
                    msg.sender === 'me' 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0' 
                      : 'bg-white dark:bg-gray-800'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    
                    <div className={`flex items-center gap-2 mt-2 text-xs ${
                      msg.sender === 'me' ? 'text-blue-100' : 'text-muted-foreground'
                    }`}>
                      <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      {msg.sender === 'me' && getMessageStatus(msg)}
                      {msg.hash && (
                        <span className="font-mono opacity-50">{msg.hash.substring(0, 8)}</span>
                      )}
                    </div>
                  </Card>
                </div>
                
                {msg.sender === 'me' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>Me</AvatarFallback>
                  </Avatar>
                )}
              </motion.div>
            ))}
            <div ref={scrollRef} />
          </div>
        </AnimatePresence>
      </ScrollArea>

      {/* Message Input */}
      <div className="px-6 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Badge 
              variant={isEncrypted ? "default" : "secondary"}
              className="gap-1 cursor-pointer"
              onClick={() => setIsEncrypted(!isEncrypted)}
            >
              <Lock className="h-3 w-3" />
              {isEncrypted ? 'Encrypted' : 'Unencrypted'}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="shrink-0">
              <Paperclip className="h-5 w-5" />
            </Button>
            <Input
              placeholder={isEncrypted ? "Type an encrypted message..." : "Type a message..."}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 h-11"
              data-testid="input-message"
            />
            <Button variant="ghost" size="icon" className="shrink-0">
              <Smile className="h-5 w-5" />
            </Button>
            <Button 
              onClick={sendMessage}
              className="shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              data-testid="button-send"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}