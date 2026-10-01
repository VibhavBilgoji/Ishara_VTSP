/**
 * Shared, robust audio engine & notification utility for clinical emergency alarms.
 *
 * Solves:
 * 1. Autoplay blocking: AudioContext starts suspended until user interaction or explicit unlock.
 * 2. Resource exhaustion: Reuses a single shared AudioContext singleton rather than leaking instances.
 * 3. Background tab notifications: Triggers native browser Notification when tab is hidden.
 */

let sharedAudioCtx: AudioContext | null = null

/**
 * Returns or initializes the shared AudioContext singleton.
 */
export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null

  if (!sharedAudioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext

    if (!AudioContextClass) return null
    sharedAudioCtx = new AudioContextClass()
  }

  return sharedAudioCtx
}

/**
 * Checks whether audio is currently unlocked and actively running.
 */
export function isAudioUnlocked(): boolean {
  if (!sharedAudioCtx) return false
  return sharedAudioCtx.state === 'running'
}

/**
 * Explicit user-gesture trigger to unlock/resume the Web Audio context
 * and request browser notification permissions.
 */
export async function unlockAlarmsAndNotifications(): Promise<{
  audioUnlocked: boolean
  notificationStatus: NotificationPermission
}> {
  let audioUnlocked = false
  let notificationStatus: NotificationPermission = 'default'

  const ctx = getSharedAudioContext()
  if (ctx) {
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      audioUnlocked = ctx.state === 'running'
    } catch (e) {
      console.warn('[AudioEngine] Could not resume AudioContext:', e)
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'default') {
        notificationStatus = await Notification.requestPermission()
      } else {
        notificationStatus = Notification.permission
      }
    } catch (e) {
      console.warn('[AudioEngine] Notification permission request error:', e)
    }
  }

  return { audioUnlocked, notificationStatus }
}

/**
 * Dispatches a native browser notification when the page is in the background.
 */
export function sendBackgroundEmergencyNotification(
  title: string,
  options?: NotificationOptions
) {
  if (typeof window === 'undefined' || !('Notification' in window)) return

  // Only dispatch background notification if tab is unfocused / hidden
  if (document.hidden && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'ishara-emergency',
        ...options,
      } as NotificationOptions)
    } catch {
      // Ignore background notification failure
    }
  }
}

/**
 * Plays a clinical emergency chime (523Hz -> 659Hz) through the shared audio context.
 */
export function playClinicalChime(bedOrPatient?: string) {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime

    // Two-tone alert (523.25Hz C5 -> 659.25Hz E5)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, now)
    osc.frequency.setValueAtTime(659.25, now + 0.15)

    gain.gain.setValueAtTime(0.35, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.55)
  } catch {
    // Autoplay or device permission
  }

  // Send background notification if clinician tab is idle or hidden
  sendBackgroundEmergencyNotification('🚨 Urgent Patient Triage Alert', {
    body: bedOrPatient
      ? `Patient at ${bedOrPatient} triggered an urgent emergency alert.`
      : 'Urgent bedside emergency alert triggered.',
  })
}

/**
 * Plays the incoming interpreter distress ring (853Hz + 960Hz dual-tone).
 */
export function playIncomingCallRing(patientOrHospital?: string) {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime

    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(853, now)
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(960, now)

    gain.gain.setValueAtTime(0.35, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.8)
    osc2.stop(now + 0.8)
  } catch {
    // Autoplay or device permission
  }

  // Send background notification if interpreter tab is idle or hidden
  sendBackgroundEmergencyNotification('📞 Incoming ISL Emergency Relay Request', {
    body: patientOrHospital
      ? `Hospital page for ${patientOrHospital}. 30s connection SLA.`
      : 'Incoming patient video relay call. Click to accept.',
  })
}
