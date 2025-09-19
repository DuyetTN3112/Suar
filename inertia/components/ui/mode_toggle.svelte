<script lang="ts">
  import { cn } from "$lib/utils-svelte"
  interface Props { class?: string }
  const { class: className, ...restProps }: Props = $props()
  function toggle() {{
    document.documentElement.classList.toggle("dark")
    localStorage.setItem("theme", document.documentElement.classList.contains("dark") ? "dark" : "light")
  }}
</script>

<button class={cn("inline-flex items-center justify-center", className)} onclick={toggle} {...restProps}>
  <span class="dark:hidden">☀️</span>
  <span class="hidden dark:block">🌙</span>
</button>
