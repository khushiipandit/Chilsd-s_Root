import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const ROLE_ROUTES = {
  parent: "/parent",
  child: "/child",
  expert: "/expert",
  admin: "/admin"
};

const ROLE_LABELS = {
  parent: "👨‍👩‍👧 Parent",
  child: "🧒 Child",
  expert: "🩺 Expert",
  admin: "🛡️ Admin"
};

function Navbar() {
  const navigate = useNavigate();
  const { currentUser, userRole, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  function goDashboard() {
    const path = ROLE_ROUTES[userRole] || "/parent";
    navigate(path);
  }

  const styles = {
    navbar: {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      padding: "20px 8%",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      zIndex: 1000,
      background: "rgba(255,255,255,0.08)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      boxSizing: "border-box"
    },
    logo: {
      fontSize: "24px",
      fontWeight: "700",
      color: "white",
      cursor: "pointer",
      letterSpacing: "1px"
    },
    navLinks: {
      display: "flex",
      gap: "30px",
      alignItems: "center"
    },
    link: {
      color: "white",
      fontSize: "16px",
      cursor: "pointer",
      fontWeight: "500",
      opacity: 0.9
    },
    authBtn: {
      padding: "10px 18px",
      borderRadius: "10px",
      border: "1px solid rgba(255,255,255,0.5)",
      color: "white",
      background: "transparent",
      cursor: "pointer",
      fontWeight: "600"
    },
    roleBadge: {
      color: "white",
      fontSize: "13px",
      fontWeight: "600",
      background: "rgba(107,107,214,0.5)",
      padding: "5px 12px",
      borderRadius: "20px",
      border: "1px solid rgba(107,107,214,0.8)"
    },
    userName: {
      color: "white",
      fontSize: "14px",
      fontWeight: "500",
      opacity: 0.9
    }
  };

  return (
    <nav style={styles.navbar}>

      <div style={styles.logo} onClick={() => navigate("/")}>
        KidRoots
      </div>

      <div style={styles.navLinks}>

        <span style={styles.link}>Features</span>

        {currentUser && (
          <span style={styles.link} onClick={goDashboard}>
            Dashboard
          </span>
        )}

        {currentUser ? (
          <>
            {userRole && (
              <span style={styles.roleBadge}>
                {ROLE_LABELS[userRole] || userRole}
              </span>
            )}
            <span style={styles.userName}>
              {currentUser.displayName || currentUser.email}
            </span>
            <button style={styles.authBtn} onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <button style={styles.authBtn} onClick={() => navigate("/auth")}>
            Login / Signup
          </button>
        )}

        <span style={styles.link}>Help</span>

      </div>
    </nav>
  );
}

export default Navbar;
