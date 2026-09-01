<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags -- sanitizedRichContent is allow-listed before rendering */
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte';
  import Button from '@/apps/user/shared/ui/button.svelte';
  import Input from '@/apps/user/shared/ui/input.svelte';
  import Textarea from '@/apps/user/shared/ui/textarea.svelte';
  import type { TvaJsonValue } from '#modules/tasks/public_contracts/task-authoring/primitives';
  import { sanitizeRichContent } from './sanitize_rich_content';

  interface Props {
    /** The current context data being edited/viewed */
    data: {
      title: string;
      summary: string;
      richContent: TvaJsonValue;
    };
    /** Whether the component is in edit or view mode */
    mode: 'view' | 'edit';
    /** Callback when user wants to save changes */
    onSave: (data: Props['data']) => void;
    /** Callback when user wants to cancel editing */
    onCancel: () => void;
  }

  type EditableData = Omit<Props['data'], 'richContent'> & {
    richContent: string;
  };

  function toEditableData(data: Props['data']): EditableData {
    return {
      title: data.title,
      summary: data.summary,
      richContent:
        typeof data.richContent === 'string'
          ? data.richContent
          : JSON.stringify(data.richContent),
    };
  }

  let {
    data,
    mode,
    onSave,
    onCancel,
  }: Props = $props();

  const { t } = $derived(useTranslation());
  const sanitizedRichContent = $derived(sanitizeRichContent(data.richContent));

  // Local state for editing
  let editedData = $state<EditableData>({
    title: '',
    summary: '',
    richContent: '',
  });

  $effect(() => {
    editedData = toEditableData(data);
  });

  // Handle saving
  function handleSaveClick() {
    onSave(editedData);
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    handleSaveClick();
  }

  // Handle canceling
  function handleCancelClick() {
    onCancel();
  }
</script>

{#if mode === 'view'}
  <div>
    <h2 class="text-xl font-semibold">{data.title}</h2>
    {#if data.summary}
      <p class="text-muted-foreground">{data.summary}</p>
    {/if}
    <!-- eslint-disable svelte/no-at-html-tags -- content is allow-listed by sanitizeRichContent -->
    {#if sanitizedRichContent}
      <div class="prose prose-sm max-w-none mt-4">{@html sanitizedRichContent}</div>
    {/if}
    <!-- eslint-enable svelte/no-at-html-tags -->
  </div>
{:else}
  <form class="space-y-6" onsubmit={handleSubmit}>
    <!-- Title -->
    <div class="space-y-2">
      <label for="title-input" class="text-sm font-medium text-foreground">
        {t('project.context_editor.title_label', {}, 'Title')}
        <span class="text-destructive">*</span>
      </label>
      <Input
        id="title-input"
        bind:value={editedData.title}
        placeholder={t('project.context_editor.title_placeholder', {}, 'Enter context title')}
      />
      {#if !editedData.title.trim()}
        <p class="text-sm text-destructive">
          {t('project.context_editor.title_required', {}, 'Title is required')}
        </p>
      {/if}
    </div>

    <!-- Summary -->
    <div class="space-y-2">
      <label for="summary-input" class="text-sm font-medium text-foreground">
        {t('project.context_editor.summary_label', {}, 'Summary')}
        <span class="text-destructive">*</span>
      </label>
      <Textarea
        id="summary-input"
        bind:value={editedData.summary}
        rows={3}
        placeholder={t('project.context_editor.summary_placeholder', {}, 'Brief description of the context')}
      />
      {#if !editedData.summary.trim()}
        <p class="text-sm text-destructive">
          {t('project.context_editor.summary_required', {}, 'Summary is required')}
        </p>
      {/if}
    </div>

    <!-- Rich Content -->
    <div class="space-y-2">
      <label for="rich-content-input" class="text-sm font-medium text-foreground">
        {t('project.context_editor.rich_content_label', {}, 'Rich Content')}
        <span class="text-destructive">*</span>
      </label>
      <Textarea
        id="rich-content-input"
        bind:value={editedData.richContent}
        rows={10}
        class="font-mono"
        placeholder={t('project.context_editor.rich_content_placeholder', {}, 'Enter detailed context (supports basic HTML)')}
      />
    </div>

    <div class="flex gap-2 mt-4">
      <Button variant="outline" type="button" onclick={handleCancelClick}>
        {t('project.context_editor.cancel', {}, 'Cancel')}
      </Button>
      <Button type="submit" disabled={!editedData.title.trim() || !editedData.summary.trim()}>
        {t('project.context_editor.save', {}, 'Save')}
      </Button>
    </div>
  </form>
{/if}
