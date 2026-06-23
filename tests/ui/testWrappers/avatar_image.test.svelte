<script lang="ts">
  import Avatar from '../../../inertia/components/ui/avatar.svelte'
  import AvatarImage from '../../../inertia/components/ui/avatar_image.svelte'
  interface Props {
    src?: string
    alt?: string
    class?: string
    [key: string]: any
  }
  let { src = '', alt = '', class: className = '', ...rest }: Props = $props()
</script>
<Avatar>
  <AvatarImage {src} {alt} class={className} {...rest}></AvatarImage>
</Avatar>