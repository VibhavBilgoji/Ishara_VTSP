'use client'

import { createClient } from '@/lib/supabase/client'
import {
  GLOBAL_HOSPITAL_REQUESTS_BC,
  HOSPITAL_REQUESTS_CHANNEL,
  REALTIME_EVENTS,
  getSessionChannel,
} from '@/lib/realtime'
import type { RequestStatusPayload } from '@/lib/types'

/**
 * Nurse-station realtime.
 *
 * Pings carry only a session id. Receivers re-fetch from the hospital-scoped
 * API, so no patient detail travels over the shared broadcast channel.
 *
 * The Supabase browser client is a singleton and returns the same channel for
 * the same topic, so the hospital-wide channel is subscribed once and shared.
 */

type PingPayload = { sessionId: string; timestamp: string }
type PingListener = (payload: PingPayload) => void

const listeners = new Set<PingListener>()
let channelReady: Promise<any> | null = null

function supabaseEnabled() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return Boolean(url && url !== 'undefined')
}

function ensureRequestsChannel(): Promise<any> | null {
  if (!supabaseEnabled()) return null
  if (!channelReady) {
    channelReady = new Promise((resolve) => {
      const supabase = createClient()
      const channel = supabase.channel(HOSPITAL_REQUESTS_CHANNEL)
      channel
        .on('broadcast', { event: REALTIME_EVENTS.PATIENT_REQUEST }, (response: { payload: PingPayload }) => {
          listeners.forEach((listener) => listener(response.payload))
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') resolve(channel)
        })
    })
  }
  return channelReady
}

/** Tell every nurse station that a bed has a new or updated request. */
export function notifyNurseStation(sessionId: string) {
  const payload: PingPayload = { sessionId, timestamp: new Date().toISOString() }
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(GLOBAL_HOSPITAL_REQUESTS_BC)
      bc.postMessage({ type: REALTIME_EVENTS.PATIENT_REQUEST, payload })
      setTimeout(() => { try { bc.close() } catch {} }, 1000)
    }
  } catch {}
  ensureRequestsChannel()
    ?.then((channel) => channel.send({ type: 'broadcast', event: REALTIME_EVENTS.PATIENT_REQUEST, payload }))
    .catch(() => {})
}

/** Listen for nurse-station pings from this device and from other devices. */
export function onNurseStationPing(listener: PingListener) {
  listeners.add(listener)
  ensureRequestsChannel()

  let bc: BroadcastChannel | null = null
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel(GLOBAL_HOSPITAL_REQUESTS_BC)
      bc.onmessage = (event) => {
        if (event.data?.type === REALTIME_EVENTS.PATIENT_REQUEST) listener(event.data.payload)
      }
    }
  } catch {}

  return () => {
    listeners.delete(listener)
    try { bc?.close() } catch {}
  }
}

/** Send a nurse response to one bed's tablet, then nudge other nurse stations. */
export function broadcastRequestStatus(payload: RequestStatusPayload) {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(`ishara_session_${payload.sessionId}`)
      bc.postMessage({ type: REALTIME_EVENTS.REQUEST_STATUS, payload })
      setTimeout(() => { try { bc.close() } catch {} }, 1000)
    }
  } catch {}

  try {
    if (supabaseEnabled()) {
      const supabase = createClient()
      const topic = getSessionChannel(payload.sessionId)
      // Reuse a channel this page already holds; only remove one we opened here.
      const existing = supabase.getChannels().find((c: { topic: string }) => c.topic === `realtime:${topic}`)
      if (existing) {
        existing.send({ type: 'broadcast', event: REALTIME_EVENTS.REQUEST_STATUS, payload })
      } else {
        const channel = supabase.channel(topic)
        channel.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            channel.send({ type: 'broadcast', event: REALTIME_EVENTS.REQUEST_STATUS, payload })
            setTimeout(() => supabase.removeChannel(channel), 1500)
          }
        })
      }
    }
  } catch {}

  notifyNurseStation(payload.sessionId)
}
