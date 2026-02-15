<script lang="ts">
  import Button from '@/components/ui/button.svelte'

  interface Props {
    title?: string
    message?: string
    stack?: string
  }

  const { title = 'Lỗi Hệ Thống', message = 'Đã xảy ra lỗi không xác định', stack }: Props = $props()
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
  <div class="mx-auto flex max-w-lg flex-col items-center space-y-6 text-center px-4">
    <div
      class="w-full rounded-lg border border-red-200 bg-red-50 p-6 text-left dark:border-red-800 dark:bg-red-950"
    >
      <h2 class="text-xl font-bold text-red-800 dark:text-red-200">{title}</h2>
      <p class="mt-2 text-red-700 dark:text-red-300">{message}</p>

      {#if stack}
        <pre
          class="mt-4 max-h-[200px] overflow-auto rounded bg-black/10 p-3 text-xs dark:bg-white/10"
        >{stack}</pre>
      {/if}
    </div>

    <Button onclick={() => { window.location.reload(); }}>
      Tải lại trang
    </Button>
  </div>
</div>
