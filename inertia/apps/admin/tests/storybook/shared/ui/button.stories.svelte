<script lang="ts">
  import { Meta, Story } from '@storybook/addon-svelte-csf'

  import Button from '@/apps/admin/shared/ui/button.svelte'
</script>

<Meta title="Admin UI/Button" component={Button} />

<Story name="Admin Actions">
  <div class="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-background p-4 text-foreground">
    <Button>Default</Button>
    <Button variant="outline">Review</Button>
    <Button variant="destructive">Suspend</Button>
    <Button disabled>Disabled</Button>
  </div>
</Story>
