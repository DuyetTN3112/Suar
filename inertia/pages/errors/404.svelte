<script lang="ts">
  import Button from '@/components/ui/button.svelte'

  const { href = '/' } = $props()
</script>

<svelte:head>
  <title>Không tìm thấy trang</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center">
  <div class="mx-auto flex max-w-md flex-col items-center space-y-6 text-center">
    <h1 class="text-6xl font-bold">404</h1>
    <h2 class="text-2xl font-semibold">Không tìm thấy trang</h2>
    <p class="text-muted-foreground">
      Trang bạn đang tìm kiếm có thể đã bị xóa hoặc không tồn tại.
    </p>
    <Button>
      <a {href}>Quay lại trang chủ</a>
    </Button>
  </div>
</div>
