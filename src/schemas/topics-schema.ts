import type { CollectionSchema } from 'deepspace/worker'

// All writes happen server-side (cron owner context or server actions, which
// bypass RBAC), so clients are read-only. Reads are scoped to the owner via
// ownerUserId for everyone, including admin: Reply Radar is single-user-per-account,
// so no client surface shows another user's topics.
export const topicsSchema: CollectionSchema = {
  name: 'topics',
  ownerField: 'ownerUserId',
  columns: [
    { name: 'name', storage: 'text', interpretation: 'plain' },
    { name: 'q1Find', storage: 'text', interpretation: 'plain' },
    { name: 'q2Promote', storage: 'text', interpretation: 'plain' },
    { name: 'queries', storage: 'text', interpretation: { kind: 'json' }, default: [] },
    { name: 'venues', storage: 'text', interpretation: { kind: 'json' }, default: [] },
    { name: 'scansPerDay', storage: 'number', interpretation: { kind: 'plain' }, default: 1 },
    { name: 'timeOfDay', storage: 'text', interpretation: 'plain', default: null },
    {
      name: 'draftMode',
      storage: 'text',
      interpretation: { kind: 'select', options: ['manual', 'auto'] },
      default: 'manual',
    },
    {
      name: 'draftModel',
      storage: 'text',
      interpretation: { kind: 'select', options: ['haiku', 'sonnet', 'opus'] },
      default: 'sonnet',
    },
    { name: 'replyVoice', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'paused', storage: 'number', interpretation: { kind: 'boolean' }, default: false },
    { name: 'nextDueAt', storage: 'number', interpretation: { kind: 'plain' }, default: 0 },
    { name: 'lastScanAt', storage: 'number', interpretation: { kind: 'plain' }, default: 0 },
    { name: 'ownerUserId', storage: 'text', interpretation: 'plain' },
  ],
  permissions: {
    viewer: { read: 'own', create: false, update: false, delete: false },
    member: { read: 'own', create: false, update: false, delete: false },
    admin: { read: 'own', create: true, update: true, delete: true },
  },
}
