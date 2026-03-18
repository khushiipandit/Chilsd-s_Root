import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const CONSULTATIONS = [
  { id: 1, childName: "Aarav Sharma", parentName: "Rahul Sharma", age: 2, concern: "Delayed speech development", status: "pending", date: "Mar 20" },
  { id: 2, childName: "Priya Mehta",  parentName: "Anita Mehta",  age: 5, concern: "Recurring fever and weight loss", status: "pending", date: "Mar 21" },
  { id: 3, childName: "Kabir Singh",  parentName: "Vijay Singh",  age: 1, concern: "Growth check — low height for age", status: "reviewed", date: "Mar 15" },
];

const C = { purple: "#5c5cd6", green: "#16a34a", orange: "#d97706", red: "#dc2626", bg: "#f0f4ff", card: "#ffffff", border: "#e2e8f0" };

const sidebarItems = [
  { id: "overview",       label: "Overview",        icon: "🏠" },
  { id: "consultations",  label: "Consultations",   icon: "👶" },
  { id: "insights",       label: "Growth Insights", icon: "📊" },
  { id: "profile",        label: "My Profile",      icon: "👤" },
];

export default function ExpertDash() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [consultations, setConsultations] = useState(CONSULTATIONS);

  const name = userProfile?.displayName || currentUser?.displayName || "Expert";

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  function submitNote(id) {
    setConsultations((prev) =>
      prev.map((c) => c.id === id ? { ...c, status: "reviewed", note } : c)
    );
    setSelected(null);
    setNote("");
  }

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
    pageHeader: { marginBottom: "32px" },
    h1: { fontSize: "26px", fontWeight: "700", color: "#0f172a", margin: 0 },
    sub: { fontSize: "14px", color: "#94a3b8", marginTop: "4px" },
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
    cRow: { padding: "16px 0", borderBottom: `1px solid ${C.border}`, display: "flex", gap: "16px", alignItems: "flex-start" },
    avatar: {
      width: "42px", height: "42px", borderRadius: "50%",
      background: "linear-gradient(135deg,#6b6bd6,#ec4899)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "white", fontWeight: "700", fontSize: "16px", flexShrink: 0
    },
    statusBadge: (s) => ({
      fontSize: "12px", fontWeight: "600", padding: "3px 10px", borderRadius: "20px",
      background: s === "pending" ? "#fef3c7" : "#dcfce7",
      color: s === "pending" ? "#92400e" : "#166534"
    }),
    textarea: {
      width: "100%", padding: "12px", borderRadius: "10px", border: `1.5px solid ${C.border}`,
      fontSize: "14px", resize: "vertical", minHeight: "90px", boxSizing: "border-box",
      fontFamily: "system-ui,sans-serif", marginTop: "12px"
    },
    submitBtn: {
      marginTop: "10px", padding: "10px 22px", background: C.purple, color: "white",
      border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer"
    },
    barRow: { display: "flex", alignItems: "center", gap: "14px", marginBottom: "12px" },
    barLabel: { width: "100px", fontSize: "13px", color: "#555", flexShrink: 0 },
    barTrack: { flex: 1, height: "10px", background: "#e2e8f0", borderRadius: "99px", overflow: "hidden" },
    barFill: (w, c) => ({ height: "100%", width: `${w}%`, background: c, borderRadius: "99px" }),
    barVal: { fontSize: "13px", fontWeight: "700", color: "#0f172a", width: "40px", textAlign: "right" },
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
            <div style={s.pageHeader}>
              <h1 style={s.h1}>Expert Dashboard 🩺</h1>
              <p style={s.sub}>Welcome back, Dr. {name.split(" ").pop()}. Here's today's summary.</p>
            </div>

            <div style={s.statsRow}>
              <div style={s.statCard(C.purple)}>
                <div style={s.statVal}>12</div>
                <div style={s.statLabel}>Children Assigned</div>
              </div>
              <div style={s.statCard(C.orange)}>
                <div style={s.statVal}>{consultations.filter((c) => c.status === "pending").length}</div>
                <div style={s.statLabel}>Pending Reviews</div>
              </div>
              <div style={s.statCard(C.green)}>
                <div style={s.statVal}>{consultations.filter((c) => c.status === "reviewed").length}</div>
                <div style={s.statLabel}>Reviews Done</div>
              </div>
              <div style={s.statCard("#06b6d4")}>
                <div style={s.statVal}>98%</div>
                <div style={s.statLabel}>Parent Satisfaction</div>
              </div>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>Pending Consultations</div>
              {consultations.filter((c) => c.status === "pending").map((c) => (
                <div key={c.id} style={s.cRow}>
                  <div style={s.avatar}>{c.childName[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "700", color: "#0f172a" }}>{c.childName} <span style={{ fontWeight: "400", color: "#94a3b8", fontSize: "13px" }}>({c.age}y)</span></div>
                    <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>{c.concern}</div>
                    <div style={{ fontSize: "12px", color: "#aaa", marginTop: "4px" }}>Parent: {c.parentName} · {c.date}</div>
                  </div>
                  <button
                    onClick={() => setActiveTab("consultations")}
                    style={{ padding: "8px 16px", borderRadius: "8px", border: `1px solid ${C.purple}`, background: "white", color: C.purple, fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "consultations" && (
          <>
            <div style={s.pageHeader}>
              <h1 style={s.h1}>Consultations 👶</h1>
              <p style={s.sub}>Review and respond to parent-submitted concerns.</p>
            </div>

            {consultations.map((c) => (
              <div key={c.id} style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ display: "flex", gap: "14px" }}>
                    <div style={s.avatar}>{c.childName[0]}</div>
                    <div>
                      <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "16px" }}>{c.childName}</div>
                      <div style={{ fontSize: "13px", color: "#94a3b8" }}>Age {c.age} · {c.parentName} · {c.date}</div>
                    </div>
                  </div>
                  <span style={s.statusBadge(c.status)}>{c.status === "pending" ? "⏳ Pending" : "✅ Reviewed"}</span>
                </div>
                <div style={{ padding: "12px 16px", background: "#f8fafc", borderRadius: "10px", fontSize: "14px", color: "#334155" }}>
                  <strong>Concern:</strong> {c.concern}
                </div>
                {c.note && (
                  <div style={{ marginTop: "10px", padding: "12px 16px", background: "#f0fdf4", borderRadius: "10px", fontSize: "14px", color: "#166534" }}>
                    <strong>Your Note:</strong> {c.note}
                  </div>
                )}
                {c.status === "pending" && selected !== c.id && (
                  <button
                    onClick={() => setSelected(c.id)}
                    style={{ marginTop: "12px", padding: "9px 20px", background: C.purple, color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer" }}
                  >
                    Write Response
                  </button>
                )}
                {selected === c.id && (
                  <div>
                    <textarea
                      style={s.textarea}
                      placeholder="Write your clinical notes and advice for this child..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <button style={s.submitBtn} onClick={() => submitNote(c.id)}>Submit Response</button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {activeTab === "insights" && (
          <>
            <div style={s.pageHeader}>
              <h1 style={s.h1}>Growth Insights 📊</h1>
              <p style={s.sub}>Aggregate health trends across your assigned children.</p>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>Health Status Distribution</div>
              {[
                { label: "Normal",         val: 67, color: C.green },
                { label: "Overweight",     val: 18, color: C.orange },
                { label: "Stunted Growth", val: 15, color: C.red },
              ].map((row) => (
                <div key={row.label} style={s.barRow}>
                  <div style={s.barLabel}>{row.label}</div>
                  <div style={s.barTrack}>
                    <div style={s.barFill(row.val, row.color)} />
                  </div>
                  <div style={s.barVal}>{row.val}%</div>
                </div>
              ))}
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>Vaccine Coverage</div>
              {[
                { label: "BCG",     val: 100, color: C.green },
                { label: "Hep B1",  val: 95,  color: C.green },
                { label: "DTaP 1",  val: 88,  color: C.purple },
                { label: "IPV 1",   val: 82,  color: C.purple },
                { label: "MMR 1",   val: 60,  color: C.orange },
                { label: "Flu",     val: 43,  color: C.red },
              ].map((row) => (
                <div key={row.label} style={s.barRow}>
                  <div style={s.barLabel}>{row.label}</div>
                  <div style={s.barTrack}>
                    <div style={s.barFill(row.val, row.color)} />
                  </div>
                  <div style={s.barVal}>{row.val}%</div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "profile" && (
          <>
            <div style={s.pageHeader}>
              <h1 style={s.h1}>My Profile 👤</h1>
            </div>
            <div style={s.card}>
              <div style={{ display: "flex", gap: "20px", alignItems: "center", marginBottom: "24px" }}>
                <div style={{ ...s.avatar, width: "60px", height: "60px", fontSize: "24px" }}>
                  {name[0]}
                </div>
                <div>
                  <div style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a" }}>{name}</div>
                  <div style={{ fontSize: "14px", color: "#94a3b8" }}>{currentUser?.email}</div>
                  <span style={{ ...s.statusBadge("reviewed"), marginTop: "6px", display: "inline-block" }}>✅ Expert Account</span>
                </div>
              </div>
              {[
                { label: "Specialization", value: "Pediatric Nutrition & Growth" },
                { label: "Experience", value: "8 Years" },
                { label: "Children Managed", value: "12 active" },
                { label: "Account Type", value: "Verified Expert" },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: "14px", color: "#64748b" }}>{row.label}</span>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </>
        )}

      </main>
    </div>
  );
}
