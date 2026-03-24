<script lang="ts">
  import AdminLayout from '@/layouts/admin_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import { Link } from '@inertiajs/svelte'

  interface Organization {
    id: string
    name: string
    slug: string
    description: string | null
    plan: string | null
    partner_type: string | null
    created_at: string
    updated_at: string
    owner: {
      id: string
      username: string
      email: string | null
    }
    stats: {
      usersCount: number
      projectsCount: number
    }
  }

  interface Props {
    organization: Organization
  }

  let { organization }: Props = $props()
</script>

<AdminLayout title="Organization Details - System Admin">
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">{organization.name}</h1>
        <p class="text-slate-600 mt-1">Organization details and settings</p>
      </div>
      <Link href="/admin/organizations">
        <Button variant="outline">Back to Organizations</Button>
      </Link>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Organization Information</CardTitle>
          <CardDescription>Basic organization details</CardDescription>
        </CardHeader>
        <CardContent>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm font-medium text-slate-600">Organization ID</dt>
              <dd class="mt-1 text-sm text-slate-900 font-mono">{organization.id}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Name</dt>
              <dd class="mt-1 text-sm text-slate-900">{organization.name}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Slug</dt>
              <dd class="mt-1 text-sm text-slate-900 font-mono">{organization.slug}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Description</dt>
              <dd class="mt-1 text-sm text-slate-900">{organization.description || 'No description'}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Plan</dt>
              <dd class="mt-1">
                <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                  {organization.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                   organization.plan === 'professional' ? 'bg-blue-100 text-blue-700' :
                   organization.plan === 'starter' ? 'bg-green-100 text-green-700' :
                   'bg-slate-100 text-slate-700'}">
                  {organization.plan || 'free'}
                </span>
              </dd>
            </div>
            {#if organization.partner_type}
              <div>
                <dt class="text-sm font-medium text-slate-600">Partner Type</dt>
                <dd class="mt-1">
                  <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700">
                    {organization.partner_type}
                  </span>
                </dd>
              </div>
            {/if}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Owner & Statistics</CardTitle>
          <CardDescription>Organization owner and usage stats</CardDescription>
        </CardHeader>
        <CardContent>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm font-medium text-slate-600">Owner</dt>
              <dd class="mt-1">
                <Link href="/admin/users/{organization.owner.id}" class="text-blue-600 hover:underline">
                  {organization.owner.username}
                </Link>
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Owner Email</dt>
              <dd class="mt-1 text-sm text-slate-900">{organization.owner.email || 'Not provided'}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Members</dt>
              <dd class="mt-1 text-sm text-slate-900">{organization.stats.usersCount} member(s)</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Projects</dt>
              <dd class="mt-1 text-sm text-slate-900">{organization.stats.projectsCount} project(s)</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Created At</dt>
              <dd class="mt-1 text-sm text-slate-900">
                {new Date(organization.created_at).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-slate-600">Last Updated</dt>
              <dd class="mt-1 text-sm text-slate-900">
                {new Date(organization.updated_at).toLocaleString()}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
        <CardDescription>Manage this organization</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" disabled>Edit Organization</Button>
          <Button variant="outline" disabled>Change Plan</Button>
          <Button variant="outline" disabled>View Members</Button>
          <Button variant="destructive" disabled>Suspend Organization</Button>
        </div>
        <p class="text-xs text-slate-500 mt-2">Actions will be implemented in Phase 3</p>
      </CardContent>
    </Card>
  </div>
</AdminLayout>
