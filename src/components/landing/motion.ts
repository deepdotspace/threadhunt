/*
 * Landing motion helpers. One place to read prefers-reduced-motion and to
 * share scroll-reveal variants so every section moves with the same vocabulary.
 */

import { useEffect, useState } from 'react'
import type { Variants } from 'framer-motion'

/** Live prefers-reduced-motion. When true, sections drop transforms and hold still. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return reduced
}

/** Scroll-reveal for a section: fade + small rise, settling once in view. */
export function revealVariants(reduced: boolean): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 22 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  }
}

/** Stagger container: children reveal in sequence as the group enters. */
export function staggerVariants(reduced: boolean): Variants {
  return {
    hidden: {},
    show: {
      transition: { staggerChildren: reduced ? 0 : 0.07, delayChildren: 0.04 },
    },
  }
}

/** A single staggered item (rise + fade), paired with staggerVariants. */
export function itemVariants(reduced: boolean): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } },
  }
}
