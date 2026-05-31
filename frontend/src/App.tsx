import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import TutorDashboard from "@/pages/TutorDashboard";
import StudentDashboard from "@/pages/StudentDashboard";
import TutorSchedulePage from "@/pages/tutor/SchedulePage";
import TutorHomeworkPage from "@/pages/tutor/HomeworkPage";
import StudentsPage from "@/pages/tutor/StudentsPage";
import TutorChatPage from "@/pages/tutor/ChatPage";
import PaymentsPage from "@/pages/tutor/PaymentsPage";
import StudentSchedulePage from "@/pages/student/SchedulePage";
import StudentHomeworkPage from "@/pages/student/HomeworkPage";
import StudentChatPage from "@/pages/student/ChatPage";
import { useAuthStore } from "@/store/auth";

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (role && user && user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function TutorRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute role="tutor">{children}</ProtectedRoute>;
}

function StudentRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute role="student">{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Tutor */}
        <Route path="/dashboard/tutor"              element={<TutorRoute><TutorDashboard /></TutorRoute>} />
        <Route path="/dashboard/tutor/schedule"     element={<TutorRoute><TutorSchedulePage /></TutorRoute>} />
        <Route path="/dashboard/tutor/homework"     element={<TutorRoute><TutorHomeworkPage /></TutorRoute>} />
        <Route path="/dashboard/tutor/students"     element={<TutorRoute><StudentsPage /></TutorRoute>} />
        <Route path="/dashboard/tutor/chat"         element={<TutorRoute><TutorChatPage /></TutorRoute>} />
        <Route path="/dashboard/tutor/payments"     element={<TutorRoute><PaymentsPage /></TutorRoute>} />

        {/* Student */}
        <Route path="/dashboard/student"            element={<StudentRoute><StudentDashboard /></StudentRoute>} />
        <Route path="/dashboard/student/schedule"   element={<StudentRoute><StudentSchedulePage /></StudentRoute>} />
        <Route path="/dashboard/student/homework"   element={<StudentRoute><StudentHomeworkPage /></StudentRoute>} />
        <Route path="/dashboard/student/chat"       element={<StudentRoute><StudentChatPage /></StudentRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
