<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import Button from '@/components/ui/button.svelte'
  import { ShieldAlert } from 'lucide-svelte'
</script>

<svelte:head>
  <title>Không có quyền truy cập</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
  <div class="mx-auto flex max-w-md flex-col items-center space-y-6 text-center px-4">
    <div
      class="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30"
    >
      <ShieldAlert class="h-10 w-10 text-red-600 dark:text-red-400" />
    </div>

    <h1 class="text-6xl font-bold text-slate-900 dark:text-slate-50">403</h1>
    <h2 class="text-2xl font-semibold text-slate-800 dark:text-slate-200">
      Không có quyền truy cập
    </h2>
    <p class="text-muted-foreground">
      Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây
      là lỗi.
    </p>

    <div class="flex gap-3">
      <Button variant="outline" onclick={() => window.history.back()}>
        Quay lại
      </Button>
      <Button>
        <Link href="/">Trang chủ</Link>
      </Button>
    </div>
  </div>
</div>
