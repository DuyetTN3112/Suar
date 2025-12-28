<script lang="ts">
  import { Meta, Story } from '@storybook/addon-svelte-csf'
  import { Plus, Shield } from 'lucide-svelte'

  import Button from '@/apps/user/shared/ui/button.svelte'
</script>

<Meta
  title="User UI/Button"
  component={Button}
  argTypes={{
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'outline', 'ghost', 'inverse', 'destructive', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'md', 'lg', 'icon', 'icon-sm'],
    },
    disabled: { control: 'boolean' },
  }}
/>

<Story name="Playground" args={{ variant: 'default', size: 'default', disabled: false }} let:args>
  <Button {...args}>Action</Button>
</Story>

<Story name="Variants">
  <div class="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-background p-4 text-foreground">
    <Button variant="default">Default</Button>
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="destructive">Delete</Button>
  </div>
</Story>

<Story name="Icon States">
  <div class="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-background p-4 text-foreground">
    <Button variant="primary" class="gap-2">
      <Shield class="size-4" />
      Secure Action
    </Button>
    <Button size="icon" variant="outline" aria-label="Add item">
      <Plus />
    </Button>
    <Button disabled>Disabled</Button>
  </div>
</Story>
