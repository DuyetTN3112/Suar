<script lang="ts">
  import { page, router } from '@inertiajs/svelte'

  import { cn } from "$lib/utils-svelte"

  interface Props {
    class?: string
    locale?: string
    supportedLocales?: string[]
    translations?: Record<string, unknown>
  }
  const { class: className, locale = "en", supportedLocales = ["en", "vi"], translations: _translations }: Props = $props()

  function switchLocale(loc: string) {
    const currentUrl = new URL(page.url, 'http://localhost')
    currentUrl.searchParams.set('locale', loc)

    router.get(
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
      {},
      { preserveState: true, preserveScroll: true }
    )
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
