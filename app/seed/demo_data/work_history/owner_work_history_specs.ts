import { CanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_constants'

export const OWNER_WORK_HISTORY_ROWS = [
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
        comment: 'Giữ được lịch sử điều hướng và tổ chức hiện tại ổn định sau khi chuyển vai trò.',
      },
      {
        skillCode: 'communication',
        skillName: 'Communication',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Mô tả rõ các tình huống chủ sở hữu và thành viên để đội ngũ cùng đối soát.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content:
          'Giữ được lịch sử điều hướng và tổ chức hiện tại ổn định trong vai trò thành viên.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Cần thêm giám sát tự động cho thao tác quay lại và tiến tới trên trình duyệt.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/orgb-navigation-qa',
        title: 'Chuẩn hóa hành trình học viên giữa các học viện - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/orgb-navigation-qa/walkthrough',
        title: 'Chuẩn hóa hành trình học viên giữa các học viện - Video nghiệm thu',
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
          'Hoàn thiện vòng xác nhận đánh giá, cập nhật chỉ số tổng hợp và xuất bản hồ sơ năng lực.',
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
        title: 'Đồng bộ điểm năng lực sau phiên đánh giá - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/owner-profile-scoring-loop/walkthrough',
        title: 'Đồng bộ điểm năng lực sau phiên đánh giá - Video nghiệm thu',
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
        comment: 'Điều phối tốt phạm vi dữ liệu vận hành qua nhiều vai trò và tổ chức.',
      },
      {
        skillCode: 'code_review',
        skillName: 'Code Review',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L7,
        comment: 'Quy trình rà soát dữ liệu quản trị rõ ràng và dễ đối chiếu trên sản phẩm.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content:
          'Điều phối được dữ liệu vận hành phù hợp cho chủ sở hữu, thành viên và quản trị hệ thống.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Cần tăng cường giám sát đồng bộ dữ liệu để quá trình đối soát ổn định hơn.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/owner-data-governance',
        title: 'Xây dựng quy chuẩn quản trị dữ liệu đánh giá - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/owner-data-governance/walkthrough',
        title: 'Xây dựng quy chuẩn quản trị dữ liệu đánh giá - Video nghiệm thu',
      },
    ],
  },
  {
    user: 'owner',
    taskKey: 'owner-evidence-architecture',
    isPublic: true,
    isFeatured: true,
    overallQualityScore: 5,
    daysEarlyOrLate: 2,
    wasOnTime: true,
    skillScores: [
      {
        skillCode: 'system_design',
        skillName: 'System Design',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L12,
        comment: 'Kiến trúc rõ ràng, có khả năng mở rộng và truy vết tốt qua nhiều mô-đun.',
      },
      {
        skillCode: 'leadership',
        skillName: 'Leadership',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Điều phối hiệu quả giữa nhóm sản phẩm, dữ liệu và đảm bảo chất lượng.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'architecture_decision',
        content:
          'Chuỗi chứng cứ sử dụng task assignment làm điểm neo để giữ quan hệ nhất quán giữa bàn giao, đánh giá và hồ sơ.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Bổ sung sơ đồ lineage tự động khi có thay đổi schema.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/owner-evidence-architecture',
        title: 'Thiết kế kiến trúc hồ sơ chứng cứ liên mô-đun - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'architecture_record',
        url: 'https://workbench.suar.dev/owner-evidence-architecture/decision-record',
        title: 'Biên bản quyết định kiến trúc hồ sơ chứng cứ',
      },
    ],
  },
  {
    user: 'owner',
    taskKey: 'owner-release-governance',
    isPublic: true,
    isFeatured: true,
    overallQualityScore: 5,
    daysEarlyOrLate: 1,
    wasOnTime: true,
    skillScores: [
      {
        skillCode: 'risk_tracking',
        skillName: 'Risk Tracking',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Ma trận rủi ro thực tế và liên kết tốt với quyết định go/no-go.',
      },
      {
        skillCode: 'release_management',
        skillName: 'Release Management',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Quy trình phát hành cân bằng tốt giữa tốc độ và chất lượng.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'release_playbook',
        content:
          'Cổng phát hành gồm tiêu chí chất lượng, chủ sở hữu tín hiệu, ngưỡng rủi ro và phương án rollback.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'release_report',
        url: 'https://workbench.suar.dev/owner-release-governance/release-gate',
        title: 'Biên bản cổng quản trị chất lượng phát hành',
      },
    ],
  },
  {
    user: 'owner',
    taskKey: 'owner-impact-analytics',
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
        assignedLevelCode: CanonicalProficiencyLevelCode.L12,
        comment: 'Mô hình tổng hợp tối ưu, dễ kiểm toán và giữ được nguồn gốc chỉ số.',
      },
      {
        skillCode: 'problem_solving',
        skillName: 'Problem Solving',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Chọn đúng chỉ số để phản ánh tác động thay vì chỉ mô tả hoạt động.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'metric_dictionary',
        content:
          'Từ điển chỉ số mô tả công thức, nguồn dữ liệu, tần suất cập nhật và giới hạn diễn giải.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'analytics_report',
        url: 'https://workbench.suar.dev/owner-impact-analytics/metric-dictionary',
        title: 'Từ điển chỉ số tác động và độ tin cậy',
      },
    ],
  },
  {
    user: 'owner',
    taskKey: 'owner-profile-api-contract',
    isPublic: true,
    isFeatured: false,
    overallQualityScore: 5,
    daysEarlyOrLate: 1,
    wasOnTime: true,
    skillScores: [
      {
        skillCode: 'api_design',
        skillName: 'API Design',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L12,
        comment: 'Thiết kế API nhất quán, có phân quyền và chiến lược deprecation rõ ràng.',
      },
      {
        skillCode: 'documentation',
        skillName: 'Documentation',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Tài liệu giúp đội tích hợp hiểu nhanh mô hình dữ liệu và trường hợp lỗi.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'api_contract',
        content:
          'Hợp đồng API tách dữ liệu công khai, dữ liệu riêng tư và metadata phục vụ kiểm toán.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'api_specification',
        url: 'https://workbench.suar.dev/owner-profile-api-contract/openapi',
        title: 'Đặc tả API hồ sơ năng lực',
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
        comment: 'Chứng cứ đầy đủ nhưng điểm đánh giá chưa phản ánh trọn vẹn phạm vi nghiệm thu.',
      },
      {
        skillCode: 'problem_solving',
        skillName: 'Problem Solving',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Trình bày yêu cầu đối soát có cấu trúc và đề xuất hành động tiếp theo rõ ràng.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_improvement',
        content: 'Cần làm rõ rubric chấm điểm để giảm khác biệt diễn giải trong các kỳ tiếp theo.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'test_report',
        url: 'https://workbench.suar.dev/owner-review-dispute-case/report',
        title: 'Báo cáo đối soát bộ tiêu chí kiểm định chất lượng dữ liệu',
      },
    ],
  },
] as const
