export interface RefreshUserTrustScoreV1 {
  commandType: 'users.refresh_trust_score.v1'
  userId: string
  requestedAt: string
}

export interface RefreshUserPerformanceScoreV1 {
  commandType: 'users.refresh_performance_score.v1'
  userId: string
  requestedAt: string
}

export interface RefreshUserWorkHistoryV1 {
  commandType: 'users.refresh_work_history.v1'
  userId: string
  requestedAt: string
}
