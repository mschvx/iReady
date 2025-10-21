import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { FirstPage } from "@/pages/FirstPage";
import { LogInOverlay } from "@/pages/LogInOverlay";
import { SignUpOverlay } from "@/pages/SignUpOverlay";
import { Home } from "@/pages/Home";
import { Account } from "@/pages/Account";

function Router() {
  return (
    <Switch>
      {/* Add pages below */}
      <Route path="/" component={FirstPage} />
      <Route path="/login" component={LogInOverlay} />
      <Route path="/signup" component={SignUpOverlay} />
      <Route path="/home" component={Home} />
      <Route path="/account" component={Account} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
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
