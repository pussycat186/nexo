import { useState, useEffect } from "react";
import { authManager } from "@/lib/auth";
import { deviceKeys } from "@/lib/crypto";
import AuthScreen from "@/components/auth/AuthScreen";
import Sidebar from "@/components/chat/Sidebar";
import ChatArea from "@/components/chat/ChatArea";
import SecurityInfoModal from "@/components/modals/SecurityInfoModal";
import NewConversationModal from "@/components/modals/NewConversationModal";
import SettingsModal from "@/components/modals/SettingsModal";

export default function Chat() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = () => {
      deviceKeys.loadKeys();
      setIsAuthenticated(authManager.isAuthenticated());
    };

    checkAuth();
  }, []);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSelectedConversation(null);
  };

  const handleConversationSelect = (conversation: any) => {
    setSelectedConversation(conversation);
  };

  const handleNewConversation = () => {
    setShowNewConversationModal(true);
  };

  const handleConversationCreated = (conversation: any) => {
    setSelectedConversation(conversation);
  };

  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground" data-testid="chat-main">
      <Sidebar
        onConversationSelect={handleConversationSelect}
        onNewConversation={handleNewConversation}
        onShowSettings={() => setShowSettingsModal(true)}
        selectedConversationId={selectedConversation?.id}
      />

      <ChatArea
        conversation={selectedConversation}
        onShowSecurity={() => setShowSecurityModal(true)}
        onShowConversationSettings={() => {}}
      />

      <SecurityInfoModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
      />

      <NewConversationModal
        isOpen={showNewConversationModal}
        onClose={() => setShowNewConversationModal(false)}
        onConversationCreated={handleConversationCreated}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}
