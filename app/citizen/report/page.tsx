'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Camera,
  CameraOff,
  X,
  MapPin,
  Image,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react'
import Link from 'next/link'
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
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ViolationType, VehicleType } from '@/lib/mock-data'
import { api, storage } from '@/lib/api'

const violationTypes: ViolationType[] = [
  'No-Parking Zone',
  'Footpath Parking',
  'Bus Stop Obstruction',
  'Emergency Lane',
  'Junction Blocking',
  'Double Parking',
  'Zebra Crossing',
]

const vehicleTypes: VehicleType[] = ['Car', 'Two-Wheeler', 'Auto-Rickshaw', 'LCV / Truck', 'Bus']

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [meta, base64] = dataUrl.split(',')
    const mime = meta.match(/data:(.*?);/)?.[1] || 'image/jpeg'
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  } catch {
    return null
  }
}

export default function ReportViolationPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImages, setCapturedImages] = useState<string[]>([])
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [cameraTrying, setCameraTrying] = useState(true)
  const [cameraError, setCameraError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Form state
  const [plate, setPlate] = useState('')
  const [vehicleType, setVehicleType] = useState<VehicleType>('Car')
  const [vehicleColor, setVehicleColor] = useState('')
  const [violationType, setViolationType] = useState<ViolationType>('No-Parking Zone')
  const [location, setLocation] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [gettingLocation, setGettingLocation] = useState(false)

  // Initialize camera with fallbacks (environment -> user -> any camera)
  useEffect(() => {
    let cancelled = false

    const startCamera = async () => {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraTrying(false)
        setCameraError(
          'Your browser does not support camera access, or the page is not served over HTTPS/localhost. You can still upload a photo instead.'
        )
        return
      }

      setCameraTrying(true)
      setCameraError('')

      // Ordered list of video constraints to try
      const attempts: MediaStreamConstraints[] = [
        { video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } } },
        { video: { facingMode: facingMode === 'environment' ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: true },
      ]

      for (const constraints of attempts) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
          if (cancelled) {
            mediaStream.getTracks().forEach(track => track.stop())
            return
          }
          streamRef.current = mediaStream
          setStream(mediaStream)
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream
          }
          setCameraTrying(false)
          return
        } catch {
          // try next fallback
        }
      }

      // All attempts failed
      if (!cancelled) {
        setCameraTrying(false)
        setStream(null)
        setCameraError(
          'Could not access the camera. Camera may be blocked by permissions or in use by another app. You can still upload a photo from your device instead.'
        )
      }
    }

    startCamera()

    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [facingMode])

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !stream) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedImages(prev => [...prev, dataUrl])
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = 5 - capturedImages.length

    files.slice(0, remaining).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result === 'string') {
          setCapturedImages(prev => {
            if (prev.length >= 5) return prev
            return [...prev, result]
          })
        }
      }
      reader.readAsDataURL(file)
    })

    // Reset input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index))
  }

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setSubmitError('Geolocation is not supported by your browser')
      return
    }
    setGettingLocation(true)
    setSubmitError('')
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      })
      setLat(position.coords.latitude)
      setLng(position.coords.longitude)
      setLocation(`${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`)
    } catch (err) {
      console.error('Location error:', err)
      setSubmitError('Unable to get location. Please enable location permissions or enter manually.')
    } finally {
      setGettingLocation(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitSuccess(false)

    if (!plate.trim()) {
      setSubmitError('Please enter vehicle license plate')
      return
    }
    if (!violationType) {
      setSubmitError('Please select violation type')
      return
    }
    if (!location.trim()) {
      setSubmitError('Please enter or fetch location')
      return
    }
    if (capturedImages.length === 0) {
      setSubmitError('Please capture or upload at least one photo')
      return
    }

    setSubmitting(true)

    try {
      const token = storage.getToken()
      if (!token) {
        setSubmitError('You must be signed in. Redirecting to login...')
        setTimeout(() => router.push('/login'), 1500)
        return
      }

      const form = new FormData()
      form.append('plate', plate.trim().toUpperCase())
      if (vehicleType) form.append('vehicle_type', vehicleType)
      if (vehicleColor) form.append('vehicle_color', vehicleColor)
      form.append('violation_type', violationType)
      form.append('location', location.trim())
      if (lat) form.append('lat', String(lat))
      if (lng) form.append('lng', String(lng))
      if (description) form.append('description', description)

      // Convert captured base64 images to File objects and append
      capturedImages.forEach((dataUrl, index) => {
        const blob = dataUrlToBlob(dataUrl)
        if (blob) form.append('evidence_files', blob, `evidence-${index + 1}.jpg`)
      })

      await api.createReport(token, form)
      setSubmitSuccess(true)

      // Redirect to reports page after 2 seconds
      setTimeout(() => {
        router.push('/citizen/reports')
      }, 2000)
    } catch (err) {
      console.error('Submit error:', err)
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const isFormValid = plate.trim() && violationType && location.trim() && capturedImages.length > 0

  return (
    <CitizenShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Report Violation</h1>
          <p className="text-sm text-muted-foreground">
            Capture evidence and submit a challan for illegal parking
          </p>
        </div>

        {/* Camera Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="size-5" />
              Capture Evidence
            </CardTitle>
            <CardDescription>
              Take clear photos showing the license plate and violation context
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Camera Preview */}
            <div className="relative aspect-video rounded-xl bg-black overflow-hidden">
              {stream && !cameraError ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      disabled={capturedImages.length >= 5}
                      className={cn(
                        buttonVariants({ size: 'lg' }),
                        'size-14 rounded-full bg-white/90 text-foreground shadow-lg',
                        capturedImages.length >= 5 && 'opacity-50 cursor-not-allowed'
                      )}
                      aria-label="Capture photo"
                    >
                      <Camera className="size-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                      className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'size-12 rounded-full bg-white/10')}
                      aria-label="Switch camera"
                    >
                      <RotateCcw className="size-5" />
                    </button>
                  </div>
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className={cn(
                      'flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium',
                      capturedImages.length >= 5 ? 'text-green-600' : 'text-muted-foreground'
                    )}>
                      <span className="size-1.5 rounded-full bg-current" />
                      {capturedImages.length}/5 photos
                    </span>
                  </div>
                </>
              ) : cameraError ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
                  <CameraOff className="size-12 mb-3 opacity-50" />
                  <p className="font-medium text-foreground">Camera Unavailable</p>
                  <p className="text-sm max-w-sm">{cameraError}</p>
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                    >
                      Try other camera
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(buttonVariants({ size: 'sm' }))}
                    >
                      <Image className="size-4 mr-1.5" />
                      Upload photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="size-8 animate-spin" />
                  <p className="mt-2">
                    {cameraTrying ? 'Starting camera...' : 'Requesting camera access...'}
                  </p>
                </div>
              )}
            </div>

            {/* Upload alternative */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Image className="size-4" />
                {stream && !cameraError
                  ? 'Camera is active — capture a photo or upload from your device'
                  : 'No camera? Upload a photo of the violation from your device'}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={capturedImages.length >= 5}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={capturedImages.length >= 5}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                <Image className="size-4 mr-1.5" />
                Upload from device
              </button>
            </div>

            {/* Captured Images */}
            {capturedImages.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Captured Evidence ({capturedImages.length}/5)</p>
                  {capturedImages.length >= 5 && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="size-3" />
                      Maximum reached
                    </span>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {capturedImages.map((img, index) => (
                    <div key={index} className="relative flex-shrink-0">
                      <div className="relative aspect-square w-24 rounded-lg overflow-hidden bg-muted">
                        <img src={img} alt={`Evidence ${index + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                        aria-label="Remove photo"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {submitError && (
            <div className={cn('flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive')}>
              <AlertCircle className="size-4 shrink-0" />
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div className={cn('flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success')}>
              <CheckCircle2 className="size-4 shrink-0" />
              Report submitted successfully! Redirecting to your reports...
            </div>
          )}

          {/* Vehicle Details */}
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plate">License Plate *</Label>
                <Input
                  id="plate"
                  placeholder="GJ01 AB 1234"
                  value={plate}
                  onChange={e => setPlate(e.target.value.toUpperCase())}
                  required
                  disabled={submitting}
                  maxLength={15}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleType">Vehicle Type *</Label>
                <Select
                  id="vehicleType"
                  value={vehicleType}
                  onChange={e => setVehicleType(e.target.value as VehicleType)}
                  disabled={submitting}
                >
                  <option value="" disabled>Select vehicle type</option>
                  {vehicleTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleColor">Vehicle Color</Label>
                <Input
                  id="vehicleColor"
                  placeholder="White, Black, Red, etc."
                  value={vehicleColor}
                  onChange={e => setVehicleColor(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="violationType">Violation Type *</Label>
                <Select
                  id="violationType"
                  value={violationType}
                  onChange={e => setViolationType(e.target.value as ViolationType)}
                  disabled={submitting}
                >
                  <option value="" disabled>Select violation type</option>
                  {violationTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location">Address / Area *</Label>
                <div className="relative">
                  <Input
                    id="location"
                    placeholder="e.g., CG Road, Navrangpura, Ahmedabad"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    required
                    disabled={submitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation || submitting}
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'absolute right-2 top-1/2 -translate-y-1/2')}
                  >
                    {gettingLocation ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <MapPin className="size-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use current location or enter address manually
                </p>
              </div>
              {(lat && lng) && (
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground font-mono">
                  GPS: {lat.toFixed(6)}, {lng.toFixed(6)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe the violation context, any signage visible, etc."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                disabled={submitting}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || !isFormValid || capturedImages.length === 0}
              className={cn(buttonVariants({ size: 'lg' }), 'flex-1')}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </button>
            <Link
              href="/citizen"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'flex-1 justify-center')}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </CitizenShell>
  )
}