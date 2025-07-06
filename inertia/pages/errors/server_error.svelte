<script lang="ts">
  import Button from '@/components/ui/button.svelte'

  interface Props {
    error?: { message?: string; name?: string; stack?: string }
  }

  const { error }: Props = $props()

  const errorMessage = $derived(
    error?.message || 'Đã xảy ra lỗi không xác định trên máy chủ'
  )
  const errorName = $derived(error?.name || 'Unknown')
</script>

<svelte:head>
  <title>Lỗi máy chủ</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
  <div class="mx-auto flex max-w-lg flex-col items-center space-y-6 text-center px-4">
    <h1 class="text-6xl font-bold text-slate-900 dark:text-slate-50">500</h1>
    <h2 class="text-2xl font-semibold text-slate-800 dark:text-slate-200">Lỗi máy chủ</h2>

    <div
      class="w-full rounded-lg border border-red-200 bg-red-50 p-6 text-left dark:border-red-800 dark:bg-red-950"
    >
      <p class="text-red-700 dark:text-red-300">{errorMessage}</p>
      <p class="mt-2 text-sm text-red-600 dark:text-red-400">
        <strong>Type:</strong> {errorName}
      </p>

      {#if error?.stack}
        <pre
          class="mt-4 max-h-[200px] overflow-auto rounded bg-black/10 p-3 text-xs dark:bg-white/10"
        >{error.stack}</pre>
      {/if}
    </div>

    <Button onclick={() => { window.location.reload(); }}>
      Tải lại trang
    </Button>
  </div>
</div>
