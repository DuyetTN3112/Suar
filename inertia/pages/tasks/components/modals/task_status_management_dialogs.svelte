<script lang="ts">
  import { TriangleAlert } from 'lucide-svelte'

  import Button from '@/components/ui/button.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectValue from '@/components/ui/select_value.svelte'

  import type { TaskStatusCategory } from '../../types.svelte'

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
    createStatusCategory: TaskStatusCategory | ''
    createStatusDescription: string
    createStatusColor: string
    createStatusError: string
    createStatusSubmitting: boolean
    onCreateSubmit: () => void
    onCreateClose: () => void
    onCreateOpenChange: (open: boolean) => void
    onCreateStatusNameChange: (value: string) => void
    onCreateStatusCategoryChange: (value: TaskStatusCategory | '') => void
    onCreateStatusDescriptionChange: (value: string) => void
    onCreateStatusColorChange: (value: string) => void

    deleteOpen: boolean
    deleteStatusError: string
    deleteStatusSubmitting: boolean
    deleteStatusTarget: DeleteStatusTarget | null
    hasDeleteTargetTasks: boolean
    isStatusMutationLocked: boolean
    onDeleteConfirm: () => void
    onDeleteClose: () => void
    onDeleteOpenChange: (open: boolean) => void
  }

  const {
    createOpen,
    createStatusName,
    createStatusCategory,
    createStatusDescription,
    createStatusColor,
    createStatusError,
    createStatusSubmitting,
    onCreateSubmit,
    onCreateClose,
    onCreateOpenChange,
    onCreateStatusNameChange,
    onCreateStatusCategoryChange,
    onCreateStatusDescriptionChange,
    onCreateStatusColorChange,
    deleteOpen,
    deleteStatusError,
    deleteStatusSubmitting,
    deleteStatusTarget,
    hasDeleteTargetTasks,
    isStatusMutationLocked,
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

        {#if deleteStatusTarget.isSystem}
          <p class="text-sm text-muted-foreground">
            Trang thai he thong khong the xoa.
          </p>
        {:else if hasDeleteTargetTasks}
          <p class="text-sm text-muted-foreground">
            Chuyen het task khoi cot nay truoc khi xoa.
          </p>
        {:else if isStatusMutationLocked}
          <p class="text-sm text-muted-foreground">
            Board dang dong bo. Vui long doi thao tac hien tai hoan tat.
          </p>
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
        disabled={deleteStatusSubmitting || !deleteStatusTarget?.id || deleteStatusTarget.isSystem === true || hasDeleteTargetTasks || isStatusMutationLocked}
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

    <div class="space-y-4 py-2">
      <div class="space-y-2">
        <Label for="status-name">Ten trang thai</Label>
        <Input
          id="status-name"
          placeholder="VD: Cho QA"
          value={createStatusName}
          disabled={createStatusSubmitting || isStatusMutationLocked}
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
      </div>

      <div class="space-y-2">
        <Label>Nhom trang thai</Label>
        <Select
          value={createStatusCategory}
          onValueChange={(value: string) => {
            if (createStatusSubmitting || isStatusMutationLocked) return
            onCreateStatusCategoryChange(value as TaskStatusCategory)
          }}
        >
          <SelectTrigger class="w-full {createStatusSubmitting || isStatusMutationLocked ? 'pointer-events-none opacity-60' : ''}">
            <SelectValue placeholder="Chon nhom trang thai" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo" label="Todo: Chua bat dau" />
            <SelectItem value="in_progress" label="In progress: Dang thuc hien" />
            <SelectItem value="done" label="Done: Hoan tat" />
            <SelectItem value="cancelled" label="Cancelled: Da huy" />
          </SelectContent>
        </Select>
      </div>

      <div class="grid gap-3 sm:grid-cols-[1fr_96px]">
        <div class="space-y-2">
          <Label for="status-description">Mo ta</Label>
          <Input
          id="status-description"
          placeholder="Mo ta ngan"
          value={createStatusDescription}
          disabled={createStatusSubmitting || isStatusMutationLocked}
          oninput={(event: Event) => {
            const target = event.target as HTMLInputElement
            onCreateStatusDescriptionChange(target.value)
            }}
          />
        </div>
        <div class="space-y-2">
          <Label for="status-color">Mau</Label>
          <Input
            id="status-color"
            type="color"
            class="h-9 p-1"
            value={createStatusColor}
            disabled={createStatusSubmitting || isStatusMutationLocked}
            oninput={(event: Event) => {
              const target = event.target as HTMLInputElement
              onCreateStatusColorChange(target.value)
            }}
          />
        </div>
      </div>

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
      {#if isStatusMutationLocked}
        <p class="text-xs text-muted-foreground">
          Board dang dong bo. Vui long doi thao tac hien tai hoan tat.
        </p>
      {/if}
      <Button onclick={onCreateSubmit} disabled={createStatusSubmitting || isStatusMutationLocked}>
        {createStatusSubmitting ? 'Dang tao...' : 'Tao trang thai'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
