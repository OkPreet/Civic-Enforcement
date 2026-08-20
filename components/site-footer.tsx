import { Brand } from '@/components/brand'

const columns = [
  {
    title: 'Platform',
    links: ['Detection Engine', 'ANPR & OCR', 'GIS Dashboard', 'Predictive Analytics'],
  },
  {
    title: 'Authorities',
    links: ['Traffic Police', 'Municipal Corp.', 'Smart City Cell', 'Integrations'],
  },
  {
    title: 'Company',
    links: ['About', 'Case Studies', 'Security', 'Contact'],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div className="flex flex-col gap-4">
          <Brand />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            AI-powered illegal parking detection and enforcement for smarter, safer urban mobility
            across Gujarat.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title} className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold">{col.title}</h4>
            <ul className="flex flex-col gap-2">
              {col.links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>© 2026 Sentinel Systems. A civic-tech demonstration.</p>
          <p>Ahmedabad · Gujarat · India</p>
        </div>
      </div>
    </footer>
  )
}
