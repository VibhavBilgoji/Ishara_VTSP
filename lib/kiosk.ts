import { createHash, randomBytes } from 'node:crypto'

export const PAIRING_TTL_SECONDS = 5 * 60
export const KIOSK_TTL_SECONDS = 12 * 60 * 60
export const newToken = () => randomBytes(32).toString('hex')
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
export const kioskCookieName = (sessionId: string) => `ishara_kiosk_${sessionId}`
