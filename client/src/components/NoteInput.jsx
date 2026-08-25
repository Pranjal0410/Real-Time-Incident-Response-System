/**
 * NoteInput Component
 * Role-aware note input control - Dark theme
 */
import { useState } from 'react';
import { useAuthStore } from '../stores';
import { useFocus } from '../hooks';
import { addNote } from '../services/socket';
import clsx from 'clsx';

export function NoteInput({ incidentId }) {
  const canWrite = useAuthStore((state) => state.canWrite());
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { onFocus, onBlur, focusedUsers } = useFocus(incidentId, 'notes');

  // Viewers don't see the input at all
  if (!canWrite) {
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    addNote(incidentId, text.trim());

    // Clear after brief delay (server will broadcast confirmation)
    setTimeout(() => {
      setText('');
      setIsSubmitting(false);
      onBlur();
    }, 100);
  };

  return (
    <form onSubmit={handleSubmit} className="note-input relative">
      {/* Focus presence indicators */}
      {focusedUsers.length > 0 && (
        <div className="focus-indicators mb-2 flex gap-1 flex-wrap">
          {focusedUsers.map((user) => (
            <span
              key={user.userId}
              className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: user.color, color: 'white' }}
            >
              {user.name} is typing...
            </span>
          ))}
        </div>
      )}

      {/* `ringColor` is not a valid CSS property, so the previous inline style
          silently did nothing. The co-editing highlight is a real box-shadow
          in the focused user's presence colour. */}
      <div
        className="rounded-[10px] overflow-hidden transition-shadow"
        style={{
          border: '1px solid var(--line-strong)',
          boxShadow: focusedUsers[0]?.color ? `0 0 0 2px ${focusedUsers[0].color}66` : 'none',
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Add observations, log lines, or findings…"
          className="w-full p-3 text-primary resize-none focus:outline-none text-[14.5px] leading-relaxed"
          style={{ backgroundColor: 'var(--bg-base)', border: 'none' }}
          rows={3}
          maxLength={2000}
          disabled={isSubmitting}
        />

        <div
          className="flex justify-between items-center px-3 py-2"
          style={{ backgroundColor: 'var(--bg-raised)', borderTop: '1px solid var(--line)' }}
        >
          <span className="text-[12px] text-muted tabular">{text.length}/2000</span>
          <button
            type="submit"
            disabled={!text.trim() || isSubmitting}
            className="btn btn--primary btn--sm"
          >
            {isSubmitting ? 'Adding…' : 'Add note'}
          </button>
        </div>
      </div>
    </form>
  );
}

export default NoteInput;
