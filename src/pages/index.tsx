import { Navigate } from 'react-router-dom'
import { useAuth } from 'deepspace'
import { Landing } from '../components/landing/Landing'

/*
 * Public entry. Signed-in visitors go straight to the app; signed-out visitors
 * see the marketing landing. The landing is not gated, so it renders without
 * AuthGate and opens the sign-in overlay from its CTAs.
 */
export default function Index() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-1)] text-[var(--text-3)]">
        Loading...
      </div>
    )
  }

  if (isSignedIn) return <Navigate to="/topics" replace />

  return <Landing />
}
