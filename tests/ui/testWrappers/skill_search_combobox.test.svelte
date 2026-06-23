<script lang="ts">
  import SkillSearchCombobox from '../../../inertia/components/ui/skill_search_combobox.svelte'
  interface Props {
    skills?: any[]
    value?: string
    class?: string
    [key: string]: any
  }
  let { skills = [], value = '', class: className = '', ...rest }: Props = $props()
</script>
<SkillSearchCombobox {skills} bind:value class={className} {...rest}></SkillSearchCombobox>