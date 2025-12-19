<script lang="ts">
  import axios from 'axios'
  import { LoaderCircle } from 'lucide-svelte'
  import Dialog from '@/apps/user/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/user/shared/ui/dialog_content.svelte'
  import DialogHeader from '@/apps/user/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/user/shared/ui/dialog_title.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import { uiToast } from '@/apps/user/shared/lib/ui_toast'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface ProjectRole {
    id: string
    code: string
    name: string
    isActive: boolean
  }

  interface Props {
    open: boolean
    projectRoles: ProjectRole[]
    taskId: string
    onPrefillSuccess: () => void
  }

  let {
    open = $bindable(),
    projectRoles,
    taskId,
    onPrefillSuccess,
  }: Props = $props()

  let selectedRoleId = $state('')
  let prefilling = $state(false)
  const { t } = useTranslation()

  async function handlePrefillFromRole(e: Event) {
    e.preventDefault()
    if (!selectedRoleId) return
    prefilling = true
    try {
      const res = await axios.post<{ data: { addedCount: number; skippedCount: number } }>(
        `/api/v1/tasks/${taskId}/requirements/role-prefill`,
        { projectProfessionalRoleId: selectedRoleId }
      )
      const { addedCount, skippedCount } = res.data.data
      const skippedSuffix = skippedCount > 0
        ? t('task.skill_requirements.prefill_skipped_suffix', { count: skippedCount }, ', :count skipped')
        : ''
      uiToast.success(t('task.skill_requirements.prefill_success', { addedCount, skippedSuffix }, 'Role applied: +:addedCount skills:skippedSuffix'))
      open = false
      selectedRoleId = ''
      onPrefillSuccess()
    } catch {
      uiToast.error(t('task.create.role_prefill_failed', {}, 'Unable to prefill skills from role'))
    } finally {
      prefilling = false
    }
  }
</script>

{#if open}
  <Dialog bind:open={open}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('task.role_prefill.apply_by_role', {}, 'Apply by role')}</DialogTitle>
      </DialogHeader>
      <form onsubmit={handlePrefillFromRole} class="space-y-4 pt-2">
        <div class="space-y-1.5">
          <Label for="prefill-role">{t('task.role_prefill.select_role', {}, 'Select role')}</Label>
          <select
            id="prefill-role"
            bind:value={selectedRoleId}
            class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            required
          >
            <option value="" disabled>{t('task.role_prefill.select_role', {}, 'Select role')}</option>
            {#each projectRoles.filter((r) => r.isActive) as role (role.id)}
              <option value={role.id}>{role.name} ({role.code})</option>
            {/each}
          </select>
        </div>
        <div class="flex justify-end gap-2">
          <Button type="button" variant="outline" onclick={() => { open = false }}>{t('common.cancel', {}, 'Cancel')}</Button>
          <Button type="submit" disabled={!selectedRoleId || prefilling}>
            {#if prefilling}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
            {t('task.skill_requirements.apply_role', {}, 'Apply role')}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
{/if}
