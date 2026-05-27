<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import { Plus } from 'lucide-svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Props {
    title: string
    description: string
    showCreateButton?: boolean
  }

  const {
    title,
    description,
    showCreateButton = true
  }: Props = $props()
  const { t } = useTranslation()
</script>

<div class="flex justify-between items-center mb-6">
  <div>
    <h1 class="text-3xl font-bold tracking-tight">{title}</h1>
    <p class="text-muted-foreground mt-1">
      {description}
    </p>
  </div>
  {#if showCreateButton}
    <Button>
      <Link href="/organizations/create">
        <Plus class="mr-2 h-4 w-4" /> {t('organization.index.create_button', {}, 'Create organization')}
      </Link>
    </Button>
  {/if}
</div>
