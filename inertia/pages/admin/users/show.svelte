<script lang="ts">
  import AdminLayout from '@/layouts/admin_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import { Link } from '@inertiajs/svelte'

  interface User {
    id: string
    username: string
    email: string | null
    system_role: string
    status: string
    current_organization_id: string | null
    is_freelancer: boolean
    created_at: string
    updated_at: string
  }

  interface Props {
    user: User
  }

  let { user }: Props = $props()
</script>

<AdminLayout title="User Details - System Admin">
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">{user.username}</h1>
        <p class="text-slate-600 mt-1">User account details</p>
      </div>
      <Link href="/admin/users">
        <Button variant="outline">Back to Users</Button>
      </Link>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Basic account details</CardDescription>
        </CardHeader>
        <CardContent>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm font-medium text-slate-600">User ID</dt>
              <dd class="mt-1 text-sm text-slate-900 font-mono">{user.id}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Username</dt>
              <dd class="mt-1 text-sm text-slate-900">{user.username}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Email</dt>
              <dd class="mt-1 text-sm text-slate-900">{user.email || 'Not provided'}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">System Role</dt>
              <dd class="mt-1">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                  {user.system_role === 'superadmin' ? 'bg-red-100 text-red-700' :
                   user.system_role === 'system_admin' ? 'bg-orange-100 text-orange-700' :
                   'bg-slate-100 text-slate-700'}">
                  {user.system_role}
                </span>
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Account Status</dt>
              <dd class="mt-1">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                  {user.status === 'active' ? 'bg-green-100 text-green-700' :
                   user.status === 'suspended' ? 'bg-red-100 text-red-700' :
                   'bg-slate-100 text-slate-700'}">
                  {user.status}
                </span>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
          <CardDescription>Organization and account settings</CardDescription>
        </CardHeader>
        <CardContent>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm font-medium text-slate-600">Current Organization</dt>
              <dd class="mt-1 text-sm text-slate-900">
                {#if user.current_organization_id}
                  <Link href="/admin/organizations/{user.current_organization_id}" class="text-blue-600 hover:underline">
                    {user.current_organization_id}
                  </Link>
                {:else}
                  <span class="text-slate-500">No organization</span>
                {/if}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Freelancer Status</dt>
              <dd class="mt-1">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                  {user.is_freelancer ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}">
                  {user.is_freelancer ? 'Freelancer' : 'Regular User'}
                </span>
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Created At</dt>
              <dd class="mt-1 text-sm text-slate-900">
                {new Date(user.created_at).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Last Updated</dt>
              <dd class="mt-1 text-sm text-slate-900">
                {new Date(user.updated_at).toLocaleString()}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
        <CardDescription>Manage this user account</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" disabled>Edit User</Button>
          <Button variant="outline" disabled>Change Role</Button>
          {#if user.status === 'active'}
            <Button variant="destructive" disabled>Suspend Account</Button>
          {:else}
            <Button variant="default" disabled>Activate Account</Button>
          {/if}
        </div>
        <p class="text-xs text-slate-500 mt-2">Actions will be implemented in Phase 3</p>
      </CardContent>
    </Card>
  </div>
</AdminLayout>
