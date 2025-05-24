import React, { useEffect, useState } from 'react';
import { ErrorDisplay, scanReactPlugin } from '@/lib/error-logger';

/**
 * Trang hiển thị lỗi server chi tiết
 */
function ServerError({ error }: { error: any }) {
  const [pluginDetails, setPluginDetails] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only log actual errors in production
    if (process.env.NODE_ENV !== 'development') {
      console.error('Server Error:', error);
    }

    try {
      // Thực hiện quét plugin
      const details = scanReactPlugin();
      setPluginDetails(details);

      // Hiển thị thông tin chi tiết về lỗi
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.info('Plugin Details:', details);
      }

      // Hiển thị thông tin debug nếu có
      if (window.DEBUG?.showReactVersionInfo) {
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.info('--- Thông tin React version ---');
          window.DEBUG.showReactVersionInfo();
        }
      }
    } catch (e) {
      // Only log actual errors in production
      if (process.env.NODE_ENV !== 'development') {
        console.error('Lỗi khi phân tích plugin React:', e);
      }
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  // Xác định nếu lỗi liên quan đến Vite/React
  const isViteError = error?.message?.includes('@vitejs/plugin-react') || false;

  return (
    <>
      <div style={{
        padding: '20px',
        margin: '20px',
        backgroundColor: '#f8d7da',
        color: '#721c24',
        border: '1px solid #f5c6cb',
        borderRadius: '4px',
        fontFamily: 'sans-serif'
      }}>
        <h2 style={{ marginTop: '0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Server Error
          {isViteError && (
            <span style={{
              fontSize: '0.8em',
              backgroundColor: '#ffc107',
              color: '#000',
              padding: '2px 8px',
              borderRadius: '4px'
            }}>
              Vite Plugin Issue
            </span>
          )}
        </h2>

        <div style={{ marginBottom: '15px', fontSize: '1.1em' }}>
          {error?.message || 'An unknown error occurred'}
        </div>

        {isViteError && (
          <div style={{
            padding: '15px',
            backgroundColor: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.5)',
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>Vấn đề với Vite React Plugin</h3>
            <p>
              Lỗi <code>can't detect preamble</code> thường xảy ra khi:
            </p>
            <ul style={{ marginBottom: '10px' }}>
              <li>Plugin React không được cấu hình đúng</li>
              <li>Đường dẫn đến tệp React không chính xác</li>
              <li>Dev server Vite khởi động không hoàn chỉnh</li>
              <li>Có xung đột giữa các phiên bản React/ReactDOM</li>
            </ul>

            <div style={{ marginTop: '15px', fontWeight: 'bold' }}>
              Thông tin về Plugin React:
            </div>
            {isLoading ? (
              <div>Đang quét thông tin plugin...</div>
            ) : pluginDetails ? (
              <div style={{ marginTop: '5px', fontSize: '0.9em' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '5px' }}>
                  <div>React Refresh:</div>
                  <div>{pluginDetails.reactRefresh ? '✅ Active' : '❌ Not found'}</div>

                  <div>Vite Hot Reload:</div>
                  <div>{pluginDetails.viteHot ? '✅ Active' : '❌ Not found'}</div>

                  <div>Script Count:</div>
                  <div>{pluginDetails.scriptCount || 'N/A'}</div>
                </div>
              </div>
            ) : (
              <div>Không thể quét thông tin plugin</div>
            )}
          </div>
        )}

        <div style={{ marginTop: '15px', fontSize: '14px' }}>
          <strong>Type:</strong> {error?.name || 'Unknown'}
        </div>

        {error?.stack && (
          <pre style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px'
          }}>
            {error.stack}
          </pre>
        )}

        {/* Developer Tools */}
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Công cụ phát triển</h3>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0d6efd',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Tải lại trang
            </button>

            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Xóa cache & tải lại
            </button>

            <button
              onClick={() => {
                if (window.DEBUG?.showReactVersionInfo) {
                  window.DEBUG.showReactVersionInfo();
                }
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#198754',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Hiển thị thông tin version
            </button>

            {isViteError && (
              <button
                onClick={() => {
                  if (window.DEBUG?.showReactVersionInfo) {
                    window.DEBUG.showReactVersionInfo();
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ffc107',
                  color: 'black',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Kiểm tra Vite Plugin
              </button>
            )}

            <button
              onClick={() => {
                // Restart development server
                fetch('/api/dev/restart', { method: 'POST' }).catch(err => {
                  // Only log actual errors in production
                  if (process.env.NODE_ENV !== 'development') {
                    console.error('Could not restart dev server:', err);
                  }
                }).finally(() => {
                  alert('Yêu cầu khởi động lại đã được gửi. Vui lòng đợi và làm mới trang.');
                });
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Khởi động lại Dev Server
            </button>
          </div>
        </div>
      </div>

      <ErrorDisplay />
    </>
  )
}

export default ServerError
