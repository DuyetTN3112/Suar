<script lang="ts">
  import Button from '@/components/ui/button.svelte'

  const { href = '/' } = $props()
</script>

<svelte:head>
  <title>Lỗi máy chủ</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center">
  <div class="mx-auto flex max-w-md flex-col items-center space-y-6 text-center">
    <h1 class="text-6xl font-bold">500</h1>
    <h2 class="text-2xl font-semibold">Lỗi máy chủ</h2>
    <p class="text-muted-foreground">
      Đã xảy ra lỗi từ phía máy chủ. Vui lòng thử lại sau hoặc liên hệ với quản trị viên.
    </p>
    <Button>
      <a {href}>Quay lại trang chủ</a>
    </Button>
  </div>
</div>
