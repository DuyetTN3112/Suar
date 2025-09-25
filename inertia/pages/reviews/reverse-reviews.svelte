<script lang="ts">
  import { page } from '@inertiajs/svelte'

import AppLayout from '@/layouts/app_layout.svelte'
import OrganizationLayout from '@/layouts/organization_layout.svelte'

  import ReverseReviewList, { type ReverseReviewListItem } from './components/reverse_review_list.svelte'

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    reviews: ReverseReviewListItem[]
    stats: {
      total: number
      anonymous: number
      by_target_type: Record<string, number>
    }
  }

  const { reviews, stats }: Props = $props()
  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)
</script>

<svelte:head>
  <title>Reverse Reviews</title>
</svelte:head>

<Layout title="Reverse Reviews">
  <ReverseReviewList
    title="Reverse reviews"
    description="Personal log of reverse reviews you submitted after review sessions."
    {reviews}
    {stats}
    scope="me"
  />
</Layout>
