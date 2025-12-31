<script lang="ts">
  import { Meta, Story } from '@storybook/addon-svelte-csf'

  import SkillSearchCombobox from '@/apps/user/modules/search/components/skill_search_combobox.svelte'

  const skills = [
    {
      id: 'skill-api',
      skillName: 'API Design',
      categoryCode: 'technology',
      aliases: ['REST contracts', 'OpenAPI'],
    },
    {
      id: 'skill-comm',
      skillName: 'Clear Communication',
      categoryCode: 'soft',
      aliases: ['stakeholder writing'],
    },
    {
      id: 'skill-release',
      skill_name: 'Release Ownership',
      category_code: 'delivery',
      aliases: ['ship readiness'],
    },
  ]

  let selectedSkill = $state('')
  let selectedLabel = $state('none')

  function updateSelection(
    skillId: string,
    skill: { skillName?: string; skill_name?: string }
  ) {
    selectedSkill = skillId
    selectedLabel = skill.skillName ?? skill.skill_name ?? skillId
  }
</script>

<Meta title="User Search/Skill Search Combobox" />

<Story name="Active Skill Picker">
  <div class="max-w-md bg-background p-4 text-foreground">
    <SkillSearchCombobox
      skills={skills}
      bind:value={selectedSkill}
      placeholder="Choose skill"
      onSelect={updateSelection}
    />
    <p class="mt-3 text-xs text-muted-foreground">Selected: {selectedLabel}</p>
  </div>
</Story>

<Story name="Selected">
  <div class="max-w-md bg-background p-4 text-foreground">
    <SkillSearchCombobox
      skills={skills}
      value="skill-comm"
      placeholder="Choose skill"
    />
  </div>
</Story>

<Story name="Empty Catalog">
  <div class="max-w-md bg-background p-4 text-foreground">
    <SkillSearchCombobox
      skills={[]}
      value=""
      placeholder="No skills configured"
    />
  </div>
</Story>

<Story name="Disabled">
  <div class="max-w-md bg-background p-4 text-foreground">
    <SkillSearchCombobox
      skills={skills}
      value=""
      placeholder="Choose skill"
      disabled
    />
  </div>
</Story>
