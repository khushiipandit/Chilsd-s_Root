# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start dev server (localhost:5173)
npm run build      # production build → dist/
npm run lint       # ESLint across all .js/.jsx files
npm run preview    # preview the production build locally
```

Requires **Node.js ≥ 20.19.0** (Vite 7 constraint). The `engines` field in `package.json` enforces this. Vercel picks it up automatically.

If the system Node is older, use nvm:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20 && nvm use 20
```

There are no tests in this project.

## Architecture

### Routing & Layout
- `src/App.jsx` — BrowserRouter + AuthProvider + AppRoutes. No layout wrapper here.
- `src/routes/AppRoutes.jsx` — All routes. Only the `/` landing page is wrapped in `GlobalLayout` (which adds the Navbar). All dashboard and auth routes are **standalone** — no top Navbar.
- `src/components/layout/GlobalLayout.jsx` — Wraps children with the landing page Navbar. Only used for `/`.
- `src/components/PrivateRoute.jsx` — Guards dashboard routes; redirects to `/auth` if not logged in.
- `src/pages/AuthRedirect.jsx` — Post-login redirect: reads `userProfile.role` from Firestore and sends the user to their role's dashboard.

### Auth & Role System
- `src/firebase.js` — Initialises Firebase app; exports `auth`, `db` (Firestore), `googleProvider`.
- `src/contexts/AuthContext.jsx` — Single source of truth for auth state. Exposes `currentUser`, `userProfile`, `userRole`, `signup(email, pass, name, role)`, `login`, `loginWithGoogle(role)`, `logout`. On auth state change it fetches the user's Firestore profile and sets `userProfile`.
- Roles: `parent` | `child` | `expert` | `admin`. Stored in `users/{uid}.role`.
- Google sign-in domains must be whitelisted in **Firebase Console → Authentication → Settings → Authorized Domains**. `localhost` and the Vercel deployment URL must both be listed.

### Firestore Data Model
```
users/{uid}                        — profile: { uid, displayName, email, role, xp, createdAt }
users/{uid}/growthHistory/{id}     — { age, height, weight, bmi, status, timestamp }
community/{id}                     — { uid, displayName, content, likes[], likesCount, timestamp }
assessments/{id}                   — { childUid, childName, question, correct, xpEarned, timestamp }
```

### Dashboard Pages
Each dashboard is a **self-contained full-screen page** (`height: 100vh`, `overflow: hidden`) with its own sidebar. The sidebar scrolls independently; the main panel scrolls independently.

| Route | File | Users |
|---|---|---|
| `/parent` | `parentDash.jsx` | Sidebar tabs: Overview, Growth Tracker, Vaccine Planner, Nutrition Guide, Community, Resources |
| `/child` | `childDash.jsx` | Tabs: Home, Quiz, Stories, Achievements. XP persisted to Firestore. |
| `/expert` | `expertDash.jsx` | Sidebar tabs: Overview, Consultations, Growth Insights, My Profile |
| `/admin` | `adminDash.jsx` | Sidebar tabs: Overview, All Users, Activity Log |

### Python Logic
`src/python_logic/` contains the original Python reference implementations (`growth_tracker.py`, `vaccine_tracker.py`). These are **not executed** — the logic has been ported directly into the React components (`parentDash.jsx`) as plain JS functions. Keep the Python files as the source of truth for the algorithms.

### Styling
All styles are **inline JS objects** defined inside each component (`const s = { ... }`). No CSS modules, no Tailwind. Shared colour palettes are defined as `const C = { purple, green, orange, ... }` at the top of each dashboard file.

## Git Remotes
- `origin` — `PrithveeOjha/kids-roots` (main working repo)
- `upstream` — `khushiipandit/Chilsd-s_Root` (Khushi's repo; sync source)
- `fork` — `PrithveeOjha/Chilsd-s_Root` (fork used to open PRs to Khushi's repo)

To keep the PR branch (`prithvee-features` on `fork`) in sync after new commits:
```bash
git checkout prithvee-features
git cherry-pick <new-commit-hash>
git push fork prithvee-features
git checkout main
```
