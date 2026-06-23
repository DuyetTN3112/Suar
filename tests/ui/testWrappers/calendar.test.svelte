<script lang="ts">
  import Calendar from '../../../inertia/components/ui/calendar.svelte'
  interface Props {
    month?: Date
    class?: string
    [key: string]: any
  }
  let { month = new Date(), class: className = '', ...rest }: Props = $props()
</script>
<Calendar {month} class={className} {...rest}></Calendar>