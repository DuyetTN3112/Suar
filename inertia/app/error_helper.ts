/**
 * Error structure for display
 */
interface DisplayError {
  message?: string
  source?: string
  lineno?: number
  colno?: number
  stack?: string
}

/**
 * Hàm hiển thị lỗi trên màn hình một cách rõ ràng
 */
export function showErrorOnScreen(error: unknown): void {
  // Parse error to DisplayError structure
  const displayError: DisplayError = {}

  if (error instanceof Error) {
    displayError.message = error.message
    displayError.stack = error.stack
  } else if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>
    const msgValue = err.message ?? 'Có lỗi không xác định xảy ra'
    displayError.message =
      typeof msgValue === 'string'
        ? msgValue
        : typeof msgValue === 'number' || typeof msgValue === 'boolean'
          ? String(msgValue)
          : 'Có lỗi không xác định xảy ra'
    displayError.source = typeof err.source === 'string' ? err.source : undefined
    displayError.lineno = typeof err.lineno === 'number' ? err.lineno : undefined
    displayError.colno = typeof err.colno === 'number' ? err.colno : undefined
    displayError.stack = typeof err.stack === 'string' ? err.stack : undefined
  } else {
    displayError.message = String(error)
  }

  // Tạo một container chứa thông báo lỗi
  const errorDiv = document.createElement('div')
  errorDiv.style.position = 'fixed'
  errorDiv.style.top = '0'
  errorDiv.style.left = '0'
  errorDiv.style.right = '0'
  errorDiv.style.padding = '20px'
  errorDiv.style.backgroundColor = '#dc3545'
  errorDiv.style.color = 'white'
  errorDiv.style.zIndex = '9999'
  errorDiv.style.fontFamily = 'monospace'
  errorDiv.style.overflow = 'auto'
  errorDiv.style.maxHeight = '100vh'

  // Tạo tiêu đề lỗi
  const title = document.createElement('h2')
  title.textContent = 'Lỗi Ứng Dụng'
  title.style.marginTop = '0'
  errorDiv.appendChild(title)

  // Tạo nút đóng
  const closeButton = document.createElement('button')
  closeButton.textContent = '×'
  closeButton.style.position = 'absolute'
  closeButton.style.right = '10px'
  closeButton.style.top = '10px'
  closeButton.style.backgroundColor = 'transparent'
  closeButton.style.border = 'none'
  closeButton.style.color = 'white'
  closeButton.style.fontSize = '24px'
  closeButton.style.cursor = 'pointer'
  closeButton.onclick = () => {
    document.body.removeChild(errorDiv)
  }
  errorDiv.appendChild(closeButton)
  // Hiển thị thông báo lỗi
  const message = document.createElement('div')
  message.textContent = displayError.message || 'Có lỗi không xác định xảy ra'
  message.style.marginBottom = '10px'
  message.style.fontWeight = 'bold'
  errorDiv.appendChild(message)
  // Hiển thị thông tin file và dòng lỗi
  if (displayError.source || displayError.lineno) {
    const location = document.createElement('div')
    location.textContent = `Vị trí: ${displayError.source ?? 'Unknown'} (dòng ${displayError.lineno ?? '?'}, cột ${displayError.colno ?? '?'})`
    location.style.marginBottom = '10px'
    errorDiv.appendChild(location)
  }
  // Hiển thị stack trace
  if (displayError.stack) {
    const stack = document.createElement('pre')
    stack.style.marginTop = '10px'
    stack.style.padding = '10px'
    stack.style.backgroundColor = 'rgba(0,0,0,0.2)'
    stack.style.color = 'white'
    stack.style.overflow = 'auto'
    stack.style.maxHeight = '60vh'
    stack.style.fontSize = '12px'
    stack.style.whiteSpace = 'pre-wrap'
    stack.textContent = displayError.stack
    errorDiv.appendChild(stack)
  }
  // Thêm nút tải lại trang
  const reloadButton = document.createElement('button')
  reloadButton.textContent = 'Tải lại trang'
  reloadButton.style.marginTop = '15px'
  reloadButton.style.padding = '8px 16px'
  reloadButton.style.backgroundColor = '#fff'
  reloadButton.style.color = '#dc3545'
  reloadButton.style.border = 'none'
  reloadButton.style.borderRadius = '4px'
  reloadButton.style.cursor = 'pointer'
  reloadButton.onclick = () => {
    window.location.reload()
  }
  errorDiv.appendChild(reloadButton)
  // Thêm vào DOM
  document.body.appendChild(errorDiv)
  // Ghi log lỗi vào console
  console.error('Chi tiết lỗi:', error)
}

/**
 * Thiết lập các event handler để bắt lỗi toàn cục
 */
export function setupGlobalErrorHandlers(): void {
  // Bắt lỗi Javascript không được xử lý
  window.onerror = function (message, source, lineno, colno, error) {
    showErrorOnScreen({ message, source, lineno, colno, stack: error?.stack })
    return false // Cho phép browser xử lý lỗi mặc định
  }
  // Bắt lỗi Promise không được xử lý
  window.addEventListener('unhandledrejection', function (event) {
    showErrorOnScreen(event.reason ?? { message: 'Unhandled Promise Rejection' })
  })
}
