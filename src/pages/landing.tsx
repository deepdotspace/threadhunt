import { Landing } from '../components/landing/Landing'

/*
 * Always-on landing route. The in-app sidebar logo links here so a signed-in
 * user can view the marketing page; its CTAs route back into the app. Public
 * (outside the (protected) group), so it renders without AuthGate.
 */
export default function LandingPage() {
  return <Landing />
}
