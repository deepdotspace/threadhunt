import type { CollectionSchema } from 'deepspace/worker'

// Discovered threads. Written by the scan (owner context) and server actions.
// Clients read only their own (scoped by ownerUserId, copied from the topic).
export const candidatesSchema: CollectionSchema = {
  name: 'candidates',
  ownerField: 'ownerUserId',
  columns: [
    { name: 'topicId', storage: 'text', interpretation: 'plain' },
    { name: 'url', storage: 'text', interpretation: 'plain' },
    { name: 'source', storage: 'text', interpretation: 'plain' },
    { name: 'subsection', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'title', storage: 'text', interpretation: 'plain' },
    { name: 'author', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'excerpt', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'highlights', storage: 'text', interpretation: { kind: 'json' }, default: [] },
    { name: 'publishedAt', storage: 'number', interpretation: { kind: 'plain' }, default: 0 },
    { name: 'score', storage: 'number', interpretation: { kind: 'plain' }, default: 0 },
    { name: 'reason', storage: 'text', interpretation: 'plain', default: '' },
    {
      name: 'type',
      storage: 'text',
      interpretation: { kind: 'select', options: ['question', 'discussion', 'painpoint'] },
    },
    { name: 'draftText', storage: 'text', interpretation: 'plain', default: '' },
    {
      name: 'status',
      storage: 'text',
      interpretation: { kind: 'select', options: ['queued', 'posted', 'skipped'] },
      default: 'queued',
    },
    { name: 'ownerUserId', storage: 'text', interpretation: 'plain' },
  ],
  permissions: {
    viewer: { read: 'own', create: false, update: false, delete: false },
    member: { read: 'own', create: false, update: false, delete: false },
    admin: { read: 'own', create: true, update: true, delete: true },
  },
}
