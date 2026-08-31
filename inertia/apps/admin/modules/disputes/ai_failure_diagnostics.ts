export type AiFailureKind = 'provider_overloaded' | 'quota_or_rate_limit' | 'authentication' | 'timeout' | 'unknown'

export interface AiFailureDiagnostic {
  kind: AiFailureKind
  label: string
  explanation: string
  action: string
}

export function diagnoseAiFailure(value: unknown): AiFailureDiagnostic {
  const raw = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''

  if (/\b503\b|unavailable|high demand|overload|temporar(?:y|ily).*(?:unavailable|busy)/i.test(raw)) {
    return {
      kind: 'provider_overloaded',
      label: 'Model AI đang quá tải tạm thời',
      explanation: 'Yêu cầu đã được Clawagent nhận nhưng model phía sau trả HTTP 503 UNAVAILABLE.',
      action: 'Không cần đổi SUAR_DISPUTE_API_KEY; hãy thử lại sau một khoảng ngắn.',
    }
  }

  if (/\b429\b|quota|resource[_ -]?exhausted|rate limit|too many requests/i.test(raw)) {
    return {
      kind: 'quota_or_rate_limit',
      label: 'Provider bị giới hạn quota hoặc tốc độ',
      explanation: 'Provider từ chối vì vượt quota/rate limit hoặc tài khoản model đã hết hạn mức.',
      action: 'Kiểm tra quota/billing của provider và key đang cấu hình trước khi retry.',
    }
  }

  if (/\b401\b|\b403\b|unauthorized|forbidden|invalid.*(?:api[ _-]?key|token)|authentication/i.test(raw)) {
    return {
      kind: 'authentication',
      label: 'Xác thực provider không hợp lệ',
      explanation: 'Provider từ chối credentials hoặc quyền truy cập endpoint.',
      action: 'Kiểm tra SUAR_DISPUTE_API_KEY/credentials và quyền của endpoint Clawagent.',
    }
  }

  if (/timeout|timed out|deadline exceeded/i.test(raw)) {
    return {
      kind: 'timeout',
      label: 'Provider phản hồi quá thời gian',
      explanation: 'Yêu cầu không hoàn tất trước deadline đã cấu hình.',
      action: 'Retry; nếu lặp lại, kiểm tra timeout và tình trạng provider.',
    }
  }

  return {
    kind: 'unknown',
    label: 'Provider trả lỗi chưa phân loại',
    explanation: 'Hệ thống đã lưu nguyên văn diagnostic để quản trị viên đối chiếu.',
    action: 'Đọc lỗi thô bên dưới và kiểm tra log Clawagent theo evaluation ID.',
  }
}
