<script lang="ts">
  import { Meta, Story } from '@storybook/addon-svelte-csf'

  import TaskSkillsField from '@/apps/org/modules/tasks/components/modals/create_task_form/task_skills_field.svelte'
</script>

<Meta title="Org/Tasks/Task Skills Field" component={TaskSkillsField} />

<Story name="Role Prefill Requirement Semantics">
  <TaskSkillsField
    requiredSkills={[
      {
        id: 'skill-1',
        name: 'API Design',
        level: 'l7',
        categoryCode: 'technology',
        minimum_level_id: 'level-min',
        target_level_id: 'level-target',
        assessment_ceiling_level_id: 'level-ceiling',
        is_mandatory: true,
        importance: 'critical',
        weight: 1.5,
        requirement_source: 'professional_role_prefill',
        requirement_notes: 'Inherited from Backend Lead role baseline.',
      },
    ]}
    availableSkills={[
      { id: 'skill-1', name: 'API Design', categoryCode: 'engineering' },
      { id: 'skill-2', name: 'Collaboration', categoryCode: 'soft_skill' },
      { id: 'skill-3', name: 'Delivery Reliability', categoryCode: 'delivery' },
    ]}
    proficiencyLevels={[
      { value: 'l4', label: 'L4 · Junior Solid' },
      { value: 'l7', label: 'L7 · Middle Solid' },
    ]}
    onAddSkill={() => {}}
    onRemoveSkill={() => {}}
  />
</Story>
