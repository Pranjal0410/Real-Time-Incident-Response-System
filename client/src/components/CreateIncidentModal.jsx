/**
 * CreateIncidentModal
 *
 * Lifted out of IncidentListPage so the overview and the queue share one form.
 * Adds what the inline version was missing: field-level validation with inline
 * error text, a described severity picker, and a submit that cannot fire twice.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WarningCircle } from '@phosphor-icons/react';
import { Modal } from './ui';
import { useIncidentStore } from '../stores';
import { incidentApi } from '../services/api';
import { SEVERITY_ORDER, SEVERITY_LABEL, SEVERITY_HINT, SIGNAL_VAR } from '../constants/signals';

const TITLE_MAX = 120;

export function CreateIncidentModal({ isOpen, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  const addIncident = useIncidentStore((state) => state.addIncident);
  const navigate = useNavigate();

  const reset = () => {
    setTitle('');
    setDescription('');
    setSeverity('medium');
    setErrors({});
    setSubmitError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const validate = () => {
    const next = {};
    const trimmed = title.trim();
    if (!trimmed) {
      next.title = 'Give the incident a title so responders can identify it.';
    } else if (trimmed.length < 6) {
      next.title = 'Use at least 6 characters.';
    } else if (trimmed.length > TITLE_MAX) {
      next.title = `Keep the title under ${TITLE_MAX} characters.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting || !validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { incident } = await incidentApi.create({
        title: title.trim(),
        description: description.trim(),
        severity,
      });
      addIncident(incident);
      reset();
      onClose();
      navigate(`/incidents/${incident._id}`);
    } catch (err) {
      setSubmitError(err.message || 'Could not declare the incident. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Declare incident"
      description="Everyone on the incident channel is notified immediately."
      footer={
        <>
          <button type="button" onClick={handleClose} className="btn btn--secondary" disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="submit"
            form="declare-incident"
            className="btn btn--primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Declaring…' : 'Declare incident'}
          </button>
        </>
      }
    >
      <form id="declare-incident" onSubmit={handleSubmit} noValidate>
        {submitError && (
          <div className="alert alert--error mb-4" role="alert">
            <WarningCircle size={16} weight="fill" className="flex-shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="mb-4">
          <label className="label" htmlFor="incident-title">
            Title
          </label>
          <input
            id="incident-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors({});
            }}
            className="input"
            placeholder="Checkout API returning 502s"
            maxLength={TITLE_MAX + 20}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'title-error' : undefined}
          />
          {errors.title ? (
            <p id="title-error" className="field-error" role="alert">
              <WarningCircle size={13} weight="fill" />
              {errors.title}
            </p>
          ) : (
            <p className="mt-1.5 text-[12px] text-muted tabular">
              {title.trim().length}/{TITLE_MAX}
            </p>
          )}
        </div>

        <fieldset className="mb-4">
          <legend className="label">Severity</legend>
          <div className="grid grid-cols-2 gap-2">
            {SEVERITY_ORDER.map((level) => {
              const selected = severity === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSeverity(level)}
                  aria-pressed={selected}
                  title={SEVERITY_HINT[level]}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-[14px] font-medium transition-colors text-left"
                  style={{
                    border: `1px solid ${selected ? SIGNAL_VAR[level] : 'var(--line-strong)'}`,
                    background: selected ? `color-mix(in srgb, ${SIGNAL_VAR[level]} 12%, transparent)` : 'transparent',
                    color: selected ? SIGNAL_VAR[level] : 'var(--text-mid)',
                  }}
                >
                  <span className="signal-dot" style={{ backgroundColor: SIGNAL_VAR[level] }} />
                  {SEVERITY_LABEL[level]}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[12px] text-muted">{SEVERITY_HINT[severity]}</p>
        </fieldset>

        <div>
          <label className="label" htmlFor="incident-description">
            What is happening? <span className="text-muted font-normal">(optional)</span>
          </label>
          <textarea
            id="incident-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="textarea"
            placeholder="Symptoms, affected services, and anything already ruled out."
          />
        </div>
      </form>
    </Modal>
  );
}

export default CreateIncidentModal;
