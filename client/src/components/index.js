/**
 * Component Exports
 */

// Layout components
export { AppLayout, Sidebar, TopBar } from './layout';

// Dashboard components
export { StatCard, IncidentTrendChart, SeverityDistribution } from './dashboard';

// Role-aware components
export { RoleGate, WriteGate, AdminGate } from './RoleGate';
export { RoleBadge } from './RoleBadge';
export { ReadOnlyBanner } from './ReadOnlyBanner';

// Incident components
export { StatusSelector } from './StatusSelector';
export { StatusProgression } from './StatusProgression';
export { NoteInput } from './NoteInput';
export { ActionItemList } from './ActionItemList';
export { AssignResponder } from './AssignResponder';
export { IncidentMetaStrip } from './IncidentMetaStrip';
export { CopyIncidentSummary } from './CopyIncidentSummary';

// Presence & Focus components
export { PresenceIndicator } from './PresenceIndicator';

export { CreateIncidentModal } from './CreateIncidentModal';

// Audit & Status
export { AuditTimeline } from './AuditTimeline';
export { ConnectionStatus } from './ConnectionStatus';

// Global
export { CommandPalette } from './CommandPalette';

// UI primitives
export { Modal, SeverityBadge, StatusBadge } from './ui';
