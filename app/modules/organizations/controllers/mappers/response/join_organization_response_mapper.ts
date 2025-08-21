const JOIN_ORGANIZATION_SUCCESS_MESSAGE =
  'Yêu cầu tham gia đã được gửi. Vui lòng chờ quản trị viên phê duyệt'

export function getJoinOrganizationSuccessMessage() {
  return JOIN_ORGANIZATION_SUCCESS_MESSAGE
}

export function mapJoinOrganizationSuccessApiBody(organization: unknown) {
  return {
    success: true,
    message: getJoinOrganizationSuccessMessage(),
    organization,
  }
}
