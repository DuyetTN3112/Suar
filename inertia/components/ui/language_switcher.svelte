<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import { cn } from "$lib/utils-svelte"

  interface Props {
    class?: string
    locale?: string
    supportedLocales?: string[]
    translations?: Record<string, unknown>
  }
  const { class: className, locale = "vi", supportedLocales = ["vi", "en"], translations: _translations }: Props = $props()

  function switchLocale(loc: string) {
    router.get(`/lang/${loc}`, {}, { preserveState: true, preserveScroll: true })
  }
</script>

<div class={cn("flex items-center gap-1", className)}>
  {#each supportedLocales as loc}
    <button
      class={cn("px-2 py-1 rounded-md text-xs font-medium", loc === locale ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
      onclick={() => { switchLocale(loc); }}
    >{loc}</button>
  {/each}
</div>
