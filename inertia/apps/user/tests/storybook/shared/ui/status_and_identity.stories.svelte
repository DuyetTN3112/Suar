<script lang="ts">
  import { Meta, Story } from '@storybook/addon-svelte-csf'

  import Avatar from '@/apps/user/shared/ui/avatar.svelte'
  import AvatarFallback from '@/apps/user/shared/ui/avatar_fallback.svelte'
  import AvatarImage from '@/apps/user/shared/ui/avatar_image.svelte'
  import Badge from '@/apps/user/shared/ui/badge.svelte'
</script>

<Meta title="User UI/Status And Identity" />

<Story name="Badges">
  <div class="flex flex-wrap gap-3 rounded-lg border border-border bg-background p-4 text-foreground">
    <Badge>Active</Badge>
    <Badge variant="secondary">Queued</Badge>
    <Badge variant="outline">Readonly</Badge>
    <Badge variant="pending">Pending</Badge>
    <Badge variant="warning">Risk</Badge>
    <Badge variant="destructive">Blocked</Badge>
  </div>
</Story>

<Story name="Avatars">
  <div class="flex items-center gap-4 rounded-lg border border-border bg-background p-4 text-foreground">
    <Avatar>
      <AvatarImage
        src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=128&q=80"
        alt="Duyet"
      />
      <AvatarFallback>DN</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>AL</AvatarFallback>
    </Avatar>
    <div>
      <p class="text-sm font-bold">Identity fallback</p>
      <p class="text-xs text-muted-foreground">Image and initials states render side by side.</p>
    </div>
  </div>
</Story>
