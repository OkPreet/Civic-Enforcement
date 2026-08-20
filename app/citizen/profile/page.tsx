'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  Camera,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  User,
  Loader2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { CitizenShell } from '@/components/citizen/shell'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, storage, type UserProfile } from '@/lib/api'
import { cn } from '@/lib/utils'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0]?.slice(0, 2).toUpperCase() || 'U'
}

export default function CitizenProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const token = storage.getToken()
    if (!token) {
      router.push('/login')
      return
    }
    api
      .me(token)
      .then(user => {
        setProfile(user)
        setName(user.full_name || user.username)
        setPhone(user.phone || '')
        setEmail(user.email || '')
        setLocation(user.area || '')
        setLoading(false)
      })
      .catch(() => {
        router.push('/login')
      })
  }, [router])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleLogout = () => {
    storage.logout()
    router.push('/login')
  }

  if (loading) {
    return (
      <CitizenShell>
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
          <p className="mt-3 text-sm">Loading profile...</p>
        </div>
      </CitizenShell>
    )
  }

  return (
    <CitizenShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account and notification preferences</p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              This information is shared with authorities when reviewing your reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="flex size-20 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
                    {initials(name)}
                  </div>
                  <button
                    type="button"
                    className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground hover:bg-primary/80"
                    aria-label="Change profile photo"
                  >
                    <Camera className="size-3.5" />
                  </button>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Profile photo</p>
                  <p>JPG or PNG, max 2MB</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Area / Locality</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="location"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className={cn(buttonVariants({ size: 'lg' }))}
                >
                  <Save className="size-4 mr-2" />
                  Save Changes
                </button>
                {saved && (
                  <span className="text-sm font-medium text-green-600">
                    Saved successfully
                  </span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Report status updates', desc: 'Get notified when your report is reviewed or a challan is issued' },
              { label: 'Hotspot alerts', desc: 'Alerts about high violation activity near your area' },
              { label: 'Weekly activity summary', desc: 'A weekly summary of your reports and their outcomes' },
            ].map((item, index) => (
              <div key={item.label} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
                <ToggleSwitch defaultChecked={index !== 2} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Account */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="size-5" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Logging out will end your current session. You will need to sign in again to report violations.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className={cn(buttonVariants({ variant: 'destructive' }))}
              >
                <LogOut className="size-4 mr-2" />
                Log out
              </button>
              <Link
                href="/citizen"
                className={cn(buttonVariants({ variant: 'ghost' }))}
              >
                Cancel
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </CitizenShell>
  )
}

function ToggleSwitch({ defaultChecked }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(!!defaultChecked)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn(v => !v)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        on ? 'bg-primary' : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'inline-block size-4 transform rounded-full bg-white shadow transition-transform',
          on ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )
}