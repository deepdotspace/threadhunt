/*
 * Reply Radar landing — the public face for signed-out visitors. Composes the hero
 * (with the live triage demo) and the story sections, and opens the SDK sign-in
 * overlay on any Get started action. The overlay themes with the host app.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthOverlay, useAuth } from 'deepspace'
import { LandingNav } from './LandingNav'
import { Hero } from './Hero'
import { HowItWorks } from './HowItWorks'
import { Venues } from './Venues'
import { TopicQueues } from './TopicQueues'
import { ClosingCTA } from './ClosingCTA'
import { LandingFooter } from './LandingFooter'

export function Landing() {
  const [signInOpen, setSignInOpen] = useState(false)
  const { isSignedIn } = useAuth()
  const navigate = useNavigate()
  // Signed-in visitors reach the landing from the in-app logo, so their CTAs go
  // into the app; signed-out visitors get the sign-in overlay.
  const openSignIn = () => (isSignedIn ? navigate('/topics') : setSignInOpen(true))

  // The app shell clamps height for the signed-in client; the landing is a long
  // scrolling page, so let the document grow while it is mounted, then restore.
  useEffect(() => {
    const root = document.getElementById('root')
    const shell = document.querySelector<HTMLElement>('[data-testid="app-root"]')
    const prev = { root: root?.style.cssText ?? '', shell: shell?.style.cssText ?? '' }
    if (root) root.style.cssText += ';height:auto;min-height:100vh;overflow:visible;'
    if (shell) shell.style.cssText += ';height:auto;min-height:100vh;overflow:visible;'
    return () => {
      if (root) root.style.cssText = prev.root
      if (shell) shell.style.cssText = prev.shell
    }
  }, [])

  return (
    <div id="top" className="min-h-screen bg-[var(--bg-1)] text-[var(--text-1)]">
      <LandingNav onGetStarted={openSignIn} />
      <main>
        <Hero onGetStarted={openSignIn} />
        <HowItWorks />
        <Venues />
        <TopicQueues />
        <ClosingCTA onGetStarted={openSignIn} />
      </main>
      <LandingFooter />

      {/* Sign-in overlay (closeable, themed by the host). Opened by any CTA. */}
      {signInOpen && <AuthOverlay onClose={() => setSignInOpen(false)} />}
    </div>
  )
}
