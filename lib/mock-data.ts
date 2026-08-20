export type ViolationStatus =
  | 'auto-detected'
  | 'pending'
  | 'verified'
  | 'challan-issued'
  | 'dismissed'

export type ViolationType =
  | 'No-Parking Zone'
  | 'Footpath Parking'
  | 'Bus Stop Obstruction'
  | 'Emergency Lane'
  | 'Junction Blocking'
  | 'Double Parking'
  | 'Zebra Crossing'

export type VehicleType = 'Car' | 'Two-Wheeler' | 'Auto-Rickshaw' | 'LCV / Truck' | 'Bus'

export interface Violation {
  id: string
  plate: string
  vehicleType: VehicleType
  vehicleModel: string
  type: ViolationType
  status: ViolationStatus
  location: string
  zone: string
  lat: number
  lng: number
  detectedAt: string // ISO
  durationMin: number
  confidence: number // 0-100 ANPR confidence
  camera: string
  fineAmount: number
  evidence: string
}

export const AHMEDABAD_CENTER: [number, number] = [23.0225, 72.5714]

const evidenceImages = [
  '/evidence/evidence-1.png',
  '/evidence/evidence-2.png',
  '/evidence/evidence-3.png',
]

export const violations: Violation[] = [
  {
    id: 'VIO-2041',
    plate: 'GJ01 KL 4821',
    vehicleType: 'Car',
    vehicleModel: 'Maruti Swift (White)',
    type: 'No-Parking Zone',
    status: 'challan-issued',
    location: 'CG Road, Navrangpura',
    zone: 'NP-Zone A / Commercial',
    lat: 23.0301,
    lng: 72.5606,
    detectedAt: '2026-08-15T09:42:00+05:30',
    durationMin: 34,
    confidence: 98.4,
    camera: 'CAM-CGR-07',
    fineAmount: 500,
    evidence: evidenceImages[0],
  },
  {
    id: 'VIO-2040',
    plate: 'GJ27 BX 7734',
    vehicleType: 'LCV / Truck',
    vehicleModel: 'Tata 407 (Blue)',
    type: 'Emergency Lane',
    status: 'verified',
    location: 'Ashram Road, near RTO',
    zone: 'Emergency Corridor',
    lat: 23.0412,
    lng: 72.5709,
    detectedAt: '2026-08-15T09:31:00+05:30',
    durationMin: 12,
    confidence: 95.1,
    camera: 'CAM-ASH-03',
    fineAmount: 1000,
    evidence: evidenceImages[1],
  },
  {
    id: 'VIO-2039',
    plate: 'GJ01 RJ 1290',
    vehicleType: 'Auto-Rickshaw',
    vehicleModel: 'Bajaj RE (Yellow/Green)',
    type: 'Bus Stop Obstruction',
    status: 'pending',
    location: 'Lal Darwaja Bus Stand',
    zone: 'Transit Stop',
    lat: 23.0258,
    lng: 72.5873,
    detectedAt: '2026-08-15T09:18:00+05:30',
    durationMin: 21,
    confidence: 91.7,
    camera: 'CAM-LDW-01',
    fineAmount: 300,
    evidence: evidenceImages[2],
  },
  {
    id: 'VIO-2038',
    plate: 'GJ05 MN 5567',
    vehicleType: 'Car',
    vehicleModel: 'Hyundai Creta (Grey)',
    type: 'Footpath Parking',
    status: 'auto-detected',
    location: 'Law Garden, Ellisbridge',
    zone: 'Pedestrian Path',
    lat: 23.0246,
    lng: 72.5581,
    detectedAt: '2026-08-15T09:07:00+05:30',
    durationMin: 47,
    confidence: 88.9,
    camera: 'CAM-LWG-04',
    fineAmount: 500,
    evidence: evidenceImages[0],
  },
  {
    id: 'VIO-2037',
    plate: 'GJ01 CD 9012',
    vehicleType: 'Two-Wheeler',
    vehicleModel: 'Honda Activa (Black)',
    type: 'Zebra Crossing',
    status: 'dismissed',
    location: 'Paldi Char Rasta',
    zone: 'Junction',
    lat: 23.0128,
    lng: 72.5679,
    detectedAt: '2026-08-15T08:54:00+05:30',
    durationMin: 6,
    confidence: 82.3,
    camera: 'CAM-PLD-02',
    fineAmount: 200,
    evidence: evidenceImages[2],
  },
  {
    id: 'VIO-2036',
    plate: 'GJ18 AA 3421',
    vehicleType: 'Car',
    vehicleModel: 'Toyota Innova (Silver)',
    type: 'Junction Blocking',
    status: 'challan-issued',
    location: 'SG Highway, Thaltej',
    zone: 'Signalised Junction',
    lat: 23.0466,
    lng: 72.5041,
    detectedAt: '2026-08-15T08:41:00+05:30',
    durationMin: 18,
    confidence: 96.6,
    camera: 'CAM-SGH-11',
    fineAmount: 800,
    evidence: evidenceImages[1],
  },
  {
    id: 'VIO-2035',
    plate: 'GJ01 PQ 8890',
    vehicleType: 'Bus',
    vehicleModel: 'Private Coach (White)',
    type: 'No-Parking Zone',
    status: 'verified',
    location: 'Maninagar Station Road',
    zone: 'NP-Zone B',
    lat: 22.9967,
    lng: 72.6021,
    detectedAt: '2026-08-15T08:29:00+05:30',
    durationMin: 63,
    confidence: 94.2,
    camera: 'CAM-MNG-05',
    fineAmount: 1200,
    evidence: evidenceImages[0],
  },
  {
    id: 'VIO-2034',
    plate: 'GJ03 KK 2255',
    vehicleType: 'Car',
    vehicleModel: 'Kia Seltos (Red)',
    type: 'Double Parking',
    status: 'pending',
    location: 'Vastrapur Lake Road',
    zone: 'Recreational',
    lat: 23.0389,
    lng: 72.5289,
    detectedAt: '2026-08-15T08:12:00+05:30',
    durationMin: 29,
    confidence: 90.5,
    camera: 'CAM-VST-08',
    fineAmount: 500,
    evidence: evidenceImages[2],
  },
  {
    id: 'VIO-2033',
    plate: 'GJ01 TR 6678',
    vehicleType: 'Auto-Rickshaw',
    vehicleModel: 'Piaggio Ape (Yellow)',
    type: 'Bus Stop Obstruction',
    status: 'auto-detected',
    location: 'Kankaria Lakefront',
    zone: 'Transit Stop',
    lat: 23.0075,
    lng: 72.6018,
    detectedAt: '2026-08-15T07:58:00+05:30',
    durationMin: 15,
    confidence: 86.4,
    camera: 'CAM-KNK-02',
    fineAmount: 300,
    evidence: evidenceImages[1],
  },
  {
    id: 'VIO-2032',
    plate: 'GJ23 LM 4409',
    vehicleType: 'LCV / Truck',
    vehicleModel: 'Ashok Leyland Dost',
    type: 'Footpath Parking',
    status: 'verified',
    location: 'Sabarmati Riverfront (West)',
    zone: 'Pedestrian Path',
    lat: 23.0612,
    lng: 72.5799,
    detectedAt: '2026-08-15T07:44:00+05:30',
    durationMin: 52,
    confidence: 93.0,
    camera: 'CAM-SRF-09',
    fineAmount: 800,
    evidence: evidenceImages[0],
  },
  {
    id: 'VIO-2031',
    plate: 'GJ01 HG 1123',
    vehicleType: 'Car',
    vehicleModel: 'Tata Nexon (Blue)',
    type: 'No-Parking Zone',
    status: 'challan-issued',
    location: 'Satellite, Jodhpur Cross Roads',
    zone: 'NP-Zone A / Commercial',
    lat: 23.0301,
    lng: 72.5108,
    detectedAt: '2026-08-15T07:30:00+05:30',
    durationMin: 41,
    confidence: 97.8,
    camera: 'CAM-SAT-06',
    fineAmount: 500,
    evidence: evidenceImages[2],
  },
  {
    id: 'VIO-2030',
    plate: 'GJ01 ZY 7756',
    vehicleType: 'Two-Wheeler',
    vehicleModel: 'Royal Enfield (Black)',
    type: 'Junction Blocking',
    status: 'pending',
    location: 'Naroda Patiya Junction',
    zone: 'Signalised Junction',
    lat: 23.0709,
    lng: 72.6608,
    detectedAt: '2026-08-15T07:16:00+05:30',
    durationMin: 9,
    confidence: 84.7,
    camera: 'CAM-NRD-03',
    fineAmount: 800,
    evidence: evidenceImages[1],
  },
]

