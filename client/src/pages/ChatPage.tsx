import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { 
  Shield, Send, Lock, CheckCircle2, AlertCircle, 
  Users, User, Hash, Plus, LogOut, Key, QrCode,
  Activity, FileText, Bot
} from 'lucide-react';

interface Room {
  id: string;
  name: string;
  kind: 'dm' | 'group' | 'channel';
  lastMessage?: string;
  unread?: number;
}

interface Message {
  id: string;
  roomId: string;
  sender: string;
  content?: string;
  cipher?: string;
  sig?: string;
  hash?: string;
  timestamp: number;
}

export default function ChatPage() {
  const [, setLocation] = useLocation();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLocation('/');
      return;
    }

    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      toast({
        title: 'Connected',
        description: 'Secure connection established'
      });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'init':
          loadRooms();
          break;
        case 'message':
          handleIncomingMessage(data);
          break;
        case 'presence':
          handlePresenceUpdate(data);
          break;
        case 'key_exchange':
          handleKeyExchange(data);
          break;
      }
    };

    ws.onerror = () => {
      toast({
        title: 'Connection error',
        description: 'Failed to connect to server',
        variant: 'destructive'
      });
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [navigate]);

  const loadRooms = async () => {
    // Simulated rooms for demo
    setRooms([
      { id: 'general', name: 'General', kind: 'channel', lastMessage: 'Welcome to Nexo!' },
      { id: 'team', name: 'Team Chat', kind: 'group', lastMessage: 'Latest updates', unread: 2 },
      { id: 'alice', name: 'Alice', kind: 'dm', lastMessage: 'Hey there!' }
    ]);
  };

  const handleIncomingMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handlePresenceUpdate = (data: any) => {
    // Update user presence status
    console.log('Presence update:', data);
  };

  const handleKeyExchange = (data: any) => {
    // Handle E2EE key exchange
    console.log('Key exchange:', data);
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedRoom || !wsRef.current) return;

    const message: any = {
      type: 'message',
      roomId: selectedRoom.id,
      timestamp: Date.now()
    };

    if (encryptionEnabled) {
      // TODO: Encrypt message with recipient's public key
      message.cipher = btoa(messageInput); // Base64 for demo
      message.sig = 'demo_signature';
    } else {
      message.content = messageInput;
    }

    wsRef.current.send(JSON.stringify(message));
    setMessageInput('');

    // Add to local messages immediately
    handleIncomingMessage({
      ...message,
      id: crypto.randomUUID(),
      sender: localStorage.getItem('userId') || 'me'
    });
  };

  const handleLogout = () => {
    localStorage.clear();
    setLocation('/');
  };

  const getRoomIcon = (kind: string) => {
    switch (kind) {
      case 'dm': return <User className="h-4 w-4" />;
      case 'group': return <Users className="h-4 w-4" />;
      case 'channel': return <Hash className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-lg">Nexo Everywhere</h2>
            <div className="flex gap-1">
              {isConnected ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" data-testid="button-keys">
              <Key className="h-3 w-3 mr-1" />
              Keys
            </Button>
            <Button size="sm" variant="outline" className="flex-1" data-testid="button-qr">
              <QrCode className="h-3 w-3 mr-1" />
              QR
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {rooms.map(room => (
              <Button
                key={room.id}
                variant={selectedRoom?.id === room.id ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setSelectedRoom(room)}
                data-testid={`room-${room.id}`}
              >
                <div className="flex items-center gap-2 w-full">
                  {getRoomIcon(room.kind)}
                  <div className="flex-1 text-left">
                    <div className="font-medium">{room.name}</div>
                    {room.lastMessage && (
                      <div className="text-xs text-muted-foreground truncate">
                        {room.lastMessage}
                      </div>
                    )}
                  </div>
                  {room.unread && (
                    <Badge variant="default" className="ml-auto">
                      {room.unread}
                    </Badge>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t space-y-2">
          <Button variant="outline" size="sm" className="w-full" data-testid="button-attestation">
            <FileText className="h-3 w-3 mr-1" />
            Attestation Card
          </Button>
          <Button variant="outline" size="sm" className="w-full" data-testid="button-health">
            <Activity className="h-3 w-3 mr-1" />
            Key Health
          </Button>
          <Button variant="outline" size="sm" className="w-full" data-testid="button-bot">
            <Bot className="h-3 w-3 mr-1" />
            Bot Assistant
          </Button>
          <Separator />
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-3 w-3 mr-1" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {selectedRoom.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedRoom.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {encryptionEnabled ? (
                      <>
                        <Lock className="h-3 w-3 text-green-500" />
                        <span>End-to-end encrypted</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 text-yellow-500" />
                        <span>Unencrypted</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={encryptionEnabled ? 'default' : 'outline'}
                  onClick={() => setEncryptionEnabled(!encryptionEnabled)}
                  data-testid="button-encryption"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  E2EE
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.filter(m => m.roomId === selectedRoom.id).map(msg => (
                  <div 
                    key={msg.id} 
                    className="flex gap-3"
                    data-testid={`message-${msg.id}`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {msg.sender === localStorage.getItem('userId') ? 'Me' : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {msg.sender === localStorage.getItem('userId') ? 'You' : 'User'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                        {msg.sig && (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="h-2 w-2 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <Card className="max-w-lg">
                        <CardContent className="p-3">
                          {msg.cipher ? (
                            <div className="text-sm">
                              {atob(msg.cipher)} {/* Decode for demo */}
                            </div>
                          ) : (
                            <div className="text-sm">{msg.content}</div>
                          )}
                        </CardContent>
                      </Card>
                      {msg.hash && (
                        <div className="text-xs text-muted-foreground font-mono">
                          Hash: {msg.hash.substring(0, 16)}...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder={encryptionEnabled ? "Type an encrypted message..." : "Type a message..."}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  data-testid="input-message"
                />
                <Button onClick={sendMessage} data-testid="button-send">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Shield className="h-12 w-12 mx-auto opacity-20" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}