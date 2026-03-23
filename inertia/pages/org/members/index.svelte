<script lang="ts">
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
  import { Button } from '@/components/ui/button'
  import { Link } from '@inertiajs/svelte'

  interface Member {
    user_id: string
    username: string
    email: string | null
    org_role: string
    status: string
    created_at: string
  }

  interface Props {
    members: Member[]
    meta: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
    }
    filters: {
      search?: string
      orgRole?: string
      status?: string
    }
  }

  let { members, meta, filters }: Props = $props()
</script>

<OrganizationLayout title="Team Members">
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">Team Members</h1>
        <p class="text-slate-600 mt-1">Manage your organization members</p>
      </div>
      <Link href="/org/invitations/new">
        <Button>Invite Member</Button>
      </Link>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>All Members ({meta.total.toLocaleString()})</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="border-b">
              <tr class="text-left text-sm text-slate-600">
                <th class="pb-3 font-medium">Member</th>
                <th class="pb-3 font-medium">Email</th>
                <th class="pb-3 font-medium">Role</th>
                <th class="pb-3 font-medium">Status</th>
                <th class="pb-3 font-medium">Joined</th>
                <th class="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              {#each members as member}
                <tr class="text-sm">
                  <td class="py-3 font-medium">{member.username}</td>
                  <td class="py-3 text-slate-600">{member.email || '-'}</td>
                  <td class="py-3">
                    <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                      {member.org_role === 'org_owner' ? 'bg-purple-100 text-purple-700' :
                       member.org_role === 'org_admin' ? 'bg-blue-100 text-blue-700' :
                       'bg-slate-100 text-slate-700'}">
                      {member.org_role.replace('org_', '')}
                    </span>
                  </td>
                  <td class="py-3">
                    <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                      {member.status === 'approved' ? 'bg-green-100 text-green-700' :
                       member.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                       'bg-red-100 text-red-700'}">
                      {member.status}
                    </span>
                  </td>
                  <td class="py-3 text-slate-600">{new Date(member.created_at).toLocaleDateString()}</td>
                  <td class="py-3">
                    <Button variant="ghost" size="sm">Manage</Button>
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
                <Link href="/org/members?page={meta.currentPage - 1}">
                  <Button variant="outline" size="sm">Previous</Button>
                </Link>
              {/if}
              {#if meta.currentPage < meta.lastPage}
                <Link href="/org/members?page={meta.currentPage + 1}">
                  <Button variant="outline" size="sm">Next</Button>
                </Link>
              {/if}
            </div>
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
</OrganizationLayout>
