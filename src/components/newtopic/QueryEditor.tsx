import { useState } from 'react'

import { Chip } from '../ui'

/*
 * Optional editable search queries. Queries are generated automatically
 * from Q1 if left blank; this panel lets the user add or remove custom ones.
 * Chips use the Chip primitive; "Add query" is a dashed pill input (Enter adds).
 */
interface QueryEditorProps {
  queries: string[]
  onChange: (queries: string[]) => void
}

export function QueryEditor({ queries, onChange }: QueryEditorProps) {
  const [draft, setDraft] = useState('')

  function addDraft() {
    const value = draft.trim()
    if (!value || queries.includes(value)) {
      setDraft('')
      return
    }
    onChange([...queries, value])
    setDraft('')
  }

  function removeAt(index: number) {
    onChange(queries.filter((_, i) => i !== index))
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-accent-soft p-4">
      <div className="mb-2.5 flex items-center gap-[7px] text-[11.5px] font-bold text-text-2">
        <span className="text-accent">✦</span>
        Search queries
        <span className="font-normal text-text-3">
          · generated from question 1 if left blank
        </span>
      </div>
      <div className="flex flex-wrap gap-[7px]">
        {queries.map((q, i) => (
          <Chip key={`${q}-${i}`} onRemove={() => removeAt(i)} removeLabel={`Remove ${q}`}>
            {q}
          </Chip>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addDraft()
            }
          }}
          onBlur={addDraft}
          placeholder="Add query..."
          aria-label="Add a custom search query"
          className="w-[130px] rounded-[20px] border border-dashed border-border-2 bg-transparent px-3 py-1.5 text-[12.5px] text-text-1 placeholder:text-text-3 focus:border-accent focus:outline-none"
        />
      </div>
    </div>
  )
}
