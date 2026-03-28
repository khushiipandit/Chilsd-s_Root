import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  doc, getDoc, updateDoc, addDoc,
  collection, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";

/* ── Quiz questions (general + values-based) ── */
const QUIZZES = [
  { q: "What color do you get when you mix red and blue?", opts: ["Green", "Purple", "Orange", "Pink"], ans: 1, xp: 20 },
  { q: "How many legs does a spider have?", opts: ["4", "6", "8", "10"], ans: 2, xp: 20 },
  { q: "Which planet is closest to the Sun?", opts: ["Earth", "Venus", "Mercury", "Mars"], ans: 2, xp: 20 },
  { q: "If your friend is sad, what is the kindest thing to do?", opts: ["Ignore them", "Make fun of them", "Ask if they are okay", "Walk away"], ans: 2, xp: 30 },
  { q: "You found a wallet on the ground. What should you do?", opts: ["Keep the money", "Leave it there", "Return it to the owner", "Give it to a stranger"], ans: 2, xp: 30 },
  { q: "A classmate is being left out at lunch. What do you do?", opts: ["Join in leaving them out", "Invite them to sit with you", "Laugh at them", "Ignore it"], ans: 1, xp: 30 },
  { q: "What is honesty?", opts: ["Saying what people want to hear", "Always telling the truth", "Keeping secrets", "Being very quiet"], ans: 1, xp: 20 },
  { q: "If you accidentally break something, what should you do?", opts: ["Hide it", "Blame someone else", "Tell the truth and apologize", "Run away"], ans: 2, xp: 30 },
  { q: "Which of these is a safe thing to do online?", opts: ["Share your home address", "Talk to strangers", "Tell a trusted adult if something feels wrong", "Click every link"], ans: 2, xp: 25 },
  { q: "How many planets are in our Solar System?", opts: ["7", "8", "9", "10"], ans: 1, xp: 20 },
];

/* ── Moral stories ── */
const STORIES = [
  {
    title: "The Kind Boy and the Butterfly",
    emoji: "🦋",
    color: "linear-gradient(135deg,#a8edea,#fed6e3)",
    textColor: "#1a1a2e",
    value: "Kindness",
    pages: [
      { text: "Arjun was walking to school one morning when he saw a butterfly with a broken wing lying on the path.", emoji: "🦋" },
      { text: "Other children walked past quickly. But Arjun stopped, picked up the butterfly gently, and placed it safely on a flower.", emoji: "🌸" },
      { text: "A week later, Arjun was sad because he had lost his favourite pen. His friend Meera found it and returned it.", emoji: "🖊️" },
      { text: "Meera said, 'I remembered how kind you were to that butterfly. Kindness always comes back.'", emoji: "💖" },
      { text: "Arjun smiled and remembered — every act of kindness, big or small, makes the world a better place.", emoji: "🌍" },
    ],
    lesson: "Small acts of kindness have a big impact on the world around you."
  },
  {
    title: "Riya Tells the Truth",
    emoji: "✨",
    color: "linear-gradient(135deg,#ffecd2,#fcb69f)",
    textColor: "#1a1a2e",
    value: "Honesty",
    pages: [
      { text: "Riya accidentally knocked over her mother's favourite vase while playing indoors.", emoji: "🏺" },
      { text: "She panicked. She thought about hiding the pieces or blaming the cat.", emoji: "😰" },
      { text: "But Riya remembered what her teacher said: 'Honesty takes courage, but it builds trust.'", emoji: "🏫" },
      { text: "Riya went to her mother and said, 'Maa, I broke the vase by accident. I'm really sorry.'", emoji: "🙏" },
      { text: "Her mother hugged her and said, 'I'm proud of you for telling the truth. That means more to me than any vase.'", emoji: "🤗" },
    ],
    lesson: "Being honest, even when it's hard, builds trust and makes you stronger."
  },
  {
    title: "The Sharing Tree",
    emoji: "🌳",
    color: "linear-gradient(135deg,#d4fc79,#96e6a1)",
    textColor: "#1a1a2e",
    value: "Respect",
    pages: [
      { text: "In a village there was a big mango tree that belonged to everyone. Children played under it every day.", emoji: "🌳" },
      { text: "One day, a new boy named Karan moved to the village. The other children wouldn't let him play near the tree.", emoji: "😔" },
      { text: "Priya noticed and said, 'This tree belongs to everyone. Karan should be welcome here too.'", emoji: "🤝" },
      { text: "The children realised they were being unfair. They apologised to Karan and invited him to play.", emoji: "😊" },
      { text: "From that day on, the tree was truly a sharing tree — a place where everyone was respected and included.", emoji: "🌈" },
    ],
    lesson: "Respecting others means treating everyone fairly and making everyone feel welcome."
  },
  {
    title: "Safe on the Internet",
    emoji: "🛡️",
    color: "linear-gradient(135deg,#a1c4fd,#c2e9fb)",
    textColor: "#1a1a2e",
    value: "Safety",
    pages: [
      { text: "Anika loved playing games online. One day, a stranger sent her a message asking for her home address.", emoji: "💬" },
      { text: "Anika felt uncomfortable. Something didn't feel right.", emoji: "😟" },
      { text: "She remembered what her parents taught her: 'Never share personal information with strangers online.'", emoji: "🔒" },
      { text: "Anika didn't reply. Instead, she went straight to her father and showed him the message.", emoji: "👨‍👧" },
      { text: "Her father was proud of her. 'You did exactly the right thing, Anika. Always tell a trusted adult.'", emoji: "⭐" },
    ],
    lesson: "Never share personal information online. Always tell a trusted adult if something feels wrong."
  },
];

