import type { ReactNode } from 'react'

/*
 * One settings section: an uppercase eyebrow label over a bordered bg-2 card.
 * Optional description sits under the
 * label, and optional header actions align to the right of the title row.
 */
interface SectionProps {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

export function Section({ title, description, actions, children }: SectionProps) {
  return (
    <section>
      <div className="mb-2.5 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-text-3">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-[12.5px] leading-snug text-text-3">{description}</p>
          )}
        </div>
        {actions}
      </div>
      <div className="rounded-[7px] border border-border bg-bg-2">{children}</div>
    </section>
  )
}

/** One labeled row inside a section card, divided by a hairline from siblings. */
export function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-[18px] py-[14px] last:border-b-0">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-text-1">{label}</div>
        {hint && <div className="mt-0.5 text-[12px] leading-snug text-text-3">{hint}</div>}
      </div>
      {children && <div className="flex flex-none items-center gap-2">{children}</div>}
    </div>
  )
}
