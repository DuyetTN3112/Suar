import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import TaskRolePrefillPanel from '@/apps/user/modules/tasks/components/detail/task_role_prefill_panel.svelte'
import type { TaskCreateFormData } from '@/apps/user/modules/tasks/types/create_form_types'

describe('TaskRolePrefillPanel', () => {
  type JsonResponse = { json: () => Promise<unknown> }
  const fetchMock = vi.fn<(input: string | URL) => Promise<JsonResponse>>()

  function getRequestUrl(input: string | URL): string {
    return typeof input === 'string' ? input : input.toString()
  }

  beforeEach(() => {
    fetchMock.mockImplementation((input) => {
      const url = getRequestUrl(input)

      if (url === '/api/v1/projects/project-1/professional-roles') {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              data: [
                { id: 'role-1', name: 'Backend Developer', code: 'backend_engineer' },
                { id: 'role-2', name: 'Quality Reviewer', code: 'quality_reviewer' },
              ],
            }),
        })
      }

      if (url === '/api/v1/projects/project-1/professional-roles/role-1/requirements') {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              data: {
                requirements: [
                  {
                    skillId: 'skill-1',
                    skillName: 'TypeScript',
                    categoryCode: 'technology',
                    requiredLevelCode: 'l7',
                  },
                ],
              },
            }),
        })
      }

      return Promise.reject(new Error(`Unhandled fetch ${url}`))
    })

    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('auto-prefills role skills and suggests matching project member on selection', async () => {
    let currentFormData: TaskCreateFormData = {
      title: '',
      description: '',
      task_status_id: 'todo',
      task_type: 'feature_development',
      verification_method: 'code_review',
      project_id: 'project-1',
      priority: '',
      label: '',
      task_visibility: 'internal',
      assigned_to: '',
      due_date: '',
      parent_task_id: '',
      estimated_time: '0',
      required_skills: [],
      acceptance_criteria: '',
      context_background: '',
      role_in_task: '',
      business_domain: '',
      problem_category: '',
      tech_stack_text: '',
      learning_objectives_text: '',
      domain_tags_text: '',
    }

    const setFormData = (updater: (prev: TaskCreateFormData) => TaskCreateFormData) => {
      currentFormData = updater(currentFormData)
    }

    render(TaskRolePrefillPanel, {
      props: {
        projectId: 'project-1',
        assignedTo: '',
        requestedTaskType: '',
        requestedRoleId: '',
        assigneeGroups: {
          projectMembers: [
            {
              id: 'user-1',
              username: 'alex',
              email: 'alex@example.com',
              governanceRole: 'project_member',
              deliveryRoleName: 'Backend Developer',
              projectProfessionalRoleId: 'role-1',
            },
          ],
          orgMembersOutsideProject: [],
        },
        setFormData,
        projectProfessionalRoleId: '',
      },
    })

    await waitFor(() => {
      expect(screen.getByText(/Backend Developer/i)).toBeInTheDocument()
      expect(screen.getByText(/Quality Reviewer/i)).toBeInTheDocument()
    })

    await fireEvent.change(screen.getByLabelText('Áp theo role'), {
      target: { value: 'role-1' },
    })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/projects/project-1/professional-roles/role-1/requirements'
      )
      expect(currentFormData.required_skills).toHaveLength(1)
      expect(currentFormData.required_skills[0]?.name).toBe('TypeScript')
      expect(currentFormData.assigned_to).toBe('user-1')
      expect(screen.getByText('1 skill')).toBeInTheDocument()
      expect(screen.getByText('1 phù hợp')).toBeInTheDocument()
      expect(screen.getByText('alex')).toBeInTheDocument()
    })
  })
})
