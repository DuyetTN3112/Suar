import { CanonicalProficiencyLevelCode } from '#modules/skills/constants/proficiency_level_constants'

export const SEED_USER_WORK_HISTORY_ROWS = [
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
        content:
          'Nắm rất nhanh logic quyền theo organization và chủ động đề xuất checklist test.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Có thể bổ sung thêm automation coverage cho đường dẫn redirect.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/member-org-switch',
        title: 'Hoàn thiện luồng chuyển organization theo role - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/member-org-switch/walkthrough',
        title: 'Hoàn thiện luồng chuyển organization theo role - Recorded walkthrough',
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
        comment: 'Có checklist verify profile proof và share link.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content:
          'Kết nối tốt dữ liệu từ review sang profile snapshot và tổng hợp đúng các proof cần hiển thị.',
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
        title: 'Xuất profile proof và snapshot công khai - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/member-profile-proof/walkthrough',
        title: 'Xuất profile proof và snapshot công khai - Recorded walkthrough',
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
        content: 'Tài liệu kiểm thử rõ ràng, dễ dùng cho admin redirect regression.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Nên thêm một case cho current_organization_id null.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/member-admin-regression',
        title: 'Chuẩn bị regression pack cho admin redirect - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/member-admin-regression/walkthrough',
        title: 'Chuẩn bị regression pack cho admin redirect - Recorded walkthrough',
      },
    ],
  },
  {
    user: 'owner',
    taskKey: 'orgb-navigation-qa',
    overallQualityScore: 4,
    daysEarlyOrLate: 0,
    wasOnTime: true,
    skillScores: [
      {
        skillCode: 'testing',
        skillName: 'Testing & QA',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment:
          'Giữ được browser history và current organization ổn định sau khi chuyển admin mode.',
      },
      {
        skillCode: 'communication',
        skillName: 'Communication',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Mô tả rõ được các case context owner/member ở org B cho team cùng verify.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content:
          'Giữ được browser history và current organization ổn định trong case member-only của org B.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Cần thêm automation cho browser back/forward để khóa regression navigation.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/orgb-navigation-qa',
        title: 'Kiểm thử navigation sau khi quay lại từ admin mode - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/orgb-navigation-qa/walkthrough',
        title: 'Kiểm thử navigation sau khi quay lại từ admin mode - Recorded walkthrough',
      },
    ],
  },
  {
    user: 'owner',
    taskKey: 'owner-profile-scoring-loop',
    isPublic: true,
    isFeatured: true,
    overallQualityScore: 5,
    daysEarlyOrLate: 1,
    wasOnTime: true,
    skillScores: [
      {
        skillCode: 'postgresql',
        skillName: 'PostgreSQL',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Thiết kế truy vấn aggregate ổn định và giữ đúng transaction boundary.',
      },
      {
        skillCode: 'problem_solving',
        skillName: 'Problem Solving',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Bóc tách nguyên nhân chậm score refresh rõ ràng và có hướng xử lý cụ thể.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content:
          'Đóng vòng đầy đủ review-confirmed -> aggregate refresh -> snapshot update cho owner profile.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Cần thêm monitor cho cache miss spikes khi traffic tăng.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/owner-profile-scoring-loop',
        title: 'Đồng bộ profile scoring sau khi review được xác nhận - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/owner-profile-scoring-loop/walkthrough',
        title: 'Đồng bộ profile scoring sau khi review được xác nhận - Recorded walkthrough',
      },
    ],
  },
  {
    user: 'owner',
    taskKey: 'owner-data-governance',
    isPublic: true,
    isFeatured: false,
    overallQualityScore: 4,
    daysEarlyOrLate: 0,
    wasOnTime: true,
    skillScores: [
      {
        skillCode: 'leadership',
        skillName: 'Leadership',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L12,
        comment: 'Điều phối tốt phạm vi dữ liệu vận hành nhiều role và nhiều organization.',
      },
      {
        skillCode: 'code_review',
        skillName: 'Code Review',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L7,
        comment: 'Checklist review dữ liệu quản trị rõ ràng và dễ đối soát lại trên UI.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content:
          'Điều phối được dữ liệu vận hành đa vai trò đủ cho owner, member và superadmin cùng dùng.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Cần thêm automation cho reset/sync datastore để full verify ổn định hơn.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/owner-data-governance',
        title: 'Điều phối bộ dữ liệu vận hành đa vai trò - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/owner-data-governance/walkthrough',
        title: 'Điều phối bộ dữ liệu vận hành đa vai trò - Recorded walkthrough',
      },
    ],
  },
  {
    user: 'owner',
    taskKey: 'owner-review-dispute-case',
    overallQualityScore: 3,
    daysEarlyOrLate: 1,
    wasOnTime: false,
    skillScores: [
      {
        skillCode: 'testing',
        skillName: 'Testing & QA',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L7,
        comment: 'Có evidence đầy đủ nhưng review bị disputed do rubric chưa rõ.',
      },
      {
        skillCode: 'problem_solving',
        skillName: 'Problem Solving',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Xử lý tình huống dispute có cấu trúc và biết tạo follow-up.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_improvement',
        content: 'Cần chuẩn hóa rubric scoring để giảm dispute trong review tiếp theo.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'test_report',
        url: 'https://workbench.suar.dev/owner-review-dispute-case/report',
        title: 'Báo cáo dispute review cho owner profile scoring',
      },
    ],
  },
  {
    user: 'owner',
    taskKey: 'orgc-marketplace-ranking',
    overallQualityScore: 4,
    daysEarlyOrLate: -1,
    wasOnTime: false,
    skillScores: [
      {
        skillCode: 'postgresql',
        skillName: 'PostgreSQL',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment:
          'Điều phối tốt dữ liệu package analytics và giữ được logic so sánh adoption theo gói.',
      },
      {
        skillCode: 'problem_solving',
        skillName: 'Problem Solving',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment:
          'Xử lý tốt bài toán package ranking dù phiên review đi vào trạng thái disputed.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content:
          'Mở rộng được dataset package adoption và ranking cho admin dashboard đa organization.',
      },
      {
        type: 'retrospective_improvement',
        content:
          'Cần chốt rubric review cho package analytics sớm hơn để tránh dispute ở vòng xác nhận.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/orgc-marketplace-ranking',
        title: 'So sánh package Pro và ProMax trong ranking của marketplace - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/orgc-marketplace-ranking/walkthrough',
        title: 'So sánh package Pro và ProMax trong ranking của marketplace - Recorded walkthrough',
      },
    ],
  },
] as const
