import { useCallback, useRef, useState, type MouseEvent } from 'react'

/*
 * A vertical drag handle for resizing two horizontally-adjacent panes. It reports
 * the pointer's clientX while dragging; the parent maps that to a clamped width.
 * A wider invisible hit area makes the 1px line easy to grab.
 */
export function ResizeDivider({ onResize }: { onResize: (clientX: number) => void }) {
  const dragging = useRef(false)
  const [active, setActive] = useState(false)

  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      setActive(true)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      const move = (ev: globalThis.MouseEvent) => {
        if (dragging.current) onResize(ev.clientX)
      }
      const up = () => {
        dragging.current = false
        setActive(false)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
      }
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
    },
    [onResize],
  )

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={onMouseDown}
      className={`relative z-10 w-px flex-none cursor-col-resize transition-colors ${
        active ? 'bg-accent' : 'bg-border hover:bg-border-2'
      }`}
    >
      <div className="absolute inset-y-0 -left-1.5 -right-1.5" aria-hidden />
    </div>
  )
}
