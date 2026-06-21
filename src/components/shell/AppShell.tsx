/*
 * AppShell: the frame every signed-in screen renders in.
 * Flex row, full viewport, no overflow: the 268px sidebar beside a full-width
 * main region (bg-1). Each routed screen owns its own scrolling.
 */

import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'

export function AppShell() {
  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-bg-1 text-text-1">
      <AppSidebar />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-bg-1">
        <Outlet />
      </main>
    </div>
  )
}
