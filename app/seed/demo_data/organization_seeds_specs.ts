import type { OrgKey, UserKey } from './types.js'

export interface OrgSpec {
  name: string
  slug: string
  owner: UserKey
  plan: 'starter' | 'professional'
  description: string
}

export const SEED_ORGANIZATIONS_SPECS: Record<OrgKey, OrgSpec> = {
  orgA: {
    name: 'Suar Product Studio',
    slug: 'suar-product-studio',
    owner: 'owner',
    plan: 'professional',
    description:
      'Đội ngũ phát triển nền tảng Suar, kết nối quản trị dự án, đánh giá năng lực, hồ sơ chứng cứ và cộng tác chuyên gia.',
  },
  orgB: {
    name: 'Học viện Kỹ năng Số Mở',
    slug: 'open-digital-skills-academy',
    owner: 'orgBOwner',
    plan: 'starter',
    description:
      'Tổ chức giáo dục xây dựng khung năng lực số, chương trình học theo dự án và mạng lưới cố vấn công nghệ.',
  },
  orgC: {
    name: 'Xưởng Sáng tạo Mekong',
    slug: 'mekong-creative-studio',
    owner: 'peerReviewer',
    plan: 'starter',
    description:
      'Xưởng sáng tạo kết nối chuyên gia nội dung, thiết kế và công nghệ cho các dự án chuyển đổi số.',
  },
  orgD: {
    name: 'Mạng lưới Chuyên gia Việt',
    slug: 'vietnam-expert-network',
    owner: 'externalContributorOne',
    plan: 'professional',
    description:
      'Mạng lưới chuyên gia độc lập với hồ sơ năng lực được xác thực và quy trình cộng tác minh bạch.',
  },
  orgE: {
    name: 'Phòng thí nghiệm Dữ liệu Tin cậy',
    slug: 'trusted-data-lab',
    owner: 'externalContributorTwo',
    plan: 'professional',
    description:
      'Đơn vị nghiên cứu chất lượng dữ liệu, truy vết nguồn gốc và các mô hình ra quyết định dựa trên chứng cứ.',
  },
  orgF: {
    name: 'Liên minh Sản phẩm Mở',
    slug: 'open-product-alliance',
    owner: 'backendSpecialist',
    plan: 'professional',
    description:
      'Liên minh kỹ sư sản phẩm mở vận hành review chất lượng, trải nghiệm nhà phát triển và phát hành tin cậy bằng dữ liệu từ vòng đời thay đổi.',
  },
  orgG: {
    name: 'Trung tâm Dịch vụ Công số',
    slug: 'civic-digital-service-center',
    owner: 'civicServiceLead',
    plan: 'professional',
    description:
      'Đơn vị thiết kế dịch vụ số lấy người dân làm trung tâm, kết nối phản hồi, accessibility và chỉ số chất lượng phục vụ.',
  },
  orgH: {
    name: 'Hợp tác xã Công nghệ Nông nghiệp',
    slug: 'agritech-cooperative',
    owner: 'agriProductOwner',
    plan: 'starter',
    description:
      'Hợp tác xã ứng dụng công nghệ cho vận hành mùa vụ, giám sát hiện trường và chia sẻ tri thức giữa nông hộ.',
  },
  orgI: {
    name: 'Viện An toàn Phần mềm',
    slug: 'software-safety-institute',
    owner: 'securityOwner',
    plan: 'professional',
    description:
      'Viện thực hành secure delivery, phản ứng sự cố và quản trị dependency với bằng chứng kiểm soát xuyên suốt pipeline.',
  },
  orgJ: {
    name: 'Studio Thương mại Bền vững',
    slug: 'sustainable-commerce-studio',
    owner: 'commerceOwner',
    plan: 'professional',
    description:
      'Studio phát triển marketplace bền vững, nghiên cứu khách hàng và vận hành mạng lưới creator với tác động có thể kiểm chứng.',
  },
}
