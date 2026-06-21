import type { CollectionSchema } from 'deepspace/worker'

// Per-topic judged-url guard: every url ever scored for a topic, queried by
// topicId into a Set so each url is judged exactly once. Internal pipeline
// state with no UI surface, so it is not client-readable.
export const seenUrlsSchema: CollectionSchema = {
  name: 'seen_urls',
  columns: [
    { name: 'topicId', storage: 'text', interpretation: 'plain' },
    { name: 'url', storage: 'text', interpretation: 'plain' },
    { name: 'judgedAt', storage: 'number', interpretation: { kind: 'plain' }, default: 0 },
  ],
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: false, create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
