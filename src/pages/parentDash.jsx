import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/* ── Growth Tracker Logic (ported from growth_tracker.py) ── */
const HEIGHT_STANDARDS = { 1: [70, 78], 2: [82, 92], 5: [100, 115] };

function analyzeGrowth(ageYears, heightCm, weightKg) {
  const bmi = +(weightKg / Math.pow(heightCm / 100, 2)).toFixed(2);
  const range = HEIGHT_STANDARDS[ageYears];
  let status = "Normal", advice = "All is well — maintain the child's current diet and activity.";
  if (range) {
    if (heightCm < range[0]) {
      status = "Stunted Growth";
      advice = "Height is below standard. Increase calcium and protein in the diet.";
    } else if (bmi > 25) {
      status = "Overweight";
      advice = "Increase physical activity and reduce sugar intake.";
    }
  }
  return { bmi, status, advice };
}

/* ── Vaccine Schedule (from VaccineApp logic) ── */
const VACCINE_SCHEDULE = [
  { ageMonths: 0,   name: "BCG",      desc: "Tuberculosis" },
  { ageMonths: 0,   name: "Hep B1",   desc: "Hepatitis B (Birth dose)" },
  { ageMonths: 1.5, name: "DTaP 1",   desc: "Diphtheria / Tetanus / Pertussis" },
  { ageMonths: 1.5, name: "IPV 1",    desc: "Polio" },
  { ageMonths: 6,   name: "Flu",      desc: "Influenza (Annual)" },
  { ageMonths: 9,   name: "MMR 1",    desc: "Measles / Mumps / Rubella" },
];

function getVaccinePlan(dobStr) {
  const dob = new Date(dobStr);
  const today = new Date();
  return VACCINE_SCHEDULE.map((v) => {
    const due = new Date(dob);
    due.setDate(due.getDate() + Math.round(v.ageMonths * 30.44));
    return { ...v, due, done: due < today };
  });
}

/* ── Shared styles ── */
const C = {
  purple: "#6b6bd6",
  green: "#3aa67c",
  orange: "#f59e0b",
  red: "#ef4444",
  bg: "#f4f6fb",
  card: "#ffffff",
  border: "#e8eaf0"
};

const sidebarItems = [
  { id: "overview",      label: "Overview",        icon: "🏠" },
  { id: "growth",        label: "Growth Tracker",  icon: "📈" },
  { id: "vaccines",      label: "Vaccine Planner", icon: "💉" },
  { id: "resources",     label: "Resources",       icon: "📚" },
];

