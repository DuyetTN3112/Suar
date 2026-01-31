<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import Button from '@/components/ui/button.svelte'
  import { Plus } from 'lucide-svelte'
  import type { ConversationsProps } from './types'
  import { createConversationStore } from './hooks/use_conversation.svelte.ts'
  import ConversationList from './components/conversation_list.svelte'
  import ConversationDetail from './components/conversation_detail.svelte'
  import EmptyConversation from './components/empty_conversation.svelte'
  import MessageInputForm from './components/message_input_form.svelte'
  import CreateConversationDialog from './components/create_conversation_dialog.svelte'
  import RecallMessageDialog from './components/recall_message_dialog.svelte'

  const { conversations }: ConversationsProps = $props()

  const loggedInUserId = $derived($page.props.auth?.user?.id || '')

  const store = createConversationStore()
  const {
    selectedId,
    selectedConversation,
    messages,
    isLoading,
    hasMore,
    newMessage,
    recallDialogOpen,
    loadConversation,
    loadMoreMessages,
    sendMessage,
    handleRecallMessage,
    handleRecallForEveryone,
    handleRecallForSelf,
  } = store

  let createDialogOpen = $state(false)

  function handleSelectConversation(conversation: any) {
    selectedId.set(conversation.id)
    loadConversation(conversation.id)
  }
</script>

<svelte:head>
  <title>Hội thoại</title>
  <style>
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background-color: rgba(155, 155, 155, 0.5);
      border-radius: 20px;
      border: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background-color: rgba(155, 155, 155, 0.7);
    }
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
    }
  </style>
</svelte:head>

<AppLayout title="Tin nhắn">
  <div class="container py-6">
    <div class="flex justify-between mb-6 items-center">
      <h1 class="text-3xl font-bold">Hội thoại</h1>
      <CreateConversationDialog bind:open={createDialogOpen}>
        {#snippet trigger()}
          <Button size="sm">
            <Plus class="h-4 w-4 mr-2" />
            Cuộc trò chuyện mới
          </Button>
        {/snippet}
      </CreateConversationDialog>
    </div>

    <div class="flex gap-6 h-[calc(100vh-12rem)]">
      <div class="w-1/3 border rounded-lg flex flex-col">
        <ConversationList
          conversations={conversations?.data || []}
          selectedId={$selectedId}
          onSelectConversation={handleSelectConversation}
          {loggedInUserId}
        />
      </div>

      <div class="flex-1 flex flex-col">
        {#if $selectedId && $selectedConversation}
          <ConversationDetail
            conversation={$selectedConversation}
            messages={$messages}
            {loggedInUserId}
            isLoading={$isLoading}
            hasMore={$hasMore}
            onLoadMore={loadMoreMessages}
            onRecallMessage={handleRecallMessage}
          />

          <MessageInputForm
            message={$newMessage}
            setMessage={(msg) => { newMessage.set(msg); }}
            onSendMessage={sendMessage}
            isLoading={$isLoading}
          />
        {:else}
          <EmptyConversation />
        {/if}
      </div>
    </div>
  </div>

  <RecallMessageDialog
    open={$recallDialogOpen}
    onClose={() => { recallDialogOpen.set(false); }}
    {handleRecallForEveryone}
    {handleRecallForSelf}
  />
</AppLayout>
