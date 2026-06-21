import { useQuery } from 'deepspace'
import { Link } from 'react-router-dom'

import { Button } from '../ui'
import { Section } from './Section'
import { TopicRow } from './TopicRow'
import type { TopicData } from '../../types'

/*
 * Topics: pause, edit, or delete each topic the user owns. Editing covers name,
 * cadence, draft mode, venues, and reply voice (updateTopic).
 */
export function TopicsSection() {
  const { records, status } = useQuery<TopicData>('topics', {
    orderBy: 'createdAt',
    orderDir: 'asc',
  })

  return (
    <Section
      title="Topics"
      description="Manage what Reply Radar scans for. Pause a topic to stop its scans without deleting it."
      actions={
        <Button variant="secondary" size="sm" asChild>
          <Link to="/new-topic">New topic</Link>
        </Button>
      }
    >
      {status === 'loading' && (
        <p className="px-[18px] py-[14px] text-[12.5px] text-text-3">Loading topics.</p>
      )}
      {status !== 'loading' && records.length === 0 && (
        <p className="px-[18px] py-[14px] text-[12.5px] text-text-3">
          No topics yet. Create one to start scanning.
        </p>
      )}
      {records.map((r) => (
        <TopicRow key={r.recordId} id={r.recordId} topic={r.data} />
      ))}
    </Section>
  )
}
