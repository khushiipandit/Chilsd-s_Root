import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";

const C = { purple: "#5c5cd6", green: "#16a34a", orange: "#d97706", red: "#dc2626", bg: "#f1f5f9", card: "#ffffff", border: "#e2e8f0" };

const sidebarItems = [
  { id: "overview", label: "Overview",     icon: "🏠" },
  { id: "users",    label: "All Users",    icon: "👥" },
  { id: "activity", label: "Activity Log", icon: "📋" },
];

/* Demo fallback users if Firestore is empty */
const DEMO_USERS = [
  { uid: "1", displayName: "Rahul Sharma",  email: "rahul@example.com",  role: "parent", createdAt: "Mar 10, 2026" },
  { uid: "2", displayName: "Dr. Priya Nair", email: "priya@example.com", role: "expert", createdAt: "Mar 11, 2026" },
  { uid: "3", displayName: "Aarav Sharma",  email: "aarav@example.com",  role: "child",  createdAt: "Mar 12, 2026" },
  { uid: "4", displayName: "Anita Mehta",   email: "anita@example.com",  role: "parent", createdAt: "Mar 14, 2026" },
  { uid: "5", displayName: "Dr. Kabir Patel",email: "kabir@example.com", role: "expert", createdAt: "Mar 15, 2026" },
];

const ACTIVITY_LOG = [
  { icon: "👤", msg: "New parent registered: Rahul Sharma", time: "2 min ago" },
  { icon: "🩺", msg: "Expert Dr. Priya Nair completed 2 consultations", time: "15 min ago" },
  { icon: "💉", msg: "Vaccine record updated for Aarav Sharma", time: "1 hr ago" },
  { icon: "📈", msg: "Growth check submitted: Kabir Singh (age 2)", time: "3 hr ago" },
  { icon: "🔐", msg: "Admin login from new device", time: "Yesterday" },
];

