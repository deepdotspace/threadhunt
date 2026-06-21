/*
 * Reply Radar left sidebar: 268px fixed, bg-0, hairline right
 * border. App mark + wordmark, New topic button, the TOPICS list (unread count
 * + honest scanning indicator), bottom History/Settings nav, account + theme.
 */

import { useMemo, useState, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useUser } from 'deepspace'
import type { RecordData } from 'deepspace'
import { History, Pencil, Settings, Trash2 } from 'lucide-react'
import type { TopicData, CandidateData } from '../../types'
import { deleteTopic } from '../../lib/api'
import { BRAND } from '../../themes'
import { ConfirmModal, ThemeToggle, useToast } from '../ui'

/** A topic plus the two derived counts the sidebar row renders. */
interface SidebarTopic {
  id: string
  name: string
  unread: number
  /** True only when a scan is genuinely due (nextDueAt elapsed, not paused). */
  scanning: boolean
}

/**
 * Derive sidebar rows from the live collections. Unread = this topic's queued
 * candidates. Scanning = a scan is due now (honest: derived from nextDueAt, not
 * a fabricated live flag, since no field reports a scan mid-flight).
 */
function useSidebarTopics(): { topics: SidebarTopic[]; loading: boolean } {
  const { records: topicRecords, status: topicStatus } =
    useQuery<TopicData>('topics', { orderBy: 'createdAt', orderDir: 'asc' })
  const { records: candidateRecords } = useQuery<CandidateData>('candidates')

  const topics = useMemo<SidebarTopic[]>(() => {
    const now = Date.now()
    const queuedByTopic = new Map<string, number>()
    for (const c of candidateRecords) {
      if (c.data.status !== 'queued') continue
      queuedByTopic.set(c.data.topicId, (queuedByTopic.get(c.data.topicId) ?? 0) + 1)
    }
    return topicRecords.map((t: RecordData<TopicData>) => ({
      id: t.recordId,
      name: t.data.name,
      unread: queuedByTopic.get(t.recordId) ?? 0,
      scanning: !t.data.paused && t.data.nextDueAt > 0 && t.data.nextDueAt <= now,
    }))
  }, [topicRecords, candidateRecords])

  return { topics, loading: topicStatus === 'loading' }
}

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useUser()
  const { topics } = useSidebarTopics()

  const activeTopicId = location.pathname.startsWith('/topics/')
    ? location.pathname.slice('/topics/'.length)
    : null

  const initials =
    (user?.name?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()

  const { success, error: toastError } = useToast()
  const [menu, setMenu] = useState<{ x: number; y: number; topic: SidebarTopic } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SidebarTopic | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function doDelete() {
    const t = confirmDelete
    if (!t) return
    setDeleting(true)
    const res = await deleteTopic(t.id)
    setDeleting(false)
    setConfirmDelete(null)
    if (res.success) {
      success('Topic deleted', 'Its history is kept.')
      if (t.id === activeTopicId) navigate('/topics')
    } else {
      toastError('Could not delete topic', res.error)
    }
  }

  return (
    <aside className="flex h-full w-[268px] flex-none flex-col border-r border-border bg-bg-0 px-3 pb-3 pt-4">
      {/* App mark + wordmark */}
      <button
        type="button"
        onClick={() => navigate('/landing')}
        className="mb-3 flex items-center gap-2.5 text-left"
      >
        <span
          className="grid h-[30px] w-[30px] place-content-center rounded-[6px] bg-accent font-display text-[17px] font-bold leading-none text-accent-text"
          aria-hidden
        >
          {BRAND.glyph}
        </span>
        <span className="flex flex-col">
          <span className="font-display text-[16px] font-bold leading-[1.1] tracking-[-0.02em] text-text-1">
            {BRAND.name}
          </span>
          <span className="text-[11px] text-text-3">{BRAND.tag}</span>
        </span>
      </button>

      {/* New topic */}
      <Link
        to="/new-topic"
        className="mb-4 flex items-center gap-2 rounded-[7px] border border-border bg-bg-2 px-[11px] py-[9px] text-[13px] font-semibold text-text-2 transition-colors hover:border-border-2 hover:bg-bg-3 hover:text-text-1"
      >
        <span className="font-display text-[16px] font-bold leading-none text-accent" aria-hidden>
          +
        </span>
        New topic
      </Link>

      {/* Topics list */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mb-1.5 px-[9px] text-[10.5px] font-bold uppercase tracking-[0.15em] text-text-3">
          Topics
        </div>
        <nav className="flex flex-col gap-0.5">
          {topics.map((t) => (
            <TopicRow
              key={t.id}
              topic={t}
              active={t.id === activeTopicId}
              onClick={() => navigate(`/topics/${t.id}`)}
              onContextMenu={(e) => {
                e.preventDefault()
                setMenu({ x: e.clientX, y: e.clientY, topic: t })
              }}
            />
          ))}
          {topics.length === 0 && (
            <p className="px-[9px] py-1.5 text-[12px] leading-snug text-text-3">
              No topics yet. Create one to start scanning.
            </p>
          )}
        </nav>
      </div>

      {/* Bottom nav */}
      <div className="mt-2 border-t border-border pt-2">
        <BottomNavItem
          to="/history"
          icon={History}
          label="History"
          active={location.pathname === '/history'}
        />
        <BottomNavItem
          to="/settings"
          icon={Settings}
          label="Settings"
          active={location.pathname === '/settings'}
        />
      </div>

      {/* Account + theme */}
      <div className="mt-2 flex items-center gap-2 rounded-[7px] border border-border bg-bg-2 p-2">
        {user?.imageUrl ? (
          <img
            src={user.imageUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-7 w-7 flex-none rounded-full object-cover"
          />
        ) : (
          <span
            className="grid h-7 w-7 flex-none place-content-center rounded-full text-[11px] font-bold text-accent-text"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--text-3))' }}
            aria-hidden
          >
            {initials}
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[12.5px] font-semibold text-text-1">
            {user?.name || user?.email || 'Account'}
          </span>
          <span className="text-[11px] text-text-3">Signed in</span>
        </span>
        <ThemeToggle />
      </div>

      {menu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setMenu(null)
            }}
            aria-hidden
          />
          <div
            className="fixed z-50 min-w-[168px] overflow-hidden rounded-[7px] border border-border-2 bg-bg-2 py-1 shadow-[var(--shadow)]"
            style={{ left: menu.x, top: menu.y }}
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                navigate('/settings')
                setMenu(null)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-text-2 transition-colors hover:bg-bg-3 hover:text-text-1"
            >
              <Pencil className="h-4 w-4" aria-hidden /> Edit topic
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setConfirmDelete(menu.topic)
                setMenu(null)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-text-2 transition-colors hover:bg-bg-3 hover:text-text-1"
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Delete topic
            </button>
          </div>
        </>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => void doDelete()}
        title="Delete this topic?"
        description="This removes the topic and stops its scans. Queued candidates and history are kept."
        confirmText="Delete topic"
        loading={deleting}
      />
    </aside>
  )
}

