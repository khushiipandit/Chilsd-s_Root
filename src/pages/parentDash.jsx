import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  collection, addDoc, onSnapshot, updateDoc,
  doc, arrayUnion, arrayRemove, serverTimestamp,
  query, orderBy, where, getDocs, getDoc
} from "firebase/firestore";
import { db } from "../firebase";

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

/* ── Vaccine Schedule ── */
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

/* ── Nutrition Plans ── */
const NUTRITION_PLANS = [
  {
    ageGroup: "0–6 Months 🍼",
    meals: [
      { emoji: "🤱", label: "Breastfeeding", desc: "Exclusive breastfeeding every 2–3 hours. No water or solids needed." },
      { emoji: "🍶", label: "Formula", desc: "If formula-fed, 60–90ml per feed for newborns, increasing with age." },
      { emoji: "💤", label: "Night Feeds", desc: "Normal to wake for feeds every 3–4 hrs. Follow baby's hunger cues." },
    ],
    tip: "Never introduce solid foods before 6 months. Breast milk or formula is the complete nutrition source."
  },
  {
    ageGroup: "6–12 Months 🥣",
    meals: [
      { emoji: "🥕", label: "Pureed Veggies", desc: "Start with single-ingredient purées — carrot, sweet potato, peas." },
      { emoji: "🍌", label: "Soft Fruits", desc: "Banana, cooked apple, pear. Mash well to avoid choking." },
      { emoji: "🌾", label: "Iron-Rich Cereals", desc: "Iron-fortified rice cereal mixed with breast milk or formula." },
    ],
    tip: "Introduce one new food every 3 days to check for allergies. Keep breastfeeding alongside solids."
  },
  {
    ageGroup: "1–3 Years 🍽️",
    meals: [
      { emoji: "🥚", label: "Protein", desc: "Eggs, dal, paneer, soft cooked chicken — 2–3 servings/day." },
      { emoji: "🥛", label: "Dairy", desc: "Full-fat milk (500ml/day), curd, cheese for calcium and growth." },
      { emoji: "🫐", label: "Fruits & Veggies", desc: "5 servings of different colours daily. Avoid fruit juices." },
    ],
    tip: "Toddlers need 1,000–1,400 calories/day. Offer 3 meals + 2 healthy snacks. Limit sugar and salt."
  },
  {
    ageGroup: "3–6 Years 🍱",
    meals: [
      { emoji: "🍚", label: "Whole Grains", desc: "Brown rice, roti, oats — energy for active growing children." },
      { emoji: "🥜", label: "Healthy Fats", desc: "A small handful of nuts (no whole nuts under 5), seeds, avocado." },
      { emoji: "🥦", label: "Greens Daily", desc: "Palak, broccoli, peas — iron and vitamins for brain development." },
    ],
    tip: "Involve children in meal prep — it increases willingness to try new foods. Avoid screen time during meals."
  },
];

/* ── Shared colors ── */
const C = {
  purple: "#6b6bd6", green: "#3aa67c", orange: "#f59e0b",
  red: "#ef4444", bg: "#f4f6fb", card: "#ffffff", border: "#e8eaf0"
};

const sidebarItems = [
  { id: "overview",   label: "Overview",        icon: "🏠" },
  { id: "growth",     label: "Growth Tracker",  icon: "📈" },
  { id: "vaccines",   label: "Vaccine Planner", icon: "💉" },
  { id: "nutrition",  label: "Nutrition Guide", icon: "🥗" },
  { id: "community",  label: "Community",       icon: "👥" },
  { id: "resources",  label: "Resources",       icon: "📚" },
];

