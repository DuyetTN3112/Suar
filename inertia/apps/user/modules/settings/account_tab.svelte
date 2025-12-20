<script lang="ts">
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'

  import type { AccountTabProps } from './types'

  const { form, onSubmit, processing }: AccountTabProps = $props()
  const { t } = $derived(useTranslation())

  function handleEmailInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    form.setData('email', target.value)
  }
</script>

<Card>
  <CardHeader>
    <CardTitle>{t('settings.account_info_title', {}, 'Account information')}</CardTitle>
  </CardHeader>
  <CardContent>
    <form onsubmit={onSubmit} class="space-y-4">
      <div class="space-y-2">
        <Label for="email">{t('settings.email', {}, 'Email')}</Label>
        <Input
          id="email"
          value={form.data.email}
          oninput={handleEmailInput}
        />
        {#if form.errors.email}
          <p class="text-sm text-destructive">{form.errors.email}</p>
        {/if}
      </div>
      <Button type="submit" disabled={processing}>
        {processing ? t('settings.saving', {}, 'Saving...') : t('settings.save_changes', {}, 'Save changes')}
      </Button>
    </form>
  </CardContent>
</Card>
