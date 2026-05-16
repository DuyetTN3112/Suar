<script lang="ts">
  import { Filter } from 'lucide-svelte'

  import Button from '@/apps/admin/shared/ui/button.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import Input from '@/apps/admin/shared/ui/input.svelte'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Props {
    actionValue: string
    resourceTypeValue: string
    userIdValue: string
    fromValue: string
    toValue: string
    onApply: () => void
    onReset: () => void
  }

  let {
    actionValue = $bindable(),
    resourceTypeValue = $bindable(),
    userIdValue = $bindable(),
    fromValue = $bindable(),
    toValue = $bindable(),
    onApply,
    onReset,
  }: Props = $props()
  const { t } = useTranslation()
</script>

<Card class="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitle class="flex items-center gap-2 text-base">
      <Filter class="h-4 w-4 text-muted-foreground" />
      {t('task.admin_audit_logs.server_filters', {}, 'Server filters')}
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-3">
    <select class="h-10 rounded-md border border-input bg-background px-3 text-sm" bind:value={actionValue}>
      <option value="">{t('task.admin_audit_logs.all_actions', {}, 'All actions')}</option>
      <option value="create">create</option>
      <option value="update">update</option>
      <option value="delete">delete</option>
      <option value="login">login</option>
      <option value="resolve">resolve</option>
    </select>
    <Input bind:value={resourceTypeValue} placeholder="resource_type" />
    <Input bind:value={userIdValue} placeholder="user_id" />
    <div class="grid grid-cols-2 gap-3">
      <Input bind:value={fromValue} type="date" />
      <Input bind:value={toValue} type="date" />
    </div>
    <div class="flex gap-2">
      <Button class="flex-1" onclick={onApply}>{t('task.admin_audit_logs.filter', {}, 'Filter')}</Button>
      <Button variant="outline" class="flex-1" onclick={onReset}>{t('task.admin_audit_logs.reset', {}, 'Reset')}</Button>
    </div>
  </CardContent>
</Card>
