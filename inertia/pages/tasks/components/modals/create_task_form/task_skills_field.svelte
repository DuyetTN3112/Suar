<script lang="ts">
  import { X } from 'lucide-svelte'

  import Button from '@/components/ui/button.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'

  interface Skill {
    id: string
    name: string
    level: string
  }

  interface Props {
    requiredSkills: Skill[]
    onAddSkill: (skill: Skill) => void
    onRemoveSkill: (skillId: string) => void
    availableSkills?: { id: string; name: string }[]
    proficiencyLevels?: { value: string; label: string }[]
    error?: string
  }

  const {
    requiredSkills = [],
    onAddSkill,
    onRemoveSkill,
    availableSkills = [],
    error,
    proficiencyLevels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'elementary', label: 'Elementary' },
      { value: 'junior', label: 'Junior' },
      { value: 'middle', label: 'Middle' },
      { value: 'senior', label: 'Senior' },
      { value: 'lead', label: 'Lead' },
      { value: 'principal', label: 'Principal' },
      { value: 'master', label: 'Master' }
    ]
  }: Props = $props()

  let selectedSkillId = $state('')
  let selectedLevel = $state('junior')

  function handleAddSkill() {
    if (!selectedSkillId) return
    if (requiredSkills.some((skill) => skill.id === selectedSkillId)) {
      selectedSkillId = ''
      return
    }
    const skill = availableSkills.find(s => s.id === selectedSkillId)
    if (!skill) return

    onAddSkill({
      id: skill.id,
      name: skill.name,
      level: selectedLevel
    })

    selectedSkillId = ''
    selectedLevel = 'junior'
  }
</script>

<div class="space-y-4">
  <div>
    <div class="text-sm font-medium text-gray-700 mb-2 block">
      Kĩ năng bắt buộc<span class="ml-1 text-red-500">*</span>
    </div>
    <div class="space-y-2">
      <div class="flex gap-2">
        <Select value={selectedSkillId} onValueChange={(val) => { selectedSkillId = String(val) }}>
          <SelectTrigger class="flex-1">
            <span>{selectedSkillId ? availableSkills.find(s => s.id === selectedSkillId)?.name : 'Chọn kĩ năng'}</span>
          </SelectTrigger>
          <SelectContent>
            {#each availableSkills as skill (skill.id)}
              <SelectItem value={skill.id} label={skill.name}>
                {skill.name}
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>

        <Select value={selectedLevel} onValueChange={(val) => { selectedLevel = String(val) }}>
          <SelectTrigger class="w-32">
            <span>{proficiencyLevels.find(l => l.value === selectedLevel)?.label ?? selectedLevel}</span>
          </SelectTrigger>
          <SelectContent>
            {#each proficiencyLevels as level (level.value)}
              <SelectItem value={level.value} label={level.label}>
                {level.label}
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>

        <Button size="sm" onclick={handleAddSkill} variant="outline">
          Thêm
        </Button>
      </div>
    </div>
    {#if error}
      <p class="text-xs text-red-500">{error}</p>
    {/if}
  </div>

  {#if requiredSkills.length > 0}
    <div>
      <div class="text-sm font-medium text-gray-700 mb-2 block">Kĩ năng đã chọn</div>
      <div class="space-y-2">
        {#each requiredSkills as skill (skill.id)}
          <div class="flex items-center justify-between p-2 bg-gray-50 rounded border">
            <div class="text-sm">
              <span class="font-medium">{skill.name}</span>
              <span class="text-gray-500"> · {skill.level}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onclick={() => { onRemoveSkill(skill.id) }}
            >
              <X class="h-4 w-4" />
            </Button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
