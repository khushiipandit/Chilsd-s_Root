import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ROLE_ROUTES = {
  parent: "/parent",
  child: "/child",
  expert: "/expert",
  admin: "/admin"
};

function AuthRedirect() {
  const { userProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      const path = ROLE_ROUTES[userProfile?.role];
      if (path) {
        navigate(path, { replace: true });
      } else {
        // No valid role found — send back to auth so the user can sign in correctly
        navigate("/auth", { replace: true });
      }
    }
  }, [userProfile, loading, navigate]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg,#667eea,#764ba2)",
      color: "white",
      fontSize: "18px",
      fontWeight: "600"
    }}>
      Redirecting to your dashboard...
    </div>
  );
}

export default AuthRedirect;
