/*
 * App landing (/topics). If the user has topics, route to the first topic's
 * queue. Otherwise show the no-topics empty state in the main region.
 */

import { Navigate } from 'react-router-dom'
import { useQuery } from 'deepspace'
import type { TopicData } from '../../../types'
import { NoTopics } from '../../../components/shell/NoTopics'

export default function TopicsIndex() {
  const { records, status } = useQuery<TopicData>('topics', {
    orderBy: 'createdAt',
    orderDir: 'asc',
  })

  if (status === 'loading') {
    return <div className="flex h-full items-center justify-center text-text-3">Loading...</div>
  }

  const first = records[0]
  if (first) return <Navigate to={`/topics/${first.recordId}`} replace />

  return <NoTopics />
}
