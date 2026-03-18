import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const QUIZZES = [
  { q: "What color do you get when you mix red and blue?", opts: ["Green", "Purple", "Orange", "Pink"], ans: 1 },
  { q: "How many legs does a spider have?", opts: ["4", "6", "8", "10"], ans: 2 },
  { q: "Which planet is closest to the Sun?", opts: ["Earth", "Venus", "Mercury", "Mars"], ans: 2 },
];

export default function ChildDash() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [xp, setXp] = useState(120);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [streak, setStreak] = useState(3);

  const name = userProfile?.displayName || currentUser?.displayName || "Explorer";
  const level = Math.floor(xp / 100) + 1;
  const progress = xp % 100;

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  function handleAnswer(idx) {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === QUIZZES[qIdx].ans) setXp((p) => p + 20);
  }

  function nextQuestion() {
    setQIdx((i) => (i + 1) % QUIZZES.length);
    setSelected(null);
    setAnswered(false);
  }

  const s = {
    shell: {
      minHeight: "100vh",
      background: "linear-gradient(135deg,#ffecd2 0%,#fcb69f 30%,#a1c4fd 70%,#c2e9fb 100%)",
      fontFamily: "system-ui,sans-serif"
    },
    topBar: {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 32px",
      background: "rgba(255,255,255,0.5)",
      backdropFilter: "blur(10px)"
    },
    logo: { fontSize: "22px", fontWeight: "800", color: "#6b6bd6" },
    xpBar: { display: "flex", alignItems: "center", gap: "12px" },
    xpLabel: { fontSize: "14px", fontWeight: "700", color: "#6b6bd6" },
    xpTrack: { width: "120px", height: "10px", background: "rgba(255,255,255,0.6)", borderRadius: "99px", overflow: "hidden" },
    xpFill: { height: "100%", background: "linear-gradient(90deg,#6b6bd6,#ec4899)", borderRadius: "99px", width: `${progress}%`, transition: "width 0.4s" },
    logoutBtn: { padding: "8px 16px", borderRadius: "20px", border: "none", background: "rgba(255,255,255,0.7)", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
    content: { padding: "32px" },
    tabs: { display: "flex", gap: "10px", marginBottom: "28px", flexWrap: "wrap" },
    tab: (active) => ({
      padding: "10px 22px", borderRadius: "30px",
      border: "none",
      background: active ? "#6b6bd6" : "rgba(255,255,255,0.7)",
      color: active ? "white" : "#444",
      fontWeight: "700", fontSize: "14px", cursor: "pointer",
      boxShadow: active ? "0 4px 14px rgba(107,107,214,0.4)" : "none"
    }),
    card: {
      background: "rgba(255,255,255,0.85)",
      borderRadius: "20px", padding: "28px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
      marginBottom: "20px"
    },
    heroBox: {
      background: "linear-gradient(135deg,#6b6bd6,#ec4899)",
      borderRadius: "20px", padding: "32px",
      color: "white", marginBottom: "20px"
    },
    heroTitle: { fontSize: "28px", fontWeight: "800", margin: 0 },
    heroSub: { opacity: 0.85, marginTop: "8px", fontSize: "15px" },
    levelBadge: {
      display: "inline-block", background: "rgba(255,255,255,0.25)",
      padding: "6px 16px", borderRadius: "30px", fontSize: "14px", fontWeight: "700",
      marginTop: "16px"
    },
    actGrid: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "16px" },
    actCard: (color) => ({
      borderRadius: "16px", padding: "22px",
      background: color, cursor: "pointer",
      boxShadow: "0 4px 14px rgba(0,0,0,0.08)"
    }),
    actEmoji: { fontSize: "30px", marginBottom: "8px" },
    actTitle: { fontWeight: "700", fontSize: "16px", color: "white" },
    actSub: { fontSize: "13px", color: "rgba(255,255,255,0.8)", marginTop: "3px" },
    achievementRow: { display: "flex", flexWrap: "wrap", gap: "12px" },
    badge: (earned) => ({
      padding: "10px 18px", borderRadius: "30px",
      background: earned ? "linear-gradient(135deg,#ffd700,#ffa500)" : "#eee",
      color: earned ? "#7c4700" : "#aaa",
      fontWeight: "700", fontSize: "13px",
      filter: earned ? "none" : "grayscale(100%)"
    }),
    quizOpt: (sel, correct, answered, idx, ansIdx) => {
      let bg = "white", color = "#333", border = "2px solid #e0e0e0";
      if (answered) {
        if (idx === ansIdx) { bg = "#dcfce7"; color = "#16a34a"; border = "2px solid #16a34a"; }
        else if (idx === sel && idx !== ansIdx) { bg = "#fee2e2"; color = "#dc2626"; border = "2px solid #dc2626"; }
      } else if (idx === sel) { bg = "#f0efff"; border = "2px solid #6b6bd6"; }
      return { padding: "14px 18px", borderRadius: "12px", background: bg, color, border, cursor: "pointer", fontSize: "15px", fontWeight: "500", transition: "all 0.2s" };
    }
  };

  return (
    <div style={s.shell}>

      {/* TOP BAR */}
      <div style={s.topBar}>
        <div style={s.logo}>KidRoots 🌱</div>
        <div style={s.xpBar}>
          <span style={s.xpLabel}>⚡ {xp} XP</span>
          <div style={s.xpTrack}><div style={s.xpFill} /></div>
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#ec4899" }}>Lv.{level}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#6b6bd6" }}>
            🔥 {streak} day streak
          </span>
          <button style={s.logoutBtn} onClick={handleLogout}>Sign Out</button>
        </div>
      </div>

      <div style={s.content}>

        {/* TABS */}
        <div style={s.tabs}>
          {[
            { id: "home", label: "🏠 Home" },
            { id: "quiz", label: "🧠 Quiz" },
            { id: "achievements", label: "🏆 Achievements" },
          ].map((t) => (
            <button key={t.id} style={s.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* HOME */}
        {activeTab === "home" && (
          <>
            <div style={s.heroBox}>
              <h1 style={s.heroTitle}>Hi, {name.split(" ")[0]}! 🌟</h1>
              <p style={s.heroSub}>You're on a {streak}-day learning streak. Keep it up!</p>
              <div style={s.levelBadge}>Level {level} Explorer ✨</div>
            </div>

            <div style={s.actGrid}>
              {[
                { emoji: "🧠", title: "Daily Quiz", sub: "Earn +20 XP", color: "linear-gradient(135deg,#6b6bd6,#8b5cf6)", tab: "quiz" },
                { emoji: "🏆", title: "Achievements", sub: `${streak} badges earned`, color: "linear-gradient(135deg,#f59e0b,#ef4444)", tab: "achievements" },
                { emoji: "📖", title: "Story Mode", sub: "4 stories unlocked", color: "linear-gradient(135deg,#3aa67c,#06b6d4)", tab: null },
                { emoji: "🎨", title: "Creative Zone", sub: "Draw & explore", color: "linear-gradient(135deg,#ec4899,#f43f5e)", tab: null },
              ].map((a, i) => (
                <div key={i} style={s.actCard(a.color)} onClick={() => a.tab && setActiveTab(a.tab)}>
                  <div style={s.actEmoji}>{a.emoji}</div>
                  <div style={s.actTitle}>{a.title}</div>
                  <div style={s.actSub}>{a.sub}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* QUIZ */}
        {activeTab === "quiz" && (
          <div style={s.card}>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "#6b6bd6", textTransform: "uppercase", marginBottom: "8px" }}>
              Question {qIdx + 1} of {QUIZZES.length}
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1a1a2e", marginBottom: "24px" }}>
              {QUIZZES[qIdx].q}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {QUIZZES[qIdx].opts.map((opt, i) => (
                <button
                  key={i}
                  style={s.quizOpt(selected, QUIZZES[qIdx].ans, answered, i, QUIZZES[qIdx].ans)}
                  onClick={() => handleAnswer(i)}
                >
                  {opt}
                </button>
              ))}
            </div>
            {answered && (
              <div style={{ marginTop: "20px" }}>
                <div style={{
                  padding: "14px 18px", borderRadius: "12px",
                  background: selected === QUIZZES[qIdx].ans ? "#dcfce7" : "#fee2e2",
                  color: selected === QUIZZES[qIdx].ans ? "#16a34a" : "#dc2626",
                  fontWeight: "600", marginBottom: "14px"
                }}>
                  {selected === QUIZZES[qIdx].ans ? "🎉 Correct! +20 XP" : `❌ Not quite! The answer was ${QUIZZES[qIdx].opts[QUIZZES[qIdx].ans]}`}
                </div>
                <button
                  onClick={nextQuestion}
                  style={{ padding: "12px 28px", background: "#6b6bd6", color: "white", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}
                >
                  Next Question →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ACHIEVEMENTS */}
        {activeTab === "achievements" && (
          <div style={s.card}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1a1a2e", marginBottom: "20px" }}>
              🏆 Your Badges
            </h2>
            <div style={s.achievementRow}>
              {[
                { label: "🔥 3-Day Streak", earned: true },
                { label: "🧠 Quiz Master", earned: true },
                { label: "⚡ 100 XP Club", earned: true },
                { label: "📖 Bookworm", earned: false },
                { label: "🎨 Creative Star", earned: false },
                { label: "🌟 Level 5", earned: false },
              ].map((b, i) => (
                <span key={i} style={s.badge(b.earned)}>{b.label}</span>
              ))}
            </div>
            <div style={{ marginTop: "24px", padding: "16px 20px", background: "#f4f6fb", borderRadius: "12px" }}>
              <div style={{ fontWeight: "700", color: "#1a1a2e" }}>Total XP: {xp}</div>
              <div style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>
                {100 - progress} XP more to reach Level {level + 1}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
