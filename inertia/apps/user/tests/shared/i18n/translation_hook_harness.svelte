<script lang="ts">
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'

  const { locale, t } = $derived(useTranslation())
</script>

<p data-testid="locale">{locale}</p>
<p data-testid="wrapped">{t('user.users', {}, 'Users fallback')}</p>
<p data-testid="flat">{t('common.cancel', {}, 'Cancel fallback')}</p>
<p data-testid="fallback">{t('missing.total', { count: 3 }, ':count items')}</p>
<p data-testid="braced">{t('missing.braced', { count: 3 }, '{count} items')}</p>
