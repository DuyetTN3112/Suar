import ValidationException from '#modules/http/exceptions/validation_exception'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'

export interface UpdateProjectMemberDTOInterface {
  project_id: string
  user_id: string
  project_role: ProjectRole | string
}

export class UpdateProjectMemberDTO implements UpdateProjectMemberDTOInterface {
  public readonly project_id: string
  public readonly user_id: string
  public readonly project_role: ProjectRole | string

  constructor(data: UpdateProjectMemberDTOInterface) {
    this.validateInput(data)
    this.project_id = data.project_id
    this.user_id = data.user_id
    this.project_role = data.project_role
  }

  private validateInput(data: UpdateProjectMemberDTOInterface): void {
    if (!data.project_id) {
      throw new ValidationException('ID dự án không hợp lệ')
    }
    if (!data.user_id) {
      throw new ValidationException('ID người dùng không hợp lệ')
    }
    const validRoles = Object.values(ProjectRole) as string[]
    if (!validRoles.includes(data.project_role)) {
      throw new ValidationException('Vai trò dự án không hợp lệ')
    }
  }
}
