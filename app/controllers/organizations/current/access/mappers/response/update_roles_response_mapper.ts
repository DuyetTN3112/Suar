export function getUpdateCustomRolesSuccessMessage() {
  return 'Cập nhật vai trò tùy chỉnh thành công'
}

export function mapUpdateCustomRolesSuccessApiBody() {
  return {
    success: true,
    message: getUpdateCustomRolesSuccessMessage(),
  }
}
