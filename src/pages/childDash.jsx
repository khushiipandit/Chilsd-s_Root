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

/* ── Scenario Games ── */
const KINDNESS_SCENES = [
  {
    scenario: "Your friend trips and drops all their books in the hallway.",
    emoji: "📚",
    choices: [
      { text: "Walk past and pretend not to notice", correct: false, feedback: "That would leave your friend feeling very alone." },
      { text: "Stop and help them pick up the books", correct: true,  feedback: "Amazing! Helping others when they need it is true kindness! 🌟" },
      { text: "Laugh at them", correct: false, feedback: "Laughing at someone when they fall would hurt their feelings." },
    ],
    xp: 30,
  },
  {
    scenario: "A new student sits alone at lunch because they don't know anyone.",
    emoji: "🍱",
    choices: [
      { text: "Ignore them — they'll figure it out", correct: false, feedback: "Being new is scary. Everyone deserves to feel welcome!" },
      { text: "Invite them to sit with you and your friends", correct: true,  feedback: "That's so kind! A small invite can change someone's whole day. 💖" },
      { text: "Whisper about them with your friends", correct: false, feedback: "That would make them feel even more left out." },
    ],
    xp: 30,
  },
  {
    scenario: "You have two cookies and your friend forgot their snack.",
    emoji: "🍪",
    choices: [
      { text: "Eat both cookies quickly before they notice", correct: false, feedback: "Sharing makes both of you happy!" },
      { text: "Give your friend one cookie", correct: true,  feedback: "Sharing is caring! You're a star. ⭐" },
      { text: "Hide one and only show them one", correct: false, feedback: "Honesty and sharing always go together!" },
    ],
    xp: 25,
  },
  {
    scenario: "Your younger sibling accidentally tears your favourite book.",
    emoji: "📖",
    choices: [
      { text: "Get really angry and shout at them", correct: false, feedback: "It was an accident. Shouting can really hurt feelings." },
      { text: "Tell a parent and calmly explain you're upset", correct: true,  feedback: "Great! It's okay to feel upset, but talking calmly helps everyone. 🤝" },
      { text: "Tear their toy on purpose", correct: false, feedback: "That would make the situation much worse for everyone." },
    ],
    xp: 30,
  },
  {
    scenario: "An elderly neighbour is struggling to carry heavy bags.",
    emoji: "🛍️",
    choices: [
      { text: "Walk past — it's not your problem", correct: false, feedback: "Helping people around us makes our whole community better!" },
      { text: "Ask if they need help carrying the bags", correct: true,  feedback: "Wonderful! Helping neighbours is what community is all about. 🏘️" },
      { text: "Stare at them but don't do anything", correct: false, feedback: "Seeing someone struggle and actually helping is so much better than just watching." },
    ],
    xp: 30,
  },
];

const SAFETY_SCENES = [
  { scenario: "A stranger online asks for your home address.", emoji: "💬", safe: false, explanation: "Never share your address or personal details with strangers online. Tell a trusted adult right away!" },
  { scenario: "You wear a helmet every time you ride your bike.", emoji: "🚲", safe: true,  explanation: "Always wear a helmet! It protects your head and keeps you safe." },
  { scenario: "A stranger offers you sweets and asks you to get in their car.", emoji: "🚗", safe: false, explanation: "Never go anywhere with a stranger. Run away and tell a trusted adult immediately!" },
  { scenario: "You cross the road at a zebra crossing after checking both sides.", emoji: "🚦", safe: true,  explanation: "Using crossings and checking for traffic keeps you safe on the road!" },
  { scenario: "Your online friend asks you to keep your chat a secret from your parents.", emoji: "🤫", safe: false, explanation: "Safe people never ask you to keep secrets from your parents. Tell a trusted adult." },
  { scenario: "You wash your hands before eating and after using the toilet.", emoji: "🧼", safe: true,  explanation: "Great hygiene habit! Washing hands prevents the spread of germs and keeps everyone healthy." },
  { scenario: "A website asks you to enter your full name and school name.", emoji: "💻", safe: false, explanation: "Be careful about sharing personal info online. Always ask a parent before filling any forms." },
  { scenario: "You tell a trusted adult when something makes you feel uncomfortable.", emoji: "🤝", safe: true,  explanation: "Always speak up! Telling someone you trust is always the right and brave thing to do." },
];