/* ---------- Aggregations for dashboards ---------- */

export const hotspots = [
  { name: 'CG Road', lat: 23.0301, lng: 72.5606, count: 184, trend: 12 },
  { name: 'Ashram Road', lat: 23.0412, lng: 72.5709, count: 156, trend: 8 },
  { name: 'SG Highway', lat: 23.0466, lng: 72.5041, count: 142, trend: -4 },
  { name: 'Maninagar', lat: 22.9967, lng: 72.6021, count: 121, trend: 19 },
  { name: 'Law Garden', lat: 23.0246, lng: 72.5581, count: 98, trend: 3 },
  { name: 'Vastrapur', lat: 23.0389, lng: 72.5289, count: 87, trend: -7 },
  { name: 'Kankaria', lat: 23.0075, lng: 72.6018, count: 76, trend: 5 },
  { name: 'Naroda', lat: 23.0709, lng: 72.6608, count: 64, trend: 22 },
]

// weighted heat points [lat, lng, intensity]
export const heatPoints: [number, number, number][] = hotspots.flatMap((h) => {
  const pts: [number, number, number][] = [[h.lat, h.lng, Math.min(1, h.count / 200)]]
  const spread = 6
  for (let i = 0; i < spread; i++) {
    pts.push([
      h.lat + (Math.random() - 0.5) * 0.012,
      h.lng + (Math.random() - 0.5) * 0.012,
      Math.random() * 0.6 + 0.2,
    ])
  }
  return pts
})

