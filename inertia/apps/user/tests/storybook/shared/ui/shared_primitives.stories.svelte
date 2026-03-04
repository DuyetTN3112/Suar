<script lang="ts">
  import { Meta, Story } from '@storybook/addon-svelte-csf'

  import { EmptyState, KANBAN_LANE_TOKENS, PageHeader, UserChip, formatDate } from '@/apps/shared/ui'
</script>

<Meta title="Shared UI/Primitives" />

<Story name="PageHeader">
  <div class="rounded-3xl border border-border bg-background p-8 text-foreground">
    <PageHeader
      eyebrow="Evidence shell"
      title="Frontend audit cockpit"
      description="A reusable header for user, organization and admin surfaces without rewriting existing screens."
      meta={formatDate('2026-07-26T08:30:00.000Z')}
    />
  </div>
</Story>

<Story name="EmptyState">
  <div class="rounded-3xl border border-border bg-background p-8 text-foreground">
    <EmptyState
      eyebrow="Quiet lane"
      title="No review packages yet"
      description="When a sprint submits evidence, this surface becomes the handoff point for reviewers."
    />
  </div>
</Story>

<Story name="UserChip">
  <div class="flex flex-wrap items-center gap-3 rounded-3xl border border-border bg-background p-8 text-foreground">
    <UserChip name="Ngoc Duyet" email="duyet@example.com" />
    <UserChip name="Platform Reviewer" subtitle="System admin" size="lg" />
    <UserChip email="anonymous@suar.dev" size="sm" />
  </div>
</Story>

<Story name="Token Maps">
  <div class="grid gap-3 rounded-3xl border border-border bg-background p-8 text-foreground sm:grid-cols-3">
    {#each Object.entries(KANBAN_LANE_TOKENS) as [key, token]}
      <div class={`rounded-2xl border p-4 ${token.surfaceClass}`}>
        <div class="flex items-center gap-2 text-sm font-black">
          <span class={`size-2 rounded-full ${token.markerClass}`}></span>
          {token.label}
        </div>
        <p class="mt-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] opacity-70">{key}</p>
      </div>
    {/each}
  </div>
</Story>
