<script lang="ts">
  import { Check, X } from 'lucide-svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Select from '@/apps/org/shared/ui/select.svelte'
  import SelectContent from '@/apps/org/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/org/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/org/shared/ui/select_trigger.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import type { AssignmentType } from '@/apps/shared/tasks/task_application_types'

  interface Props {
    appId: string
    assignmentType: AssignmentType
    isRejecting: boolean
    rejectionReason: string
    isProcessing: boolean
    assignmentTypeLabel: (type: AssignmentType) => string
    onAssignmentTypeChange: (value: AssignmentType) => void
    onRejectionReasonChange: (value: string) => void
    onStartReject: () => void
    onCancelReject: () => void
    onApprove: () => void
    onConfirmReject: () => void
  }

  const {
    appId,
    assignmentType,
    isRejecting,
    rejectionReason,
    isProcessing,
    assignmentTypeLabel,
    onAssignmentTypeChange,
    onRejectionReasonChange,
    onStartReject,
    onCancelReject,
    onApprove,
    onConfirmReject,
  }: Props = $props()

  const { t } = useTranslation()
</script>

<div class="ml-auto mb-2 grid max-w-[220px] gap-1 text-left">
  <label class="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground" for={`assignment-type-${appId}`}>
    {t('task.applications.assignment_type.label', {}, 'Assignment type')}
  </label>
  <Select
    value={assignmentType}
    onValueChange={(value: string) => onAssignmentTypeChange(value as AssignmentType)}
  >
    <SelectTrigger id={`assignment-type-${appId}`}>
      <span>{assignmentTypeLabel(assignmentType)}</span>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="member" label={t('task.applications.assignment_type.member', {}, 'Member')}>
        {t('task.applications.assignment_type.member', {}, 'Member')}
      </SelectItem>
      <SelectItem value="external_contributor" label={t('task.applications.assignment_type.external_contributor', {}, 'External contributor')}>
        {t('task.applications.assignment_type.external_contributor', {}, 'External contributor')}
      </SelectItem>
      <SelectItem value="volunteer" label={t('task.applications.assignment_type.volunteer', {}, 'Volunteer')}>
        {t('task.applications.assignment_type.volunteer', {}, 'Volunteer')}
      </SelectItem>
    </SelectContent>
  </Select>
</div>

{#if isRejecting}
  <div class="ml-auto grid max-w-[280px] gap-2 text-left">
    <label class="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground" for={`rejection-reason-${appId}`}>
      {t('task.applications.rejection_reason', {}, 'Rejection reason')}
    </label>
    <textarea
      id={`rejection-reason-${appId}`}
      class="min-h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      value={rejectionReason}
      oninput={(event) => onRejectionReasonChange(event.currentTarget.value)}
      placeholder={t('task.applications.rejection_reason_placeholder', {}, 'Explain the reason so the applicant understands the decision')}
    ></textarea>
    <div class="flex justify-end gap-1">
      <Button
        variant="outline"
        size="sm"
        class="h-7 font-bold"
        onclick={onCancelReject}
        disabled={isProcessing}
      >
        {t('common.cancel', {}, 'Cancel')}
      </Button>
      <Button
        variant="outline"
        size="sm"
        class="h-7 font-bold text-destructive hover:text-destructive"
        onclick={onConfirmReject}
        disabled={isProcessing || !rejectionReason.trim()}
      >
        <X class="mr-1 h-3 w-3" />
        {t('task.applications.confirm_reject', {}, 'Confirm rejection')}
      </Button>
    </div>
  </div>
{:else}
  <div class="flex justify-end gap-1">
    <Button
      size="sm"
      class="h-7 font-bold"
      onclick={onApprove}
      disabled={isProcessing}
    >
      <Check class="mr-1 h-3 w-3" />
      {t('task.applications.approve', {}, 'Approve')}
    </Button>
    <Button
      variant="outline"
      size="sm"
      class="h-7 font-bold text-destructive hover:text-destructive"
      onclick={onStartReject}
      disabled={isProcessing}
    >
      <X class="mr-1 h-3 w-3" />
      {t('task.applications.reject', {}, 'Reject')}
    </Button>
  </div>
{/if}
