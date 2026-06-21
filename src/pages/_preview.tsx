/*
 * DEV-ONLY design-system preview. Not part of the product.
 *
 * Renders the full Reply Radar palette plus every shared UI primitive in BOTH
 * themes side by side so the tokens can be screenshot-verified. Each column
 * scopes its own `data-theme`, so dark and light render at once regardless of
 * the app's active mode. Reachable at /preview via src/pages/preview.tsx.
 */

import * as React from 'react'
import {
  Button,
  Input,
  Textarea,
  Checkbox,
  Switch,
  Card,
  Badge,
  StatusBadge,
  SourceChip,
  Chip,
  Kbd,
  ThemeToggle,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../components/ui'
import { SOURCES, TYPES, type ThemeMode } from '../themes'

// ── Token swatch helpers ──────────────────────────────────────────────────

function Swatch({ name, varName, ring }: { name: string; varName: string; ring?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="h-9 w-9 shrink-0 rounded-[var(--radius)] border border-[var(--border)]"
        style={{ background: `var(${varName})`, boxShadow: ring ? '0 0 0 1px var(--border-2)' : undefined }}
      />
      <div className="min-w-0 leading-tight">
        <div className="text-[12px] font-semibold text-[var(--text-1)]">{name}</div>
        <code className="text-[10.5px] text-[var(--text-3)]">{varName}</code>
      </div>
    </div>
  )
}

function TextRow({ name, varName }: { name: string; varName: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[14px]" style={{ color: `var(${varName})` }}>
        {name}
      </span>
      <code className="text-[10.5px] text-[var(--text-3)]">{varName}</code>
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)]">
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-1)] p-4">
      <Eyebrow>{title}</Eyebrow>
      {children}
    </section>
  )
}

// ── One full palette + primitive set, themed by the enclosing data-theme ───

