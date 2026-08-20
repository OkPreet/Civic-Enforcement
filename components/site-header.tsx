'use client'

import { ArrowRight, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Brand } from '@/components/brand'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const nav = [
  { label: 'Platform', href: '#platform' },
  { label: 'How it works', href: '#how' },
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Impact', href: '#impact' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Brand />

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }))}>
            Sign in
          </Link>
          <Link
            href="/login"
            data-icon="inline-end"
            className={cn(buttonVariants({ size: 'lg' }), 'h-9 px-4')}
          >
            Open dashboard
            <ArrowRight />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex size-9 items-center justify-center rounded-lg border border-border md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ size: 'lg' }), 'mt-2 h-10')}
            >
              Open dashboard
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
