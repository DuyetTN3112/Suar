<script lang="ts">
  import Badge from '@/components/ui/badge.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'

  interface BuiltInPermission {
    label: string
  }

  interface BuiltInRole {
    label: string
    memberCount: number
    description: string
    permissionCount: number
    permissions: BuiltInPermission[]
  }

  interface Props {
    builtInRoles: BuiltInRole[]
  }

  const { builtInRoles }: Props = $props()
</script>

<Card>
  <CardHeader>
    <CardTitle>Vai trò hệ thống sẵn có</CardTitle>
    <CardDescription>Built-in role là read-only, dùng để làm baseline trước khi tạo role riêng.</CardDescription>
  </CardHeader>
  <CardContent class="space-y-3">
    {#each builtInRoles as role}
      <div class="rounded-xl border border-border p-4">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div class="flex items-center gap-2">
              <p class="font-bold">{role.label}</p>
              <Badge variant="secondary">{role.memberCount} member</Badge>
            </div>
            <p class="mt-1 text-sm text-muted-foreground">{role.description}</p>
          </div>
          <Badge variant="outline">{role.permissionCount} quyền</Badge>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          {#each role.permissions as permission}
            <Badge variant="outline">{permission.label}</Badge>
          {/each}
        </div>
      </div>
    {/each}
  </CardContent>
</Card>
