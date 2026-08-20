'use client'

import {
  Bell,
  BrainCircuit,
  Cctv,
  LayoutDashboard,
  ListChecks,
  MapPinned,
  Menu,
  Search,
  Settings,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Brand } from '@/components/brand'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Violations', href: '/violations', icon: ListChecks },
  { label: 'Live Map', href: '/dashboard#map', icon: MapPinned },
  { label: 'Cameras', href: '/dashboard#cameras', icon: Cctv },
  { label: 'Predictive', href: '/dashboard#predictive', icon: BrainCircuit },
]

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {navItems.map((item) => {
        const active =
          item.href === pathname ||
          (item.href.startsWith('/violations') && pathname.startsWith('/violations')) ||
          (item.href === '/dashboard' && pathname === '/dashboard')
        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        )
      })}
      <div className="mt-auto flex flex-col gap-1 border-t border-sidebar-border pt-3">
        <Link
          href="#"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <Settings className="size-4" />
          Settings
        </Link>
      </div>
    </nav>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Brand />
        </div>
        <SidebarNav />
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 px-3 py-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              RP
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">R. Patel</p>
              <p className="truncate text-xs text-muted-foreground">Traffic Control, AMC</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
              <Brand />
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-lg border border-border lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>

          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search plate, location or violation ID…"
              className="h-9 w-full rounded-lg border border-border bg-muted/40 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:bg-background"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-success/12 px-3 py-1 text-xs font-medium text-success sm:flex">
              <span className="size-1.5 rounded-full bg-success" />
              System live
            </span>
            <button
              type="button"
              className="relative flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-background" />
            </button>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
