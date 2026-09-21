import { describe, expect, it } from 'vitest'

import { readSource } from './support/i18n_source_test_helpers.js'

const projectDetailsTabSources = [
  'inertia/apps/user/modules/projects/components/project_details_tab.svelte',
  'inertia/apps/org/modules/projects/components/project_details_tab.svelte',
] as const

const projectMembersTabSources = [
  'inertia/apps/user/modules/projects/components/project_members_tab.svelte',
  'inertia/apps/org/modules/projects/components/project_members_tab.svelte',
] as const

const projectMemberCardSources = [
  'inertia/apps/user/modules/projects/components/project_member_card.svelte',
  'inertia/apps/org/modules/projects/components/project_member_card.svelte',
] as const

const projectRolesTabSources = [
  'inertia/apps/user/modules/projects/components/project_roles_tab.svelte',
  'inertia/apps/org/modules/projects/components/project_roles_tab.svelte',
] as const

const projectRoleSkillDialogSources = [
  'inertia/apps/user/modules/projects/components/project_role_skill_dialog.svelte',
  'inertia/apps/org/modules/projects/components/project_role_skill_dialog.svelte',
] as const

const projectDetailModalSources = [
  'inertia/apps/user/modules/projects/components/project_detail_modal.svelte',
  'inertia/apps/org/modules/projects/components/project_detail_modal.svelte',
] as const

const projectShowSources = [
  'inertia/apps/user/modules/projects/show.svelte',
  'inertia/apps/org/modules/projects/show.svelte',
] as const

const projectOperatingModelSources = [
  'inertia/apps/org/modules/projects/components/project_operating_model_tab.svelte',
] as const

