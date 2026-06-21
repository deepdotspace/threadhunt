import type { ReactNode } from 'react'

/*
 * One labeled section of the New Topic form. A numbered question shows an
 * accent number badge; a plain section shows a bold label, with an
 * optional muted "optional" suffix.
 */
interface FieldProps {
  label: string
  number?: number
  optional?: boolean
  children: ReactNode
}

export function Field({ label, number, optional, children }: FieldProps) {
  return (
    <div>
      <label
        className={`block text-[13px] font-bold text-text-1 ${number != null ? 'mb-[7px]' : 'mb-2.5'}`}
      >
        {number != null && <span className="mr-1.5 text-accent">{number}</span>}
        {label}
        {optional && <span className="ml-1.5 font-normal text-text-3">· optional</span>}
      </label>
      {children}
    </div>
  )
}
