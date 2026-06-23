<script lang="ts">
  import OrganizationRequiredSimpleDialog from '../../../inertia/components/ui/organization_required_simple_dialog.svelte'
  interface Props {
    open?: boolean
    class?: string
    [key: string]: any
  }
  let { open = false, class: className = '', ...rest }: Props = $props()
</script>
<div class={className}>
  <OrganizationRequiredSimpleDialog {open} {...rest}></OrganizationRequiredSimpleDialog>
</div>