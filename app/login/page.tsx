'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Lock, AlertCircle, Shield, User, UserPlus } from 'lucide-react'
import { Brand } from '@/components/brand'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, storage, type Role } from '@/lib/api'
import { cn } from '@/lib/utils'

const roleOptions: { value: Role; label: string; icon: React.ElementType; description: string; demoUsername: string; demoPassword: string }[] = [
  {
    value: 'citizen',
    label: 'Citizen',
    icon: User,
    description: 'Report violations, track challans',
    demoUsername: 'citizen',
    demoPassword: 'citizen123',
  },
  {
    value: 'authority',
    label: 'Authority',
    icon: Shield,
    description: 'Manage enforcement, view dashboard',
    demoUsername: 'admin',
    demoPassword: 'password123',
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [role, setRole] = useState<Role>('citizen')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedRole = roleOptions.find(r => r.value === role)!
  const isSignup = mode === 'signup'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    try {
      const res = isSignup
        ? await api.register(username.trim(), password, fullName.trim() || undefined)
        : await api.login(username.trim(), password)

      storage.setToken(res.access_token)
      storage.setRole(res.role)
      storage.setUsername(res.username)
      storage.setRemember(rememberMe)

      router.push(res.role === 'citizen' ? '/citizen' : '/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole)
    setError('')
  }

  const switchMode = () => {
    setMode(isSignup ? 'signin' : 'signup')
    setError('')
    setInfo('')
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Brand className="mx-auto mb-4" />
          <CardTitle className="text-2xl">{isSignup ? 'Create your account' : 'Sign in to Sentinel'}</CardTitle>
          <CardDescription>
            {isSignup ? 'Register in seconds — new accounts start as Citizen' : 'Choose your role to continue'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSignup && (
            <div className="grid grid-cols-2 gap-3 mb-6" role="radiogroup" aria-label="Select role">
              {roleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleRoleChange(option.value)}
                  role="radio"
                  aria-checked={role === option.value}
                  className={cn(
                    'relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                    role === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <option.icon className={cn('size-6', role === option.value ? 'text-primary' : 'text-muted-foreground')} />
                  <span className={cn('font-medium', role === option.value ? 'text-primary' : 'text-foreground')}>
                    {option.label}
                  </span>
                  <span className="text-xs text-muted-foreground text-center">{option.description}</span>
                  {role === option.value && (
                    <span className="absolute top-2 right-2 size-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="size-3 text-primary-foreground" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* Honeypot fields (off-screen): they soak up the browser's saved
                username/password so the real inputs stay empty on load. */}
            <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <input type="text" name="fake-username" tabIndex={-1} autoComplete="username" />
              <input type="password" name="fake-password" tabIndex={-1} autoComplete="current-password" />
            </div>

            {error && (
              <div className={cn('flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive')}>
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}
            {info && (
              <div className={cn('flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary')}>
                <Check className="size-4 shrink-0" />
                {info}
              </div>
            )}

            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-9"
                    disabled={loading}
                    autoComplete="off"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9"
                  required
                  disabled={loading}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isSignup ? 'At least 6 characters' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  required
                  disabled={loading}
                  autoComplete={isSignup ? 'new-password' : 'off'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {!isSignup && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                    className="size-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-muted-foreground">Remember me</span>
                </label>
                <Link
                  href="#"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
            >
              {loading
                ? (isSignup ? 'Creating account…' : 'Signing in…')
                : (isSignup ? 'Create account' : `Sign in as ${selectedRole.label}`)}
            </button>
          </form>

          <button
            type="button"
            onClick={switchMode}
            className="mt-4 w-full text-center text-sm text-primary hover:underline"
          >
            {isSignup ? 'Already have an account? Sign in' : 'Don’t have an account? Create one'}
          </button>

          {!isSignup && (
            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-center text-muted-foreground">
              <p className="font-medium">Demo credentials ({selectedRole.label})</p>
              <p>{selectedRole.demoUsername} / {selectedRole.demoPassword}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Link
            href="/"
            className={cn(buttonVariants({ variant: 'ghost' }), 'w-full')}
          >
            ← Back to home
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
