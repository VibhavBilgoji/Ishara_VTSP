'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getSessionChannel,
  REALTIME_EVENTS,
  INTERPRETER_REQUESTS_CHANNEL,
  HOSPITAL_ALERTS_CHANNEL,
  GLOBAL_HOSPITAL_ALERTS_BC,
} from '@/lib/realtime'
import { notifyNurseStation } from '@/lib/nurse-realtime'
import type {
  PictogramAlertPayload,
  PlayClipPayload,
  StatusChangePayload,
  SessionStatus,
  SessionEvent,
  GestureTextPayload,
  ClipPriority,
  RequestStatusPayload,
  AlertAckPayload,
} from '@/lib/types'

// Re-export so consumers can import GestureTextPayload from this hook
export type { GestureTextPayload }

interface UseSessionRealtimeOptions {
  sessionId: string
  onAlertReceived?: (alert: PictogramAlertPayload) => void
  onClipReceived?: (clip: PlayClipPayload) => void
  onStatusReceived?: (status: StatusChangePayload) => void
  onGestureReceived?: (payload: GestureTextPayload) => void
  onRequestStatus?: (payload: RequestStatusPayload) => void
  onAlertAck?: (ack: AlertAckPayload) => void
}

export function useSessionRealtime({
  sessionId,
  onAlertReceived,
  onClipReceived,
  onStatusReceived,
  onGestureReceived,
  onRequestStatus,
  onAlertAck,
}: UseSessionRealtimeOptions) {
  const [activeAlert, setActiveAlert] = useState<PictogramAlertPayload | null>(null)
  const [activeClip, setActiveClip] = useState<PlayClipPayload | null>(null)
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('active')
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [lastAck, setLastAck] = useState<AlertAckPayload | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const supabaseChannelRef = useRef<any>(null)

  const handleIncomingEvent = useCallback(
    (type: string, payload: any) => {
      if (!payload) return

      if (type === REALTIME_EVENTS.PICTOGRAM_ALERT) {
        const alertData = payload as PictogramAlertPayload
        // Only set activeAlert (interruptive banner + chime) if the alert is classified as URGENT!
        const isUrgent = alertData.isUrgent ?? (alertData.priority === 'P0' || alertData.category?.toLowerCase().includes('emergency'))
        if (isUrgent) {
          setActiveAlert(alertData)
          onAlertReceived?.(alertData)
        }

        // Always append all events to audit trail
        setEvents((prev) => [
          {
            id: `evt-${Date.now()}-${Math.random()}`,
            session_id: sessionId,
            event_type: 'pictogram',
            payload: alertData as unknown as Record<string, unknown>,
            actor_id: null,
            created_at: alertData.timestamp || new Date().toISOString(),
          },
          ...prev,
        ])
      } else if (type === REALTIME_EVENTS.PLAY_CLIP) {
        const clipData = payload as PlayClipPayload
        setActiveClip(clipData)
        onClipReceived?.(clipData)

        setEvents((prev) => [
          {
            id: `evt-${Date.now()}-${Math.random()}`,
            session_id: sessionId,
            event_type: 'isl_played',
            payload: clipData as unknown as Record<string, unknown>,
            actor_id: null,
            created_at: clipData.timestamp || new Date().toISOString(),
          },
          ...prev,
        ])
      } else if (type === REALTIME_EVENTS.STATUS_CHANGE) {
        const statusData = payload as StatusChangePayload
        setSessionStatus(statusData.newStatus)
        onStatusReceived?.(statusData)

        setEvents((prev) => [
          {
            id: `evt-${Date.now()}-${Math.random()}`,
            session_id: sessionId,
            event_type: 'note',
            payload: { message: `Status changed to ${statusData.newStatus}` },
            actor_id: null,
            created_at: statusData.timestamp || new Date().toISOString(),
          },
          ...prev,
        ])
      } else if (type === REALTIME_EVENTS.REQUEST_STATUS) {
        onRequestStatus?.(payload as RequestStatusPayload)
      } else if (type === REALTIME_EVENTS.GESTURE_TEXT) {
        const gestureData = payload as GestureTextPayload
        onGestureReceived?.(gestureData)

        setEvents((prev) => [
          {
            id: `evt-${Date.now()}-${Math.random()}`,
            session_id: sessionId,
            event_type: 'gesture_text',
            payload: gestureData as unknown as Record<string, unknown>,
            actor_id: null,
            created_at: gestureData.timestamp || new Date().toISOString(),
          },
          ...prev,
        ])
      } else if (type === REALTIME_EVENTS.ALERT_ACK) {
        const ackData = payload as AlertAckPayload
        setLastAck(ackData)
        onAlertAck?.(ackData)
      }
    },
    [sessionId, onAlertReceived, onClipReceived, onStatusReceived, onGestureReceived, onRequestStatus, onAlertAck]
  )

  useEffect(() => {
    if (!sessionId) return

    // 1. Setup local BroadcastChannel for zero-latency local / same-machine multi-tab demo
    let localBC: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        localBC = new BroadcastChannel(`ishara_session_${sessionId}`)
        broadcastChannelRef.current = localBC

        localBC.onmessage = (event) => {
          const { type, payload } = event.data || {}
          handleIncomingEvent(type, payload)
        }
      }
    } catch {
      // Ignore broadcast channel errors
    }

    // 2. Setup Supabase Realtime Channel
    let supabase: any = null
    let channel: any = null

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (supabaseUrl && supabaseUrl !== 'undefined') {
        supabase = createClient()
        const channelName = getSessionChannel(sessionId)

        channel = supabase.channel(channelName, {
          config: { broadcast: { self: false } },
        })

        channel
          .on('broadcast', { event: REALTIME_EVENTS.PICTOGRAM_ALERT }, (response: any) => {
            handleIncomingEvent(REALTIME_EVENTS.PICTOGRAM_ALERT, response.payload)
          })
          .on('broadcast', { event: REALTIME_EVENTS.ALERT_ACK }, (response: any) => {
            handleIncomingEvent(REALTIME_EVENTS.ALERT_ACK, response.payload)
          })
          .on('broadcast', { event: REALTIME_EVENTS.PLAY_CLIP }, (response: any) => {
            handleIncomingEvent(REALTIME_EVENTS.PLAY_CLIP, response.payload)
          })
          .on('broadcast', { event: REALTIME_EVENTS.STATUS_CHANGE }, (response: any) => {
            handleIncomingEvent(REALTIME_EVENTS.STATUS_CHANGE, response.payload)
          })
          .on('broadcast', { event: REALTIME_EVENTS.GESTURE_TEXT }, (response: any) => {
            handleIncomingEvent(REALTIME_EVENTS.GESTURE_TEXT, response.payload)
          })
          .on('broadcast', { event: REALTIME_EVENTS.REQUEST_STATUS }, (response: any) => {
            handleIncomingEvent(REALTIME_EVENTS.REQUEST_STATUS, response.payload)
          })
          .subscribe((status: string) => {
            setIsConnected(status === 'SUBSCRIBED')
          })

        supabaseChannelRef.current = channel
      } else {
        // Fallback: local broadcast is active
        setIsConnected(true)
      }
    } catch (e) {
      console.warn('Realtime subscription fallback to local:', e)
      setIsConnected(true)
    }

    return () => {
      if (localBC) localBC.close()
      if (channel && supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [sessionId, handleIncomingEvent])

  /** Broadcast a pictogram tap event */
  const sendPictogramAlert = useCallback(
    (
      clipKey: string,
      label: string,
      category = 'Emergency',
      priority: ClipPriority = 'P1',
      isUrgent = false,
      patientName?: string,
      extraNote?: string
    ) => {
      const payload: PictogramAlertPayload = {
        type: 'pictogram_alert',
        sessionId,
        patientName,
        clipKey,
        label,
        category,
        priority,
        isUrgent,
        ...(extraNote ? { extraNote } : {}),
        timestamp: new Date().toISOString(),
      }

      // 1. Post to local session broadcast channel
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: REALTIME_EVENTS.PICTOGRAM_ALERT,
          payload,
        })
      }

      // 2. Post to Supabase Realtime session channel
      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: REALTIME_EVENTS.PICTOGRAM_ALERT,
          payload,
        })
      }

      // 3. If URGENT, broadcast to hospital-wide alerts channel for doctors on /dashboard!
      if (isUrgent) {
        try {
          if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const globalAlertsBC = new BroadcastChannel(GLOBAL_HOSPITAL_ALERTS_BC)
            globalAlertsBC.postMessage({
              type: REALTIME_EVENTS.EMERGENCY_ALERT,
              payload,
            })
            setTimeout(() => {
              try {
                globalAlertsBC.close()
              } catch { }
            }, 3000)
          }
        } catch { }

        try {
          if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
            const supabase = createClient()
            const globalChannel = supabase.channel(HOSPITAL_ALERTS_CHANNEL)
            globalChannel.subscribe((status: string) => {
              if (status === 'SUBSCRIBED') {
                globalChannel.send({
                  type: 'broadcast',
                  event: REALTIME_EVENTS.EMERGENCY_ALERT,
                  payload,
                })
              }
            })
          }
        } catch { }
      }

      // Update local state ONLY if URGENT!
      if (isUrgent) {
        setActiveAlert(payload)
      }

      setEvents((prev) => [
        {
          id: `evt-${Date.now()}`,
          session_id: sessionId,
          event_type: 'pictogram',
          payload: payload as unknown as Record<string, unknown>,
          actor_id: null,
          created_at: payload.timestamp,
        },
        ...prev,
      ])

      // Asynchronous API call to persist in database without blocking UI
      fetch(`/api/patient/${sessionId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'pictogram',
          payload,
        }),
      })
        .then(() => notifyNurseStation(sessionId))
        .catch(() => { })
    },
    [sessionId]
  )

  /** Broadcast an ISL video clip to play on patient tablet */
  const sendPlayClip = useCallback(
    (clipKey: string, clipUrl: string, label: string) => {
      const payload: PlayClipPayload = {
        type: 'play_clip',
        sessionId,
        clipKey,
        clipUrl,
        label,
        timestamp: new Date().toISOString(),
      }

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: REALTIME_EVENTS.PLAY_CLIP,
          payload,
        })
      }

      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: REALTIME_EVENTS.PLAY_CLIP,
          payload,
        })
      }

      setActiveClip(payload)
      setEvents((prev) => [
        {
          id: `evt-${Date.now()}`,
          session_id: sessionId,
          event_type: 'isl_played',
          payload: payload as unknown as Record<string, unknown>,
          actor_id: null,
          created_at: payload.timestamp,
        },
        ...prev,
      ])
    },
    [sessionId]
  )

  /** Update session status */
  const sendStatusChange = useCallback(
    (newStatus: SessionStatus) => {
      const payload: StatusChangePayload = {
        type: 'status_change',
        sessionId,
        newStatus,
        timestamp: new Date().toISOString(),
      }

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: REALTIME_EVENTS.STATUS_CHANGE,
          payload,
        })
      }

      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: REALTIME_EVENTS.STATUS_CHANGE,
          payload,
        })
      }

      setSessionStatus(newStatus)

      // Notify database status API to keep state persisted
      fetch(`/api/session/${sessionId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          activeMode: newStatus === 'interpreter_connected' ? 'live_interpreter' : 'pictogram',
        }),
      }).catch(() => { })
    },
    [sessionId]
  )

  /** Broadcast an interpreter request across the hospital and to all interpreters */
  const requestInterpreter = useCallback(
    async (options?: { hospitalName?: string; patientName?: string; note?: string }) => {
      // 1. Update session status to interpreter_requested
      sendStatusChange('interpreter_requested')

      const requestPayload = {
        id: `req-${Date.now()}`,
        sessionId,
        hospitalName: options?.hospitalName || 'Ishara Demo Hospital',
        patientName: options?.patientName || 'Bedside Patient (ISL)',
        note: options?.note || 'Urgent clinician bedside request',
        requestedAt: new Date().toLocaleTimeString(),
      }

      // 2. Broadcast to local interpreter requests channel
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('ishara_global_interpreter_requests')
          bc.postMessage({
            type: 'new_request',
            payload: requestPayload,
          })
          setTimeout(() => {
            try {
              bc.close()
            } catch { }
          }, 3000)
        } catch { }
      }

      // 3. Broadcast to Supabase Realtime channel for interpreters
      try {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
          const supabase = createClient()
          const interpChannel = supabase.channel(INTERPRETER_REQUESTS_CHANNEL)
          interpChannel.subscribe((subStatus: string) => {
            if (subStatus === 'SUBSCRIBED') {
              interpChannel.send({
                type: 'broadcast',
                event: REALTIME_EVENTS.NEW_REQUEST,
                payload: requestPayload,
              })
            }
          })
        }
      } catch (err) {
        console.warn('Realtime interpreter broadcast error:', err)
      }

      // 4. Persist to API
      try {
        await fetch(`/api/session/${sessionId}/request-interpreter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            note: options?.note || 'Urgent clinician bedside request',
            hospitalName: options?.hospitalName,
            patientName: options?.patientName,
          }),
        })
      } catch (err) {
        console.warn('API interpreter request error:', err)
      }
    },
    [sessionId, sendStatusChange]
  )

  /** Cancel an active interpreter request */
  const cancelInterpreterRequest = useCallback(
    async () => {
      // 1. Reset session status back to active triage
      sendStatusChange('active')

      const cancelPayload = {
        type: 'cancel_request',
        sessionId,
      }

      // 2. Broadcast cancellation over local BroadcastChannel
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('ishara_global_interpreter_requests')
          bc.postMessage({
            type: 'cancel_request',
            payload: cancelPayload,
          })
          setTimeout(() => {
            try {
              bc.close()
            } catch { }
          }, 3000)
        } catch { }
      }

      // 3. Broadcast cancellation over Supabase Realtime channel
      try {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
          const supabase = createClient()
          const interpChannel = supabase.channel(INTERPRETER_REQUESTS_CHANNEL)
          interpChannel.subscribe((subStatus: string) => {
            if (subStatus === 'SUBSCRIBED') {
              interpChannel.send({
                type: 'broadcast',
                event: REALTIME_EVENTS.CANCEL_REQUEST,
                payload: cancelPayload,
              })
            }
          })
        }
      } catch (err) {
        console.warn('Realtime interpreter cancellation error:', err)
      }

      // 4. Update session status in API
      try {
        await fetch(`/api/session/${sessionId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'active',
            activeMode: 'pictogram',
          }),
        })
      } catch { }
    },
    [sessionId, sendStatusChange]
  )

  const clearAlert = useCallback(() => {
    setActiveAlert(null)
  }, [])

  const clearClip = useCallback(() => {
    setActiveClip(null)
  }, [])

  /** Broadcast a detected ISL gesture text to the dashboard */
  const sendGestureText = useCallback(
    (text: string, confidence: number) => {
      const payload: GestureTextPayload = {
        type: 'gesture_text',
        sessionId,
        text,
        confidence,
        timestamp: new Date().toISOString(),
      }

      // 1. Local BroadcastChannel (zero-latency same-device)
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: REALTIME_EVENTS.GESTURE_TEXT,
          payload,
        })
      }

      // 2. Supabase Realtime (cross-device)
      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: REALTIME_EVENTS.GESTURE_TEXT,
          payload,
        })
      }

      // 3. Persist to database audit trail
      fetch(`/api/patient/${sessionId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'gesture_text', payload }),
      })
        .then(() => notifyNurseStation(sessionId))
        .catch(() => { })
    },
    [sessionId]
  )

  /** Send an acknowledgement from clinician to patient kiosk */
  const sendAlertAck = useCallback(
    (alertId?: string, acknowledgedBy = 'Doctor / Clinical Staff') => {
      const payload: AlertAckPayload = {
        type: 'alert_ack',
        sessionId,
        alertId,
        acknowledgedBy,
        timestamp: new Date().toISOString(),
      }

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: REALTIME_EVENTS.ALERT_ACK,
          payload,
        })
      }

      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: REALTIME_EVENTS.ALERT_ACK,
          payload,
        })
      }
    },
    [sessionId]
  )

  return {
    activeAlert,
    activeClip,
    sessionStatus,
    events,
    isConnected,
    lastAck,
    sendPictogramAlert,
    sendAlertAck,
    sendPlayClip,
    sendStatusChange,
    requestInterpreter,
    cancelInterpreterRequest,
    clearAlert,
    clearClip,
    setEvents,
    sendGestureText,
  }
}
