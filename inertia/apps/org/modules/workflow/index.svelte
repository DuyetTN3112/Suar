<script lang="ts">
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
</script>

<svelte:head>
  <title>Workflow configuration temporarily unavailable</title>
</svelte:head>

<OrganizationLayout title="Workflow configuration temporarily unavailable">
  <section
    class="mx-auto flex max-w-2xl flex-col items-start gap-4 rounded-lg border border-border bg-card p-6 sm:p-8"
    aria-labelledby="workflow-unavailable-title"
  >
    <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
      Task coordination
    </p>
    <h1 id="workflow-unavailable-title" class="text-3xl font-black text-foreground">
      Workflow configuration is temporarily unavailable
    </h1>
    <p class="max-w-prose text-sm leading-6 text-muted-foreground">
      Workflow editing is paused while task-status safety checks are being rebuilt. Existing task
      boards and their seeded columns remain available.
    </p>
    <a
      href="/org/tasks/board"
      class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      Return to task board
    </a>
  </section>
</OrganizationLayout>
