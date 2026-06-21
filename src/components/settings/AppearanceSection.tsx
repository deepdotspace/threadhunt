import { useTheme } from '../../lib/theme'
import { Segmented } from './Segmented'
import { Section, Row } from './Section'
import type { ThemeMode } from '../../themes'

/*
 * Appearance: a labeled theme control. The same toggle lives in the sidebar;
 * this is a labeled segmented version for the settings screen.
 */
const MODES: { value: ThemeMode; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
]

export function AppearanceSection() {
  const { mode, setMode } = useTheme()

  return (
    <Section title="Appearance">
      <Row label="Theme" hint="Dark is the default. Your choice is remembered on this device.">
        <Segmented ariaLabel="Theme" options={MODES} value={mode} onChange={setMode} />
      </Row>
    </Section>
  )
}
