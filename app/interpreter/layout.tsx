import { redirect } from 'next/navigation'
import { AccessError, requireInterpreter } from '@/lib/auth'

export default async function InterpreterLayout({ children }: { children: React.ReactNode }) {
  try { await requireInterpreter() }
  catch (error) {
    if (error instanceof AccessError) redirect('/auth/interpreter')
    throw error
  }
  return children
}
