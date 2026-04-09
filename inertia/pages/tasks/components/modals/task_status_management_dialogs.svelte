<script lang="ts">
  import Button from '@/components/ui/button.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import { TriangleAlert } from 'lucide-svelte'

  interface DeleteStatusTarget {
    status: string
    label: string
    taskCount: number
    id?: string
    isSystem?: boolean
  }

  interface Props {
    createOpen: boolean
    createStatusName: string
    createStatusError: string
    createStatusSubmitting: boolean
    onCreateSubmit: () => void
    onCreateClose: () => void
    onCreateOpenChange: (open: boolean) => void
    onCreateStatusNameChange: (value: string) => void

    deleteOpen: boolean
    deleteStatusError: string
    deleteStatusSubmitting: boolean
    deleteStatusTarget: DeleteStatusTarget | null
    hasDeleteTargetTasks: boolean
    onDeleteConfirm: () => void
    onDeleteClose: () => void
    onDeleteOpenChange: (open: boolean) => void
  }

  const {
    createOpen,
    createStatusName,
    createStatusError,
    createStatusSubmitting,
    onCreateSubmit,
    onCreateClose,
    onCreateOpenChange,
    onCreateStatusNameChange,
    deleteOpen,
    deleteStatusError,
    deleteStatusSubmitting,
    deleteStatusTarget,
    hasDeleteTargetTasks,
    onDeleteConfirm,
    onDeleteClose,
    onDeleteOpenChange,
  }: Props = $props()
</script>

<Dialog
  open={deleteOpen}
  onOpenChange={(open: boolean) => {
    onDeleteOpenChange(open)
    if (!open) {
      onDeleteClose()
    }
  }}
>
  <DialogContent class="sm:max-w-[480px]">
    <DialogHeader>
      <DialogTitle>Xoa trang thai</DialogTitle>
      <DialogDescription>
        Hanh dong nay chi xoa cot trang thai, khong tu dong xoa task.
      </DialogDescription>
    </DialogHeader>

    {#if deleteStatusTarget}
      <div class="space-y-3 py-1 text-sm">
        <p>
          Ban sap xoa trang thai <span class="font-semibold">{deleteStatusTarget.label}</span>.
        </p>

        <div class="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-orange-900 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-100">
          <div class="flex items-start gap-2">
            <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p class="font-medium">Canh bao</p>
              <p>
                Cot nay hien co <span class="font-semibold">{deleteStatusTarget.taskCount}</span> task.
                Neu con task, he thong se chan xoa de tranh mat du lieu.
              </p>
            </div>
          </div>
        </div>

        {#if deleteStatusError}
          <p class="text-red-500">{deleteStatusError}</p>
        {/if}
      </div>
    {/if}

    <DialogFooter>
      <Button
        variant="outline"
        onclick={() => {
          onDeleteOpenChange(false)
          onDeleteClose()
        }}
        disabled={deleteStatusSubmitting}
      >
        Huy
      </Button>
      <Button
        variant="destructive"
        onclick={onDeleteConfirm}
        disabled={deleteStatusSubmitting || !deleteStatusTarget?.id || hasDeleteTargetTasks}
      >
        {deleteStatusSubmitting ? 'Dang xoa...' : 'Xoa trang thai'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<Dialog
  open={createOpen}
  onOpenChange={(open: boolean) => {
    onCreateOpenChange(open)
    if (!open) {
      onCreateClose()
    }
  }}
>
  <DialogContent class="sm:max-w-[460px]">
    <DialogHeader>
      <DialogTitle>Them trang thai moi</DialogTitle>
      <DialogDescription>
        Nhap ten trang thai moi de them cot vao board.
      </DialogDescription>
    </DialogHeader>

    <div class="space-y-2 py-2">
      <Input
        placeholder="VD: Cho QA"
        value={createStatusName}
        oninput={(event: Event) => {
          const target = event.target as HTMLInputElement
          onCreateStatusNameChange(target.value)
        }}
        onkeydown={(event: KeyboardEvent) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onCreateSubmit()
          }
        }}
      />
      {#if createStatusError}
        <p class="text-sm text-red-500">{createStatusError}</p>
      {/if}
    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onclick={() => {
          onCreateOpenChange(false)
          onCreateClose()
        }}
        disabled={createStatusSubmitting}
      >
        Huy
      </Button>
      <Button onclick={onCreateSubmit} disabled={createStatusSubmitting}>
        {createStatusSubmitting ? 'Dang tao...' : 'Tao trang thai'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
