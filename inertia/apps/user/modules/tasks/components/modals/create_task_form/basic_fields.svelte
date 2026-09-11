<script lang="ts">
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import Select from '@/apps/user/shared/ui/select.svelte'
  import SelectContent from '@/apps/user/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/user/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/user/shared/ui/select_trigger.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface Props {
    formData: {
      title: string
      description: string
    context_background: string
    task_status_id: string
    }
    handleChange: (event: Event) => void
    handleSelectChange: (name: string, value: string) => void
    statuses: { value: string; label: string; slug?: string; category?: string }[]
    errors: Record<string, string>
    isPublish?: boolean
    isDocumentationItem?: boolean
  }

  const {
    formData,
    handleChange,
    handleSelectChange,
    statuses,
    errors,
    isPublish: _isPublish = true,
    isDocumentationItem = false,
  }: Props = $props()
  const { t } = useTranslation()
  const descriptionError = $derived(errors.description)
</script>

<div class="grid gap-2">
  <Label for="title">
    {t('task.title', {}, 'Title')}<span class="ml-1 text-[#ef4444]">*</span>
  </Label>
  <Input
    id="title"
    name="title"
    value={formData.title}
    oninput={handleChange}
    placeholder={t('task.enter_title', {}, 'Enter task title')}
    class={errors.title ? 'border-destructive' : ''}
    required
    minlength="3"
    maxlength="255"
    aria-invalid={errors.title ? 'true' : undefined}
    aria-describedby={errors.title ? 'title-error' : undefined}
    autofocus
  />
  {#if errors.title}
    <p id="title-error" class="text-xs font-medium text-destructive" role="alert">{errors.title}</p>
  {/if}
</div>

<div class="grid gap-2">
  <Label for="task_status_id">
    {t('task.status', {}, 'Trạng thái')}<span class="ml-1 text-[#ef4444]" aria-hidden="true">*</span>
  </Label>
  <Select
    value={formData.task_status_id}
    onValueChange={(value: string) => handleSelectChange('task_status_id', value)}
  >
    <SelectTrigger id="task_status_id" aria-required="true" aria-invalid={errors.task_status_id ? 'true' : undefined}>
      <span>{statuses.find((status) => status.value === formData.task_status_id)?.label ?? t('task.select_status', {}, 'Chọn trạng thái')}</span>
    </SelectTrigger>
    <SelectContent>
      {#each statuses as status (status.value)}
        <SelectItem value={status.value} label={status.label}>{status.label}</SelectItem>
      {/each}
    </SelectContent>
  </Select>
  {#if errors.task_status_id}
    <p class="text-xs font-medium text-destructive" role="alert">{errors.task_status_id}</p>
  {/if}
</div>

{#if isDocumentationItem}
<div class="grid gap-2">
  <Label for="description">
    {t('task.create.docs_content', {}, 'Nội dung hoặc đường dẫn tài liệu')}<span class="ml-1 text-[#ef4444]" aria-hidden="true">*</span>
  </Label>
  <Textarea
    id="description"
    name="description"
    value={formData.description}
    oninput={handleChange}
    placeholder={t('task.create.docs_content_placeholder', {}, 'Nội dung, đường dẫn, hoặc ghi chú cần giữ lại cho dự án')}
    rows={5}
    maxlength={5000}
    required
    aria-invalid={descriptionError ? 'true' : undefined}
    aria-describedby={descriptionError ? 'description-error' : undefined}
    class={`min-h-[120px] resize-y ${descriptionError ? 'border-destructive' : ''}`}
  />
  {#if descriptionError}<p id="description-error" class="text-xs font-medium text-destructive" role="alert">{descriptionError}</p>{/if}
</div>
{/if}
