<script lang="ts">
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'

  interface Props {
    organization: {
      name: string
      slug: string
    }
    summary: {
      approvedMembers: number
      builtInRoleCount: number
      pendingInvitations: number
    }
    customRoleCount: number
  }

  const { organization, summary, customRoleCount }: Props = $props()
</script>

<div class="grid gap-4 md:grid-cols-4">
  <Card>
    <CardHeader class="pb-2">
      <CardTitle class="text-sm font-medium">Organization</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="text-xl font-bold">{organization.name}</div>
      <p class="mt-1 text-xs text-muted-foreground">{organization.slug}</p>
    </CardContent>
  </Card>
  <Card>
    <CardHeader class="pb-2">
      <CardTitle class="text-sm font-medium">Thành viên duyệt</CardTitle>
    </CardHeader>
    <CardContent><div class="text-3xl font-bold">{summary.approvedMembers}</div></CardContent>
  </Card>
  <Card>
    <CardHeader class="pb-2">
      <CardTitle class="text-sm font-medium">Built-in roles</CardTitle>
    </CardHeader>
    <CardContent><div class="text-3xl font-bold">{summary.builtInRoleCount}</div></CardContent>
  </Card>
  <Card>
    <CardHeader class="pb-2">
      <CardTitle class="text-sm font-medium">Custom roles</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="text-3xl font-bold">{customRoleCount}</div>
      <p class="mt-1 text-xs text-muted-foreground">{summary.pendingInvitations} lời mời đang chờ</p>
    </CardContent>
  </Card>
</div>
