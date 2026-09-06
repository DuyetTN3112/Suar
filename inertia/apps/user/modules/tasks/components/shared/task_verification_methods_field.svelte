<script lang="ts">
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import {
    parseTaskVerificationMethod,
    serializeTaskVerificationMethod,
    TASK_VERIFICATION_METHOD_OPTIONS,
  } from '@/apps/user/modules/tasks/lib/rules/task_verification_methods'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface Props {
    value: string
    error?: string
    label?: string
    customLabel?: string
    required?: boolean
    onChange: (value: string) => void
  }

  const {
    value,
    error,
    label,
    customLabel,
    required = false,
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

<div id="verification-method-field" tabindex="-1" class={`grid gap-3 rounded-xl ${error ? 'ring-2 ring-destructive/30' : ''}`} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'verification_method-error' : undefined}>
  <div class="grid gap-2">
    <Label>
      {resolvedLabel}
      {#if required}<span class="ml-1 text-[#ef4444]" aria-hidden="true">*</span>{/if}
    </Label>
    <div class="grid gap-2 rounded-xl border border-border bg-muted/20 p-3 md:grid-cols-2" role="group" data-required={required ? 'true' : undefined}>
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
    <p id="verification_method-error" class="text-xs font-medium text-destructive" role="alert">{error}</p>
  {/if}
</div>
