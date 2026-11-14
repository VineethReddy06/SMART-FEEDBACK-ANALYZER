import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const api = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const result = await response.json();
  if (!response.ok && !result.message) throw new Error("Request failed");
  return result;
};

const go = (path) => {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

function Layout({ children, admin = false }) {
  return (
    <>
      <header className={admin ? "navbar admin-nav" : "navbar"}>
        <a className="logo" href="/" onClick={(event) => { event.preventDefault(); go("/"); }}>
          Smart Feedback <span>AI</span>
        </a>
        <nav>
          {!admin && <a href="/feedback" onClick={(event) => { event.preventDefault(); go("/feedback"); }}>Give Feedback</a>}
          {!admin && <a href="/dashboard" onClick={(event) => { event.preventDefault(); go("/dashboard"); }}>Dashboard</a>}
          {!admin && <a href="/login" onClick={(event) => { event.preventDefault(); go("/login"); }}>Login</a>}
          {!admin && <a href="/register" onClick={(event) => { event.preventDefault(); go("/register"); }}>Register</a>}
          {admin && <button className="link-button" onClick={() => logout()}>Logout</button>}
        </nav>
      </header>
      {children}
      <footer className="footer">© 2026 Smart Feedback AI · AI-powered feedback management system</footer>
    </>
  );
}

async function logout() {
  await fetch("/logout");
  go("/login");
}

function Home() {
  return <Layout><main className="hero-page">
    <section className="hero">
      <div className="eyebrow">✨ AI-POWERED FEEDBACK PLATFORM</div>
      <h1>Turn customer feedback into <span>meaningful insights.</span></h1>
      <p>Smart Feedback AI analyzes sentiment, category, and priority so teams can act on what customers really need.</p>
      <div className="actions"><button onClick={() => go("/feedback")}>Analyze Feedback →</button><button className="secondary" onClick={() => go("/login")}>Sign In</button></div>
    </section>
    <section className="feature-grid">
      <Feature icon="🤖" title="AI Analysis" text="Classify feedback by sentiment, category, and urgency automatically." />
      <Feature icon="📊" title="Smart Insights" text="Give administrators an organized view of customer opinions." />
      <Feature icon="⚡" title="Priority Detection" text="Highlight urgent feedback so important issues are handled first." />
    </section>
  </main></Layout>;
}

function Feature({ icon, title, text }) {
  return <article className="feature-card"><div className="feature-icon">{icon}</div><h3>{title}</h3><p>{text}</p></article>;
}

function AuthCard({ title, subtitle, children }) {
  return <Layout><main className="auth-page"><section className="auth-card"><div className="auth-icon">🤖</div><h1>{title}</h1><p>{subtitle}</p>{children}</section></main></Layout>;
}

function Login() {
  const [message, setMessage] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await api("/api/login", { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
      if (result.success) go(result.role === "admin" ? "/admin" : "/dashboard");
      else setMessage(result.message);
    } catch (error) { setMessage(error.message); }
  };
  return <AuthCard title="Welcome Back 👋" subtitle="Sign in to continue to Smart Feedback AI.">
    <form className="form" onSubmit={submit}><Field name="email" label="Email address" type="email" autoComplete="email" /><Field name="password" label="Password" type="password" autoComplete="current-password" /><button type="submit">Sign In →</button><a className="form-link" href="/forgot-password" onClick={(event) => { event.preventDefault(); go("/forgot-password"); }}>Forgot password?</a><p className="message">{message}</p></form>
    <p className="auth-foot">No account? <a href="/register" onClick={(event) => { event.preventDefault(); go("/register"); }}>Create one</a></p>
  </AuthCard>;
}

function Register() {
  const [message, setMessage] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await api("/api/register", { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
      setMessage(result.message);
      if (result.success) event.currentTarget.reset();
    } catch (error) { setMessage(error.message); }
  };
  return <AuthCard title="Create Your Account" subtitle="Join Smart Feedback AI and start sharing valuable feedback.">
    <form className="form" onSubmit={submit}><Field name="name" label="Full name" autoComplete="name" /><Field name="email" label="Email address" type="email" autoComplete="email" /><Field name="password" label="Password" type="password" autoComplete="new-password" /><button type="submit">Create Account →</button><p className="message">{message}</p></form>
    <p className="auth-foot">Already registered? <a href="/login" onClick={(event) => { event.preventDefault(); go("/login"); }}>Sign in</a></p>
  </AuthCard>;
}

function Field({ label, name, type = "text", ...props }) {
  return <label>{label}<input name={name} type={type} required {...props} /></label>;
}

function ForgotPassword() {
  const [message, setMessage] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");
    try { setMessage((await api("/api/forgot-password", { method: "POST", body: JSON.stringify({ email }) })).message); }
    catch (error) { setMessage(error.message); }
  };
  return <AuthCard title="Forgot Password" subtitle="Enter your email and we will send a secure reset link."><form className="form" onSubmit={submit}><Field name="email" label="Email address" type="email" autoComplete="email" /><button type="submit">Send Reset Link</button><p className="message">{message}</p></form><BackToLogin /></AuthCard>;
}

function ResetPassword({ token }) {
  const [message, setMessage] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("password");
    try {
      const result = await api("/api/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
      setMessage(result.message);
      if (result.success) setTimeout(() => go("/login"), 1000);
    } catch (error) { setMessage(error.message); }
  };
  return <AuthCard title="Set New Password" subtitle="Choose a new password for your account."><form className="form" onSubmit={submit}><Field name="password" label="New password" type="password" minLength="6" autoComplete="new-password" /><button type="submit">Reset Password</button><p className="message">{message}</p></form></AuthCard>;
}

