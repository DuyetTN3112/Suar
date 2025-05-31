<script lang="ts">
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import { Send, Loader2 } from 'lucide-svelte'

  interface Props {
    message: string
    setMessage: (message: string) => void
    onSendMessage: () => void
    isLoading: boolean
  }

  const { message, setMessage, onSendMessage, isLoading }: Props = $props()

  function handleSubmit(e: Event) {
    e.preventDefault()
    if (message.trim() && !isLoading) {
      onSendMessage()
    }
  }
</script>

<div class="p-4 border-t">
  <form onsubmit={handleSubmit}>
    <div class="flex items-center gap-2">
      <Input
        placeholder="Nhập tin nhắn của bạn..."
        class="flex-1"
        value={message}
        oninput={(e) => { setMessage(e.currentTarget.value); }}
        disabled={isLoading}
      />
      <Button
        type="submit"
        disabled={!message.trim() || isLoading}
        size="icon"
        class="h-10 w-10 rounded-full"
      >
        {#if isLoading}
          <Loader2 class="h-4 w-4 animate-spin" />
        {:else}
          <Send class="h-4 w-4" />
        {/if}
      </Button>
    </div>
  </form>
</div>
