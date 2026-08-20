import { API_BASE, type Report } from '@/lib/api'
import {
  AHMEDABAD_CENTER,
  type VehicleType,
  type Violation,
  type ViolationStatus,
  type ViolationType,
} from '@/lib/mock-data'

export const reportStatusToViolation: Record<string, ViolationStatus> = {
  submitted: 'pending',
  'under-review': 'pending',
  verified: 'verified',
  'challan-issued': 'challan-issued',
  rejected: 'dismissed',
  'auto-detected': 'auto-detected',
}

export function evidenceUrl(report: Report): string {
  if (!report.evidence) return '/placeholder.svg'
  const first = report.evidence.split(',')[0].trim()
  if (!first) return '/placeholder.svg'
  return `${API_BASE}${first}`
}

export function mapReportToViolation(report: Report): Violation {
  return {
    id: report.public_id,
    plate: report.plate,
    vehicleType: (report.vehicle_type as VehicleType) || 'Car',
    vehicleModel: report.vehicle_color
      ? `${report.vehicle_color} ${report.vehicle_type || 'vehicle'}`
      : report.vehicle_type || 'Unknown',
    type: (report.violation_type as ViolationType) || 'No-Parking Zone',
    status: reportStatusToViolation[report.status] || 'pending',
    location: report.location,
    zone: report.location,
    lat: report.lat ?? AHMEDABAD_CENTER[0],
    lng: report.lng ?? AHMEDABAD_CENTER[1],
    detectedAt: report.reported_at,
    durationMin: 0,
    confidence: 0,
    camera: report.source === 'citizen' ? 'Citizen app' : report.source.toUpperCase(),
    fineAmount: report.fine_amount ?? 0,
    evidence: evidenceUrl(report),
  }
}

export function mapReportsToViolations(reports: Report[]): Violation[] {
  return reports.map(mapReportToViolation)
}
