import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoginPage from "@/pages/LoginPage";
import ChatPage from "@/pages/ChatPage";
import AdminPage from "@/pages/AdminPage";
import AuditPage from "@/pages/AuditPage";
import MetricsPage from "@/pages/MetricsPage";
import NotFound from "@/pages/not-found";
import AppShell from "@/components/AppShell";

function Router() {
  const isAuthRoute = window.location.pathname === '/';
  
  if (isAuthRoute) {
    return (
      <Switch>
        <Route path="/" component={LoginPage} />
        <Route component={NotFound} />
      </Switch>
    );
  }
  
  return (
    <AppShell>
      <Switch>
        <Route path="/chat" component={ChatPage} />
        <Route path="/chat/:roomId" component={ChatPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/audit" component={AuditPage} />
        <Route path="/metrics" component={MetricsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
