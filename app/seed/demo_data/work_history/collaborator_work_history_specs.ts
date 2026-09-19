import { CanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_constants'

export const COLLABORATOR_WORK_HISTORY_ROWS = [
  {
    user: 'orgAdmin',
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
          'Điều phối tốt dữ liệu năng lực và giữ được logic so sánh mức độ phù hợp theo yêu cầu dự án.',
      },
      {
        skillCode: 'problem_solving',
        skillName: 'Problem Solving',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Xử lý tốt bài toán xếp hạng dù các bên chưa thống nhất trọng số đánh giá.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content:
          'Mở rộng được tập chỉ số ghép nối năng lực và xếp hạng cho danh mục dự án liên tổ chức.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Cần thống nhất rubric cho mô hình xếp hạng sớm hơn trước vòng xác nhận.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/orgc-marketplace-ranking',
        title: 'Xây dựng mô hình xếp hạng đề xuất cộng tác - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/orgc-marketplace-ranking/walkthrough',
        title: 'Xây dựng mô hình xếp hạng đề xuất cộng tác - Video nghiệm thu',
      },
    ],
  },
  {
    user: 'orgAdmin',
    taskKey: 'orgCMarketplaceLab-bulk-05',
    overallQualityScore: 5,
    daysEarlyOrLate: 1,
    skillScores: [
      {
        skillCode: 'planning',
        skillName: 'Planning',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Điều phối phiên hỏi đáp, mốc phản hồi và trách nhiệm công bố rất rõ ràng.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content: 'Một lịch điều phối công khai giúp ứng viên và hội đồng cùng nhìn thấy kỳ vọng.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'orgc-qa-session',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/orgc-marketplace/qa-session',
        title: 'Phiên hỏi đáp công khai với ứng viên',
      },
    ],
  },
  {
    user: 'peerReviewer',
    taskKey: 'orgCMarketplaceLab-bulk-12',
    overallQualityScore: 5,
    daysEarlyOrLate: 2,
    skillScores: [
      {
        skillCode: 'code_review',
        skillName: 'Code Review',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L12,
        comment: 'Rà soát đầy đủ quyền sử dụng và truy vết từng tài sản sáng tạo về nguồn.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content: 'Checklist quyền sử dụng được đưa vào cổng nghiệm thu thay vì kiểm tra thủ công cuối kỳ.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'orgc-rights-audit',
        evidence_type: 'test_report',
        url: 'https://workbench.suar.dev/orgc-marketplace/rights-audit',
        title: 'Báo cáo quyền sử dụng tài sản sáng tạo',
      },
    ],
  },
  {
    user: 'orgBOwner',
    taskKey: 'orgBKnowledgeBase-bulk-05',
    overallQualityScore: 5,
    daysEarlyOrLate: 1,
    skillScores: [
      {
        skillCode: 'documentation',
        skillName: 'Documentation',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L12,
        comment: 'Lộ trình học liên kết rõ khoảng trống năng lực, bài thực hành và rubric đầu ra.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content: 'Người học hiểu vì sao từng bài tập xuất hiện trong lộ trình cá nhân.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'orgb-learning-path',
        evidence_type: 'api_specification',
        url: 'https://workbench.suar.dev/openlearning/learning-path',
        title: 'Đặc tả lộ trình học từ khoảng trống năng lực',
      },
    ],
  },
  {
    user: 'externalContributorOne',
    taskKey: 'orgDTalentShowcase-bulk-11',
    overallQualityScore: 5,
    daysEarlyOrLate: 2,
    skillScores: [
      {
        skillCode: 'communication',
        skillName: 'Communication',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L12,
        comment: 'Lời chứng thực giữ đúng ngữ cảnh và có xác nhận của khách hàng.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content: 'Phỏng vấn theo mốc tác động tạo lời chứng thực cụ thể hơn lời khen chung chung.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'orgd-testimonial',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/talent/testimonial-interview',
        title: 'Biên bản phỏng vấn xác thực lời chứng thực',
      },
    ],
  },
  {
    user: 'externalContributorTwo',
    taskKey: 'orgEDataOps-bulk-05',
    overallQualityScore: 5,
    daysEarlyOrLate: 1,
    skillScores: [
      {
        skillCode: 'postgresql',
        skillName: 'PostgreSQL',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L12,
        comment: 'Quy tắc phát hiện review trùng cân bằng tốt giữa uniqueness và khả năng replay.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content: 'Fingerprint theo aggregate giúp loại trùng mà vẫn giữ provenance cho audit.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'orge-review-dedupe',
        evidence_type: 'test_report',
        url: 'https://workbench.suar.dev/dataops/review-deduplication',
        title: 'Báo cáo kiểm định review trùng lặp',
      },
    ],
  },
] as const
