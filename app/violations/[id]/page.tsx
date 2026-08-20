import { DashboardShell } from '@/components/dashboard/shell'
import { ReportDetail } from '@/components/dashboard/report-detail'
import { ViolationDetail } from '@/components/dashboard/violation-detail'
import { getViolation, violations } from '@/lib/mock-data'

export function generateStaticParams() {
  return violations.map((v) => ({ id: v.id }))
}

export default async function ViolationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const violation = getViolation(id)

  return (
    <DashboardShell>
      {violation ? (
        <ViolationDetail violation={violation} />
      ) : (
        <ReportDetail publicId={id} />
      )}
    </DashboardShell>
  )
}
