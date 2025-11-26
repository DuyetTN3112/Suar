export function navigateToProfileEdit(): void {
  window.location.assign('/profile/edit')
}

export function navigateToUserReviews(userId: string): void {
  window.location.assign(`/users/${userId}/reviews`)
}
