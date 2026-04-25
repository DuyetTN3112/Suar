import { skillApplication as skillPublicApi } from '#composition/skills/skill-application/skills_application_composition'

export const skillTestingApi = {
  createCustomProjectRole: skillPublicApi.createCustomProjectRole.bind(skillPublicApi),
  addSkillToProject: skillPublicApi.addSkillToProject.bind(skillPublicApi),
  addSkillToProjectRole: skillPublicApi.addSkillToProjectRole.bind(skillPublicApi),
}
