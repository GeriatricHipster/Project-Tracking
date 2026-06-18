import { useState } from 'react';
import { api } from '../lib/api';

export default function AuthScreen({ onAuth, pendingInviteCode }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: 'admin@demo.com', password: 'Construction123!', rememberMe: true });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = mode === 'register'
        ? { name: form.name, email: form.email, password: form.password }
        : { email: form.email, password: form.password };
      const data = await api(`/auth/${mode}`, { method: 'POST', body: payload, token: null });
      onAuth(data, form.rememberMe);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-lockup">
          <span className="brand-mark">PSG</span>
          <div>
            <h1>PSG and SS Tracking</h1>
            <p>Construction project timelines, live task tracking, and Gantt schedules.</p>
          </div>
        </div>

        {pendingInviteCode && (
          <div className="notice-box auth-invite-note">
            You opened a project invitation code. Log in or register first, then PSG and SS Tracking will add you to the project automatically.
          </div>
        )}

        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">Login</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">Register</button>
        </div>

        <form className="stack" onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Name
              <input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Jane Project Manager" />
            </label>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="you@company.com" />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} placeholder="At least 8 characters" />
          </label>
          <label className="remember-me-row">
            <span>
              <input
                type="checkbox"
                checked={form.rememberMe}
                onChange={(event) => updateField('rememberMe', event.target.checked)}
              />
              <span> Remember me on this device</span>
            </span>
          </label>
          {error && <p className="error-box">{error}</p>}
          <button className="primary-button" disabled={loading}>{loading ? 'Working...' : mode === 'login' ? 'Login' : 'Create account'}</button>
        </form>
      </section>
    </main>
  );
}
