import { useState } from 'react';

const allRoles = ['owner', 'manager', 'editor', 'viewer'];

function describeSlack(result, baseMessage) {
  const slack = result?.slack;
  const code = result?.invite?.formatted_code;
  if (!slack) return baseMessage;
  if (slack.sent) {
    const destination = 'Slack channel invitation';
    const warning = slack.warning ? ` Note: ${slack.warning}` : '';
    return `${baseMessage} ${destination} sent${code ? ` with code ${code}` : ''}.${warning}`;
  }
  return `${baseMessage} Slack invite was not sent: ${slack.error || 'check Slack setup.'}`;
}

export default function MembersPanel({ currentUser, projectRole, members, canManage, onAddMember, onUpdateMember, onRemoveMember }) {
  const canOwner = projectRole === 'owner';
  const [form, setForm] = useState({ email: '', role: 'editor' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const roleOptions = canOwner ? allRoles : allRoles.filter((role) => role !== 'owner');

  async function submit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const result = await onAddMember(form);
      setNotice(describeSlack(result, 'Member added or updated.'));
      setForm({ email: '', role: 'editor' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeMemberRole(member, role) {
    setError('');
    setNotice('');
    setUpdatingUserId(member.user_id);
    try {
      const result = await onUpdateMember(member, role);
      setNotice(describeSlack(result, `${member.name} updated to ${role}.`));
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingUserId(null);
    }
  }

  return (
    <section className="panel side-panel">
      <div className="panel-heading compact-heading">
        <div>
          <h2>Project members</h2>
          <p>{members.length} user{members.length === 1 ? '' : 's'} assigned</p>
        </div>
      </div>

      <form className="stack compact-form" onSubmit={submit}>
        <label>
          Registered user email
          <input disabled={!canManage} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="teammate@company.com" />
        </label>
        <label>
          Project role
          <select disabled={!canManage} value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
            {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </label>
        <p className="form-help">The user must already have a BuildTrack account. When Slack is set up, an invite code is posted to the project invite channel after add/update and calls out the assigned BuildTrack email.</p>
        {error && <p className="error-box">{error}</p>}
        {notice && <p className="notice-box">{notice}</p>}
        <button className="primary-button compact" disabled={!canManage || saving}>{saving ? 'Adding...' : 'Add / update member'}</button>
      </form>

      <div className="member-list">
        {members.map((member) => (
          <div className="member-item" key={member.user_id}>
            <div>
              <strong>{member.name}{member.access_revoked ? ' (revoked)' : ''}</strong>
              <span>{member.email}</span>
            </div>
            <div className="member-actions">
              {canOwner ? (
                <select disabled={updatingUserId === member.user_id} value={member.role} onChange={(event) => changeMemberRole(member, event.target.value)}>
                  {allRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              ) : (
                <span className={`role-pill role-${member.role}`}>{member.role}</span>
              )}
              {canOwner && member.user_id !== currentUser?.id && (
                <button className="danger-button compact" onClick={() => onRemoveMember(member)} type="button">Remove</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
