/*
 * Section shell + eyebrow used across the story. Each section reveals once on
 * scroll into view and shares the landing's motion vocabulary.
 */

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { revealVariants, useReducedMotion } from './motion'

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)]">
      {children}
    </span>
  )
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-3 max-w-[640px] font-display text-[30px] font-bold leading-tight tracking-[-0.02em] text-[var(--text-1)] sm:text-[36px]">
      {children}
    </h2>
  )
}

export function Section({
  id,
  children,
  className = '',
}: {
  id?: string
  children: ReactNode
  className?: string
}) {
  const reduced = useReducedMotion()
  return (
    <motion.section
      id={id}
      variants={revealVariants(reduced)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      className={`mx-auto w-full max-w-[1240px] px-6 py-20 lg:px-10 ${className}`}
    >
      {children}
    </motion.section>
  )
}
