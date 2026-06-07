<script lang="ts">
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Textarea from '@/apps/org/shared/ui/textarea.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Props {
    formData: {
      title: string
      description: string
    }
    handleChange: (e: Event) => void
    errors: Record<string, string>
  }

  const { formData, handleChange, errors }: Props = $props()
  const { t } = useTranslation()

  let contextDescription = $state('')
  let concreteRequirements = $state('')
  let expectedOutcome = $state('')
  let extraNotes = $state('')

  function buildDescriptionFromSections() {
    const sections: string[] = []

    if (contextDescription.trim()) {
      sections.push(`## ${t('task.create.description_context_heading', {}, 'Context description')}\n${contextDescription.trim()}`)
    }

    if (concreteRequirements.trim()) {
      sections.push(`## ${t('task.create.concrete_requirements', {}, 'Concrete requirements')}\n${concreteRequirements.trim()}`)
    }

    if (expectedOutcome.trim()) {
      sections.push(`## ${t('task.create.expected_outcome', {}, 'Expected outcome')}\n${expectedOutcome.trim()}`)
    }

    if (extraNotes.trim()) {
      sections.push(`## ${t('task.create.extra_notes', {}, 'Extra notes')}\n${extraNotes.trim()}`)
    }

    return sections.join('\n\n')
  }

  function syncDescriptionFromSections() {
    const nextValue = buildDescriptionFromSections()

    handleChange({
      target: {
        name: 'description',
        value: nextValue,
      },
    } as unknown as Event)
  }

  function clearSectionInputs() {
    contextDescription = ''
    concreteRequirements = ''
    expectedOutcome = ''
    extraNotes = ''

    handleChange({
      target: {
        name: 'description',
        value: '',
      },
    } as unknown as Event)
  }

  function handleSectionInput(
    setter: (value: string) => void
  ) {
    return (event: Event) => {
      const target = event.currentTarget as HTMLTextAreaElement | null

      if (!target) return

      setter(target.value)
    }
  }

  const handleContextDescriptionInput = handleSectionInput((value) => {
    contextDescription = value
  })

  const handleConcreteRequirementsInput = handleSectionInput((value) => {
    concreteRequirements = value
  })

  const handleExpectedOutcomeInput = handleSectionInput((value) => {
    expectedOutcome = value
  })

  const handleExtraNotesInput = handleSectionInput((value) => {
    extraNotes = value
  })
</script>

<div class="grid gap-2">
  <Label for="title">
    {t('task.title', {}, 'Title')}<span class="ml-1 text-destructive">*</span>
  </Label>
  <Input
    id="title"
    name="title"
    value={formData.title}
    oninput={handleChange}
    placeholder={t('task.enter_title', {}, 'Enter task title')}
    class={errors.title ? 'border-destructive' : ''}
    autofocus
  />
  {#if errors.title}
    <p class="text-xs text-destructive">{errors.title}</p>
  {/if}
</div>

<div class="grid gap-2">
  <Label for="description">{t('task.description', {}, 'Description')}</Label>
  <div class="rounded-md border p-3 space-y-3 bg-muted/20">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded border px-2 py-1 text-xs hover:bg-muted"
          onclick={syncDescriptionFromSections}
        >
          {t('task.create.merge_description', {}, 'Merge into description')}
        </button>
        <button
          type="button"
          class="rounded border px-2 py-1 text-xs hover:bg-muted"
          onclick={clearSectionInputs}
        >
          {t('task.create.clear_suggestion_content', {}, 'Clear suggestion content')}
        </button>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <div class="space-y-1">
        <Label for="desc_context" class="text-xs">{t('task.create.context_description', {}, 'Context description')}</Label>
        <Textarea id="desc_context" value={contextDescription} rows={3} oninput={handleContextDescriptionInput} placeholder={t('task.create.context_description_placeholder', {}, 'Current problem, reason this task is needed...')} class="text-sm" />
      </div>

      <div class="space-y-1">
        <Label for="desc_requirements" class="text-xs">{t('task.create.concrete_requirements', {}, 'Concrete requirements')}</Label>
        <Textarea id="desc_requirements" value={concreteRequirements} rows={3} oninput={handleConcreteRequirementsInput} placeholder={t('task.create.concrete_requirements_placeholder', {}, 'Requirement checklist, technical constraints, scope...')} class="text-sm" />
      </div>

      <div class="space-y-1">
        <Label for="desc_outcome" class="text-xs">{t('task.create.expected_outcome', {}, 'Expected outcome')}</Label>
        <Textarea id="desc_outcome" value={expectedOutcome} rows={3} oninput={handleExpectedOutcomeInput} placeholder={t('task.create.expected_outcome_placeholder', {}, 'Definition of done, acceptance criteria, expected output...')} class="text-sm" />
      </div>

      <div class="space-y-1">
        <Label for="desc_notes" class="text-xs">{t('task.create.extra_notes', {}, 'Extra notes')}</Label>
        <Textarea id="desc_notes" value={extraNotes} rows={3} oninput={handleExtraNotesInput} placeholder={t('task.create.extra_notes_placeholder', {}, 'Related docs, implementation notes, dependencies...')} class="text-sm" />
      </div>
    </div>
  </div>

  <Textarea
    id="description"
    name="description"
    value={formData.description}
    oninput={handleChange}
    placeholder={t('task.create.description_placeholder', {}, 'Task description')}
    rows={10}
    class="min-h-[220px] resize-y"
  />
</div>
