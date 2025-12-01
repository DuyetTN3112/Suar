<script lang="ts">
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Textarea from '@/apps/org/shared/ui/textarea.svelte'
  import {
    parseTaskVerificationMethod,
    serializeTaskVerificationMethod,
    TASK_VERIFICATION_METHOD_OPTIONS,
  } from '@/apps/org/modules/tasks/lib/rules/task_verification_methods'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Props {
    value: string
    error?: string
    label?: string
    customLabel?: string
    onChange: (value: string) => void
  }

  const {
    value,
    error,
    label,
    customLabel,
    onChange,
  }: Props = $props()
  const { t } = useTranslation()
  const resolvedLabel = $derived(label ?? t('task.verification_methods.label', {}, 'Verification methods'))
  const resolvedCustomLabel = $derived(customLabel ?? t('task.verification_methods.custom_label', {}, 'Other verification methods'))

  let selectedValues = $state<string[]>([])
  let customText = $state('')

  $effect(() => {
    const parsed = parseTaskVerificationMethod(value)
    selectedValues = parsed.selectedValues
    customText = parsed.customValues.join('\n')
  })

  function emitVerificationMethodChange(nextSelectedValues: string[], nextCustomText: string) {
    onChange(
      serializeTaskVerificationMethod({
        selectedValues: nextSelectedValues,
        customValues: nextCustomText
          .split('\n')
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      })
    )
  }

  function handleToggle(methodValue: string, checked: boolean) {
    const nextSelectedValues = checked
      ? [...selectedValues, methodValue]
      : selectedValues.filter((selectedValue) => selectedValue !== methodValue)

    selectedValues = nextSelectedValues
    emitVerificationMethodChange(nextSelectedValues, customText)
  }

  function handleCustomInput(event: Event) {
    const nextCustomText = (event.currentTarget as HTMLTextAreaElement | null)?.value ?? ''
    customText = nextCustomText
    emitVerificationMethodChange(selectedValues, nextCustomText)
  }
</script>

<div class="grid gap-3">
  <div class="grid gap-2">
    <Label>{resolvedLabel}</Label>
    <div class="grid gap-2 rounded-xl border border-border bg-muted/20 p-3 md:grid-cols-2">
      {#each TASK_VERIFICATION_METHOD_OPTIONS as option (option.value)}
        <label class="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={selectedValues.includes(option.value)}
            onchange={(event: Event) => {
              handleToggle(option.value, (event.currentTarget as HTMLInputElement).checked)
            }}
          />
          <span>{t(`task.verification_methods.${option.value}`, {}, option.label)}</span>
        </label>
      {/each}
    </div>
  </div>

  <div class="grid gap-2">
    <Label for="verification_custom">{resolvedCustomLabel}</Label>
    <Textarea
      id="verification_custom"
      value={customText}
      rows={3}
      placeholder={t('task.verification_methods.custom_placeholder', {}, 'One custom verification method per line')}
      oninput={handleCustomInput}
    />
  </div>

  {#if error}
    <p class="text-xs text-destructive">{error}</p>
  {/if}
</div>