function Showcase({ mode }: { mode: ThemeMode }) {
  return (
    <div
      data-theme={mode}
      className="flex-1 min-w-0 bg-[var(--bg-1)] p-6 text-[var(--text-1)]"
      style={{ fontFamily: 'var(--font-ui)' }}
    >
      {/* Header / brand mark */}
      <div className="mb-6 flex items-center gap-3">
        <span
          className="grid h-[30px] w-[30px] place-content-center rounded-[calc(var(--radius)-1px)] font-display text-[17px] font-bold"
          style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
        >
          S
        </span>
        <div className="leading-tight">
          <div className="font-display text-[16px] font-bold tracking-[-0.02em]">Reply Radar</div>
          <div className="text-[11px] text-[var(--text-3)]">Reply triage</div>
        </div>
        <span className="ml-auto rounded-full bg-[var(--bg-2)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-3)]">
          {mode}
        </span>
        <ThemeToggle />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Backgrounds */}
        <Section title="Background world">
          <div className="grid gap-3">
            <Swatch name="bg-0" varName="--bg-0" />
            <Swatch name="bg-1" varName="--bg-1" />
            <Swatch name="bg-2" varName="--bg-2" />
            <Swatch name="bg-3" varName="--bg-3" />
            <Swatch name="bg-sel" varName="--bg-sel" />
          </div>
        </Section>

        {/* Accent + borders */}
        <Section title="Accent & borders">
          <div className="grid gap-3">
            <Swatch name="accent" varName="--accent" />
            <div className="flex items-center gap-2.5">
              <span
                className="grid h-9 w-9 shrink-0 place-content-center rounded-[var(--radius)] font-display text-[13px] font-bold"
                style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
              >
                S
              </span>
              <div className="min-w-0 leading-tight">
                <div className="text-[12px] font-semibold">accent-text on accent</div>
                <code className="text-[10.5px] text-[var(--text-3)]">--accent-text</code>
              </div>
            </div>
            <Swatch name="accent-soft" varName="--accent-soft" ring />
            <Swatch name="border" varName="--border" ring />
            <Swatch name="border-2" varName="--border-2" ring />
          </div>
        </Section>

        {/* Text */}
        <Section title="Text">
          <div className="grid gap-2">
            <TextRow name="Primary text" varName="--text-1" />
            <TextRow name="Muted secondary" varName="--text-2" />
            <TextRow name="Subtle meta" varName="--text-3" />
          </div>
        </Section>

        {/* Source chips */}
        <Section title="Source chips & type dots">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {SOURCES.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5">
                <SourceChip source={s.id} />
                <span className="text-[12px] font-semibold text-[var(--text-2)]">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {TYPES.map((t) => (
              <div key={t.id} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-[2px]" style={{ background: t.dot }} />
                <span className="text-[11px] text-[var(--text-3)]">{t.label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="primary">Mark posted</Button>
            <Button variant="secondary">Skip</Button>
            <Button variant="outline">Copy and open</Button>
            <Button variant="ghost">Open thread</Button>
            <Button variant="primary" loading>Working</Button>
            <Button variant="secondary" disabled>Disabled</Button>
          </div>
        </Section>

        {/* Status badges */}
        <Section title="Status & badges">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusBadge action="posted" />
            <StatusBadge action="edited" />
            <StatusBadge action="skipped" />
            <Badge variant="accent">12 unread</Badge>
            <Badge variant="neutral">draft</Badge>
            <Badge variant="outline">filter</Badge>
          </div>
        </Section>

        {/* Inputs */}
        <Section title="Inputs">
          <div className="grid gap-3">
            <Input placeholder="9:00 AM" defaultValue="9:00 AM" />
            <Textarea rows={2} placeholder="People looking for a privacy friendly analytics tool" />
            <div className="flex items-center gap-5">
              <label className="flex items-center gap-2 text-[13px] text-[var(--text-2)]">
                <Checkbox defaultChecked /> Reddit
              </label>
              <label className="flex items-center gap-2 text-[13px] text-[var(--text-2)]">
                <Checkbox /> X
              </label>
              <label className="flex items-center gap-2 text-[13px] text-[var(--text-2)]">
                <Switch defaultChecked /> Auto draft
              </label>
            </div>
          </div>
        </Section>

        {/* Chips + Kbd */}
        <Section title="Query chips & key hints">
          <div className="mb-3 flex flex-wrap gap-2">
            <Chip onRemove={() => {}}>cookieless analytics</Chip>
            <Chip onRemove={() => {}}>google analytics alternative</Chip>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-[var(--text-2)]">
            Skip <Kbd>X</Kbd> · Next <Kbd>J</Kbd> · Prev <Kbd>K</Kbd>
          </div>
        </Section>

        {/* Surface card */}
        <Section title="Surface card">
          <Card className="p-4">
            <div className="flex items-start gap-2.5">
              <span className="font-display text-[18px] leading-none text-[var(--accent)]">✦</span>
              <div>
                <p className="text-[12.5px] text-[var(--text-2)]">
                  <span className="font-bold text-[var(--text-1)]">Why this is here.</span> The thread asks
                  for a lightweight analytics tool.
                </p>
                <div className="mt-1 text-[13px] font-bold tnum text-[var(--accent)]">92% match</div>
              </div>
            </div>
          </Card>
        </Section>

        {/* Dropdown + tabular nums */}
        <Section title="Dropdown & tabular nums">
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">Last 7 days ▾</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Range</DropdownMenuLabel>
                <DropdownMenuItem>All time</DropdownMenuItem>
                <DropdownMenuCheckboxItem checked>Last 7 days</DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Last 30 days</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="tnum text-[13px] text-[var(--text-2)]">
              1,204 · 89% · 12:51 PM
            </div>
          </div>
        </Section>

        {/* Toast surface (static render of the undo + flash chrome) */}
        <Section title="Toasts">
          <div className="flex flex-col gap-2.5">
            <div className="inline-flex items-center gap-3 self-start rounded-[var(--radius)] border border-[var(--border-2)] bg-[var(--bg-3)] py-2.5 pl-4 pr-3 text-[13px] shadow-[var(--shadow)]">
              <span className="text-[var(--text-1)]">Skipped 1 conversation.</span>
              <button className="rounded-[5px] border border-[var(--border-2)] bg-[var(--bg-1)] px-2.5 py-1 text-[12.5px] font-bold text-[var(--text-1)]">
                Undo
              </button>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-[var(--radius)] border border-[var(--border-2)] bg-[var(--bg-3)] py-2.5 pl-4 pr-4 text-[13px] shadow-[var(--shadow)]">
              <span className="text-[var(--accent)]">✓</span>
              <span className="text-[var(--text-1)]">Reply copied to clipboard.</span>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}

export default function Preview() {
  return (
    <div className="min-h-screen w-full">
      <div className="border-b border-[var(--border-2)] bg-[var(--bg-0)] px-6 py-2 text-[12px] font-semibold uppercase tracking-[0.15em] text-[var(--text-3)]">
        Reply Radar design system · dev preview · not a product screen
      </div>
      <div className="flex w-full items-stretch">
        <Showcase mode="dark" />
        <div className="w-px self-stretch bg-[var(--border-2)]" />
        <Showcase mode="light" />
      </div>
    </div>
  )
}
