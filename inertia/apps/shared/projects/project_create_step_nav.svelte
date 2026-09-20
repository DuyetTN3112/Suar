<script lang="ts">
  import { CheckCircle2 } from 'lucide-svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import type { WizardStep, WizardStepConfig } from './project_create_blueprints'

  interface Props {
    steps: WizardStepConfig[]
    currentStep: WizardStep
    stepIndex: number
    hasFoundationReady: boolean
    onSelectStep: (stepId: WizardStep) => void
    t: (key: string, params?: Record<string, unknown>, fallback?: string) => string
  }

  const {
    steps,
    currentStep,
    stepIndex,
    hasFoundationReady,
    onSelectStep,
    t,
  }: Props = $props()
</script>

<Card>
  <CardHeader>
    <CardTitle>{t('project.create_page.steps_heading', {}, 'Steps')}</CardTitle>
  </CardHeader>
  <CardContent class="grid gap-3 md:grid-cols-3">
    {#each steps as step, index}
      <button
        type="button"
        class={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${currentStep === step.id ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-secondary/30'}`}
        onclick={() => {
          if (step.id === 'foundation' || hasFoundationReady) {
            onSelectStep(step.id)
          }
        }}
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-foreground">
              {t(step.titleKey, {}, step.titleFallback)}
            </p>
            <p class="mt-1 text-xs leading-5 text-muted-foreground">
              {t(step.descriptionKey, {}, step.descriptionFallback)}
            </p>
          </div>
          {#if index < stepIndex || (step.id === 'foundation' && hasFoundationReady)}
            <CheckCircle2 class="mt-0.5 size-4 text-emerald-600" />
          {/if}
        </div>
      </button>
    {/each}
  </CardContent>
</Card>
