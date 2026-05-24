import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/profile/ProfileForm'

export default async function ProfilePage() {
  const user = await getSession()
  if (!user) redirect('/login')

  return (
    <div className="max-w-lg space-y-6">
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
