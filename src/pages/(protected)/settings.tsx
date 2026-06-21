/*
 * Settings (/settings): account, topic management, and appearance.
 */

import { ScreenHeader } from '../../components/shell/ScreenScaffold'
import {
  AccountSection,
  TopicsSection,
  AppearanceSection,
} from '../../components/settings'

export default function SettingsPage() {
  return (
    <>
      <ScreenHeader title="Settings" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[760px] flex-col gap-8 px-[30px] py-[24px] pb-[60px]">
          <AccountSection />
          <TopicsSection />
          <AppearanceSection />
        </div>
      </div>
    </>
  )
}
