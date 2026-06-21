/**
 * App — global providers + outlet.
 *
 * Generouted renders this around all routes. The signed-in app gets its chrome
 * (sidebar + main) from (protected)/_layout.tsx via AppShell; there is no global
 * top-nav. Public pages (home, preview) render bare inside the outlet.
 */

import { Suspense, type ReactNode } from 'react'
import { Outlet, useRouteError } from 'react-router-dom'
import { DeepSpaceAuthProvider, useAuth } from 'deepspace'
import { RecordProvider, RecordScope } from 'deepspace'
import { ErrorScreen, ToastProvider } from '../components/ui'
import { APP_NAME, SCOPE_ID } from '../constants'
import { schemas } from '../schemas'

export default function App() {
  return (
    <ToastProvider>
      <DeepSpaceAuthProvider>
        <AuthBoot>
          {/* data-testid="app-root" is the canonical "app shell mounted" hook
              every test relies on. Don't rename without updating templates/tests. */}
          <div data-testid="app-root" className="h-screen overflow-hidden bg-bg-1 text-text-1">
            <Suspense fallback={<BootFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </AuthBoot>
      </DeepSpaceAuthProvider>
    </ToastProvider>
  )
}

/**
 * Root error boundary. Generouted wires a `_app` `Catch` export to the root
 * route's errorElement, so any render-time crash in a page lands here instead
 * of React Router's raw minified screen. ErrorScreen decodes it for the dev.
 */
export function Catch() {
  const error = useRouteError()
  return <ErrorScreen error={error} />
}

/** Waits for auth to resolve, then mounts the data layer. Distinct from the SDK's `AuthGate`. */
function AuthBoot({ children }: { children: ReactNode }) {
  const { isLoaded } = useAuth()

  if (!isLoaded) return <BootFallback />

  return (
    <RecordProvider allowAnonymous>
      <RecordScope roomId={SCOPE_ID} schemas={schemas} appId={APP_NAME}>
        {children}
      </RecordScope>
    </RecordProvider>
  )
}

function BootFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-bg-1 text-text-3">
      Loading...
    </div>
  )
}
