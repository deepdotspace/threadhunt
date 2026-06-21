/*
 * No-topics empty state. Replaces the main region
 * with a centered column: big lime app-mark chip, heading, body, and a primary
 * "+ New topic" button. Entry-animated with rs-in.
 */

import { Link } from 'react-router-dom'
import { BRAND } from '../../themes'

export function NoTopics() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center [animation:rs-in_0.3s_ease]">
      <span
        className="mb-6 grid h-[66px] w-[66px] place-content-center rounded-[7px] bg-accent font-display text-[34px] font-bold leading-none text-accent-text"
        aria-hidden
      >
        {BRAND.glyph}
      </span>
      <h1 className="font-display text-[24px] font-bold tracking-[-0.02em] text-text-1">
        Create your first topic
      </h1>
      <p className="mt-3 max-w-[420px] text-[14px] leading-relaxed text-text-3">
        A topic is something you want to find conversations about. Answer two
        questions and Reply Radar starts scanning for threads worth replying to.
      </p>
      <Link
        to="/new-topic"
        className="mt-7 inline-flex items-center gap-2 rounded-[7px] bg-accent px-4 py-2.5 text-[13px] font-bold text-accent-text transition hover:brightness-[1.06]"
      >
        <span className="font-display text-[16px] leading-none" aria-hidden>
          +
        </span>
        New topic
      </Link>
    </div>
  )
}
