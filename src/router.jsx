import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import Login from "./pages/auth/Login";
import AdminAccessRequest from "./pages/auth/AdminAccessRequest";
import AdminRequests from "./pages/AdminRequests";
import CreditsInfo from "./pages/CreditsInfo";
import Dashboard from "./pages/Dashboard";
import Deadlines from "./pages/Deadlines";
import Announcements from "./pages/Announcements";
import Students from "./pages/Students";
import Subjects from "./pages/Subjects";
import Events from "./pages/Events";
import Schedules from "./pages/Schedules";
import Organizations from "./pages/Organizations";
import Settings from "./pages/Settings";
import Calendar from "./pages/Calendar";
import SubjectDetail from "./pages/SubjectDetail";
import DeadlineDetail from "./pages/DeadlineDetail";
import PlaceholderPage from "./pages/PlaceholderPage";
import Gallery from "./pages/Gallery";
import AlbumDetail from "./pages/AlbumDetail";
import { NAV_ITEMS } from "./utils/constants";

const BUILT_ROUTES = {
  "/dashboard": Dashboard,
  "/deadlines": Deadlines,
  "/announcements": Announcements,
  "/students": Students,
  "/subjects": Subjects,
  "/events": Events,
  "/schedule": Schedules,
  "/organizations": Organizations,
  "/calendar": Calendar,
  "/settings": Settings,
  "/gallery": Gallery,
};

function withLayout(node, { adminOnly = false } = {}) {
  return (
    <ProtectedRoute adminOnly={adminOnly}>
      <DashboardLayout>{node}</DashboardLayout>
    </ProtectedRoute>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/request-admin" element={<AdminAccessRequest />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {NAV_ITEMS.map(({ path, label }) => {
        const Page = BUILT_ROUTES[path];

        return (
          <Route
            key={path}
            path={path}
            element={withLayout(
              Page ? <Page /> : <PlaceholderPage title={label} />
            )}
          />
        );
      })}

      <Route
        path="/subjects/:id"
        element={withLayout(<SubjectDetail />)}
      />
      <Route
        path="/deadlines/:id"
        element={withLayout(<DeadlineDetail />)}
      />
      <Route path="/gallery/:id" element={withLayout(<AlbumDetail />)} />
      <Route
        path="/admin-requests"
        element={withLayout(<AdminRequests />, { adminOnly: true })}
      />
      <Route
        path="/credits-info"
        element={withLayout(<CreditsInfo />, { adminOnly: true })}
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
