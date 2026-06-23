<script lang="ts">
  import Alert from '../../../inertia/components/ui/alert.svelte'
  interface Props {
    variant?: 'default' | 'destructive'
    class?: string
  }
  let { variant = 'default', class: className = '' }: Props = $props()
</script>
<Alert {variant} class={className}></Alert>