import type { Metadata } from 'next'
import { Dashboard } from '@/components/admin/dashboard'
import { LoginForm } from '@/components/admin/login-form'
import { adminTabSchema } from '@/lib/schemas'
import { getAdmin } from '@/server/auth'
import { getAdminData } from '@/server/queries'

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function AdminPage({ searchParams }: Props) {
  // Sem sessão: mostra o login na própria URL /admin (e nenhum dado do painel é consultado).
  if (!(await getAdmin())) return <LoginForm />
  const tab = adminTabSchema.parse((await searchParams).aba)
  return <Dashboard tab={tab} data={await getAdminData()} />
}
