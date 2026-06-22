
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { TestModeProvider } from "@/contexts/TestModeContext";
import { ModelsProvider } from "@/contexts/ModelsContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import AgeVerificationModal from "@/components/AgeVerificationModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import { installGlobalErrorHandlers } from "@/lib/reportError";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Gallery from "./pages/Gallery";
import PublicModel from "./pages/PublicModel";
import Discover from "./pages/Discover";
import ProfileSettings from "./pages/ProfileSettings";
import UserProfile from "./pages/UserProfile";
import ResetPassword from "./pages/ResetPassword";
import Academy from "./pages/Academy";
import Admin from "./pages/Admin";
import AdminHealth from "./pages/AdminHealth";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import DMCA from "./pages/DMCA";
import AIDisclosure from "./pages/AIDisclosure";
import AgeGate from "./pages/AgeGate";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    installGlobalErrorHandlers();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TestModeProvider>
              <ModelsProvider>
                <SubscriptionProvider>
                  <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <BrowserRouter>
                      <AgeVerificationModal />
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/gallery" element={<Gallery />} />
                        <Route path="/discover" element={<Discover />} />
                        <Route path="/explore" element={<Discover />} />
                        <Route path="/m/:slug" element={<PublicModel />} />
                        <Route path="/settings/profile" element={<ProfileSettings />} />
                        <Route path="/u/:handle" element={<UserProfile />} />
                        <Route path="/auth/reset-password" element={<ResetPassword />} />
                        <Route path="/academy" element={<Academy />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/dmca" element={<DMCA />} />
                        <Route path="/ai-disclosure" element={<AIDisclosure />} />
                        <Route path="/age-gate" element={<AgeGate />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </BrowserRouter>
                  </TooltipProvider>
                </SubscriptionProvider>
              </ModelsProvider>
            </TestModeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