/** One topic row: active rail, status dot, name, scanning spinner, unread pill. */
function TopicRow({
  topic,
  active,
  onClick,
  onContextMenu,
}: {
  topic: SidebarTopic
  active: boolean
  onClick: () => void
  onContextMenu: (e: MouseEvent) => void
}) {
  const emphasized = active || topic.unread > 0
  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      className="relative flex items-center gap-2 rounded-[7px] px-[9px] py-2 text-[13px] transition-colors hover:bg-bg-2"
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-[3px] bg-accent"
          aria-hidden
        />
      )}
      <span
        className="h-[7px] w-[7px] flex-none rounded-full"
        style={{ background: active ? 'var(--accent)' : 'var(--text-3)' }}
        aria-hidden
      />
      <span
        className={[
          'min-w-0 flex-1 truncate text-left',
          emphasized ? 'text-text-1' : 'text-text-2',
          topic.unread > 0 ? 'font-semibold' : 'font-medium',
        ].join(' ')}
      >
        {topic.name}
      </span>
      {topic.scanning && (
        <span
          className="h-3 w-3 flex-none animate-rs-spin rounded-full border-[1.5px] border-border-2 border-t-accent"
          title="Scanning"
          aria-hidden
        />
      )}
      {topic.unread > 0 && (
        <span className="tnum min-w-[18px] flex-none rounded-[20px] bg-accent-soft px-[5px] py-px text-center text-[11px] font-bold text-accent">
          {topic.unread}
        </span>
      )}
    </button>
  )
}

/** A bottom nav row (History / Settings). */
function BottomNavItem({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: string
  icon: typeof History
  label: string
  active: boolean
}) {
  return (
    <Link
      to={to}
      className={[
        'flex items-center gap-2 rounded-[7px] px-[9px] py-2 text-[13px] font-medium transition-colors',
        active ? 'bg-bg-2 text-text-1' : 'text-text-3 hover:bg-bg-2 hover:text-text-1',
      ].join(' ')}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="h-4 w-4 flex-none" aria-hidden />
      {label}
    </Link>
  )
}