export const hourlyViolations = [
  { hour: '00', count: 34, predicted: 30 },
  { hour: '02', count: 21, predicted: 24 },
  { hour: '04', count: 18, predicted: 20 },
  { hour: '06', count: 42, predicted: 45 },
  { hour: '08', count: 128, predicted: 120 },
  { hour: '10', count: 164, predicted: 158 },
  { hour: '12', count: 142, predicted: 150 },
  { hour: '14', count: 118, predicted: 122 },
  { hour: '16', count: 156, predicted: 148 },
  { hour: '18', count: 198, predicted: 210 },
  { hour: '20', count: 176, predicted: 188 },
  { hour: '22', count: 92, predicted: 96 },
]

export const violationByType = [
  { type: 'No-Parking', count: 412 },
  { type: 'Footpath', count: 318 },
  { type: 'Bus Stop', count: 214 },
  { type: 'Junction', count: 186 },
  { type: 'Emergency', count: 98 },
  { type: 'Double Park', count: 142 },
]

export const weeklyTrend = [
  { day: 'Mon', detected: 620, resolved: 540 },
  { day: 'Tue', detected: 680, resolved: 610 },
  { day: 'Wed', detected: 710, resolved: 650 },
  { day: 'Thu', detected: 664, resolved: 620 },
  { day: 'Fri', detected: 792, resolved: 700 },
  { day: 'Sat', detected: 854, resolved: 690 },
  { day: 'Sun', detected: 512, resolved: 470 },
]

export const stats = {
  activeViolations: 1284,
  detectedToday: 342,
  challansIssued: 218,
  camerasOnline: 486,
  camerasTotal: 512,
  avgResponseMin: 14,
  anprAccuracy: 96.8,
  revenueToday: 148600,
}

export const statusLabels: Record<ViolationStatus, string> = {
  'auto-detected': 'Auto-Detected',
  pending: 'Pending Review',
  verified: 'Verified',
  'challan-issued': 'Challan Issued',
  dismissed: 'Dismissed',
}

export const statusVariant: Record<
  ViolationStatus,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'accent'
> = {
  'auto-detected': 'accent',
  pending: 'warning',
  verified: 'default',
  'challan-issued': 'success',
  dismissed: 'secondary',
}

