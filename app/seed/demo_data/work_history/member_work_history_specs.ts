import { CanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_constants'

export const MEMBER_WORK_HISTORY_ROWS = [
  {
    user: 'member',
    taskKey: 'member-org-switch',
    overallQualityScore: 5,
    daysEarlyOrLate: 2,
    skillScores: [
      {
        skillCode: 'typescript',
        skillName: 'TypeScript',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Xử lý state và typing tốt, không để lọt case role mismatch.',
      },
      {
        skillCode: 'communication',
        skillName: 'Communication',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L7,
        comment: 'Trao đổi rõ các case edge và báo tiến độ đều.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content: 'Nắm nhanh mô hình phân quyền đa tổ chức và chủ động đề xuất ma trận kiểm định.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Có thể bổ sung giám sát tự động cho các nhánh điều hướng quan trọng.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/member-org-switch',
        title: 'Phân quyền theo không gian làm việc đa tổ chức - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/member-org-switch/walkthrough',
        title: 'Phân quyền theo không gian làm việc đa tổ chức - Video nghiệm thu',
      },
    ],
  },
  {
    user: 'member',
    taskKey: 'member-profile-proof',
    overallQualityScore: 5,
    daysEarlyOrLate: 2,
    skillScores: [
      {
        skillCode: 'postgresql',
        skillName: 'PostgreSQL',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L7,
        comment: 'Dựng dữ liệu profile aggregate chắc tay, nắm rõ bảng review và snapshot.',
      },
      {
        skillCode: 'problem_solving',
        skillName: 'Problem Solving',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Biết lần theo dependency dữ liệu khi UI hiển thị tĩnh.',
      },
      {
        skillCode: 'testing',
        skillName: 'Testing & QA',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L7,
        comment: 'Có ma trận nghiệm thu đầy đủ cho hồ sơ năng lực và liên kết chia sẻ.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content:
          'Kết nối tốt dữ liệu đánh giá với hồ sơ năng lực và tổng hợp đúng các chứng cứ cần công bố.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Cần tinh gọn thêm luồng invalidate cache profile.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/member-profile-proof',
        title: 'Xuất bản hồ sơ năng lực có chứng cứ - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/member-profile-proof/walkthrough',
        title: 'Xuất bản hồ sơ năng lực có chứng cứ - Video nghiệm thu',
      },
    ],
  },
  {
    user: 'member',
    taskKey: 'member-admin-regression',
    overallQualityScore: 4,
    daysEarlyOrLate: 1,
    skillScores: [
      {
        skillCode: 'testing',
        skillName: 'Testing & QA',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L7,
        comment: 'Checklist hợp lý và bám sát bug report.',
      },
      {
        skillCode: 'communication',
        skillName: 'Communication',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Tài liệu rõ và có giải thích được tình huống back button.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content: 'Tài liệu nghiệm thu rõ ràng, dễ sử dụng cho các thay đổi điều hướng quản trị.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Nên bổ sung tình huống người dùng chưa chọn tổ chức mặc định.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/member-admin-regression',
        title: 'Kiểm định điều hướng theo vai trò quản trị - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/member-admin-regression/walkthrough',
        title: 'Kiểm định điều hướng theo vai trò quản trị - Video nghiệm thu',
      },
    ],
  },
] as const
