'use client'

import {
  Camera,
  FileText,
  Home,
  LayoutDashboard,
  MapPin,
  Menu,
  Settings,
  User,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Brand } from '@/components/brand'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { api, storage, type UserProfile } from '@/lib/api'

const navItems = [
  { label: 'Dashboard', href: '/citizen', icon: LayoutDashboard },
  { label: 'Report Violation', href: '/citizen/report', icon: Camera },
  { label: 'My Reports', href: '/citizen/reports', icon: FileText },
  { label: 'Nearby Violations', href: '/citizen/map', icon: MapPin },
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0]?.slice(0, 2).toUpperCase() || 'U'
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {navItems.map((item) => {
        const active =
          item.href === pathname ||
          (item.href !== '/citizen' && pathname.startsWith(item.href))
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
          href="/citizen/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <Settings className="size-4" />
          Settings
        </Link>
      </div>
    </nav>
  )
}

export function CitizenShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    const token = storage.getToken()
    if (!token) return
    api
      .me(token)
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  const displayName = user?.full_name || user?.username || 'Citizen User'

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Brand />
        </div>
        <SidebarNav />
        <div className="border-t border-sidebar-border p-3">
          <Link
            href="/citizen/profile"
            className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 px-3 py-2.5 transition-colors hover:bg-sidebar-accent"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials(displayName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">Ahmedabad Resident</p>
            </div>
          </Link>
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

          <div className="flex items-center gap-3">
            <Home className="size-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Citizen Portal</h1>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-success/12 px-3 py-1 text-xs font-medium text-success sm:flex">
              <span className="size-1.5 rounded-full bg-success" />
              System live
            </span>
            <Link
              href="/citizen/profile"
              className="flex size-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Profile"
            >
              <User className="size-4" />
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}