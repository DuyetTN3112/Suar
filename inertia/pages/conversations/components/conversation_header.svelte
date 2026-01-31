<script lang="ts">
  import Avatar from '@/components/ui/avatar.svelte'
  import AvatarFallback from '@/components/ui/avatar_fallback.svelte'
  import Button from '@/components/ui/button.svelte'
  import { Phone, Video, MoreVertical } from 'lucide-svelte'
  import type { Conversation } from '../types'

  interface Props {
    conversation: Conversation | null
    otherParticipant?: any
    loggedInUserId?: string
  }

  const { conversation, otherParticipant }: Props = $props()
</script>

{#if conversation}
  <div class="p-4 border-b flex items-center justify-between bg-card">
    <div class="flex items-center gap-3">
      <Avatar class="h-10 w-10">
        <AvatarFallback>
          {otherParticipant?.username?.[0]?.toUpperCase() || otherParticipant?.email?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      <div>
        <h2 class="font-semibold">
          {otherParticipant?.username || otherParticipant?.email || 'Cuộc trò chuyện'}
        </h2>
        {#if otherParticipant?.description}
          <p class="text-sm text-muted-foreground">{otherParticipant.description}</p>
        {:else}
          <p class="text-sm text-muted-foreground">
            {conversation.conversation_participants?.length || 0} người tham gia
          </p>
        {/if}
      </div>
    </div>

    <div class="flex items-center gap-2">
      <Button size="icon" variant="ghost" title="Gọi điện">
        <Phone class="h-5 w-5" />
      </Button>
      <Button size="icon" variant="ghost" title="Gọi video">
        <Video class="h-5 w-5" />
      </Button>
      <Button size="icon" variant="ghost" title="Thêm">
        <MoreVertical class="h-5 w-5" />
      </Button>
    </div>
  </div>
{/if}