export default function ChildDash() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [xp, setXp] = useState(0);
  const [xpLoaded, setXpLoaded] = useState(false);

  /* Quiz state */
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);

  /* Story state */
  const [storyIdx, setStoryIdx] = useState(null);
  const [storyPage, setStoryPage] = useState(0);

  const name = userProfile?.displayName || currentUser?.displayName || "Explorer";
  const level = Math.floor(xp / 100) + 1;
  const progress = xp % 100;
  const streak = 3; // static for now — can be Firestore-tracked later

  /* ── Load XP from Firestore on mount ── */
  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, "users", currentUser.uid)).then((snap) => {
      if (snap.exists() && snap.data().xp != null) {
        setXp(snap.data().xp);
      }
      setXpLoaded(true);
    });
  }, [currentUser]);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  /* ── Answer quiz question + save assessment to Firestore ── */
  async function handleAnswer(idx) {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    const correct = idx === QUIZZES[qIdx].ans;
    const earned = correct ? QUIZZES[qIdx].xp : 0;
    const newXp = xp + earned;
    if (earned > 0) setXp(newXp);

    if (currentUser) {
      // Save XP to user profile
      if (earned > 0) {
        await updateDoc(doc(db, "users", currentUser.uid), { xp: newXp });
      }
      // Save assessment result for experts to review
      await addDoc(collection(db, "assessments"), {
        childUid: currentUser.uid,
        childName: name,
        question: QUIZZES[qIdx].q,
        correct,
        xpEarned: earned,
        timestamp: serverTimestamp()
      });
    }
  }

  function nextQuestion() {
    setQIdx((i) => (i + 1) % QUIZZES.length);
    setSelected(null);
    setAnswered(false);
  }

  const badges = [
    { label: "🔥 3-Day Streak", earned: streak >= 3 },
    { label: "🧠 Quiz Master",  earned: xp >= 100 },
    { label: "⚡ 100 XP Club",  earned: xp >= 100 },
    { label: "📖 Bookworm",     earned: xp >= 200 },
    { label: "🎨 Creative Star",earned: xp >= 300 },
    { label: "🌟 Level 5",      earned: level >= 5 },
  ];

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
      padding: "10px 22px", borderRadius: "30px", border: "none",
      background: active ? "#6b6bd6" : "rgba(255,255,255,0.7)",
      color: active ? "white" : "#444",
      fontWeight: "700", fontSize: "14px", cursor: "pointer",
      boxShadow: active ? "0 4px 14px rgba(107,107,214,0.4)" : "none"
    }),
    card: {
      background: "rgba(255,255,255,0.85)", borderRadius: "20px", padding: "28px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.07)", marginBottom: "20px"
    },
    heroBox: {
      background: "linear-gradient(135deg,#6b6bd6,#ec4899)",
      borderRadius: "20px", padding: "32px", color: "white", marginBottom: "20px"
    },
    heroTitle: { fontSize: "28px", fontWeight: "800", margin: 0 },
    heroSub: { opacity: 0.85, marginTop: "8px", fontSize: "15px" },
    levelBadge: {
      display: "inline-block", background: "rgba(255,255,255,0.25)",
      padding: "6px 16px", borderRadius: "30px", fontSize: "14px", fontWeight: "700", marginTop: "16px"
    },
    actGrid: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "16px" },
    actCard: (color) => ({
      borderRadius: "16px", padding: "22px", background: color, cursor: "pointer",
      boxShadow: "0 4px 14px rgba(0,0,0,0.08)"
    }),
    actEmoji: { fontSize: "30px", marginBottom: "8px" },
    actTitle: { fontWeight: "700", fontSize: "16px", color: "white" },
    actSub: { fontSize: "13px", color: "rgba(255,255,255,0.8)", marginTop: "3px" },
    achievementRow: { display: "flex", flexWrap: "wrap", gap: "12px" },
    badge: (earned) => ({
      padding: "10px 18px", borderRadius: "30px",
      background: earned ? "linear-gradient(135deg,#ffd700,#ffa500)" : "#eee",
      color: earned ? "#7c4700" : "#aaa", fontWeight: "700", fontSize: "13px",
      filter: earned ? "none" : "grayscale(100%)"
    }),
    quizOpt: (sel, correct, ans, idx) => {
      let bg = "white", color = "#333", border = "2px solid #e0e0e0";
      if (ans) {
        if (idx === correct) { bg = "#dcfce7"; color = "#16a34a"; border = "2px solid #16a34a"; }
        else if (idx === sel && idx !== correct) { bg = "#fee2e2"; color = "#dc2626"; border = "2px solid #dc2626"; }
      } else if (idx === sel) { bg = "#f0efff"; border = "2px solid #6b6bd6"; }
      return { padding: "14px 18px", borderRadius: "12px", background: bg, color, border, cursor: "pointer", fontSize: "15px", fontWeight: "500", transition: "all 0.2s" };
    },
    /* Story styles */
    storyGrid: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "18px" },
    storyCard: (color) => ({
      borderRadius: "20px", padding: "26px", background: color,
      cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      transition: "transform 0.2s"
    }),
  };

  /* ── Render story reading view ── */
  if (storyIdx !== null) {
    const story = STORIES[storyIdx];
    const page = story.pages[storyPage];
    const isLast = storyPage === story.pages.length - 1;
    return (
      <div style={s.shell}>
        <div style={s.topBar}>
          <div style={s.logo}>KidRoots 🌱</div>
          <button style={s.logoutBtn} onClick={() => { setStoryIdx(null); setStoryPage(0); }}>← Back to Stories</button>
        </div>
        <div style={s.content}>
          <div style={{ ...s.card, maxWidth: "640px", margin: "0 auto", textAlign: "center" }}>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "#6b6bd6", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
              {story.value} · Page {storyPage + 1} of {story.pages.length}
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#1a1a2e", margin: "0 0 28px" }}>{story.title}</h2>
            <div style={{ fontSize: "64px", marginBottom: "24px" }}>{page.emoji}</div>
            <p style={{ fontSize: "17px", color: "#333", lineHeight: "1.8", marginBottom: "32px" }}>{page.text}</p>

            {isLast && (
              <div style={{ background: "#f0faf5", borderRadius: "14px", padding: "18px 22px", marginBottom: "24px", borderLeft: "3px solid #3aa67c" }}>
                <div style={{ fontWeight: "700", color: "#3aa67c", marginBottom: "6px" }}>🌟 Lesson Learned</div>
                <div style={{ fontSize: "15px", color: "#444", lineHeight: "1.6" }}>{story.lesson}</div>
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              {storyPage > 0 && (
                <button
                  onClick={() => setStoryPage((p) => p - 1)}
                  style={{ padding: "12px 24px", borderRadius: "12px", border: "2px solid #e0e0e0", background: "white", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}
                >
                  ← Previous
                </button>
              )}
              {!isLast ? (
                <button
                  onClick={() => setStoryPage((p) => p + 1)}
                  style={{ padding: "12px 28px", background: "#6b6bd6", color: "white", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={() => { setStoryIdx(null); setStoryPage(0); }}
                  style={{ padding: "12px 28px", background: "linear-gradient(135deg,#3aa67c,#06b6d4)", color: "white", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}
                >
                  Finish Story 🎉
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            { id: "home",         label: "🏠 Home" },
            { id: "quiz",         label: "🧠 Quiz" },
            { id: "stories",      label: "📖 Stories" },
            { id: "achievements", label: "🏆 Achievements" },
          ].map((t) => (
            <button key={t.id} style={s.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── HOME ── */}
        {activeTab === "home" && (
          <>
            <div style={s.heroBox}>
              <h1 style={s.heroTitle}>Hi, {name.split(" ")[0]}! 🌟</h1>
              <p style={s.heroSub}>You're on a {streak}-day learning streak. Keep it up!</p>
              <div style={s.levelBadge}>Level {level} Explorer ✨</div>
            </div>

            <div style={s.actGrid}>
              {[
                { emoji: "🧠", title: "Daily Quiz", sub: "Earn XP with every question", color: "linear-gradient(135deg,#6b6bd6,#8b5cf6)", tab: "quiz" },
                { emoji: "🏆", title: "Achievements", sub: `${badges.filter((b) => b.earned).length} badges earned`, color: "linear-gradient(135deg,#f59e0b,#ef4444)", tab: "achievements" },
                { emoji: "📖", title: "Story Mode", sub: `${STORIES.length} stories about values`, color: "linear-gradient(135deg,#3aa67c,#06b6d4)", tab: "stories" },
                { emoji: "🎨", title: "Creative Zone", sub: "Coming soon!", color: "linear-gradient(135deg,#ec4899,#f43f5e)", tab: null },
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

        {/* ── QUIZ ── */}
        {activeTab === "quiz" && (
          <div style={s.card}>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "#6b6bd6", textTransform: "uppercase", marginBottom: "8px" }}>
              Question {qIdx + 1} of {QUIZZES.length}
              <span style={{ marginLeft: "10px", color: QUIZZES[qIdx].xp >= 30 ? "#f59e0b" : "#6b6bd6" }}>
                +{QUIZZES[qIdx].xp} XP
              </span>
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1a1a2e", marginBottom: "24px" }}>
              {QUIZZES[qIdx].q}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {QUIZZES[qIdx].opts.map((opt, i) => (
                <button
                  key={i}
                  style={s.quizOpt(selected, QUIZZES[qIdx].ans, answered, i)}
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
                  {selected === QUIZZES[qIdx].ans
                    ? `🎉 Correct! +${QUIZZES[qIdx].xp} XP`
                    : `❌ Not quite! The answer was "${QUIZZES[qIdx].opts[QUIZZES[qIdx].ans]}"`}
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

        {/* ── STORIES ── */}
        {activeTab === "stories" && (
          <>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#1a1a2e", margin: "0 0 6px" }}>📖 Moral Stories</h2>
              <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>Short stories that teach kindness, honesty, respect, and safety.</p>
            </div>
            <div style={s.storyGrid}>
              {STORIES.map((story, i) => (
                <div key={i} style={s.storyCard(story.color)} onClick={() => { setStoryIdx(i); setStoryPage(0); }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>{story.emoji}</div>
                  <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", color: "#6b6bd6", marginBottom: "6px" }}>
                    {story.value}
                  </div>
                  <div style={{ fontWeight: "800", fontSize: "17px", color: story.textColor, marginBottom: "8px" }}>{story.title}</div>
                  <div style={{ fontSize: "13px", color: "#555" }}>{story.pages.length} pages · Tap to read</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── ACHIEVEMENTS ── */}
        {activeTab === "achievements" && (
          <div style={s.card}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1a1a2e", marginBottom: "20px" }}>
              🏆 Your Badges
            </h2>
            <div style={s.achievementRow}>
              {badges.map((b, i) => (
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
