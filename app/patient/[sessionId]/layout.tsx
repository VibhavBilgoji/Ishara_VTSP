import { redirect } from 'next/navigation'
import { AccessError, requireKioskOrStaff } from '@/lib/auth'

export default async function PatientLayout({ children, params }: {
  children: React.ReactNode; params: Promise<{ sessionId: string }>
}) {
  try { await requireKioskOrStaff((await params).sessionId) }
  catch (error) {
    if (error instanceof AccessError) redirect('/login')
    throw error
  }
  return children
}
