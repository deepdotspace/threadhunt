/**
 * Collection Schemas
 *
 * All collections with columns and RBAC permissions.
 * Single source of truth — imported by both worker and frontend.
 *
 * Add schemas by creating a file in src/schemas/ and importing it here.
 */

import type { CollectionSchema } from 'deepspace/worker'
import { usersSchema } from './schemas/users-schema'
import { settingsSchema } from './schemas/admin-schema'
import { topicsSchema } from './schemas/topics-schema'
import { candidatesSchema } from './schemas/candidates-schema'
import { decisionsSchema } from './schemas/decisions-schema'
import { seenUrlsSchema } from './schemas/seen-urls-schema'

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  topicsSchema,
  candidatesSchema,
  decisionsSchema,
  seenUrlsSchema,
]
