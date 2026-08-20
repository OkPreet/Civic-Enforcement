'use client'

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

export type Role = 'citizen' | 'authority'

export interface AuthResponse {
  access_token: string
  token_type: string
  role: Role
  username: string
}

export interface UserProfile {
  id: number
  username: string
  full_name?: string | null
  email?: string | null
  phone?: string | null
  role: Role
  area?: string | null
}

export interface Report {
  id: number
  public_id: string
  plate: string
  vehicle_type?: string | null
  vehicle_color?: string | null
  violation_type: string
  status: string
  location: string
  lat?: number | null
  lng?: number | null
  description?: string | null
  source: string
  fine_amount?: number | null
  evidence?: string | null
  reviewer_notes?: string | null
  reported_at: string
  reviewed_at?: string | null
}

export interface ViolationStats {
  total: number
  pending_review: number
  verified: number
  challan_issued: number
  rejected: number
}

export interface Camera {
  id: number
  code: string
  name?: string | null
  location?: string | null
  lat?: number | null
  lng?: number | null
  status?: string | null
}

export interface Zone {
  id: number
  name: string
  violation_type: string
  fine_amount: number
  camera_id?: number | null
  coordinates?: string | null
  active: boolean
}

export interface HourlyTrendPoint {
  hour: string
  count: number
  predicted: number
}

export interface TypeCount {
  type: string
  count: number
}

export interface TopZone {
  name: string
  count: number
  trend: number
}

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      if (data?.detail) detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, res.status)
  }
  return res.json() as Promise<T>
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (username: string, password: string, fullName?: string) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, full_name: fullName }),
    }),

  me: (token: string) => request<UserProfile>('/api/users/me', {}, token),

  // Reports
  myReports: (token: string) => request<Report[]>('/api/reports/mine', {}, token),

  allReports: (token: string, params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : ''
    return request<Report[]>(`/api/reports${qs}`, {}, token)
  },

  getReport: (token: string, publicId: string) =>
    request<Report>(`/api/reports/${publicId}`, {}, token),

  createReport: (token: string, form: FormData) =>
    request<Report>('/api/reports', { method: 'POST', body: form }, token),

  reviewReport: (token: string, publicId: string, action: 'confirmed' | 'rejected', notes?: string) =>
    request<Report>(`/api/reports/${publicId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, notes }),
    }, token),

  // Authority
  violationStats: (token: string) =>
    request<ViolationStats>('/api/violations/stats', {}, token),

  violationTrend: (token: string) =>
    request<HourlyTrendPoint[]>('/api/violations/trend', {}, token),

  violationByType: (token: string) =>
    request<TypeCount[]>('/api/violations/by-type', {}, token),

  topZones: (token: string) =>
    request<TopZone[]>('/api/violations/top-zones', {}, token),

  // Reference data
  cameras: (token: string) => request<Camera[]>('/api/cameras', {}, token),
  zones: (token: string) => request<Zone[]>('/api/zones', {}, token),
}

export type LiveEvent =
  | 'report.created'
  | 'report.reviewed'
  | 'challan.updated'
  | 'camera.detection'
  | 'notification'
  | 'connected'

export function subscribeEvents(token: string, onEvent: (event: string, data: unknown) => void) {
  const url = `${API_BASE}/api/events/stream?token=${encodeURIComponent(token)}`
  const es = new EventSource(url)
  const types: LiveEvent[] = [
    'report.created',
    'report.reviewed',
    'challan.updated',
    'camera.detection',
    'notification',
  ]
  types.forEach((t) =>
    es.addEventListener(t, (e) => {
      try {
        onEvent(t, JSON.parse((e as MessageEvent).data))
      } catch {
        /* ignore malformed */
      }
    }),
  )
  return es
}

export const storage = {
  getToken: () => localStorage.getItem('sentinel_token'),
  setToken: (token: string) => localStorage.setItem('sentinel_token', token),
  clearToken: () => localStorage.removeItem('sentinel_token'),
  getRole: (): Role | null => (localStorage.getItem('sentinel_role') as Role) || null,
  setRole: (role: Role) => localStorage.setItem('sentinel_role', role),
  clearRole: () => localStorage.removeItem('sentinel_role'),
  getUsername: () => localStorage.getItem('sentinel_username'),
  setUsername: (u: string) => localStorage.setItem('sentinel_username', u),
  clearUsername: () => localStorage.removeItem('sentinel_username'),
  getRemember: () => localStorage.getItem('sentinel_remember') === 'true',
  setRemember: (v: boolean) =>
    v ? localStorage.setItem('sentinel_remember', 'true') : localStorage.removeItem('sentinel_remember'),
  logout: () => {
    localStorage.removeItem('sentinel_token')
    localStorage.removeItem('sentinel_role')
    localStorage.removeItem('sentinel_username')
    localStorage.removeItem('sentinel_remember')
    sessionStorage.removeItem('sentinel_user')
    sessionStorage.removeItem('sentinel_role')
  },
}
