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
    reviews?: any[]
  }

  let { reviews = $bindable([]) }: Props = $props()
</script>

<AdminLayout title="Flagged Reviews - System Admin">
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">Flagged Reviews</h1>
        <p class="text-slate-600 mt-1">Manage flagged and reported reviews</p>
      </div>
      <Link href="/admin">
        <Button variant="outline">Back to Dashboard</Button>
      </Link>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Review Moderation</CardTitle>
        <CardDescription>Handle reported and flagged reviews (Phase 3 - In Development)</CardDescription>
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
                d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
              />
            </svg>
            <h3 class="text-lg font-semibold text-slate-900 mb-2">Flagged Reviews Management</h3>
            <p class="text-slate-600 mb-6">
              This feature is currently under development as part of Phase 3 implementation.
              You will be able to review flagged content, take moderation actions, and manage user reports here.
            </p>
            <div class="flex items-center justify-center gap-3">
              <Link href="/admin">
                <Button variant="default">Back to Dashboard</Button>
              </Link>
              <Link href="/admin/users">
                <Button variant="outline">Manage Users</Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</AdminLayout>
