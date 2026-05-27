<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { Building } from 'lucide-svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Dialog from '@/apps/org/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/org/shared/ui/dialog_content.svelte'
  import DialogDescription from '@/apps/org/shared/ui/dialog_description.svelte'
  import DialogFooter from '@/apps/org/shared/ui/dialog_footer.svelte'
  import DialogHeader from '@/apps/org/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/org/shared/ui/dialog_title.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Props {
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }

  const { open = false, onOpenChange }: Props = $props()
  const { t } = useTranslation()

  function handleGoToOrganizations() {
    router.visit('/organizations')
  }
</script>

<Dialog {open} {onOpenChange}>
  <DialogContent class="sm:max-w-[500px] max-h-[90vh]">
    <DialogHeader>
      <div class="flex items-center justify-center mb-4">
        <div class="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Building class="h-8 w-8 text-muted-foreground" />
        </div>
      </div>
      <DialogTitle class="text-center text-2xl">{t('organization.required_dialog.title', {}, 'Organization required')}</DialogTitle>
      <DialogDescription class="text-center">
        {t('organization.required_dialog.description_line_1', {}, 'Join or create an organization to access this feature.')}<br />
        {t('organization.required_dialog.description_line_2', {}, 'Full platform features require membership in at least one organization.')}
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
        {t('organization.required_dialog.view_list', {}, 'View organizations')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
