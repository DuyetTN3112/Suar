<script lang="ts">
  import AdminLayout from '@/layouts/admin_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import { Link } from '@inertiajs/svelte'

  interface Props {
    organization?: any
  }

  let { organization = $bindable() }: Props = $props()
</script>

<AdminLayout title="Organization Details - System Admin">
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">Organization Details</h1>
        <p class="text-slate-600 mt-1">View and manage organization information</p>
      </div>
      <Link href="/admin/organizations">
        <Button variant="outline">Back to Organizations</Button>
      </Link>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Organization Information</CardTitle>
        <CardDescription>Detailed view of organization (Phase 3 - In Development)</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex items-center justify-center py-12">
          <div class="text-center max-w-md">
            <svg
              class="mx-auto h-16 w-16 text-slate-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 class="text-lg font-semibold text-slate-900 mb-2">Organization Details Page</h3>
            <p class="text-slate-600 mb-6">
              This feature is currently under development as part of Phase 3 implementation.
              You will be able to view detailed organization information, members, projects, and subscription plans here.
            </p>
            <div class="flex items-center justify-center gap-3">
              <Link href="/admin/organizations">
                <Button variant="default">Back to Organizations List</Button>
              </Link>
              <Link href="/admin">
                <Button variant="outline">Go to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</AdminLayout>
