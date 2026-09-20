<script lang="ts">
  interface SummaryStat {
    label: string
    value: string
    tone: string
    note: string
  }

  interface Props {
    summaryStats: SummaryStat[]
  }

  const { summaryStats }: Props = $props()
</script>

<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
  {#each summaryStats as stat (stat.label)}
    <article class={`rounded-[24px] border p-4 shadow-suar-sm ${stat.tone}`}>
      <p class="text-xs font-semibold text-muted-foreground">{stat.label}</p>
      <p class="mt-3 text-3xl font-black tracking-tight">{stat.value}</p>
      <p class="mt-2 text-xs font-semibold opacity-75">{stat.note}</p>
    </article>
  {/each}
</div>
