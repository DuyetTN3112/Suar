<script lang="ts">
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import Button from '@/components/ui/button.svelte'
  import { MessageSquare } from 'lucide-svelte'
  import CreateConversationDialog from './create_conversation_dialog.svelte'
</script>

<div class="flex-1 flex items-center justify-center">
  <Card>
    <CardContent class="p-6">
      <div class="text-center space-y-2">
        <MessageSquare class="h-12 w-12 mx-auto text-muted-foreground mb-2" />
        <h3 class="text-lg font-medium">
          Chưa có tin nhắn nào được chọn
        </h3>
        <p class="text-muted-foreground">
          Chọn một cuộc trò chuyện từ danh sách để bắt đầu hoặc tạo mới
        </p>
        <CreateConversationDialog>
          {#snippet trigger()}
            <Button class="mt-4">
              Tạo cuộc trò chuyện mới
            </Button>
          {/snippet}
        </CreateConversationDialog>
      </div>
    </CardContent>
  </Card>
</div>
