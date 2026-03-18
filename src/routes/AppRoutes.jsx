import { Routes, Route } from "react-router-dom";
import AuthPage from "../pages/AuthPage";
import AuthRedirect from "../pages/AuthRedirect";
import PrivateRoute from "../components/PrivateRoute";

import LandingPage from "../pages/landing/landingPage";
import ParentDash from "../pages/parentDash";
import ChildDash from "../pages/childDash";
import ExpertDash from "../pages/expertDash";
import AdminDash from "../pages/adminDash";

function AppRoutes() {
  return (
    <Routes>

      {/* PUBLIC ROUTES */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth-redirect" element={<PrivateRoute><AuthRedirect /></PrivateRoute>} />

      {/* PROTECTED DASHBOARDS */}
      <Route path="/parent" element={<PrivateRoute><ParentDash /></PrivateRoute>} />
      <Route path="/child"  element={<PrivateRoute><ChildDash /></PrivateRoute>} />
      <Route path="/expert" element={<PrivateRoute><ExpertDash /></PrivateRoute>} />
      <Route path="/admin"  element={<PrivateRoute><AdminDash /></PrivateRoute>} />

    </Routes>
  );
}

export default AppRoutes;
