/*
 * Gated routes. Any file under src/pages/(protected)/ requires sign-in.
 * AuthGate shows the SDK sign-in overlay when signed out and mounts the shell
 * (sidebar + main) around the routed screen once signed in. The (protected)
 * folder is a Generouted route group, so it does not appear in the URL.
 */

import { AuthGate } from 'deepspace'
import { AppShell } from '../../components/shell/AppShell'

export default function ProtectedLayout() {
  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  )
}
