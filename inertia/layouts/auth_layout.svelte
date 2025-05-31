<script lang="ts">
  import type { Snippet } from 'svelte'
  import { Toaster } from 'svelte-sonner'
  import ThemeSwitch from '@/components/theme-switch.svelte'
  import LanguageSwitcher from '@/components/ui/language_switcher.svelte'

  type Props = {
    children: Snippet
  }

  const { children }: Props = $props()
</script>

<div class="min-h-screen bg-background transition-colors duration-300">
  <header>
    <nav class="flex items-center justify-between p-6 lg:px-8">
      <div class="flex lg:flex-1">
        <a href="/" class="-m-1.5 p-1.5">
          <span class="sr-only">Suar</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-8 w-auto"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M7 7h10" />
            <path d="M7 12h10" />
            <path d="M7 17h10" />
          </svg>
        </a>
      </div>
      <div class="flex flex-1 justify-end gap-4 items-center">
        <div class="flex items-center space-x-1">
          <ThemeSwitch />
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  </header>
  <div class="p-6 lg:p-8">
    <div class="flex flex-col justify-center space-y-6 w-full sm:w-[400px] mx-auto">
      {@render children()}
    </div>
  </div>
  <Toaster position="top-right" />
</div>