export default function ParentDash() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  /* Growth tracker state */
  const [gt, setGt] = useState({ age: "", height: "", weight: "" });
  const [gtResult, setGtResult] = useState(null);
  const [growthHistory, setGrowthHistory] = useState([]);

  /* Vaccine planner state */
  const [dob, setDob] = useState("");
  const [vaccines, setVaccines] = useState([]);

  /* Community state */
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [postCategory, setPostCategory] = useState("Special Moment");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  /* Child connection state */
  const [linkedChild, setLinkedChild] = useState(null);
  const [linkedChildAssessments, setLinkedChildAssessments] = useState([]);
  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState("");

  const name = userProfile?.displayName || currentUser?.displayName || "Parent";

  /* ── Load community posts (real-time) ── */
  useEffect(() => {
    const q = query(collection(db, "community"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  /* ── Load growth history (real-time) ── */
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "users", currentUser.uid, "growthHistory"),
      orderBy("timestamp", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setGrowthHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [currentUser]);

  /* ── Load linked child profile + assessments ── */
  useEffect(() => {
    if (!userProfile?.linkedChildUid) { setLinkedChild(null); return; }
    getDoc(doc(db, "users", userProfile.linkedChildUid)).then((snap) => {
      if (snap.exists()) setLinkedChild({ uid: snap.id, ...snap.data() });
    });
    const q = query(
      collection(db, "assessments"),
      where("childUid", "==", userProfile.linkedChildUid),
      orderBy("timestamp", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setLinkedChildAssessments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [userProfile?.linkedChildUid]);

  /* ── Link child by email ── */
  async function linkChildAccount(e) {
    e.preventDefault();
    setLinking(true);
    setLinkError("");
    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", linkEmail.trim().toLowerCase()),
        where("role", "==", "child")
      );
      const snap = await getDocs(q);
      if (snap.empty) { setLinkError("No child account found with that email."); return; }
      const childDoc = snap.docs[0];
      const childUid = childDoc.id;
      await updateDoc(doc(db, "users", currentUser.uid), { linkedChildUid: childUid });
      await updateDoc(doc(db, "users", childUid), { linkedParentUid: currentUser.uid, linkedParentName: name });
      setLinkedChild({ uid: childUid, ...childDoc.data() });
      setLinkEmail("");
    } catch {
      setLinkError("Something went wrong. Please try again.");
    } finally {
      setLinking(false);
    }
  }

  /* ── Unlink child ── */
  async function unlinkChild() {
    if (!userProfile?.linkedChildUid) return;
    await updateDoc(doc(db, "users", currentUser.uid), { linkedChildUid: null });
    await updateDoc(doc(db, "users", userProfile.linkedChildUid), { linkedParentUid: null, linkedParentName: null });
    setLinkedChild(null);
    setLinkedChildAssessments([]);
  }

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  /* ── Growth tracker — saves to Firestore ── */
  async function runGrowthTracker(e) {
    e.preventDefault();
    const result = analyzeGrowth(+gt.age, +gt.height, +gt.weight);
    setGtResult(result);
    if (currentUser) {
      await addDoc(collection(db, "users", currentUser.uid, "growthHistory"), {
        age: +gt.age, height: +gt.height, weight: +gt.weight,
        bmi: result.bmi, status: result.status,
        timestamp: serverTimestamp()
      });
    }
  }

  function runVaccinePlan(e) {
    e.preventDefault();
    setVaccines(getVaccinePlan(dob));
  }

  /* ── Community: submit post ── */
  async function submitPost(e) {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      let imageUrl = "";
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("upload_preset", "parenting-platform-major-project");
        const res = await fetch("https://api.cloudinary.com/v1_1/dkh3saqj0/image/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        imageUrl = data.secure_url;
      }
      await addDoc(collection(db, "community"), {
        uid: currentUser.uid,
        displayName: name,
        content: newPost.trim(),
        category: postCategory,
        imageUrl,
        likes: [],
        likesCount: 0,
        timestamp: serverTimestamp()
      });
      setNewPost("");
      setPostCategory("Special Moment");
      setImageFile(null);
      setImagePreview("");
    } finally {
      setPosting(false);
    }
  }

  /* ── Community: toggle like ── */
  async function toggleLike(post) {
    if (!currentUser) return;
    const ref = doc(db, "community", post.id);
    const liked = post.likes?.includes(currentUser.uid);
    await updateDoc(ref, {
      likes: liked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
      likesCount: liked ? Math.max(0, (post.likesCount || 1) - 1) : (post.likesCount || 0) + 1
    });
  }

  /* ── Style helpers ── */
  function statusColor(status) {
    if (status === "Normal") return C.green;
    if (status === "Overweight") return C.orange;
    return C.red;
  }

  const s = {
    shell: { display: "flex", height: "100vh", overflow: "hidden", background: C.bg, fontFamily: "system-ui,sans-serif" },
    sidebar: {
      width: "240px", height: "100vh", overflowY: "auto", background: "linear-gradient(180deg,#1a1a2e,#16213e)",
      padding: "30px 0", display: "flex", flexDirection: "column", flexShrink: 0
    },
    sbLogo: { color: "white", fontWeight: "800", fontSize: "22px", padding: "0 24px 28px", letterSpacing: "0.5px" },
    sbItem: (active) => ({
      display: "flex", alignItems: "center", gap: "12px",
      padding: "13px 24px", cursor: "pointer",
      background: active ? "rgba(107,107,214,0.3)" : "transparent",
      borderRight: active ? `3px solid ${C.purple}` : "3px solid transparent",
      color: active ? "white" : "rgba(255,255,255,0.6)",
      fontSize: "14px", fontWeight: active ? "600" : "400", transition: "all 0.2s"
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
    vaccineRow: () => ({
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
    resourceGrid: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "16px" },
    resourceCard: {
      padding: "20px", borderRadius: "14px", border: `1.5px solid ${C.border}`,
      background: "#fafafe", cursor: "pointer"
    },
    resourceEmoji: { fontSize: "28px", marginBottom: "10px" },
    resourceTitle: { fontWeight: "700", color: "#1a1a2e", marginBottom: "4px" },
    resourceSub: { fontSize: "13px", color: "#888" },
    /* Community */
    postCard: {
      background: C.card, borderRadius: "16px", padding: "22px 26px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: "18px"
    },
    avatar: {
      width: "38px", height: "38px", borderRadius: "50%",
      background: "linear-gradient(135deg,#6b6bd6,#8b5cf6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "white", fontWeight: "700", fontSize: "16px", flexShrink: 0
    },
  };

  return (
    <div style={s.shell}>

      {/* SIDEBAR */}
      <aside style={s.sidebar}>
        <div style={s.sbLogo}>KidRoots</div>

        {sidebarItems.map((item) => (
          <div key={item.id} style={s.sbItem(activeTab === item.id)} onClick={() => setActiveTab(item.id)}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}

        <div style={s.sbBottom}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginBottom: "12px" }}>{name}</div>
          <button style={s.logoutBtn} onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={s.main}>

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <>
            <div style={s.pageHeader}>
              <h1 style={s.greeting}>Welcome back, {name.split(" ")[0]} 👋</h1>
              <p style={s.subGreet}>Here's a summary of your child's wellbeing today.</p>
            </div>

            <div style={s.statsRow}>
              <div style={s.statCard(C.purple)}>
                <div style={s.statVal}>{growthHistory.length || 0}</div>
                <div style={s.statLabel}>Growth Records</div>
              </div>
              <div style={s.statCard(C.green)}>
                <div style={s.statVal}>{linkedChild ? (linkedChild.xp || 0) : "—"}</div>
                <div style={s.statLabel}>{linkedChild ? `${linkedChild.displayName?.split(" ")[0]}'s XP` : "Child XP"}</div>
              </div>
              <div style={s.statCard(C.orange)}>
                <div style={s.statVal}>{linkedChildAssessments.length || 0}</div>
                <div style={s.statLabel}>Quizzes Taken</div>
              </div>
            </div>

            {/* ── My Child card ── */}
            <div style={s.sectionCard}>
              <div style={s.sectionTitle}>👶 My Child</div>
              {!linkedChild ? (
                <form onSubmit={linkChildAccount}>
                  <p style={{ fontSize: "14px", color: "#666", marginBottom: "14px" }}>
                    Link your child's KidRoots account to see their progress here.
                  </p>
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div style={s.fieldWrap}>
                      <label style={s.fieldLabel}>Child's Email Address</label>
                      <input
                        type="email"
                        placeholder="child@example.com"
                        style={{ ...s.fieldInput, width: "260px" }}
                        value={linkEmail}
                        onChange={(e) => setLinkEmail(e.target.value)}
                        required
                      />
                    </div>
                    <button style={{ ...s.submitBtn, opacity: linking ? 0.6 : 1 }} type="submit" disabled={linking}>
                      {linking ? "Linking..." : "Link Account"}
                    </button>
                  </div>
                  {linkError && <p style={{ color: C.red, fontSize: "13px", marginTop: "10px" }}>{linkError}</p>}
                </form>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                    <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "linear-gradient(135deg,#a1c4fd,#c2e9fb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>
                      🧒
                    </div>
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "17px", color: "#1a1a2e" }}>{linkedChild.displayName}</div>
                      <div style={{ fontSize: "13px", color: "#888" }}>Level {Math.floor((linkedChild.xp || 0) / 100) + 1} · {linkedChild.xp || 0} XP</div>
                    </div>
                    <button onClick={unlinkChild} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: "8px", border: `1px solid ${C.border}`, background: "white", color: "#888", fontSize: "13px", cursor: "pointer" }}>
                      Unlink
                    </button>
                  </div>

                  {/* XP progress bar */}
                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#888", marginBottom: "6px" }}>
                      <span>XP Progress</span>
                      <span>{(linkedChild.xp || 0) % 100}/100 to next level</span>
                    </div>
                    <div style={{ background: "#e8eaf0", borderRadius: "20px", height: "8px" }}>
                      <div style={{ width: `${(linkedChild.xp || 0) % 100}%`, background: `linear-gradient(90deg,${C.purple},#8b5cf6)`, borderRadius: "20px", height: "8px", transition: "width 0.4s" }} />
                    </div>
                  </div>

                  {/* Recent quiz results */}
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a2e", marginBottom: "10px" }}>Recent Quiz Results</div>
                  {linkedChildAssessments.length === 0 && (
                    <p style={{ fontSize: "14px", color: "#aaa" }}>No quizzes taken yet.</p>
                  )}
                  {linkedChildAssessments.slice(0, 4).map((a) => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: "18px" }}>{a.correct ? "✅" : "❌"}</span>
                      <div style={{ flex: 1, fontSize: "13px", color: "#444" }}>{a.question}</div>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: a.correct ? C.green : C.red }}>
                        {a.correct ? `+${a.xpEarned} XP` : "0 XP"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={s.sectionCard}>
              <div style={s.sectionTitle}>Quick Actions</div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {[
                  { label: "Run Growth Check", icon: "📈", tab: "growth" },
                  { label: "View Vaccine Plan", icon: "💉", tab: "vaccines" },
                  { label: "Nutrition Guide", icon: "🥗", tab: "nutrition" },
                  { label: "Community Forum", icon: "👥", tab: "community" },
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
              {growthHistory.slice(0, 3).map((h, i) => (
                <div key={h.id || i} style={{ display: "flex", gap: "14px", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: "20px" }}>📈</span>
                  <div>
                    <div style={{ fontSize: "14px", color: "#1a1a2e" }}>
                      Growth check — {h.status} (BMI {h.bmi}, Age {h.age}y)
                    </div>
                    <div style={{ fontSize: "12px", color: "#aaa", marginTop: "2px" }}>
                      {h.timestamp?.toDate ? h.timestamp.toDate().toLocaleDateString("en-IN") : "Recent"}
                    </div>
                  </div>
                </div>
              ))}
              {growthHistory.length === 0 && (
                <p style={{ color: "#aaa", fontSize: "14px" }}>No activity yet. Run a growth check to get started!</p>
              )}
            </div>
          </>
        )}

        {/* ── GROWTH TRACKER ── */}
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
                <button style={s.submitBtn} type="submit">Analyze & Save Growth</button>
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

            {/* Growth History */}
            {growthHistory.length > 0 && (
              <div style={s.sectionCard}>
                <div style={s.sectionTitle}>Growth History</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ background: "#f4f6fb" }}>
                      {["Date", "Age", "Height (cm)", "Weight (kg)", "BMI", "Status"].map((h) => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#555", fontWeight: "600" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {growthHistory.map((h) => (
                      <tr key={h.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "10px 14px", color: "#666" }}>
                          {h.timestamp?.toDate ? h.timestamp.toDate().toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td style={{ padding: "10px 14px" }}>{h.age}y</td>
                        <td style={{ padding: "10px 14px" }}>{h.height}</td>
                        <td style={{ padding: "10px 14px" }}>{h.weight}</td>
                        <td style={{ padding: "10px 14px", fontWeight: "600" }}>{h.bmi}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{
                            padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600",
                            background: h.status === "Normal" ? "#dcfce7" : h.status === "Overweight" ? "#fef9c3" : "#fee2e2",
                            color: h.status === "Normal" ? C.green : h.status === "Overweight" ? C.orange : C.red
                          }}>
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

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

        {/* ── VACCINE PLANNER ── */}
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

        {/* ── NUTRITION GUIDE ── */}
        {activeTab === "nutrition" && (
          <>
            <div style={s.pageHeader}>
              <h1 style={s.greeting}>Nutrition Guide 🥗</h1>
              <p style={s.subGreet}>Age-appropriate meal plans and healthy routine suggestions for your child.</p>
            </div>

            {NUTRITION_PLANS.map((plan, i) => (
              <div key={i} style={s.sectionCard}>
                <div style={s.sectionTitle}>{plan.ageGroup}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", marginBottom: "20px" }}>
                  {plan.meals.map((meal, j) => (
                    <div key={j} style={{
                      padding: "18px", borderRadius: "12px",
                      background: "#f4f6fb", border: `1px solid ${C.border}`
                    }}>
                      <div style={{ fontSize: "26px", marginBottom: "10px" }}>{meal.emoji}</div>
                      <div style={{ fontWeight: "700", color: "#1a1a2e", marginBottom: "6px" }}>{meal.label}</div>
                      <div style={{ fontSize: "13px", color: "#666", lineHeight: "1.5" }}>{meal.desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{
                  background: "#f0faf5", padding: "14px 18px",
                  borderRadius: "10px", borderLeft: `3px solid ${C.green}`
                }}>
                  <div style={{ fontWeight: "700", color: C.green, marginBottom: "4px", fontSize: "13px" }}>💡 Expert Tip</div>
                  <div style={{ fontSize: "14px", color: "#444", lineHeight: "1.6" }}>{plan.tip}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── COMMUNITY ── */}
        {activeTab === "community" && (() => {
          const CATEGORIES = [
            { value: "Special Moment", emoji: "📸" },
            { value: "Activity Together", emoji: "🎮" },
            { value: "Parenting Tip", emoji: "💡" },
            { value: "Health & Growth", emoji: "🌱" },
            { value: "Question / Help", emoji: "❓" },
            { value: "General", emoji: "💬" },
          ];
          const catEmoji = (cat) => CATEGORIES.find((c) => c.value === cat)?.emoji || "💬";

          const catToTags = {
            "Special Moment":    ["#SpecialMoment", "#Memories"],
            "Activity Together": ["#ActivityTogether", "#Bonding"],
            "Parenting Tip":     ["#ParentingTip", "#Advice"],
            "Health & Growth":   ["#Health", "#Growth"],
            "Question / Help":   ["#Question", "#Help"],
            "General":           ["#General"],
          };

          const avatarColors = ["#6b6bd6","#3aa67c","#f59e0b","#ef4444","#8b5cf6","#0ea5e9","#ec4899","#14b8a6"];
          const avatarColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

          function timeAgo(ts) {
            if (!ts?.toDate) return "just now";
            const diff = Date.now() - ts.toDate().getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return "just now";
            if (mins < 60) return `${mins}m ago`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return `${hrs}h ago`;
            const days = Math.floor(hrs / 24);
            return `${days} day${days > 1 ? "s" : ""} ago`;
          }

          /* Trending topics */
          const trending = Object.entries(
            posts.reduce((acc, p) => {
              const cat = p.category || "General";
              acc[cat] = (acc[cat] || 0) + 1;
              return acc;
            }, {})
          ).sort((a, b) => b[1] - a[1]).slice(0, 5);

          /* Community Impact stats */
          const questionsAnswered = posts.filter((p) => p.category === "Question / Help").length;
          const postsWithLikes = posts.filter((p) => (p.likesCount || 0) > 0).length;
          const satisfactionRate = posts.length > 0 ? Math.round((postsWithLikes / posts.length) * 100) : 0;

          return (
            <>
              <div style={s.pageHeader}>
                <h1 style={s.greeting}>Community 👥</h1>
                <p style={s.subGreet}>Share experiences, ask questions, and learn from other parents.</p>
              </div>

              {/* Trending Topics */}
              {trending.length > 0 && (
                <div style={{ ...s.sectionCard, marginBottom: "20px" }}>
                  <div style={s.sectionTitle}>🔥 Trending Topics</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "12px" }}>
                    {trending.map(([cat, count]) => (
                      <div key={cat} style={{ background: "#f0efff", borderRadius: "20px", padding: "7px 16px", fontSize: "13px", fontWeight: "600", color: "#6b6bd6", display: "flex", alignItems: "center", gap: "6px" }}>
                        {catEmoji(cat)} {cat}
                        <span style={{ background: "#6b6bd6", color: "white", borderRadius: "20px", padding: "1px 8px", fontSize: "11px", fontWeight: "700" }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Two-column layout */}
              <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>

                {/* ── LEFT: Composer + Feed ── */}
                <div style={{ flex: 1, minWidth: 0 }}>

                  {/* Post Composer */}
                  <div style={s.sectionCard}>
                    <div style={s.sectionTitle}>Share with the Community</div>
                    <form onSubmit={submitPost}>
                      <div style={{ marginBottom: "14px" }}>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>What is this post about?</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => setPostCategory(cat.value)}
                              style={{
                                padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer",
                                fontSize: "13px", fontWeight: "600",
                                background: postCategory === cat.value ? "#6b6bd6" : "#f0efff",
                                color: postCategory === cat.value ? "white" : "#6b6bd6",
                                transition: "all 0.15s"
                              }}
                            >{cat.emoji} {cat.value}</button>
                          ))}
                        </div>
                      </div>

                      <textarea
                        placeholder="Share a parenting tip, question, or experience..."
                        style={{
                          width: "100%", padding: "14px 16px", borderRadius: "12px",
                          border: `1.5px solid ${C.border}`, fontSize: "15px",
                          resize: "vertical", minHeight: "90px", fontFamily: "inherit",
                          outline: "none", boxSizing: "border-box", background: "#fafafe", lineHeight: "1.6"
                        }}
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                      />

                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px" }}>
                        <label style={{ cursor: "pointer", padding: "8px 16px", borderRadius: "10px", background: "#f0efff", color: "#6b6bd6", fontWeight: "600", fontSize: "13px", border: "1.5px solid #e0e0ff" }}>
                          📷 Add Photo
                          <input type="file" accept="image/*" style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              setImageFile(file);
                              setImagePreview(URL.createObjectURL(file));
                            }}
                          />
                        </label>
                        {imagePreview && (
                          <div style={{ position: "relative", display: "inline-block" }}>
                            <img src={imagePreview} alt="preview" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "10px", border: `1.5px solid ${C.border}` }} />
                            <button type="button" onClick={() => { setImageFile(null); setImagePreview(""); }}
                              style={{ position: "absolute", top: "-6px", right: "-6px", background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: "18px", height: "18px", cursor: "pointer", fontSize: "10px", fontWeight: "700", lineHeight: "18px", padding: 0 }}
                            >✕</button>
                          </div>
                        )}
                      </div>

                      <button
                        style={{ ...s.submitBtn, marginTop: "12px", opacity: (posting || !newPost.trim()) ? 0.6 : 1 }}
                        type="submit" disabled={posting || !newPost.trim()}
                      >{posting ? "Posting..." : "Share with Community"}</button>
                    </form>
                  </div>

                  {/* Feed */}
                  {posts.length === 0 && (
                    <div style={{ ...s.sectionCard, textAlign: "center", color: "#aaa", fontSize: "15px", padding: "40px" }}>
                      No posts yet. Be the first to share! 🌱
                    </div>
                  )}

                  {posts.map((post) => {
                    const liked = post.likes?.includes(currentUser?.uid);
                    const tags = catToTags[post.category] || ["#General"];
                    return (
                      <div key={post.id} style={{ ...s.postCard, border: `1px solid ${C.border}` }}>
                        {/* Post header */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                          <div style={{ ...s.avatar, background: avatarColor(post.displayName) }}>
                            {post.displayName?.[0]?.toUpperCase() || "P"}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: "700", fontSize: "15px", color: "#1a1a2e" }}>{post.displayName}</div>
                            <div style={{ fontSize: "12px", color: "#aaa" }}>{timeAgo(post.timestamp)}</div>
                          </div>
                          <span style={{ fontSize: "16px", color: "#bbb", cursor: "pointer" }}>🔖</span>
                        </div>

                        {/* Content */}
                        <p style={{ fontSize: "15px", color: "#333", lineHeight: "1.7", margin: "0 0 12px" }}>{post.content}</p>

                        {/* Photo */}
                        {post.imageUrl && (
                          <img src={post.imageUrl} alt="post" style={{ width: "100%", maxHeight: "320px", objectFit: "cover", borderRadius: "12px", marginBottom: "12px" }} />
                        )}

                        {/* Hashtag pills */}
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                          {tags.map((tag) => (
                            <span key={tag} style={{ background: "#f0efff", color: "#6b6bd6", borderRadius: "20px", padding: "3px 12px", fontSize: "12px", fontWeight: "600" }}>{tag}</span>
                          ))}
                        </div>

                        {/* Divider */}
                        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: "12px", display: "flex", justifyContent: "space-around" }}>
                          <button onClick={() => toggleLike(post)}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: liked ? "#2563eb" : "#888", display: "flex", alignItems: "center", gap: "6px", padding: 0 }}
                          >
                            👍 Like ({post.likesCount || 0})
                          </button>
                          <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "#888", display: "flex", alignItems: "center", gap: "6px", padding: 0 }}>
                            💬 Comment (0)
                          </button>
                          <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "#888", display: "flex", alignItems: "center", gap: "6px", padding: 0 }}>
                            ↗ Share
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Load More */}
                  {posts.length > 0 && (
                    <div style={{ ...s.sectionCard, textAlign: "center", cursor: "pointer", color: "#555", fontWeight: "600", fontSize: "14px", padding: "16px" }}>
                      Load More Posts
                    </div>
                  )}
                </div>

                {/* ── RIGHT SIDEBAR ── */}
                <div style={{ width: "260px", flexShrink: 0 }}>

                  {/* Community Impact */}
                  <div style={{ ...s.sectionCard, marginBottom: "16px" }}>
                    <div style={s.sectionTitle}>Community Impact</div>
                    <div style={{ textAlign: "center", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: "32px", fontWeight: "800", color: C.green }}>{posts.length}</div>
                      <div style={{ fontSize: "13px", color: "#888", marginTop: "2px" }}>Total Posts</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: "32px", fontWeight: "800", color: C.purple }}>{questionsAnswered}</div>
                      <div style={{ fontSize: "13px", color: "#888", marginTop: "2px" }}>Questions Asked</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "12px 0" }}>
                      <div style={{ fontSize: "32px", fontWeight: "800", color: "#8b5cf6" }}>{satisfactionRate}%</div>
                      <div style={{ fontSize: "13px", color: "#888", marginTop: "2px" }}>Posts Liked</div>
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div style={s.sectionCard}>
                    <div style={s.sectionTitle}>Quick Links</div>
                    {["Community Guidelines", "Featured Parents", "Report Content"].map((link) => (
                      <div key={link} style={{ padding: "12px 14px", borderRadius: "10px", border: `1px solid ${C.border}`, marginBottom: "10px", fontSize: "14px", fontWeight: "500", color: "#333", cursor: "pointer" }}>
                        {link}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </>
          );
        })()}

        {/* ── RESOURCES ── */}
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
