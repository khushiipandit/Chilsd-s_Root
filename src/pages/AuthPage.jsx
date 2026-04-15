import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ROLE_ROUTES = {
  parent: "/parent",
  child: "/child",
  expert: "/expert",
  admin: "/admin"
};

function AuthPage() {
  const [isSignup, setIsSignup] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("parent");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { signup, login, loginWithGoogle, userProfile } = useAuth();
  const navigate = useNavigate();

  function getRedirectPath(profileRole) {
    return ROLE_ROUTES[profileRole] || "/parent";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (isSignup && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      if (isSignup) {
        await signup(email, password, name.trim(), role);
        navigate(ROLE_ROUTES[role]);
      } else {
        await login(email, password);
        // After login, redirect based on existing profile role
        // We'll handle via a brief re-fetch delay; redirect to /auth-redirect
        navigate("/auth-redirect");
      }
    } catch (err) {
      const code = err.code;
      if (code === "auth/email-already-in-use") {
        setError("This email is already registered. Try signing in.");
      } else if (code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else if (code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else if (code === "auth/weak-password") {
        setError("Password is too weak.");
      } else {
        setError(err.message);
      }
    }
    setSubmitting(false);
  }

  async function handleGoogle() {
    setError("");
    try {
      await loginWithGoogle(role);
      navigate("/auth-redirect");
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Google sign-in failed. Please try again.");
      }
    }
  }

  const s = {
    wrapper: {
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)"
    },
    card: {
      background: "white",
      padding: "44px 40px",
      borderRadius: "24px",
      width: "420px",
      boxShadow: "0 20px 60px rgba(0,0,0,0.18)"
    },
    logo: {
      fontSize: "22px",
      fontWeight: "800",
      color: "#6b6bd6",
      marginBottom: "8px",
      letterSpacing: "0.5px"
    },
    title: {
      margin: "0 0 4px 0",
      fontSize: "26px",
      fontWeight: "700",
      color: "#1a1a2e"
    },
    subtitle: {
      margin: "0 0 26px 0",
      fontSize: "14px",
      color: "#888"
    },
    label: {
      display: "block",
      fontSize: "13px",
      fontWeight: "600",
      color: "#555",
      marginBottom: "5px",
      marginTop: "14px"
    },
    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: "10px",
      border: "1.5px solid #e0e0e0",
      fontSize: "15px",
      boxSizing: "border-box",
      outline: "none",
      transition: "border-color 0.2s",
      background: "#fafafa"
    },
    select: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: "10px",
      border: "1.5px solid #e0e0e0",
      fontSize: "15px",
      boxSizing: "border-box",
      outline: "none",
      background: "#fafafa",
      cursor: "pointer"
    },
    roleGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: "8px",
      marginTop: "6px"
    },
    roleBtn: (selected) => ({
      padding: "10px 6px",
      borderRadius: "10px",
      border: selected ? "2px solid #6b6bd6" : "2px solid #e0e0e0",
      background: selected ? "#f0efff" : "white",
      color: selected ? "#6b6bd6" : "#666",
      fontWeight: selected ? "700" : "500",
      fontSize: "13px",
      cursor: "pointer",
      transition: "all 0.2s",
      textAlign: "center"
    }),
    button: {
      marginTop: "22px",
      width: "100%",
      padding: "14px",
      background: "linear-gradient(135deg,#6b6bd6,#8b5cf6)",
      color: "white",
      border: "none",
      borderRadius: "12px",
      fontSize: "16px",
      fontWeight: "700",
      cursor: "pointer",
      opacity: submitting ? 0.7 : 1
    },
    divider: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      margin: "18px 0",
      color: "#aaa",
      fontSize: "13px"
    },
    dividerLine: {
      flex: 1,
      height: "1px",
      background: "#e8e8e8"
    },
    googleBtn: {
      width: "100%",
      padding: "12px",
      background: "white",
      color: "#333",
      border: "1.5px solid #e0e0e0",
      borderRadius: "12px",
      fontSize: "15px",
      fontWeight: "500",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px"
    },
    toggle: {
      marginTop: "20px",
      cursor: "pointer",
      color: "#6b6bd6",
      fontSize: "14px",
      textAlign: "center",
      fontWeight: "500"
    },
    error: {
      background: "#fff0f0",
      color: "#c00",
      padding: "10px 14px",
      borderRadius: "8px",
      fontSize: "13px",
      marginTop: "12px",
      border: "1px solid #fcc"
    },
    roleEmoji: { fontSize: "16px", display: "block", marginBottom: "2px" }
  };

  const roles = [
    { value: "parent", label: "Parent", emoji: "👨‍👩‍👧" },
    { value: "child", label: "Child", emoji: "🧒" },
    { value: "expert", label: "Expert", emoji: "🩺" }
  ];

  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        <div style={s.logo}>KidRoots</div>
        <h2 style={s.title}>
          {isSignup ? "Create Account" : "Welcome Back"}
        </h2>
        <p style={s.subtitle}>
          {isSignup
            ? "Join KidRoots to support your child's growth journey"
            : "Sign in to continue to your dashboard"}
        </p>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <label style={s.label}>Full Name</label>
              <input
                placeholder="Enter your full name"
                style={s.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </>
          )}

          <label style={s.label}>Email</label>
          <input
            placeholder="your@email.com"
            type="email"
            style={s.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label style={s.label}>Password</label>
          <input
            placeholder="Min 6 characters"
            type="password"
            style={s.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {isSignup && (
            <>
              <label style={s.label}>I am a...</label>
              <div style={s.roleGrid}>
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    style={s.roleBtn(role === r.value)}
                    onClick={() => setRole(r.value)}
                  >
                    <span style={s.roleEmoji}>{r.emoji}</span>
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {error && <div style={s.error}>{error}</div>}

          <button style={s.button} type="submit" disabled={submitting}>
            {submitting
              ? "Please wait..."
              : isSignup
              ? "Create Account"
              : "Sign In"}
          </button>
        </form>

        <div style={s.divider}>
          <div style={s.dividerLine} />
          <span>or</span>
          <div style={s.dividerLine} />
        </div>

        <button style={s.googleBtn} onClick={handleGoogle} type="button">
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <p
          style={s.toggle}
          onClick={() => { setIsSignup(!isSignup); setError(""); }}
        >
          {isSignup
            ? "Already have an account? Sign in"
            : "New here? Create account"}
        </p>
      </div>
    </div>
  );
}

export default AuthPage;
