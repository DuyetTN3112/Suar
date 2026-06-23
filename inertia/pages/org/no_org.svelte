<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import { Building, Plus, ArrowRight, Compass, ShieldAlert } from 'lucide-svelte'

  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
</script>

<svelte:head>
  <title>Chưa chọn tổ chức - SUAR</title>
</svelte:head>

<div class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-4 text-black">
  <!-- Glowing Background Orbs (very subtle light orange) -->
  <div class="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-orange-500/5 blur-[100px]"></div>

  <div class="relative z-10 w-full max-w-2xl text-center space-y-8">
    <div class="inline-flex relative">
      <div class="absolute inset-0 rounded-3xl bg-orange-500/10 blur-xl opacity-40"></div>
      <div class="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-black/12 bg-white shadow-lg">
        <Building class="h-12 w-12 text-orange-500" />
      </div>
      <div class="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black border-2 border-white shadow-lg">
        <ShieldAlert class="h-3.5 w-3.5 text-white" />
      </div>
    </div>

    <div class="space-y-3">
      <p class="font-mono uppercase tracking-[0.16em] text-xs text-orange-500 font-bold">BẮT ĐẦU VỚI TỔ CHỨC</p>
      <h1 class="text-4xl sm:text-5xl font-black tracking-tight text-black">
        Chưa có tổ chức được chọn
      </h1>
      <p class="mx-auto max-w-lg text-black/56 text-sm sm:text-base leading-relaxed">
        Để truy cập khu vực làm việc và quản lý dự án này, tài khoản của bạn cần có liên kết với một tổ chức đang hoạt động.
      </p>
    </div>

    <Card class="border-black/12 bg-white text-left shadow-sm">
      <CardHeader class="pb-3">
        <CardTitle class="text-lg text-black flex items-center gap-2 font-bold">
          <Compass class="h-5 w-5 text-orange-500" />
          Bạn muốn làm gì tiếp theo?
        </CardTitle>
        <CardDescription class="text-black/56 text-xs">
          Chọn một trong hai tuỳ chọn bên dưới để tiếp tục sử dụng hệ thống.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4 sm:grid-cols-2 pt-2 pb-6">
        <div class="group relative rounded-xl border border-black/12 bg-white p-5 transition-all duration-300 hover:border-orange-500 hover:shadow-md">
          <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
            <Building class="h-5 w-5" />
          </div>
          <h3 class="text-sm font-bold text-black group-hover:text-orange-500 transition-colors">Tham gia tổ chức sẵn có</h3>
          <p class="mt-1 text-xs text-black/56">Khám phá và gửi yêu cầu tham gia các tổ chức hiện đang hoạt động trên hệ thống.</p>
          <Link href="/organizations" class="mt-4 inline-flex items-center text-xs font-bold text-orange-500 hover:underline">
            Khám phá tổ chức
            <ArrowRight class="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div class="group relative rounded-xl border border-black/12 bg-white p-5 transition-all duration-300 hover:border-orange-500 hover:shadow-md">
          <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-black/5 text-black">
            <Plus class="h-5 w-5" />
          </div>
          <h3 class="text-sm font-bold text-black group-hover:text-orange-500 transition-colors">Tạo tổ chức của riêng bạn</h3>
          <p class="mt-1 text-xs text-black/56">Bắt đầu như một người quản trị, tạo không gian mới và mời các thành viên tham gia.</p>
          <Link href="/organizations" class="mt-4 inline-flex items-center text-xs font-bold text-orange-500 hover:underline">
            Tạo không gian mới
            <ArrowRight class="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </CardContent>
    </Card>

    <div class="flex items-center justify-center gap-6 text-xs text-black/56">
      <Link href="/tasks" class="hover:text-black transition-colors">Về trang chủ</Link>
      <span>&bull;</span>
      <Link href="/settings" class="hover:text-black transition-colors">Cài đặt tài khoản</Link>
    </div>
  </div>
</div>
