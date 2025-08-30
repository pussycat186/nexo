import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Shield, Menu, X, Search, Plus, User, Users, Hash, 
  Settings, LogOut, ChevronRight, MessageSquare, Bell,
  Activity, Lock, Zap
} from 'lucide-react';
import { brand } from '@/styles/brand';

interface Room {
  id: string;
  name: string;
  kind: 'dm' | 'group' | 'channel';
  unread?: number;
  lastMessage?: string;
  timestamp?: Date;
}

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [keyHealthScore, setKeyHealthScore] = useState(95);
  const [rooms, setRooms] = useState<Room[]>([
    { id: 'general', name: 'General', kind: 'channel', unread: 0, lastMessage: 'Welcome!' },
    { id: 'team', name: 'Team', kind: 'group', unread: 2, lastMessage: 'Meeting at 3pm' },
    { id: 'alice', name: 'Alice', kind: 'dm', lastMessage: 'Thanks!' }
  ]);

  useEffect(() => {
    // Simulate key health monitoring
    const interval = setInterval(() => {
      setKeyHealthScore(Math.min(100, Math.max(85, keyHealthScore + (Math.random() - 0.5) * 5)));
    }, 30000);
    return () => clearInterval(interval);
  }, [keyHealthScore]);

  const getRoomIcon = (kind: string) => {
    switch (kind) {
      case 'dm': return <User className="h-4 w-4" />;
      case 'group': return <Users className="h-4 w-4" />;
      case 'channel': return <Hash className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getKeyHealthColor = () => {
    if (keyHealthScore >= 90) return 'text-green-500';
    if (keyHealthScore >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0B0F1A] dark:to-[#151A2A]">
      {/* Premium Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              duration: 0.2 
            }}
            className="w-[280px] bg-white/95 dark:bg-[#0B0F1A]/95 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 flex flex-col"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-lg tracking-tight">{brand.name}</h2>
                  <p className="text-xs text-muted-foreground">Secure messaging</p>
                </div>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-gray-100 dark:bg-gray-900/50 border-0 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Rooms List */}
            <ScrollArea className="flex-1 px-2 py-2">
              <div className="space-y-1">
                {rooms
                  .filter(room => room.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(room => (
                    <Link key={room.id} href={`/chat/${room.id}`}>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                          location.includes(room.id) 
                            ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          {getRoomIcon(room.kind)}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{room.name}</span>
                            {room.unread && room.unread > 0 && (
                              <Badge variant="default" className="h-5 min-w-[20px] px-1.5 text-xs">
                                {room.unread}
                              </Badge>
                            )}
                          </div>
                          {room.lastMessage && (
                            <p className="text-xs text-muted-foreground truncate">
                              {room.lastMessage}
                            </p>
                          )}
                        </div>
                      </motion.button>
                    </Link>
                  ))}
              </div>
            </ScrollArea>

            {/* Sidebar Footer */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                <Plus className="h-4 w-4" />
                New Conversation
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2" size="sm">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Premium Navbar */}
        <motion.header 
          initial={{ y: -60 }}
          animate={{ y: 0 }}
          className="h-14 bg-white/95 dark:bg-[#0B0F1A]/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4"
        >
          {/* Left Section */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Center Section - Room Title */}
          <div className="flex-1 text-center">
            <h3 className="font-semibold">General</h3>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Key Health Indicator */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full cursor-pointer"
            >
              <Activity className={`h-4 w-4 ${getKeyHealthColor()}`} />
              <span className="text-xs font-medium">{keyHealthScore}%</span>
              <Lock className="h-3 w-3 text-muted-foreground" />
            </motion.div>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
            </Button>

            {/* Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Activity className="mr-2 h-4 w-4" />
                  <span>Key Health</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Zap className="mr-2 h-4 w-4" />
                  <span>Attestation</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}