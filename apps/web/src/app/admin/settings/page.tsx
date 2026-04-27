import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Settings, Building2, Zap } from 'lucide-react'
import { AddPropertyModal } from '@/components/admin/AddPropertyModal'
import { EditProfileForm } from '@/components/admin/EditProfileForm'
import { EditPropertyCard } from '@/components/admin/EditPropertyCard'
import { BillTypeManager } from '@/components/admin/BillTypeManager'

export default async function AdminSettingsPage() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  const adminClient = createAdminClient()

  const [{ data: properties }, { data: profile }, { data: billTypes }] = await Promise.all([
    (adminClient as any)
      .from('properties')
      .select('*')
      .eq('manager_id', user!.id)
      .order('created_at', { ascending: true }),
    (adminClient as any)
      .from('users')
      .select('full_name, email, phone, role, created_at')
      .eq('id', user!.id)
      .single(),
    (adminClient as any)
      .from('bill_types')
      .select('*')
      .order('name'),
  ])

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Settings
        </h1>
        <p className="text-slate-500 mt-1">Account and property configuration</p>
      </div>

      {/* Account */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Account</h2>
        <EditProfileForm
          userId={user!.id}
          initialName={profile?.full_name ?? ''}
          initialPhone={profile?.phone ?? ''}
        />
        {/* Read-only fields */}
        <div className="mt-3 bg-white dark:bg-slate-900 rounded-xl border divide-y divide-slate-100 dark:divide-slate-800">
          <Row label="Email" value={profile?.email ?? '—'} />
          <Row label="Role" value={<span className="capitalize font-semibold text-green-600">{profile?.role}</span>} />
        </div>
      </section>

      {/* Properties */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Properties
          </h2>
          <AddPropertyModal managerId={user!.id} />
        </div>
        {(properties ?? []).length > 0 ? (
          <div className="space-y-3">
            {((properties ?? []) as any[]).map((p: any) => (
              <EditPropertyCard key={p.id} property={p} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border p-10 text-center text-slate-400">
            No properties yet. Add one above.
          </div>
        )}
      </section>

      {/* Bill Types */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Bill Types
        </h2>
        <BillTypeManager billTypes={(billTypes ?? []) as any[]} />
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm text-slate-900 dark:text-white">{value}</span>
    </div>
  )
}
