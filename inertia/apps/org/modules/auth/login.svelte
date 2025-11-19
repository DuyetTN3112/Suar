<script lang="ts">
  import { buttonVariants } from '@/apps/org/shared/ui/button_variants'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import AuthLayout from '@/apps/org/shared/layouts/auth_layout.svelte'
  import { cn } from '@/apps/org/shared/lib/utils-svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  const { t } = useTranslation()

  const liveProviders = [
    {
      name: 'Google',
      href: '/auth/google/redirect',
      accentClass: 'text-destructive',
    },
    {
      name: 'GitHub',
      href: '/auth/github/redirect',
      accentClass: '',
    },
  ]
</script>

<svelte:head>
  <title>{t('auth.login', {}, 'Login')}</title>
</svelte:head>

<AuthLayout>
  <Card class="mx-auto w-full">
    <CardHeader class="space-y-1">
      <CardTitle class="text-center text-2xl font-bold">
        {t('auth.login', {}, 'Login')}
      </CardTitle>
    </CardHeader>

    <CardContent>
      <div class="space-y-4">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {#each liveProviders as provider}
            <a
              href={provider.href}
              class={cn(
                buttonVariants({ variant: 'outline' }),
                'flex w-full items-center justify-center gap-2'
              )}
            >
                {#if provider.name === 'Google'}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class={provider.accentClass}
                    aria-hidden="true"
                  >
                    <path d="M21.35 11.1H12.18V13.83H18.69C18.36 17.64 15.19 19.27 12.19 19.27C8.36 19.27 5.22 16.25 5.22 12.21C5.22 8.17 8.38 5.16 12.21 5.16C14.38 5.16 16.12 6.34 17.09 7.24L19.07 5.24C17.13 3.43 14.92 2.33 12.21 2.33C6.97 2.33 2.33 7.04 2.33 12.21C2.33 17.38 6.98 22.09 12.22 22.09C17.79 22.09 21.4 17.86 21.4 12.45C21.4 11.83 21.37 11.42 21.35 11.1Z" />
                  </svg>
                {:else}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                  </svg>
                {/if}
                <span>{provider.name}</span>
            </a>
          {/each}
        </div>
      </div>
    </CardContent>
  </Card>
</AuthLayout>