export default function AdminDash() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState(DEMO_USERS);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const name = userProfile?.displayName || currentUser?.displayName || "Admin";

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "users"));
        if (!snap.empty) {
          const fetched = snap.docs.map((d) => ({
            ...d.data(),
            createdAt: d.data().createdAt?.toDate?.()?.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) || "—"
          }));
          setUsers(fetched);
        }
      } catch (_) {
        // keep demo data
      }
      setLoading(false);
    }
    loadUsers();
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const roleCount = (role) => users.filter((u) => u.role === role).length;
  const filtered = filter === "all" ? users : users.filter((u) => u.role === filter);

  const s = {
    shell: { display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "system-ui,sans-serif" },
    sidebar: {
      width: "240px", minHeight: "100vh",
      background: "linear-gradient(180deg,#0f172a,#1e293b)",
      padding: "30px 0", display: "flex", flexDirection: "column", flexShrink: 0
    },
    sbLogo: { color: "white", fontWeight: "800", fontSize: "22px", padding: "0 24px 28px" },
    sbItem: (active) => ({
      display: "flex", alignItems: "center", gap: "12px",
      padding: "13px 24px", cursor: "pointer",
      background: active ? "rgba(92,92,214,0.25)" : "transparent",
      borderRight: active ? `3px solid ${C.purple}` : "3px solid transparent",
      color: active ? "white" : "rgba(255,255,255,0.55)",
      fontSize: "14px", fontWeight: active ? "600" : "400"
    }),
    sbBottom: { marginTop: "auto", padding: "20px 24px" },
    logoutBtn: {
      width: "100%", padding: "10px", background: "rgba(255,255,255,0.07)",
      color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: "10px", cursor: "pointer", fontSize: "14px"
    },
    main: { flex: 1, padding: "36px 40px" },
    h1: { fontSize: "26px", fontWeight: "700", color: "#0f172a", margin: 0 },
    sub: { fontSize: "14px", color: "#94a3b8", marginTop: "4px", marginBottom: "32px" },
    statsRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "18px", marginBottom: "32px" },
    statCard: (c) => ({
      background: C.card, borderRadius: "14px", padding: "20px 22px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderTop: `4px solid ${c}`
    }),
    statVal: { fontSize: "30px", fontWeight: "800", color: "#0f172a" },
    statLabel: { fontSize: "12px", color: "#94a3b8", marginTop: "4px" },
    card: {
      background: C.card, borderRadius: "16px", padding: "26px 28px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)", marginBottom: "22px"
    },
    cardTitle: { fontSize: "17px", fontWeight: "700", color: "#0f172a", marginBottom: "18px" },
    filterRow: { display: "flex", gap: "10px", marginBottom: "18px", flexWrap: "wrap" },
    filterBtn: (active) => ({
      padding: "8px 18px", borderRadius: "20px",
      border: `1.5px solid ${active ? C.purple : C.border}`,
      background: active ? "#ede9fe" : "white",
      color: active ? C.purple : "#64748b",
      fontWeight: active ? "700" : "500",
      cursor: "pointer", fontSize: "13px"
    }),
    table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
    th: { padding: "10px 14px", textAlign: "left", color: "#64748b", fontWeight: "600", background: "#f8fafc", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" },
    td: { padding: "12px 14px", borderBottom: `1px solid ${C.border}`, color: "#1e293b" },
    roleBadge: (role) => {
      const map = { parent: ["#ede9fe","#6d28d9"], child: ["#fef9c3","#92400e"], expert: ["#dcfce7","#166534"], admin: ["#fee2e2","#991b1b"] };
      const [bg, col] = map[role] || ["#f1f5f9","#475569"];
      return { background: bg, color: col, padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" };
    },
    avatar: (name) => ({
      width: "34px", height: "34px", borderRadius: "50%",
      background: "linear-gradient(135deg,#6b6bd6,#ec4899)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      color: "white", fontWeight: "700", fontSize: "14px", marginRight: "10px", flexShrink: 0, verticalAlign: "middle"
    }),
  };

  return (
    <div style={s.shell}>

      {/* SIDEBAR */}
      <aside style={s.sidebar}>
        <div style={s.sbLogo}>KidRoots</div>
        {sidebarItems.map((item) => (
          <div key={item.id} style={s.sbItem(activeTab === item.id)} onClick={() => setActiveTab(item.id)}>
            <span>{item.icon}</span><span>{item.label}</span>
          </div>
        ))}
        <div style={s.sbBottom}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginBottom: "10px" }}>{name}</div>
          <button style={s.logoutBtn} onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={s.main}>

        {activeTab === "overview" && (
          <>
            <h1 style={s.h1}>Admin Panel 🛡️</h1>
            <p style={s.sub}>Platform-wide management for KidRoots.</p>

            <div style={s.statsRow}>
              <div style={s.statCard(C.purple)}>
                <div style={s.statVal}>{users.length}</div>
                <div style={s.statLabel}>Total Users</div>
              </div>
              <div style={s.statCard("#06b6d4")}>
                <div style={s.statVal}>{roleCount("parent")}</div>
                <div style={s.statLabel}>Parents</div>
              </div>
              <div style={s.statCard(C.green)}>
                <div style={s.statVal}>{roleCount("expert")}</div>
                <div style={s.statLabel}>Experts</div>
              </div>
              <div style={s.statCard(C.orange)}>
                <div style={s.statVal}>{roleCount("child")}</div>
                <div style={s.statLabel}>Children</div>
              </div>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>Recent Activity</div>
              {ACTIVITY_LOG.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "14px", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: "20px" }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", color: "#1e293b" }}>{item.msg}</div>
                    <div style={{ fontSize: "12px", color: "#aaa", marginTop: "2px" }}>{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "users" && (
          <>
            <h1 style={s.h1}>All Users 👥</h1>
            <p style={s.sub}>Manage registered users across all roles.</p>

            <div style={s.filterRow}>
              {["all","parent","child","expert"].map((r) => (
                <button key={r} style={s.filterBtn(filter === r)} onClick={() => setFilter(r)}>
                  {r === "all" ? "All Users" : r.charAt(0).toUpperCase() + r.slice(1) + "s"}
                  {" "}
                  <span style={{ fontWeight: "500", opacity: 0.7 }}>
                    ({r === "all" ? users.length : roleCount(r)})
                  </span>
                </button>
              ))}
            </div>

            <div style={s.card}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>Loading users...</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["User", "Email", "Role", "Joined"].map((h) => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => (
                      <tr key={u.uid}>
                        <td style={s.td}>
                          <span style={s.avatar(u.displayName)}>{(u.displayName || "?")[0]}</span>
                          {u.displayName || "—"}
                        </td>
                        <td style={s.td}>{u.email}</td>
                        <td style={s.td}>
                          <span style={s.roleBadge(u.role)}>{u.role}</span>
                        </td>
                        <td style={s.td}>{u.createdAt || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {activeTab === "activity" && (
          <>
            <h1 style={s.h1}>Activity Log 📋</h1>
            <p style={s.sub}>All recent platform events.</p>
            <div style={s.card}>
              {ACTIVITY_LOG.concat(ACTIVITY_LOG).map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "14px", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", color: "#1e293b" }}>{item.msg}</div>
                    <div style={{ fontSize: "12px", color: "#aaa", marginTop: "2px" }}>{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </main>
    </div>
  );
}
