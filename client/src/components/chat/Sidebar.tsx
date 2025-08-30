import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { authManager } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

interface SidebarProps {
  onConversationSelect: (conversation: any) => void;
  onNewConversation: () => void;
  onShowSettings: () => void;
  selectedConversationId?: string;
}

export default function Sidebar({ 
  onConversationSelect, 
  onNewConversation, 
  onShowSettings,
  selectedConversationId 
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [userHandle, setUserHandle] = useState("");

  const { data: conversationsData, isLoading } = useQuery({
    queryKey: ['/api/conversations'],
    queryFn: async () => {
      const response = await fetch('/api/conversations', {
        headers: authManager.getAuthHeader()
      });
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json();
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  useEffect(() => {
    // Extract handle from JWT token
    const token = authManager.getAccessToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserHandle(payload.hdl || 'user');
      } catch (e) {
        setUserHandle('user');
      }
    }
  }, []);

  const conversations = conversationsData?.conversations || [];
  const filteredConversations = conversations.filter((conv: any) =>
    conv.peer_handle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: string | number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col" data-testid="sidebar">
      {/* User Profile Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <i className="fas fa-user text-primary-foreground text-sm"></i>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm" data-testid="text-user-handle">{userHandle}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
              <span>Encrypted</span>
              <i className="fas fa-shield-alt text-accent ml-1"></i>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-muted rounded-md"
            onClick={onShowSettings}
            data-testid="button-settings"
          >
            <i className="fas fa-cog text-muted-foreground"></i>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm"></i>
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-input border-border rounded-lg pl-10 pr-4 py-2 text-sm"
            data-testid="input-search"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto" data-testid="conversations-list">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          filteredConversations.map((conversation: any) => (
            <div
              key={conversation.id}
              className={`conversation-item p-4 cursor-pointer border-l-2 transition-colors hover:bg-muted ${
                selectedConversationId === conversation.id 
                  ? 'border-primary bg-muted/30' 
                  : 'border-transparent'
              }`}
              onClick={() => onConversationSelect(conversation)}
              data-testid={`conversation-${conversation.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-user text-secondary-foreground text-sm"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm truncate" data-testid={`text-peer-${conversation.id}`}>
                      {conversation.peer_handle || 'Unknown User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(conversation.last_message_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground truncate flex-1">
                      {conversation.last_message_preview}
                    </span>
                    <div className="flex items-center gap-1">
                      <i className="fas fa-lock text-accent text-xs"></i>
                      {conversation.unread_count > 0 && (
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Conversation Button */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={onNewConversation}
          className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          data-testid="button-new-conversation"
        >
          <i className="fas fa-plus mr-2"></i>
          New Conversation
        </Button>
      </div>
    </div>
  );
}
