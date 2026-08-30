<script lang="ts">
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Textarea from '@/apps/org/shared/ui/textarea.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Props {
    formData: {
      title: string
      description: string
      context_background: string
    }
    handleChange: (event: Event) => void
    errors: Record<string, string>
    isPublish?: boolean
    isDocumentationItem?: boolean
  }

  const { formData, handleChange, errors, isPublish = true, isDocumentationItem = false }: Props = $props()
  const { t } = useTranslation()
  const descriptionError = $derived(errors.description)
  const contextError = $derived(errors.context_background)
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
  <Label for="description">
    {isDocumentationItem
      ? t('task.create.docs_content', {}, 'Nội dung hoặc đường dẫn tài liệu')
      : t('task.description', {}, 'Description')}<span class="ml-1 text-[#ef4444]">*</span>
  </Label>
  <p class="text-xs leading-5 text-muted-foreground">
    {isDocumentationItem
      ? t('task.create.docs_content_help', {}, 'Ghi nội dung cần lưu hoặc dán đường dẫn tới tài liệu. Mục này sẽ ở lại cột Docs.')
      : t('task.create.description_help', {}, 'Describe the work to be done. Expected outputs and acceptance checks are defined in the next tab.')}
  </p>
  <Textarea
    id="description"
    name="description"
    value={formData.description}
    oninput={handleChange}
    placeholder={isDocumentationItem
      ? t('task.create.docs_content_placeholder', {}, 'Nội dung, đường dẫn, hoặc ghi chú cần giữ lại cho dự án')
      : t('task.enter_description', {}, 'Describe the task clearly')}
    rows={6}
    maxlength={5000}
    required={isPublish || isDocumentationItem}
    aria-invalid={descriptionError ? 'true' : undefined}
    aria-describedby={descriptionError ? 'description-error' : undefined}
    class={`min-h-[150px] resize-y ${descriptionError ? 'border-destructive' : ''}`}
  />
  {#if descriptionError}
    <p id="description-error" class="text-xs font-medium text-destructive" role="alert">{descriptionError}</p>
  {/if}
</div>

{#if !isDocumentationItem}
<div class="grid gap-2 border-t border-border/70 pt-4">
  <Label for="context_background">
    {t('task.edit.context_background', {}, 'Business context')}<span class="ml-1 text-[#ef4444]">*</span>
  </Label>
  <p class="text-xs leading-5 text-muted-foreground">
    {t('task.create.context_background_help', {}, 'Explain why this task matters, who it affects, and any background the assignee needs before starting.')}
  </p>
  <Textarea
    id="context_background"
    name="context_background"
    value={formData.context_background}
    oninput={handleChange}
    placeholder={t('task.edit.context_background_placeholder', {}, 'Why this task exists and what context matters')}
    rows={5}
    maxlength={5000}
    required={isPublish}
    aria-invalid={contextError ? 'true' : undefined}
    aria-describedby={contextError ? 'context-background-error' : undefined}
    class={`min-h-[130px] resize-y ${contextError ? 'border-destructive' : ''}`}
  />
  {#if contextError}
    <p id="context-background-error" class="text-xs font-medium text-destructive" role="alert">{contextError}</p>
  {/if}
</div>
{/if}
