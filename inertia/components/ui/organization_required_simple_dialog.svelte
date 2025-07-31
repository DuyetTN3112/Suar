<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { Building } from 'lucide-svelte'
  import Button from '@/components/ui/button.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'

  interface Props {
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }

  const { open = false, onOpenChange }: Props = $props()

  // Xử lý chuyển hướng đến trang tổ chức
  function handleGoToOrganizations() {
    router.visit('/organizations')
  }
</script>

<Dialog {open} {onOpenChange}>
  <DialogContent class="sm:max-w-[500px] max-h-[90vh]">
    <DialogHeader>
      <div class="flex items-center justify-center mb-4">
        <div class="h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
          <Building class="h-8 w-8 text-slate-500 dark:text-slate-400" />
        </div>
      </div>
      <DialogTitle class="text-center text-2xl">Cần có tổ chức</DialogTitle>
      <DialogDescription class="text-center">
        Bạn cần tham gia hoặc tạo một tổ chức để truy cập tính năng này.<br />
        Để sử dụng đầy đủ tính năng của hệ thống, bạn cần phải là thành viên của ít nhất một tổ chức.
      </DialogDescription>
    </DialogHeader>

    <DialogFooter class="sm:justify-center gap-3 mt-6">
      <Button
        onclick={handleGoToOrganizations}
        variant="default"
        size="lg"
        class="w-full"
      >
        <Building class="mr-2 h-5 w-5" />
        Xem danh sách tổ chức
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
