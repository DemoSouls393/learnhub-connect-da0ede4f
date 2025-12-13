import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ClassDetail from "./pages/ClassDetail";
import AssignmentDetail from "./pages/AssignmentDetail";
import TakeQuiz from "./pages/TakeQuiz";
import ReviewQuiz from "./pages/ReviewQuiz";
import LiveSession from "./pages/LiveSession";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/class/:id" element={<ClassDetail />} />
            <Route path="/class/:classId/assignment/:assignmentId" element={<AssignmentDetail />} />
            <Route path="/class/:classId/assignment/:assignmentId/take" element={<TakeQuiz />} />
            <Route path="/class/:classId/assignment/:assignmentId/review/:submissionId" element={<ReviewQuiz />} />
            <Route path="/class/:classId/session/:sessionId" element={<LiveSession />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;