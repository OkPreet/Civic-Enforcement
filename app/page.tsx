import { Hero } from '@/components/landing/hero'
import { Capabilities, CtaBand, HowItWorks, PredictiveImpact } from '@/components/landing/sections'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Capabilities />
        <PredictiveImpact />
        <CtaBand />
      </main>
      <SiteFooter />
    </div>
  )
}
