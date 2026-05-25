import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/profile/ProfileForm'

interface Props {
  searchParams: Promise<{ force?: string }>
}

export default async function ProfilePage({ searchParams }: Props) {
  const user = await getSession()
  if (!user) redirect('/login')

  const { force } = await searchParams
  const isForced = force === '1'

  return (
    <div className="max-w-lg space-y-6">
      {isForced && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">You are using a temporary password.</p>
          <p className="mt-0.5">Please set a new password below before continuing.</p>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account settings</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <ProfileForm name={user.name} email={user.email} avatarUrl={user.avatarUrl} />
      </div>
    </div>
  )
}
