import React from 'react'

function CustomError({ title, message, stack }: { title: string, message: string, stack?: string }) {
  // Sử dụng React.createElement thay vì JSX
  return React.createElement(
    'div',
    { style: {
      padding: '20px',
      margin: '20px',
      backgroundColor: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb',
      borderRadius: '4px',
      fontFamily: 'Arial, sans-serif'
    }},
    React.createElement('h2', null, title || 'Lỗi Hệ Thống'),
    React.createElement('p', null, message || 'Đã xảy ra lỗi không xác định'),
    stack ? React.createElement(
      'pre',
      { style: {
        marginTop: '10px',
        padding: '10px',
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: '4px',
        overflow: 'auto',
        fontSize: '12px',
        maxHeight: '200px'
      }},
      stack
    ) : null,
    React.createElement(
      'button',
      {
        onClick: () => window.location.reload(),
        style: {
          marginTop: '15px',
          padding: '8px 16px',
          backgroundColor: '#0d6efd',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }
      },
      'Tải lại trang'
    )
  )
}

// Export component để có thể sử dụng cho trang lỗi
export default function ErrorPage({ error }: { error: unknown }) {
  return React.createElement(
    CustomError,
    {
      title: 'Lỗi Máy Chủ',
      message: error?.message || 'Đã xảy ra lỗi không xác định trên máy chủ',
      stack: error?.stack
    }
  )
}