const FEELINGS_SCENES = [
  { scene: "Your best friend didn't invite you to their birthday party.", emoji: "🎂", options: ["Happy", "Sad", "Excited", "Proud"], ans: 1, xp: 20 },
  { scene: "You won first prize in the school drawing competition!", emoji: "🏆", options: ["Angry", "Scared", "Sad", "Proud"], ans: 3, xp: 20 },
  { scene: "It's the night before a big school exam and you don't feel ready.", emoji: "📝", options: ["Nervous", "Excited", "Happy", "Silly"], ans: 0, xp: 20 },
  { scene: "Someone took your favourite pencil without asking.", emoji: "✏️", options: ["Happy", "Angry", "Bored", "Proud"], ans: 1, xp: 20 },
  { scene: "You're going on your first ever camping trip tomorrow!", emoji: "⛺", options: ["Sad", "Angry", "Excited", "Tired"], ans: 2, xp: 20 },
  { scene: "You see a very large dog running towards you with no owner.", emoji: "🐕", options: ["Happy", "Bored", "Excited", "Scared"], ans: 3, xp: 20 },
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

  /* Game state */
  const [activeGame, setActiveGame] = useState(null); // 'kindness' | 'safety' | 'feelings'
  const [gameIdx, setGameIdx] = useState(0);
  const [gameChoice, setGameChoice] = useState(null);
  const [gameAnswered, setGameAnswered] = useState(false);

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

  async function handleGameAnswer(correct, xpAmt) {
    if (gameAnswered) return;
    setGameAnswered(true);
    if (correct && xpAmt > 0) {
      const newXp = xp + xpAmt;
      setXp(newXp);
      if (currentUser) await updateDoc(doc(db, "users", currentUser.uid), { xp: newXp });
    }
  }

  function nextGame(totalLen) {
    if (gameIdx + 1 >= totalLen) {
      setActiveGame(null);
      setGameIdx(0);
    } else {
      setGameIdx((i) => i + 1);
    }
    setGameChoice(null);
    setGameAnswered(false);
  }

  function exitGame() {
    setActiveGame(null);
    setGameIdx(0);
    setGameChoice(null);
    setGameAnswered(false);
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
            { id: "games",        label: "🎮 Games" },
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

            {userProfile?.linkedParentName && (
              <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: "16px", padding: "14px 20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px", backdropFilter: "blur(10px)" }}>
                <span style={{ fontSize: "22px" }}>👨‍👩‍👧</span>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "14px", color: "#1a1a2e" }}>Connected to {userProfile.linkedParentName}</div>
                  <div style={{ fontSize: "12px", color: "#666" }}>Your parent can see your progress</div>
                </div>
              </div>
            )}

            <div style={s.actGrid}>
              {[
                { emoji: "🧠", title: "Daily Quiz", sub: "Earn XP with every question", color: "linear-gradient(135deg,#6b6bd6,#8b5cf6)", tab: "quiz" },
                { emoji: "🏆", title: "Achievements", sub: `${badges.filter((b) => b.earned).length} badges earned`, color: "linear-gradient(135deg,#f59e0b,#ef4444)", tab: "achievements" },
                { emoji: "📖", title: "Story Mode", sub: `${STORIES.length} stories about values`, color: "linear-gradient(135deg,#3aa67c,#06b6d4)", tab: "stories" },
                { emoji: "🎮", title: "Scenario Games", sub: "3 fun games to play!", color: "linear-gradient(135deg,#ec4899,#f43f5e)", tab: "games" },
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

        {/* ── GAMES ── */}
        {activeTab === "games" && (
          <>
            {/* Game selection */}
            {!activeGame && (
              <>
                <div style={{ marginBottom: "24px" }}>
                  <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#1a1a2e", margin: "0 0 6px" }}>🎮 Scenario Games</h2>
                  <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>Learn important life skills through fun situations!</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "18px" }}>
                  {[
                    { id: "kindness", emoji: "💖", title: "Kindness Quest", desc: "Choose the kindest response in each situation.", color: "linear-gradient(135deg,#f093fb,#f5576c)", count: KINDNESS_SCENES.length },
                    { id: "safety",   emoji: "🛡️", title: "Safety Champion", desc: "Decide if each situation is safe or not safe.", color: "linear-gradient(135deg,#4facfe,#00f2fe)", count: SAFETY_SCENES.length },
                    { id: "feelings", emoji: "🔍", title: "Feelings Detective", desc: "Name the feeling in each situation.", color: "linear-gradient(135deg,#43e97b,#38f9d7)", count: FEELINGS_SCENES.length },
                  ].map((g) => (
                    <div
                      key={g.id}
                      onClick={() => { setActiveGame(g.id); setGameIdx(0); setGameChoice(null); setGameAnswered(false); }}
                      style={{ background: g.color, borderRadius: "20px", padding: "28px 22px", cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,0.12)", color: "white" }}
                    >
                      <div style={{ fontSize: "44px", marginBottom: "12px" }}>{g.emoji}</div>
                      <div style={{ fontWeight: "800", fontSize: "18px", marginBottom: "8px" }}>{g.title}</div>
                      <div style={{ fontSize: "13px", opacity: 0.9, marginBottom: "16px", lineHeight: "1.5" }}>{g.desc}</div>
                      <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: "20px", padding: "6px 14px", display: "inline-block", fontSize: "12px", fontWeight: "700" }}>
                        {g.count} scenes · Tap to play
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── KINDNESS QUEST ── */}
            {activeGame === "kindness" && (() => {
              const scene = KINDNESS_SCENES[gameIdx];
              return (
                <div style={{ maxWidth: "620px", margin: "0 auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <button onClick={exitGame} style={{ background: "rgba(255,255,255,0.7)", border: "none", borderRadius: "20px", padding: "8px 18px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>← Back</button>
                    <div style={{ fontWeight: "700", color: "#6b6bd6", fontSize: "14px" }}>💖 Kindness Quest · {gameIdx + 1} / {KINDNESS_SCENES.length}</div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#ec4899" }}>+{scene.xp} XP</div>
                  </div>
                  <div style={{ ...s.card, textAlign: "center" }}>
                    <div style={{ fontSize: "64px", marginBottom: "20px" }}>{scene.emoji}</div>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#1a1a2e", marginBottom: "28px", lineHeight: "1.5" }}>{scene.scenario}</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {scene.choices.map((c, i) => {
                        let bg = "white", border = "2px solid #e0e0e0", color = "#333";
                        if (gameAnswered) {
                          if (c.correct) { bg = "#dcfce7"; border = "2px solid #16a34a"; color = "#16a34a"; }
                          else if (gameChoice === i && !c.correct) { bg = "#fee2e2"; border = "2px solid #dc2626"; color = "#dc2626"; }
                        } else if (gameChoice === i) {
                          bg = "#f0efff"; border = "2px solid #6b6bd6";
                        }
                        return (
                          <button
                            key={i}
                            onClick={() => { if (!gameAnswered) { setGameChoice(i); handleGameAnswer(c.correct, scene.xp); } }}
                            style={{ padding: "14px 18px", borderRadius: "12px", background: bg, color, border, cursor: gameAnswered ? "default" : "pointer", fontSize: "15px", fontWeight: "500", textAlign: "left", transition: "all 0.2s" }}
                          >
                            {c.text}
                          </button>
                        );
                      })}
                    </div>
                    {gameAnswered && (
                      <div style={{ marginTop: "20px" }}>
                        <div style={{ padding: "14px 18px", borderRadius: "12px", background: scene.choices[gameChoice]?.correct ? "#dcfce7" : "#fff7e6", color: scene.choices[gameChoice]?.correct ? "#16a34a" : "#b45309", fontWeight: "600", marginBottom: "14px", fontSize: "15px" }}>
                          {scene.choices[gameChoice]?.correct ? `🎉 +${scene.xp} XP! ` : ""}
                          {scene.choices[gameChoice]?.feedback}
                        </div>
                        <button onClick={() => nextGame(KINDNESS_SCENES.length)} style={{ padding: "12px 28px", background: "linear-gradient(135deg,#f093fb,#f5576c)", color: "white", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
                          {gameIdx + 1 === KINDNESS_SCENES.length ? "Finish Game 🎉" : "Next Scene →"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── SAFETY CHAMPION ── */}
            {activeGame === "safety" && (() => {
              const scene = SAFETY_SCENES[gameIdx];
              const chosen = gameChoice;
              const isCorrect = gameAnswered && ((scene.safe && chosen === "safe") || (!scene.safe && chosen === "unsafe"));
              return (
                <div style={{ maxWidth: "620px", margin: "0 auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <button onClick={exitGame} style={{ background: "rgba(255,255,255,0.7)", border: "none", borderRadius: "20px", padding: "8px 18px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>← Back</button>
                    <div style={{ fontWeight: "700", color: "#6b6bd6", fontSize: "14px" }}>🛡️ Safety Champion · {gameIdx + 1} / {SAFETY_SCENES.length}</div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#ec4899" }}>+25 XP</div>
                  </div>
                  <div style={{ ...s.card, textAlign: "center" }}>
                    <div style={{ fontSize: "72px", marginBottom: "20px" }}>{scene.emoji}</div>
                    <h3 style={{ fontSize: "19px", fontWeight: "700", color: "#1a1a2e", marginBottom: "32px", lineHeight: "1.5" }}>{scene.scenario}</h3>
                    {!gameAnswered && (
                      <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
                        <button
                          onClick={() => { setGameChoice("safe"); handleGameAnswer(scene.safe, 25); }}
                          style={{ flex: 1, maxWidth: "200px", padding: "20px", borderRadius: "16px", background: "linear-gradient(135deg,#43e97b,#38f9d7)", color: "white", border: "none", fontWeight: "800", fontSize: "18px", cursor: "pointer", boxShadow: "0 4px 14px rgba(67,233,123,0.4)" }}
                        >
                          ✅ SAFE
                        </button>
                        <button
                          onClick={() => { setGameChoice("unsafe"); handleGameAnswer(!scene.safe, 25); }}
                          style={{ flex: 1, maxWidth: "200px", padding: "20px", borderRadius: "16px", background: "linear-gradient(135deg,#f5576c,#f093fb)", color: "white", border: "none", fontWeight: "800", fontSize: "18px", cursor: "pointer", boxShadow: "0 4px 14px rgba(245,87,108,0.4)" }}
                        >
                          ❌ NOT SAFE
                        </button>
                      </div>
                    )}
                    {gameAnswered && (
                      <div style={{ marginTop: "8px" }}>
                        <div style={{ fontSize: "48px", marginBottom: "12px" }}>{isCorrect ? "🎉" : "🤔"}</div>
                        <div style={{ padding: "16px 20px", borderRadius: "14px", background: isCorrect ? "#dcfce7" : "#fff7e6", color: isCorrect ? "#16a34a" : "#b45309", fontWeight: "600", marginBottom: "20px", fontSize: "15px", lineHeight: "1.6" }}>
                          {isCorrect ? "Correct! +25 XP 🌟 " : `This is actually ${scene.safe ? "SAFE ✅" : "NOT SAFE ❌"}. `}
                          {scene.explanation}
                        </div>
                        <button onClick={() => nextGame(SAFETY_SCENES.length)} style={{ padding: "12px 28px", background: "linear-gradient(135deg,#4facfe,#00f2fe)", color: "white", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
                          {gameIdx + 1 === SAFETY_SCENES.length ? "Finish Game 🎉" : "Next Scene →"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── FEELINGS DETECTIVE ── */}
            {activeGame === "feelings" && (() => {
              const scene = FEELINGS_SCENES[gameIdx];
              return (
                <div style={{ maxWidth: "620px", margin: "0 auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <button onClick={exitGame} style={{ background: "rgba(255,255,255,0.7)", border: "none", borderRadius: "20px", padding: "8px 18px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>← Back</button>
                    <div style={{ fontWeight: "700", color: "#6b6bd6", fontSize: "14px" }}>🔍 Feelings Detective · {gameIdx + 1} / {FEELINGS_SCENES.length}</div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#ec4899" }}>+{scene.xp} XP</div>
                  </div>
                  <div style={{ ...s.card, textAlign: "center" }}>
                    <div style={{ fontSize: "64px", marginBottom: "20px" }}>{scene.emoji}</div>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#1a1a2e", marginBottom: "10px", lineHeight: "1.5" }}>{scene.scene}</h3>
                    <p style={{ fontSize: "15px", color: "#888", marginBottom: "28px" }}>What feeling does this describe?</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      {scene.options.map((opt, i) => {
                        let bg = "white", border = "2px solid #e0e0e0", color = "#333";
                        if (gameAnswered) {
                          if (i === scene.ans) { bg = "#dcfce7"; border = "2px solid #16a34a"; color = "#16a34a"; }
                          else if (gameChoice === i && i !== scene.ans) { bg = "#fee2e2"; border = "2px solid #dc2626"; color = "#dc2626"; }
                        } else if (gameChoice === i) {
                          bg = "#f0efff"; border = "2px solid #6b6bd6";
                        }
                        return (
                          <button
                            key={i}
                            onClick={() => { if (!gameAnswered) { setGameChoice(i); handleGameAnswer(i === scene.ans, scene.xp); } }}
                            style={{ padding: "16px", borderRadius: "12px", background: bg, color, border, cursor: gameAnswered ? "default" : "pointer", fontSize: "16px", fontWeight: "700", transition: "all 0.2s" }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {gameAnswered && (
                      <div style={{ marginTop: "20px" }}>
                        <div style={{ padding: "14px 18px", borderRadius: "12px", background: gameChoice === scene.ans ? "#dcfce7" : "#fff7e6", color: gameChoice === scene.ans ? "#16a34a" : "#b45309", fontWeight: "600", marginBottom: "14px", fontSize: "15px" }}>
                          {gameChoice === scene.ans ? `🎉 Yes! That's "${scene.options[scene.ans]}"! +${scene.xp} XP` : `Not quite! The feeling is "${scene.options[scene.ans]}".`}
                        </div>
                        <button onClick={() => nextGame(FEELINGS_SCENES.length)} style={{ padding: "12px 28px", background: "linear-gradient(135deg,#43e97b,#38f9d7)", color: "white", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "15px" }}>
                          {gameIdx + 1 === FEELINGS_SCENES.length ? "Finish Game 🎉" : "Next Scene →"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </>
        )}

      </div>
    </div>
  );
}