export function getViolation(id: string) {
  return violations.find((v) => v.id === id)
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  })
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.round(hr / 24)}d ago`
}

/* ---------- Citizen (User) Types ---------- */

export type UserReportStatus = 'submitted' | 'under-review' | 'verified' | 'challan-issued' | 'rejected'

export interface UserReport {
  id: string
  userId: string
  plate: string
  vehicleType: VehicleType
  vehicleColor?: string
  type: ViolationType
  status: UserReportStatus
  location: string
  lat: number
  lng: number
  reportedAt: string // ISO
  description: string
  evidenceImages: string[] // base64 or URLs
  fineAmount?: number
  reviewedAt?: string
  reviewerNotes?: string
}

export const mockUserReports: UserReport[] = [
  {
    id: 'RPT-2026-001',
    userId: 'citizen@sentinel.com',
    plate: 'GJ01 AB 1234',
    vehicleType: 'Car',
    vehicleColor: 'White',
    type: 'No-Parking Zone',
    status: 'challan-issued',
    location: 'CG Road, Navrangpura',
    lat: 23.0301,
    lng: 72.5606,
    reportedAt: '2026-08-10T14:30:00+05:30',
    description: 'Car parked in no-parking zone blocking traffic flow',
    evidenceImages: ['/evidence/evidence-1.png'],
    fineAmount: 500,
    reviewedAt: '2026-08-10T16:45:00+05:30',
    reviewerNotes: 'Verified via CCTV CAM-CGR-07. Challan issued.',
  },
  {
    id: 'RPT-2026-002',
    userId: 'citizen@sentinel.com',
    plate: 'GJ05 XY 5678',
    vehicleType: 'Two-Wheeler',
    vehicleColor: 'Black',
    type: 'Footpath Parking',
    status: 'verified',
    location: 'Law Garden, Ellisbridge',
    lat: 23.0246,
    lng: 72.5581,
    reportedAt: '2026-08-12T09:15:00+05:30',
    description: 'Two-wheeler parked on pedestrian footpath',
    evidenceImages: ['/evidence/evidence-2.png'],
    reviewedAt: '2026-08-12T11:20:00+05:30',
    reviewerNotes: 'Verified. Awaiting challan generation.',
  },
  {
    id: 'RPT-2026-003',
    userId: 'citizen@sentinel.com',
    plate: 'GJ27 CD 9012',
    vehicleType: 'Auto-Rickshaw',
    vehicleColor: 'Yellow/Green',
    type: 'Bus Stop Obstruction',
    status: 'under-review',
    location: 'Lal Darwaja Bus Stand',
    lat: 23.0258,
    lng: 72.5873,
    reportedAt: '2026-08-14T18:45:00+05:30',
    description: 'Auto-rickshaw blocking bus stop entrance',
    evidenceImages: ['/evidence/evidence-3.png'],
  },
  {
    id: 'RPT-2026-004',
    userId: 'citizen@sentinel.com',
    plate: 'GJ01 EF 3456',
    vehicleType: 'Car',
    vehicleColor: 'Red',
    type: 'Zebra Crossing',
    status: 'rejected',
    location: 'Paldi Char Rasta',
    lat: 23.0128,
    lng: 72.5679,
    reportedAt: '2026-08-08T11:00:00+05:30',
    description: 'Car stopped on zebra crossing',
    evidenceImages: ['/evidence/evidence-1.png'],
    reviewedAt: '2026-08-08T14:30:00+05:30',
    reviewerNotes: 'Insufficient evidence. Vehicle was moving, not parked.',
  },
  {
    id: 'RPT-2026-005',
    userId: 'citizen@sentinel.com',
    plate: 'GJ18 GH 7890',
    vehicleType: 'LCV / Truck',
    vehicleColor: 'Blue',
    type: 'Emergency Lane',
    status: 'submitted',
    location: 'Ashram Road, near RTO',
    lat: 23.0412,
    lng: 72.5709,
    reportedAt: '2026-08-15T08:30:00+05:30',
    description: 'Truck parked in emergency lane',
    evidenceImages: ['/evidence/evidence-2.png'],
  },
]

export const userReportStatusLabels: Record<UserReportStatus, string> = {
  submitted: 'Submitted',
  'under-review': 'Under Review',
  verified: 'Verified',
  'challan-issued': 'Challan Issued',
  rejected: 'Rejected',
}

export const userReportStatusVariant: Record<UserReportStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'accent'> = {
  submitted: 'accent',
  'under-review': 'warning',
  verified: 'default',
  'challan-issued': 'success',
  rejected: 'destructive',
}

export function getUserReports(userId: string) {
  return mockUserReports.filter(r => r.userId === userId).sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
}