export default function ParentDash() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  /* Growth tracker state */
  const [gt, setGt] = useState({ age: "", height: "", weight: "" });
  const [gtResult, setGtResult] = useState(null);

  /* Vaccine planner state */
  const [dob, setDob] = useState("");
  const [vaccines, setVaccines] = useState([]);

  const name = userProfile?.displayName || currentUser?.displayName || "Parent";

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  function runGrowthTracker(e) {
    e.preventDefault();
    const result = analyzeGrowth(+gt.age, +gt.height, +gt.weight);
    setGtResult(result);
  }

  function runVaccinePlan(e) {
    e.preventDefault();
    setVaccines(getVaccinePlan(dob));
  }

  /* ── Styles ── */
  const s = {
    shell: { display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "system-ui,sans-serif" },
    sidebar: {
      width: "240px", minHeight: "100vh", background: "linear-gradient(180deg,#1a1a2e,#16213e)",
      padding: "30px 0", display: "flex", flexDirection: "column", flexShrink: 0
    },
    sbLogo: { color: "white", fontWeight: "800", fontSize: "22px", padding: "0 24px 28px", letterSpacing: "0.5px" },
    sbItem: (active) => ({
      display: "flex", alignItems: "center", gap: "12px",
      padding: "13px 24px", cursor: "pointer",
      background: active ? "rgba(107,107,214,0.3)" : "transparent",
      borderRight: active ? `3px solid ${C.purple}` : "3px solid transparent",
      color: active ? "white" : "rgba(255,255,255,0.6)",
      fontSize: "14px", fontWeight: active ? "600" : "400",
      transition: "all 0.2s"
    }),
    sbBottom: { marginTop: "auto", padding: "20px 24px" },
    logoutBtn: {
      width: "100%", padding: "10px", background: "rgba(255,255,255,0.08)",
      color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "500"
    },
    main: { flex: 1, padding: "36px 40px", overflowY: "auto" },
    pageHeader: { marginBottom: "32px" },
    greeting: { fontSize: "26px", fontWeight: "700", color: "#1a1a2e", margin: 0 },
    subGreet: { fontSize: "14px", color: "#888", marginTop: "4px" },
    statsRow: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "20px", marginBottom: "32px" },
    statCard: (color) => ({
      background: C.card, borderRadius: "16px", padding: "22px 24px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderLeft: `4px solid ${color}`
    }),
    statVal: { fontSize: "32px", fontWeight: "800", color: "#1a1a2e" },
    statLabel: { fontSize: "13px", color: "#888", marginTop: "4px" },
    sectionCard: {
      background: C.card, borderRadius: "16px", padding: "28px 30px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: "24px"
    },
    sectionTitle: { fontSize: "18px", fontWeight: "700", color: "#1a1a2e", marginBottom: "20px" },
    formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" },
    fieldWrap: { display: "flex", flexDirection: "column", gap: "6px" },
    fieldLabel: { fontSize: "12px", fontWeight: "600", color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" },
    fieldInput: {
      padding: "11px 14px", borderRadius: "10px", border: `1.5px solid ${C.border}`,
      fontSize: "15px", outline: "none", background: "#fafafe"
    },
    submitBtn: {
      padding: "12px 28px", background: `linear-gradient(135deg,${C.purple},#8b5cf6)`,
      color: "white", border: "none", borderRadius: "10px", fontWeight: "600",
      fontSize: "15px", cursor: "pointer"
    },
    resultBox: (color) => ({
      marginTop: "20px", padding: "20px 24px", borderRadius: "14px",
      background: color === C.green ? "#f0faf5" : color === C.red ? "#fff5f5" : "#fff8ec",
      border: `1.5px solid ${color}`
    }),
    resultStatus: (color) => ({ fontSize: "18px", fontWeight: "700", color }),
    resultBMI: { fontSize: "14px", color: "#666", marginTop: "4px" },
    resultAdvice: { fontSize: "14px", color: "#444", marginTop: "10px", lineHeight: "1.6" },
    /* Vaccine */
    vaccineRow: (done) => ({
      display: "flex", alignItems: "center", gap: "14px",
      padding: "14px 0", borderBottom: `1px solid ${C.border}`
    }),
    vaccineDot: (done) => ({
      width: "36px", height: "36px", borderRadius: "50%",
      background: done ? "#dcfce7" : "#fef9c3",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "16px", flexShrink: 0
    }),
    vaccineInfo: { flex: 1 },
    vaccineName: { fontWeight: "700", fontSize: "15px", color: "#1a1a2e" },
    vaccineDesc: { fontSize: "13px", color: "#888", marginTop: "2px" },
    vaccineDue: (done) => ({
      fontSize: "13px", fontWeight: "600",
      color: done ? C.green : C.orange,
      background: done ? "#dcfce7" : "#fef9c3",
      padding: "4px 10px", borderRadius: "20px"
    }),
    /* Resources */
    resourceGrid: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "16px" },
    resourceCard: {
      padding: "20px", borderRadius: "14px", border: `1.5px solid ${C.border}`,
      background: "#fafafe", cursor: "pointer"
    },
    resourceEmoji: { fontSize: "28px", marginBottom: "10px" },
    resourceTitle: { fontWeight: "700", color: "#1a1a2e", marginBottom: "4px" },
    resourceSub: { fontSize: "13px", color: "#888" }
  };

  /* ── Status color helper ── */
  function statusColor(status) {
    if (status === "Normal") return C.green;
    if (status === "Overweight") return C.orange;
    return C.red;
  }

  return (
    <div style={s.shell}>

      {/* SIDEBAR */}
      <aside style={s.sidebar}>
        <div style={s.sbLogo}>KidRoots</div>

        {sidebarItems.map((item) => (
          <div
            key={item.id}
            style={s.sbItem(activeTab === item.id)}
            onClick={() => setActiveTab(item.id)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}

        <div style={s.sbBottom}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginBottom: "12px" }}>
            {name}
          </div>
          <button style={s.logoutBtn} onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={s.main}>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <>
            <div style={s.pageHeader}>
              <h1 style={s.greeting}>Welcome back, {name.split(" ")[0]} 👋</h1>
              <p style={s.subGreet}>Here's a summary of your child's wellbeing today.</p>
            </div>

            <div style={s.statsRow}>
              <div style={s.statCard(C.purple)}>
                <div style={s.statVal}>3</div>
                <div style={s.statLabel}>Children Registered</div>
              </div>
              <div style={s.statCard(C.green)}>
                <div style={s.statVal}>87%</div>
                <div style={s.statLabel}>Avg. Health Score</div>
              </div>
              <div style={s.statCard(C.orange)}>
                <div style={s.statVal}>2</div>
                <div style={s.statLabel}>Vaccines Due</div>
              </div>
            </div>

            <div style={s.sectionCard}>
              <div style={s.sectionTitle}>Quick Actions</div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {[
                  { label: "Run Growth Check", icon: "📈", tab: "growth" },
                  { label: "View Vaccine Plan", icon: "💉", tab: "vaccines" },
                  { label: "Browse Resources", icon: "📚", tab: "resources" },
                ].map((a) => (
                  <button
                    key={a.tab}
                    onClick={() => setActiveTab(a.tab)}
                    style={{
                      padding: "12px 20px", borderRadius: "12px",
                      border: `1.5px solid ${C.border}`, background: "white",
                      cursor: "pointer", fontSize: "14px", fontWeight: "600",
                      display: "flex", alignItems: "center", gap: "8px", color: "#1a1a2e"
                    }}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={s.sectionCard}>
              <div style={s.sectionTitle}>Recent Activity</div>
              {[
                { icon: "📈", text: "Growth check completed for Aarav", time: "2 days ago" },
                { icon: "💉", text: "MMR 1 vaccine scheduled for March 25", time: "3 days ago" },
                { icon: "📚", text: "Read: Healthy Sleep Habits for Toddlers", time: "1 week ago" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "14px", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: "20px" }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: "14px", color: "#1a1a2e" }}>{item.text}</div>
                    <div style={{ fontSize: "12px", color: "#aaa", marginTop: "2px" }}>{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* GROWTH TRACKER */}
        {activeTab === "growth" && (
          <>
            <div style={s.pageHeader}>
              <h1 style={s.greeting}>Growth Tracker 📈</h1>
              <p style={s.subGreet}>WHO-standard analysis of your child's height and weight.</p>
            </div>

            <div style={s.sectionCard}>
              <div style={s.sectionTitle}>Enter Child's Measurements</div>
              <form onSubmit={runGrowthTracker}>
                <div style={s.formGrid}>
                  <div style={s.fieldWrap}>
                    <label style={s.fieldLabel}>Age (years)</label>
                    <select
                      style={s.fieldInput}
                      value={gt.age}
                      onChange={(e) => setGt({ ...gt, age: e.target.value })}
                      required
                    >
                      <option value="">Select age</option>
                      <option value="1">1 year</option>
                      <option value="2">2 years</option>
                      <option value="5">5 years</option>
                    </select>
                  </div>
                  <div style={s.fieldWrap}>
                    <label style={s.fieldLabel}>Height (cm)</label>
                    <input
                      type="number" placeholder="e.g. 85"
                      style={s.fieldInput} value={gt.height}
                      onChange={(e) => setGt({ ...gt, height: e.target.value })} required
                    />
                  </div>
                  <div style={s.fieldWrap}>
                    <label style={s.fieldLabel}>Weight (kg)</label>
                    <input
                      type="number" placeholder="e.g. 12"
                      style={s.fieldInput} value={gt.weight}
                      onChange={(e) => setGt({ ...gt, weight: e.target.value })} required
                    />
                  </div>
                </div>
                <button style={s.submitBtn} type="submit">Analyze Growth</button>
              </form>

              {gtResult && (
                <div style={s.resultBox(statusColor(gtResult.status))}>
                  <div style={s.resultStatus(statusColor(gtResult.status))}>
                    {gtResult.status === "Normal" ? "✅" : gtResult.status === "Overweight" ? "⚠️" : "🔴"}{" "}
                    {gtResult.status}
                  </div>
                  <div style={s.resultBMI}>BMI: <strong>{gtResult.bmi}</strong></div>
                  <div style={s.resultAdvice}>{gtResult.advice}</div>
                </div>
              )}
            </div>

            <div style={s.sectionCard}>
              <div style={s.sectionTitle}>WHO Growth Standards Reference</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "#f4f6fb" }}>
                    {["Age", "Min Height (cm)", "Max Height (cm)", "Healthy BMI"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#555", fontWeight: "600" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { age: "1 year", min: 70, max: 78, bmi: "15–18" },
                    { age: "2 years", min: 82, max: 92, bmi: "15–18" },
                    { age: "5 years", min: 100, max: 115, bmi: "14–17" },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "10px 14px", color: "#1a1a2e" }}>{row.age}</td>
                      <td style={{ padding: "10px 14px", color: "#444" }}>{row.min}</td>
                      <td style={{ padding: "10px 14px", color: "#444" }}>{row.max}</td>
                      <td style={{ padding: "10px 14px", color: "#444" }}>{row.bmi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* VACCINE PLANNER */}
        {activeTab === "vaccines" && (
          <>
            <div style={s.pageHeader}>
              <h1 style={s.greeting}>Vaccine Planner 💉</h1>
              <p style={s.subGreet}>Track upcoming and completed vaccinations based on your child's date of birth.</p>
            </div>

            <div style={s.sectionCard}>
              <div style={s.sectionTitle}>Enter Baby's Date of Birth</div>
              <form onSubmit={runVaccinePlan} style={{ display: "flex", gap: "14px", alignItems: "flex-end" }}>
                <div style={s.fieldWrap}>
                  <label style={s.fieldLabel}>Date of Birth</label>
                  <input
                    type="date" style={{ ...s.fieldInput, width: "220px" }}
                    value={dob} onChange={(e) => setDob(e.target.value)} required
                  />
                </div>
                <button style={s.submitBtn} type="submit">View Plan</button>
              </form>
            </div>

            {vaccines.length > 0 && (
              <>
                <div style={{ ...s.sectionCard, marginBottom: "24px" }}>
                  <div style={s.sectionTitle}>Upcoming Vaccines</div>
                  {vaccines.filter((v) => !v.done).length === 0 && (
                    <p style={{ color: "#888", fontSize: "14px" }}>All vaccines completed! Great job. 🎉</p>
                  )}
                  {vaccines.filter((v) => !v.done).map((v, i) => (
                    <div key={i} style={s.vaccineRow(false)}>
                      <div style={s.vaccineDot(false)}>💉</div>
                      <div style={s.vaccineInfo}>
                        <div style={s.vaccineName}>{v.name}</div>
                        <div style={s.vaccineDesc}>{v.desc}</div>
                      </div>
                      <div style={s.vaccineDue(false)}>
                        Due: {v.due.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={s.sectionCard}>
                  <div style={s.sectionTitle}>Completed Vaccines</div>
                  {vaccines.filter((v) => v.done).length === 0 && (
                    <p style={{ color: "#888", fontSize: "14px" }}>No vaccines completed yet.</p>
                  )}
                  {vaccines.filter((v) => v.done).map((v, i) => (
                    <div key={i} style={s.vaccineRow(true)}>
                      <div style={s.vaccineDot(true)}>✅</div>
                      <div style={s.vaccineInfo}>
                        <div style={{ ...s.vaccineName, color: "#555" }}>{v.name}</div>
                        <div style={s.vaccineDesc}>{v.desc}</div>
                      </div>
                      <div style={s.vaccineDue(true)}>Completed</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* RESOURCES */}
        {activeTab === "resources" && (
          <>
            <div style={s.pageHeader}>
              <h1 style={s.greeting}>Resources 📚</h1>
              <p style={s.subGreet}>Expert-curated articles and guides for your parenting journey.</p>
            </div>

            <div style={s.sectionCard}>
              <div style={s.sectionTitle}>Featured Articles</div>
              <div style={s.resourceGrid}>
                {[
                  { emoji: "😴", title: "Healthy Sleep Habits", sub: "Toddlers & Infants · 5 min read" },
                  { emoji: "🥦", title: "Nutritional Guide Ages 1–5", sub: "Nutrition · 8 min read" },
                  { emoji: "🧠", title: "Early Brain Development", sub: "Child Development · 6 min read" },
                  { emoji: "🏃", title: "Screen Time Guidelines", sub: "Digital Wellbeing · 4 min read" },
                  { emoji: "💬", title: "Building Emotional Vocabulary", sub: "Mental Health · 7 min read" },
                  { emoji: "🦷", title: "Dental Care from Year One", sub: "Oral Health · 3 min read" },
                ].map((r, i) => (
                  <div key={i} style={s.resourceCard}>
                    <div style={s.resourceEmoji}>{r.emoji}</div>
                    <div style={s.resourceTitle}>{r.title}</div>
                    <div style={s.resourceSub}>{r.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}
