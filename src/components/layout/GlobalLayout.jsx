import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";

const DASHBOARD_PATHS = ["/parent", "/child", "/expert", "/admin", "/auth-redirect"];

function GlobalLayout({ children }) {
  const { pathname } = useLocation();
  const isDashboard = DASHBOARD_PATHS.some((p) => pathname.startsWith(p));

  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100vh" }}>
      {!isDashboard && <Navbar />}
      {children}
    </div>
  );
}

export default GlobalLayout;
