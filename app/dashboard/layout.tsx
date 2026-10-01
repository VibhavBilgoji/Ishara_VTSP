import { redirect } from 'next/navigation'
import { AccessError, requireStaff } from '@/lib/auth'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  try { await requireStaff() }
  catch (error) {
    if (error instanceof AccessError) redirect('/auth/hospital')
    throw error
  }
  return children
}
