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
    user?: any
  }

  let { user = $bindable() }: Props = $props()
</script>

<AdminLayout title="User Details - System Admin">
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">User Details</h1>
        <p class="text-slate-600 mt-1">View and manage user information</p>
      </div>
      <Link href="/admin/users">
        <Button variant="outline">Back to Users</Button>
      </Link>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>User Information</CardTitle>
        <CardDescription>Detailed view of user account (Phase 3 - In Development)</CardDescription>
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <h3 class="text-lg font-semibold text-slate-900 mb-2">User Details Page</h3>
            <p class="text-slate-600 mb-6">
              This feature is currently under development as part of Phase 3 implementation.
              You will be able to view detailed user information, update roles, and manage user status here.
            </p>
            <div class="flex items-center justify-center gap-3">
              <Link href="/admin/users">
                <Button variant="default">Back to Users List</Button>
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
