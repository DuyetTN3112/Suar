<script lang="ts">
  import { Command as CommandPrimitive } from 'bits-ui'
  import Dialog from './dialog.svelte'
  import DialogContent from './dialog_content.svelte'
  import DialogHeader from './dialog_header.svelte'
  import DialogTitle from './dialog_title.svelte'
  import DialogDescription from './dialog_description.svelte'

  export let open = false
  export let onOpenChange: ((open: boolean) => void) | undefined = undefined
  export let title = 'Command Palette'
  export let description = 'Search for a command to run...'
</script>

<Dialog bind:open {onOpenChange}>
  <DialogHeader class="sr-only">
    <DialogTitle>{title}</DialogTitle>
    <DialogDescription>{description}</DialogDescription>
  </DialogHeader>
  <DialogContent class="overflow-hidden p-0">
    <CommandPrimitive.Root
      class="[&_[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
    >
      <slot></slot>
    </CommandPrimitive.Root>
  </DialogContent>
</Dialog>
