<script lang="ts">
  import { router } from '@inertiajs/svelte'


  interface ProficiencyLevel {
    id: string
    ordinal: number
    code: string
    displayName: string
  }

  interface RubricLevel {
    id: string
    proficiencyLevel: ProficiencyLevel
    summary: string | null
    knowledgeExpectations: string[] | string | null
    observableBehaviors: string[] | string | null
    independenceExpectations: string | null
    complexityExpectations: string | null
    impactScopeExpectations: string | null
    positiveExamples: string[] | string | null
    negativeExamples: string[] | string | null
    evidenceGuidance: string | null
    expectedExecution: string | null
    autonomyDescriptor: string | null
    complexityDescriptor: string | null
    qualityDescriptor: string | null
    collaborationDescriptor: string | null
    ceilingGuidance: string | null
  }

  interface Props {
    skill: {
      id: string
      skillName: string
      skillCode: string
      categoryCode: string
      description: string | null
    }
    rubric: {
      id: string
      version: number
      status: string
      effectiveFrom: string | null
      effectiveTo: string | null
      changeSummary: string | null
      levels: RubricLevel[]
      createdAt: string
      updatedAt: string
    }
  }

  const { skill, rubric }: Props = $props()

  const goBack = () => { router.get("/admin/proficiency") }
</script>

<svelte:head>
  <title>{skill.skillName} Rubric — Admin</title>
</svelte:head>


  <div class="space-y-6 max-w-4xl mx-auto">
    <div class="flex items-center justify-between">
      <button onclick={goBack} class="text-sm text-muted-foreground underline">
        ← Back to Proficiency
      </button>
    </div>

    <div class="rounded-lg border p-4 bg-muted/20">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold">{skill.skillName}</h1>
        <span class="rounded-full border px-2 py-0.5 text-xs">{skill.skillCode}</span>
        <span class="rounded-full border px-2 py-0.5 text-xs">{skill.categoryCode}</span>
      </div>
      {#if skill.description}
        <p class="mt-2 text-sm text-muted-foreground">{skill.description}</p>
      {/if}
    </div>

    <div class="rounded-lg border p-4">
      <div class="flex items-center gap-3 mb-1">
        <h2 class="text-lg font-semibold">Rubric v{rubric.version}</h2>
        <span class="rounded-full border px-2 py-0.5 text-xs">{rubric.status}</span>
      </div>
      {#if rubric.changeSummary}
        <p class="text-sm text-muted-foreground">{rubric.changeSummary}</p>
      {/if}
    </div>

    <div class="space-y-4">
      {#each rubric.levels as level (level.id)}
        <div class="rounded-lg border p-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold">
              {level.proficiencyLevel.displayName}
            </span>
            <span class="text-xs text-muted-foreground font-mono">
              {level.proficiencyLevel.code}
            </span>
          </div>

          {#if level.summary}
            <div class="mb-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Summary</p>
              <p class="text-sm">{level.summary}</p>
            </div>
          {/if}

          {#if level.knowledgeExpectations}
            <div class="mb-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Knowledge</p>
              {#if Array.isArray(level.knowledgeExpectations)}
                <ul class="list-disc pl-5 text-sm text-muted-foreground">
                  {#each level.knowledgeExpectations as exp}
                    <li>{exp}</li>
                  {/each}
                </ul>
              {:else}
                <p class="text-sm text-muted-foreground">{level.knowledgeExpectations}</p>
              {/if}
            </div>
          {/if}

          {#if level.observableBehaviors}
            <div class="mb-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Observable Behaviors</p>
              {#if Array.isArray(level.observableBehaviors)}
                <ul class="list-disc pl-5 text-sm text-muted-foreground">
                  {#each level.observableBehaviors as behavior}
                    <li>{behavior}</li>
                  {/each}
                </ul>
              {:else}
                <p class="text-sm text-muted-foreground">{level.observableBehaviors}</p>
              {/if}
            </div>
          {/if}

          {#if level.expectedExecution}
            <div class="mb-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Expected Execution</p>
              <p class="text-sm text-muted-foreground">{level.expectedExecution}</p>
            </div>
          {/if}

          {#if level.autonomyDescriptor}
            <div class="mb-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Autonomy Descriptor</p>
              <p class="text-sm text-muted-foreground">{level.autonomyDescriptor}</p>
            </div>
          {/if}

          {#if level.complexityDescriptor}
            <div class="mb-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Complexity Descriptor</p>
              <p class="text-sm text-muted-foreground">{level.complexityDescriptor}</p>
            </div>
          {/if}

          {#if level.qualityDescriptor}
            <div class="mb-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Quality Descriptor</p>
              <p class="text-sm text-muted-foreground">{level.qualityDescriptor}</p>
            </div>
          {/if}

          {#if level.collaborationDescriptor}
            <div class="mb-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Collaboration Descriptor</p>
              <p class="text-sm text-muted-foreground">{level.collaborationDescriptor}</p>
            </div>
          {/if}

          {#if level.evidenceGuidance}
            <div class="mt-3 rounded border border-border bg-muted/20 p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Evidence Guidance</p>
              <p class="text-sm text-foreground">{level.evidenceGuidance}</p>
            </div>
          {/if}

          {#if level.ceilingGuidance}
            <div class="mt-3 rounded border border-border bg-secondary/40 p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Ceiling Guidance</p>
              <p class="text-sm text-foreground">{level.ceilingGuidance}</p>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
 
