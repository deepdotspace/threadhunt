import { signOut, useUser } from 'deepspace'

import { Button } from '../ui'
import { Section, Row } from './Section'

/*
 * Account: name, email, and the Sign out control. Name and email are read from
 * the auth profile; there is no profile editing here (the SDK owns that).
 */
export function AccountSection() {
  const { user } = useUser()
  const initials = (user?.name?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()

  return (
    <Section title="Account">
      <div className="flex items-center gap-3 border-b border-border px-[18px] py-[14px]">
        {user?.imageUrl ? (
          <img
            src={user.imageUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-10 w-10 flex-none rounded-full object-cover"
          />
        ) : (
          <span
            className="grid h-10 w-10 flex-none place-content-center rounded-full text-[14px] font-bold text-accent-text"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--text-3))' }}
            aria-hidden
          >
            {initials}
          </span>
        )}
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold text-text-1">
            {user?.name || 'Account'}
          </div>
          <div className="truncate text-[12.5px] text-text-2">
            {user?.email || 'Signed in'}
          </div>
        </div>
      </div>
      <Row label="Sign out" hint="End this session on this device.">
        <Button variant="secondary" size="sm" onClick={() => signOut()}>
          Sign out
        </Button>
      </Row>
    </Section>
  )
}
