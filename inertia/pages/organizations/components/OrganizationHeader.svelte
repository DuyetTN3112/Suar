<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import Button from '@/components/ui/button.svelte'
  import { Plus } from 'lucide-svelte'

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
        <Plus class="mr-2 h-4 w-4" /> Tạo tổ chức mới
      </Link>
    </Button>
  {/if}
</div>
