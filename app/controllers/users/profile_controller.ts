import type { HttpContext } from '@adonisjs/core/http'
import GetUserProfileQuery, { GetUserProfileDTO } from '#actions/users/queries/get_user_profile_query'
import GetUserSkillsQuery, { GetUserSkillsDTO } from '#actions/users/queries/get_user_skills_query'
import GetSpiderChartDataQuery, { GetSpiderChartDataDTO } from '#actions/users/queries/get_spider_chart_data_query'
import UpdateUserDetailsCommand from '#actions/users/commands/update_user_details_command'
import AddUserSkillCommand from '#actions/users/commands/add_user_skill_command'
import RemoveUserSkillCommand from '#actions/users/commands/remove_user_skill_command'
import UpdateUserSkillCommand from '#actions/users/commands/update_user_skill_command'
import { UpdateUserDetailsDTO } from '#actions/users/dtos/update_user_details_dto'
import { AddUserSkillDTO, UpdateUserSkillDTO, RemoveUserSkillDTO } from '#actions/users/dtos/user_skill_dtos'
import Skill from '#models/skill'
import SkillCategory from '#models/skill_category'
import ProficiencyLevel from '#models/proficiency_level'

export default class ProfileController {
  /**
   * Display user's own profile
   */
  async show(ctx: HttpContext) {
    const userId = ctx.auth.user!.id
    const query = new GetUserProfileQuery(ctx)
    const user = await query.handle(new GetUserProfileDTO(userId))

    // Get spider chart data for soft skills visualization
    const spiderChartQuery = new GetSpiderChartDataQuery(ctx)
    const spiderChartData = await spiderChartQuery.handle(new GetSpiderChartDataDTO(userId))

    // Calculate profile completeness
    const completeness = this.calculateProfileCompleteness(user)

    return ctx.inertia.render('profile/show', {
      user: user.serialize(),
      completeness,
      spiderChartData,
    })
  }

  /**
   * Display profile edit form
   */
  async edit(ctx: HttpContext) {
    const userId = ctx.auth.user!.id
    const query = new GetUserProfileQuery(ctx)
    const user = await query.handle(new GetUserProfileDTO(userId))

    // Get available skills grouped by category
    const skills = await Skill.query().where('is_active', true).preload('category').orderBy('skill_name')

    // Get skill categories
    const categories = await SkillCategory.query().where('is_active', true).orderBy('display_order')

    // Get proficiency levels for dropdown
    const proficiencyLevels = await ProficiencyLevel.query().orderBy('level_order')

    // Get user's current skills
    const skillsQuery = new GetUserSkillsQuery(ctx)
    const userSkills = await skillsQuery.handle(new GetUserSkillsDTO(userId))

    // Calculate profile completeness
    const completeness = this.calculateProfileCompleteness(user)

    return ctx.inertia.render('profile/edit', {
      user: user.serialize(),
      completeness,
      availableSkills: skills.map((s) => s.serialize()),
      categories: categories.map((c) => c.serialize()),
      proficiencyLevels: proficiencyLevels.map((p) => p.serialize()),
      userSkills,
    })
  }

  /**
   * Update user details (bio, avatar, freelancer info, etc.)
   */
  async updateDetails(ctx: HttpContext) {
    const { request, response, session } = ctx

    try {
      const dto = new UpdateUserDetailsDTO(request.all())
      const command = new UpdateUserDetailsCommand(ctx)
      await command.handle(dto)

      session.flash('success', 'Profile updated successfully')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update profile'
      session.flash('error', message)
    }

    return response.redirect().back()
  }

  /**
   * Add a skill to user's profile
   */
  async addSkill(ctx: HttpContext) {
    const { request, response, session } = ctx

    try {
      const dto = new AddUserSkillDTO(
        request.input('skill_id'),
        request.input('proficiency_level_id')
      )
      const command = new AddUserSkillCommand(ctx)
      await command.handle(dto)

      session.flash('success', 'Skill added successfully')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add skill'
      session.flash('error', message)
    }

    return response.redirect().back()
  }

  /**
   * Update skill proficiency level
   */
  async updateSkill(ctx: HttpContext) {
    const { request, response, session, params } = ctx

    try {
      const dto = new UpdateUserSkillDTO(
        Number(params.id),
        request.input('proficiency_level_id')
      )
      const command = new UpdateUserSkillCommand(ctx)
      await command.handle(dto)

      session.flash('success', 'Skill updated successfully')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update skill'
      session.flash('error', message)
    }

    return response.redirect().back()
  }

  /**
   * Remove a skill from user's profile
   */
  async removeSkill(ctx: HttpContext) {
    const { response, session, params } = ctx

    try {
      const dto = new RemoveUserSkillDTO(Number(params.id))
      const command = new RemoveUserSkillCommand(ctx)
      await command.handle(dto)

      session.flash('success', 'Skill removed successfully')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove skill'
      session.flash('error', message)
    }

    return response.redirect().back()
  }

  /**
   * View another user's public profile
   */
  async viewUser(ctx: HttpContext) {
    const { params } = ctx
    const userId = Number(params.id)

    const query = new GetUserProfileQuery(ctx)
    const user = await query.handle(new GetUserProfileDTO(userId))

    // Get spider chart data for soft skills visualization
    const spiderChartQuery = new GetSpiderChartDataQuery(ctx)
    const spiderChartData = await spiderChartQuery.handle(new GetSpiderChartDataDTO(userId))

    const isOwnProfile = ctx.auth.user?.id === userId
    const completeness = this.calculateProfileCompleteness(user)

    return ctx.inertia.render('profile/view', {
      user: user.serialize(),
      completeness,
      spiderChartData,
      isOwnProfile,
    })
  }

  /**
   * Calculate profile completeness percentage
   */
  private calculateProfileCompleteness(user: any): number {
    const fields = [
      user.username,
      user.email,
      user.detail?.avatar_url,
      user.detail?.bio,
      user.detail?.phone,
      user.skills?.length > 0,
    ]

    const filledFields = fields.filter(Boolean).length
    return Math.round((filledFields / fields.length) * 100)
  }

  /**
   * @deprecated Settings moved to settings controller
   */
  async updateSettings(ctx: HttpContext) {
    const { response, session } = ctx
    session.flash('info', 'This feature has been moved to the settings page')
    return response.redirect().toRoute('settings.index')
  }
}
