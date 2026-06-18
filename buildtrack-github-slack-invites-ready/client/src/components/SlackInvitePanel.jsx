import { useState } from 'react';

const managerRoleOptions = ['editor', 'viewer'];
const ownerRoleOptions = ['manager', 'editor', 'viewer'];

export default function SlackInvitePanel({ canManage, projectRole, onSendSlackInvite }) {
  const roleOptions = projectRole === 'owner' ? ownerRoleOptions : managerRoleOptions;
  const [form, setForm] = useState({ role: roleOptions[0], expires_in_days: 7, max_uses: 10 });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [lastInvite, setLastInvite] = useState(null);
  const [sending, setSending] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLastInvite(null);
    setSending(true);
    try {
      const result = await onSendSlackInvite({
        role: form.role,
        expires_in_days: Number(form.expires_in_days),
        max_uses: Number(form.max_uses)
      });
      setLastInvite(result.invite);
      if (result.slack?.sent) {
        setNotice('Slack invitation code sent. The code is also shown below for your records.');
      } else {
        setNotice('Invitation code was created, but Slack did not send. Check the setup steps in SLACK_INVITE_SETUP.md.');
      }
      if (result.slack?.error) setError(result.slack.error);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="panel side-panel slack-invite-panel">
      <div className="panel-heading compact-heading">
        <div>
          <h2>Slack invite code</h2>
          <p>Create a project code and post it to your Slack channel.</p>
        </div>
      </div>

      <form className="stack compact-form" onSubmit={submit}>
        <label>
          Access level for people using this code
          <select disabled={!canManage || sending} value={form.role} onChange={(event) => updateField('role', event.target.value)}>
            {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </label>
        <div className="two-col">
          <label>
            Expires in days
            <input disabled={!canManage || sending} min="1" max="30" type="number" value={form.expires_in_days} onChange={(event) => updateField('expires_in_days', event.target.value)} />
          </label>
          <label>
            Max uses
            <input disabled={!canManage || sending} min="1" max="100" type="number" value={form.max_uses} onChange={(event) => updateField('max_uses', event.target.value)} />
          </label>
        </div>
        <p className="form-help">This posts to the Slack channel connected by your Slack webhook. People still need a BuildTrack account before accepting the code.</p>
        {notice && <p className="notice-box">{notice}</p>}
        {error && <p className="error-box">{error}</p>}
        {lastInvite && (
          <div className="invite-result-box">
            <span>Invitation code</span>
            <strong>{lastInvite.formatted_code || lastInvite.code}</strong>
            {lastInvite.invite_url && <small>Invite link: {lastInvite.invite_url}</small>}
          </div>
        )}
        <button className="primary-button compact" disabled={!canManage || sending} type="submit">
          {sending ? 'Sending to Slack...' : 'Send invite code to Slack'}
        </button>
      </form>
    </section>
  );
}