describe('project workspace i18n source guard', () => {
  it('routes project workspace details, members, and roles copy through translations', () => {
    for (const sourcePath of projectDetailsTabSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.details_tab.info_title'",
        "t('project.details_tab.empty_value'",
        "t('project.name'",
        "t('project.description'",
        "t('project.status'",
        "t('project.start_date'",
        "t('project.end_date'",
        "t('project.creator'",
        "t('project.manager'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Thành viên',
        'Task đang chạy',
        'Task trễ',
        'Chưa có professional role',
        'người',
        'chưa có owner',
        'thành viên chưa có delivery role',
        'professional role chưa có owner',
        'Đã đủ để tiếp tục tạo task.',
        'Thông tin dự án',
        'Mô tả',
        'Không có',
        'Trạng thái',
        'Chờ duyệt',
        'Đang thực hiện',
        'Hoàn thành',
        'Đã hủy',
        'Ngày bắt đầu',
        'Ngày kết thúc',
        'Người tạo',
        'Quản lý',
        'Tên dự án',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }

    for (const sourcePath of [
      'inertia/apps/user/modules/projects/components/project_details_tab.svelte',
    ]) {
      const source = readSource(sourcePath)

      for (const key of [
        "t('project.details_tab.members'",
        "t('project.details_tab.running_tasks'",
        "t('project.details_tab.overdue_tasks'",
        "t('project.details_tab.delivery_coverage'",
        "t('project.details_tab.role_coverage'",
        "t('project.details_tab.need_staffing'",
        "t('project.details_tab.coverage_by_role'",
        "t('project.details_tab.no_professional_role'",
        "t('project.details_tab.people_count'",
        "t('project.details_tab.no_owner'",
        "t('project.details_tab.staffing_status'",
        "t('project.details_tab.members_without_delivery_role'",
        "t('project.details_tab.roles_without_owner'",
        "t('project.details_tab.staffing_ready'",
      ]) {
        expect(source).toContain(key)
      }
    }

    for (const sourcePath of projectMembersTabSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.members'",
        "t('project.add_member'",
        "t('project.members_tab.search_label'",
        "t('project.members_tab.search_placeholder'",
        "t('project.members_tab.choose_member_label'",
        "t('project.members_tab.choose_member_placeholder'",
        "t('project.members_tab.loading'",
        "t('project.members_tab.no_candidates'",
        "t('project.members_tab.project_role_label'",
        "t('project.members_tab.delivery_role_label'",
        "t('project.members_tab.unassigned_delivery_role'",
        "t('project.members_tab.loading_roles'",
        "t('project.members_tab.submit'",
        "t('project.members_tab.staffing_clarity'",
        "t('project.members_tab.member_missing_delivery'",
        "t('project.members_tab.empty'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Tìm thành viên tổ chức',
        'Tìm theo tên hoặc email...',
        'Chọn thành viên',
        'Đang tải...',
        'Không có thành viên khả dụng',
        'Vai trò trong dự án',
        'Professional role phụ trách',
        'Chưa gán delivery role',
        'Đang tải role...',
        'member chưa có delivery role',
        'Chưa có thành viên nào',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }

    for (const sourcePath of projectMemberCardSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.member_card.governance_label'",
        "t('project.member_card.delivery_label'",
        "t('project.member_card.unassigned_role'",
        "t('project.member_card.governance_role_label'",
        "t('project.member_card.delivery_role_label'",
        "t('project.member_card.unassigned_short'",
        "t('project.member_card.remove'",
        "t('project.member_card.unassigned_delivery_role'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Chưa gán role',
        'Chưa gán',
        'Xóa',
        'Chưa gán delivery role',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }

    for (const sourcePath of projectRolesTabSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.roles_tab.load_error'",
        "t('project.roles_tab.remove_skill_title'",
        "t('project.roles_tab.remove_skill_desc'",
        "t('project.roles_tab.remove_skill_confirm'",
        "t('project.roles_tab.cancel'",
        "t('project.roles_tab.remove_skill_success'",
        "t('project.roles_tab.remove_skill_error'",
        "t('project.roles_tab.deactivate_title'",
        "t('project.roles_tab.deactivate_desc'",
        "t('project.roles_tab.deactivate_confirm'",
        "t('project.roles_tab.deactivate_success'",
        "t('project.roles_tab.deactivate_error'",
        "t('project.roles_tab.active_count'",
        "t('project.roles_tab.add_role'",
        "t('project.roles_tab.loading'",
        "t('project.roles_tab.empty'",
        "t('project.roles_tab.completeness'",
        "t('project.roles_tab.skills_count'",
        "t('project.roles_tab.candidates'",
        "t('project.roles_tab.create_task'",
        "t('project.roles_tab.add_skill'",
        "t('project.roles_tab.empty_skills'",
        "t('project.roles_tab.mandatory'",
        "`project.roles_tab.importance.${importance}`",
        "t('project.roles_tab.edit'",
        "t('project.roles_tab.delete'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Không thể tải dữ liệu professional roles',
        'Xóa skill khỏi role',
        'khỏi role này?',
        'Hủy',
        'Đã xóa skill khỏi role',
        'Lỗi xóa skill',
        'Tắt professional role',
        'không thể dùng cho task mới',
        'Đã tắt role',
        'Lỗi tắt role',
        'role đang active',
        'Thêm Role',
        'Chưa có role.',
        'Cấu hình hoàn chỉnh',
        'Ứng viên',
        'Tạo task',
        'Thêm Skill',
        'Chưa có skill.',
        'Bắt buộc',
        'Sửa',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }

    for (const sourcePath of projectRoleSkillDialogSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.role_skill_dialog.update_success'",
        "t('project.role_skill_dialog.add_success'",
        "t('project.role_skill_dialog.save_error'",
        "t('project.role_skill_dialog.edit_title'",
        "t('project.role_skill_dialog.add_title'",
        "t('project.role_skill_dialog.skill_label'",
        "t('project.role_skill_dialog.skill_placeholder'",
        "t('project.role_skill_dialog.all_skills_added'",
        "t('project.role_skill_dialog.importance_label'",
        "`project.role_skill_dialog.importance.${level}`",
        "t('project.role_skill_dialog.weight_label'",
        "t('project.role_skill_dialog.mandatory_full'",
        "t('project.role_skill_dialog.mandatory_short'",
        "t('project.role_skill_dialog.cancel'",
        "t('project.role_skill_dialog.save'",
        "t('project.role_skill_dialog.add_skill'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Đã cập nhật cấu hình skill',
        'Đã thêm skill vào role',
        'Lỗi lưu cấu hình',
        'Sửa cấu hình Skill trong Role',
        'Thêm Skill vào Role',
        'Chọn Skill từ Catalog',
        'Chọn skill',
        'Role này đã có toàn bộ skill active trong Catalog.',
        'Mức độ quan trọng',
        'Trọng số',
        'Bắt buộc phải đạt level tối thiểu',
        'Bắt buộc',
        'Hủy',
        'Lưu thay đổi',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })

  it('routes project show shells, detail modals, and operating model copy through translations', () => {
    for (const sourcePath of projectDetailModalSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.project_detail'",
        "t('project.deleted'",
        "t('project.detail_modal.update_success'",
        "t('project.detail_modal.update_error'",
        "t('project.detail_modal.organization_prefix'",
        "t('project.detail_modal.cancel_edit'",
        "t('project.detail_modal.saving'",
        "t('project.detail_modal.save'",
        "t('project.detail_modal.edit'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Lỗi khi tải dữ liệu',
        'Xác nhận xóa',
        'Bạn có chắc chắn muốn xóa?',
        'Dự án đã được xóa',
        'Lỗi khi xóa',
        'Đã cập nhật dự án thành công',
        'Không thể cập nhật dự án',
        'Đang tải...',
        'Chi tiết dự án',
        'Tổ chức:',
        'Tên dự án',
        'Trạng thái',
        'Mô tả',
        'Ngày bắt đầu',
        'Ngày kết thúc',
        'Thành viên',
        'Đóng',
        'Hủy sửa',
        'Đang lưu...',
        'Lưu',
        'Sửa',
        'Đang xóa...',
        'Xóa',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toContain('text-gray-700')
      expect(source).not.toContain('text-gray-600')
    }

    for (const sourcePath of projectShowSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.show_page.delete_error'",
        "t('project.show_page.name_required'",
        "t('project.show_page.update_success'",
        "t('project.show_page.update_error'",
        "t('project.show_page.shell_org_detail'",
        "t('project.show_page.shell_user_detail'",
        "t('project.show_page.cancel_edit'",
        "t('project.show_page.saving'",
        "t('project.show_page.save'",
        "t('project.show_page.edit'",
        "t('project.show_page.delete'",
        "t('project.show_page.confirm_delete_project_title'",
        "t('project.show_page.confirm_remove_member_title'",
        "t('project.show_page.confirm_delete_project_desc'",
        "t('project.show_page.confirm_remove_member_desc'",
        "t('project.show_page.cancel'",
        "t('project.show_page.confirm'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Không thể xóa dự án',
        'Tên dự án là bắt buộc',
        'Đã cập nhật dự án',
        'Không thể cập nhật dự án',
        'Hủy sửa',
        'Đang lưu...',
        'Lưu',
        'Sửa',
        'Xóa',
        'Xóa dự án',
        'Xóa thành viên khỏi dự án',
        'Bạn có chắc chắn muốn xóa dự án này?',
        'Bạn có chắc chắn muốn xóa thành viên này khỏi dự án?',
        'Xác nhận',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }

    const userShowSource = readSource('inertia/apps/user/modules/projects/show.svelte')
    for (const key of [
      "t('project.show_page.review_governance_title'",
      "t('project.show_page.review_sessions'",
      "t('project.show_page.completed_summary'",
      "t('project.show_page.pending_reviews'",
      "t('project.show_page.required_pending'",
      "t('project.show_page.overdue'",
      "t('project.show_page.fallback_pending'",
      "t('project.show_page.disputes'",
      "t('project.show_page.dispute_hint'",
      "t('project.show_page.tab_details'",
      "t('project.show_page.tab_members'",
      "t('project.show_page.tab_skills'",
      "t('project.show_page.tab_roles'",
    ]) {
      expect(userShowSource).toContain(key)
    }

    for (const forbidden of [
      'Hoàn thành',
      'Đang chờ review',
      'Reviewer bắt buộc còn nợ',
      'Quá hạn',
      'Reviewer dự phòng chờ',
      'Tranh chấp',
      'Cần theo dõi để không khóa profile kéo dài',
      'Tổng quan',
    ]) {
      expect(userShowSource).not.toContain(forbidden)
    }

    const orgShowSource = readSource('inertia/apps/org/modules/projects/show.svelte')
    for (const key of [
      "t('project.show_page.operating_model_title'",
      "t('project.show_page.sprint_section_label'",
      "t('project.show_page.sprint_eyebrow'",
      "t('project.show_page.sprint_title'",
      "t('project.show_page.sprint_desc'",
    ]) {
      expect(orgShowSource).toContain(key)
    }

    for (const forbidden of [
      'Sprint của project',
      'Quản lý project',
      'Kết thúc sprint hiện tại',
    ]) {
      expect(orgShowSource).not.toContain(forbidden)
    }

    for (const sourcePath of projectOperatingModelSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.operating_model.title'",
        "t('project.operating_model.description'",
        "t('project.operating_model.role_setup_title'",
        "t('project.operating_model.role_setup_desc'",
        "t('project.operating_model.definition_title'",
        "t('project.operating_model.definition_desc'",
        "t('project.operating_model.sprint_skip_title'",
        "t('project.operating_model.sprint_skip_desc'",
        "t('project.operating_model.preset_title'",
        "t('project.operating_model.no_roles'",
        "t('project.operating_model.review_owner'",
        "t('project.operating_model.create_task'",
        "t('project.operating_model.skill_ranges'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Task Factory tạo task từ role',
        'Role setup trước',
        'Role và skill dùng làm nguồn',
        'Task cần evidence',
        'Sprint bỏ qua demo',
        'Sprint là tùy chọn',
        'Preset tạo task',
        'Chưa có role active sẵn sàng',
        'Tạo task',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })
})
