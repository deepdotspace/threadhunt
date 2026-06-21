import type { CollectionSchema } from 'deepspace/worker'

// Logged outcomes. Written by server actions; clients read only their own
// (scoped by actorUserId, the user who took the action).
export const decisionsSchema: CollectionSchema = {
  name: 'decisions',
  ownerField: 'actorUserId',
  columns: [
    { name: 'candidateId', storage: 'text', interpretation: 'plain' },
    { name: 'topicId', storage: 'text', interpretation: 'plain' },
    {
      name: 'action',
      storage: 'text',
      interpretation: { kind: 'select', options: ['posted', 'edited', 'skipped'] },
    },
    { name: 'finalText', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'actorUserId', storage: 'text', interpretation: 'plain' },
  ],
  permissions: {
    viewer: { read: 'own', create: false, update: false, delete: false },
    member: { read: 'own', create: false, update: false, delete: false },
    admin: { read: 'own', create: true, update: true, delete: true },
  },
}
