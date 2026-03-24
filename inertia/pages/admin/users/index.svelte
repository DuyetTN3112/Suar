<script lang="ts">
  import AdminLayout from '@/layouts/admin_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
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
    created_at: string
  }

  interface Props {
    users: User[]
    meta: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
    }
    filters: {
      search?: string
      systemRole?: string
      status?: string
    }
  }

  let { users, meta, filters }: Props = $props()
</script>

<AdminLayout title="All Users - System Admin">
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">Users</h1>
        <p class="text-slate-600 mt-1">Manage all users in the system</p>
      </div>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>All Users ({meta.total.toLocaleString()})</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="border-b">
              <tr class="text-left text-sm text-slate-600">
                <th class="pb-3 font-medium">Username</th>
                <th class="pb-3 font-medium">Email</th>
                <th class="pb-3 font-medium">System Role</th>
                <th class="pb-3 font-medium">Status</th>
                <th class="pb-3 font-medium">Joined</th>
                <th class="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              {#each users as user}
                <tr class="text-sm">
                  <td class="py-3 font-medium">{user.username}</td>
                  <td class="py-3 text-slate-600">{user.email || '-'}</td>
                  <td class="py-3">
                    <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                      {user.system_role === 'superadmin' ? 'bg-red-100 text-red-700' :
                       user.system_role === 'system_admin' ? 'bg-orange-100 text-orange-700' :
                       'bg-slate-100 text-slate-700'}">
                      {user.system_role}
                    </span>
                  </td>
                  <td class="py-3">
                    <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                      {user.status === 'active' ? 'bg-green-100 text-green-700' :
                       user.status === 'suspended' ? 'bg-red-100 text-red-700' :
                       'bg-slate-100 text-slate-700'}">
                      {user.status}
                    </span>
                  </td>
                  <td class="py-3 text-slate-600">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td class="py-3">
                    <Link href="/admin/users/{user.id}">
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        {#if meta.lastPage > 1}
          <div class="mt-4 flex items-center justify-between">
            <p class="text-sm text-slate-600">
              Page {meta.currentPage} of {meta.lastPage}
            </p>
            <div class="flex gap-2">
              {#if meta.currentPage > 1}
                <Link href="/admin/users?page={meta.currentPage - 1}">
                  <Button variant="outline" size="sm">Previous</Button>
                </Link>
              {/if}
              {#if meta.currentPage < meta.lastPage}
                <Link href="/admin/users?page={meta.currentPage + 1}">
                  <Button variant="outline" size="sm">Next</Button>
                </Link>
              {/if}
            </div>
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
</AdminLayout>
