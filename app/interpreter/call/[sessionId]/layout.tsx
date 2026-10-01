import { redirect } from 'next/navigation'
import { AccessError, requireInterpreter, requireSessionAccess } from '@/lib/auth'

export default async function CallLayout({ children, params }: {
  children: React.ReactNode; params: Promise<{ sessionId: string }>
}) {
  try {
    await requireInterpreter()
    const auth = await requireSessionAccess((await params).sessionId)
    if (auth.kind !== 'interpreter' || auth.session.status === 'closed') throw new AccessError(403, 'No assigned call')
  } catch (error) {
    if (error instanceof AccessError) redirect('/interpreter/dashboard')
    throw error
  }
  return children
}
