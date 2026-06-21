/*
 * App identity. To rename your deployment, change the two values below, then set
 * the matching name and APP_NAME in wrangler.toml. See README "Set your app name".
 */
export const APP_NAME = 'reply-radar' // lowercase slug; must match wrangler name + [vars] APP_NAME
export const APP_DISPLAY_NAME = 'Reply Radar' // shown in the UI (sidebar, landing, title)

/** Primary scope ID for the app's RecordRoom DO */
export const SCOPE_ID = `app:${APP_NAME}`

/** Roles and display config, imported from SDK (single source of truth). */
export { ROLES, ROLE_CONFIG, type Role } from 'deepspace'