function BackToLogin() {
  return <a className="back-link" href="/login" onClick={(event) => { event.preventDefault(); go("/login"); }}>← Back to Login</a>;
}

function Feedback() {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const submit = async (event) => {
    event.preventDefault();
    try {
      const result = await api("/api/feedback", { method: "POST", body: JSON.stringify({ feedback_text: text }) });
      setMessage(result.message);
      if (result.success) { setAnalysis(result.analysis); setText(""); }
    } catch (error) { setMessage(error.message); }
  };
  return <Layout><main className="content"><section className="panel wide"><div className="section-title"><span className="feature-icon">💬</span><div><h1>Share Your Feedback</h1><p>Our AI will analyze your experience automatically.</p></div></div><form className="form" onSubmit={submit}><label>Your feedback<textarea value={text} onChange={(event) => setText(event.target.value)} maxLength="1000" minLength="5" required placeholder="Tell us about your experience..." /><small>{text.length} / 1000</small></label><button type="submit">🤖 Analyze My Feedback</button><p className="message">{message}</p></form>{analysis && <Analysis analysis={analysis} />}</section></main></Layout>;
}

function Analysis({ analysis }) {
  return <div className="analysis"><h2>AI Feedback Analysis</h2><div className="pill-row"><Pill label="Sentiment" value={analysis.sentiment} /><Pill label="Category" value={analysis.category} /><Pill label="Priority" value={analysis.priority} /></div></div>;
}

function Pill({ label, value }) { return <div className="pill"><small>{label}</small><strong>{value}</strong></div>; }

function Dashboard() {
  const [items, setItems] = useState([]);
  useEffect(() => { api("/api/my-feedback").then((result) => setItems(result.feedback || [])).catch(() => setItems([])); }, []);
  return <Layout><main className="content"><div className="page-heading"><div><div className="eyebrow">👋 WELCOME BACK</div><h1>My Feedback</h1><p>Track your submissions and view AI-generated insights.</p></div><button onClick={() => go("/feedback")}>+ Give Feedback</button></div><section className="panel"><div className="section-title"><div><h2>Feedback History</h2><p>Your recent feedback and AI-generated insights.</p></div></div>{items.length === 0 ? <div className="empty">No feedback submitted yet.</div> : <div className="feedback-list">{items.map((item) => <article className="feedback-item" key={item.id}><div><small>Feedback #{item.id} · {item.created_at}</small><p>{item.feedback_text}</p></div><Analysis analysis={item} /><span className={`status ${item.status}`}>{item.status}</span></article>)}</div>}</section></main></Layout>;
}

function Admin() {
  const [stats, setStats] = useState({});
  const [analytics, setAnalytics] = useState({});
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "", sentiment: "", category: "", priority: "" });
  const load = async () => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    const [feedback, statResult, analyticsResult] = await Promise.all([api(`/api/admin/feedback?${query}`), api("/api/admin/stats"), api("/api/admin/analytics")]);
    setItems(feedback.feedback || []); setStats(statResult.stats || {}); setAnalytics(analyticsResult);
  };
  useEffect(() => { load().catch(() => go("/login")); }, []);
  const update = async (id, action) => { await api(`/api/admin/feedback/${id}/${action}`, { method: "PUT" }); load(); };
  return <Layout admin><main className="content admin-content"><div className="page-heading"><div><div className="eyebrow">ADMINISTRATOR DASHBOARD</div><h1>Feedback Intelligence</h1><p>Monitor, classify, and prioritize customer feedback.</p></div></div><div className="stats">{[["Total", stats.total], ["Pending", stats.pending], ["Reviewed", stats.reviewed], ["Flagged", stats.flagged]].map(([label, value]) => <div className="stat" key={label}><small>{label}</small><strong>{value || 0}</strong></div>)}</div><section className="analytics-grid">{[["Sentiment", analytics.sentiment], ["Category", analytics.category], ["Priority", analytics.priority]].map(([title, data]) => <div className="panel" key={title}><h2>{title}</h2><Bars data={data || []} title={title} /></div>)}</section><section className="panel"><div className="filters">{Object.keys(filters).map((key) => <input key={key} placeholder={key} value={filters[key]} onChange={(event) => setFilters({ ...filters, [key]: event.target.value })} />)}<button onClick={load}>Search</button></div><div className="table-wrap"><table><thead><tr>{["ID", "Feedback", "Sentiment", "Category", "Priority", "Status", "Actions"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.feedback_text}</td><td>{item.sentiment}</td><td>{item.category}</td><td>{item.priority}</td><td><span className={`status ${item.status}`}>{item.status}</span></td><td><button className="small-button" onClick={() => update(item.id, "review")}>Review</button><button className="small-button danger" onClick={() => update(item.id, "flag")}>Flag</button></td></tr>)}</tbody></table></div></section></main></Layout>;
}

function Bars({ data, title }) {
  return <div className="bars">{data.map((item) => { const label = item.sentiment || item.category || item.priority; return <div className="bar-row" key={label}><span>{label}</span><div><i style={{ width: `${Math.min(100, item.count * 10)}%` }} /></div><b>{item.count}</b></div>; })}{data.length === 0 && <p className="empty">No data yet.</p>}</div>;
}

function App() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => { const listener = () => setPath(window.location.pathname); window.addEventListener("popstate", listener); return () => window.removeEventListener("popstate", listener); }, []);
  if (path === "/login") return <Login />;
  if (path === "/register") return <Register />;
  if (path === "/forgot-password") return <ForgotPassword />;
  if (path.startsWith("/reset-password/")) return <ResetPassword token={path.split("/").pop()} />;
  if (path === "/feedback") return <Feedback />;
  if (path === "/dashboard") return <Dashboard />;
  if (path === "/admin") return <Admin />;
  return <Home />;
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
