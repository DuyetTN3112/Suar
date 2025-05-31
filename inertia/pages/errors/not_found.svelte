<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import Button from '@/components/ui/button.svelte'
</script>

<div class="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
  <div class="text-center">
    <h1 class="text-9xl font-extrabold text-slate-900 dark:text-slate-50">404</h1>
    <h2 class="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-4">Không tìm thấy trang</h2>
    <p class="text-lg text-slate-600 dark:text-slate-400 mt-2">
      Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
    </p>
    <div class="mt-8">
      <Button>
        <Link href="/">Quay lại trang chủ</Link>
      </Button>
    </div>
  </div>
</div>
