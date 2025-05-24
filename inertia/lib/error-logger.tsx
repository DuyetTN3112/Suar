import { useEffect, useState } from 'react';

// Khai báo kiểu log mở rộng
type ErrorLog = {
  id: number;
  timestamp: Date;
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  error?: Error;
  stack?: string;
  type: 'error' | 'warning' | 'info' | 'unhandledRejection' | 'vitePlugin';
  details?: Record<string, unknown>;
};

// Thêm hàm quét DOM để kiểm tra trạng thái Vite/React plugin
export function scanReactPlugin(): Record<string, unknown> {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    scripts: [],
    viteHot: typeof (window as unknown).__vite_hot !== 'undefined',
    vitePlugins: typeof (window as unknown).__vite_plugins !== 'undefined',
    reactRefresh: typeof (window as unknown).$RefreshReg$ !== 'undefined',
    reactRefreshSig: typeof (window as unknown).$RefreshSig$ !== 'undefined',
    reactVersion: (window as unknown).React?.version || 'unknown',
  };

  // Quét tất cả script tags
  try {
    const scriptTags = document.querySelectorAll('script');
    results.scriptCount = scriptTags.length;

    scriptTags.forEach((script, index) => {
      const scriptInfo: Record<string, unknown> = {
        index,
        type: script.type || 'unknown',
        src: script.src || 'inline',
        id: script.id || 'no-id',
        async: script.async,
        defer: script.defer,
        length: script.textContent?.length || 0,
      };

      // Kiểm tra nội dung script cho Vite/React plugin
      if (script.textContent && !script.src) {
        if (script.textContent.includes('@vitejs/plugin-react')) {
          scriptInfo.containsVitePlugin = true;
          scriptInfo.excerpt = script.textContent.substring(0, 100) + '...';
        }
        if (script.textContent.includes('__vite_hot')) {
          scriptInfo.containsViteHot = true;
        }
        if (script.textContent.includes('$RefreshReg$')) {
          scriptInfo.containsReactRefresh = true;
        }
      }

      results.scripts.push(scriptInfo);
    });
  } catch (e) {
    results.scanError = String(e);
  }

  return results;
}

// Log container
const errorLogs: ErrorLog[] = [];
let errorCounter = 0;

// Số lượng lỗi tối đa được lưu trữ để tránh tràn bộ nhớ
const MAX_ERROR_LOGS = 30;
// Đánh dấu trạng thái đang xử lý lỗi để tránh gọi đệ quy vô tận
let loggingInProgress = false;
// Số lượng lỗi trùng lặp liên tiếp tối đa được phép
const MAX_DUPLICATE_ERRORS = 3;
// Giữ lịch sử message lỗi gần nhất để phát hiện lặp
const recentErrorMessages: string[] = [];

// Thêm hàm ghi log về lỗi plugin React
export function logVitePluginError(message: string) {
  try {
    // Kiểm tra xem Vite HMR có hoạt động không
    const viteHot = Boolean((window as unknown).__vite_hot__)
    const vitePlugins = Boolean((window as unknown).__vite_plugin_react_preamble_installed__)

    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Vite plugin status:', {
        viteHot,
        vitePlugins,
        message
      })
    }

    // Nếu không phải lỗi nghiêm trọng, chỉ log warning
    if (message.includes('preamble') && !vitePlugins) {
      // Only log in development
      if (import.meta.env.NODE_ENV === 'development') {
        console.warn('Vite React plugin preamble not detected. This is expected during initial load.')
      }
      return
    }

    // Log lỗi nếu nghiêm trọng
    logError({
      type: 'vitePlugin',
      message,
      details: {
        timestamp: new Date().toISOString(),
        scripts: Array.from(document.scripts).map(s => s.src),
        viteHot,
        vitePlugins,
        reactRefresh: Boolean((window as unknown).__REACT_REFRESH_RUNTIME_SIGNATURE__),
        url: window.location.href
      }
    })
  } catch (err) {
    // Only log actual errors in production
    if (import.meta.env.NODE_ENV !== 'development') {
      console.error('Error in logVitePluginError:', err)
    }
  }
}

// Hàm thêm lỗi vào danh sách
export function logError(error: Partial<ErrorLog>): ErrorLog {
  // Kiểm tra nếu đang xử lý lỗi khác, tránh đệ quy vô hạn
  if (loggingInProgress) {
    return { id: -1, timestamp: new Date(), message: "Logging skipped - recursive error", type: 'error' } as ErrorLog;
  }

  try {
    loggingInProgress = true;

    // Kiểm tra nếu lỗi này giống các lỗi gần đây
    const errorMessage = error.message || 'Unknown Error';

    if (recentErrorMessages.includes(errorMessage)) {
      // Lỗi trùng lặp, không cần ghi log để tránh tràn bộ nhớ
      return { id: -1, timestamp: new Date(), message: "Duplicate error skipped", type: 'error' } as ErrorLog;
    }

    // Thêm thông báo lỗi vào danh sách gần đây
    recentErrorMessages.push(errorMessage);
    if (recentErrorMessages.length > MAX_DUPLICATE_ERRORS) {
      recentErrorMessages.shift(); // Giữ giới hạn lỗi gần đây
    }

    // Tạo ID cho lỗi mới
    const errorId = errorCounter++;

    // Tạo object ErrorLog
    const errorLog: ErrorLog = {
      id: errorId,
      timestamp: new Date(),
      message: errorMessage,
      source: error.source,
      lineno: error.lineno,
      colno: error.colno,
      error: error.error,
      stack: error.stack || error.error?.stack,
      type: error.type || 'error',
      details: error.details,
    };

    // Thêm vào đầu mảng
    errorLogs.unshift(errorLog);

    // Giới hạn số lượng lỗi được lưu trữ để tránh tràn bộ nhớ
    if (errorLogs.length > MAX_ERROR_LOGS) {
      errorLogs.length = MAX_ERROR_LOGS;
    }

    // Trong môi trường development, log ra console
    if (import.meta.env.NODE_ENV === 'development') {
      // Chỉ sử dụng originalConsoleError nếu đã được định nghĩa
      if (typeof originalConsoleError === 'function') {
        originalConsoleError('Logged Error:', errorLog);
      }
    }

    // Kích hoạt sự kiện để cập nhật UI nhưng không gây lỗi mới
    try {
      window.dispatchEvent(new CustomEvent('error-logged', { detail: errorLog }));
    } catch (dispatchError) {
      // Bỏ qua lỗi khi dispatch event
    }

    return errorLog;
  } finally {
    loggingInProgress = false;
  }
}

// Biến lưu trữ console.error gốc
let originalConsoleError: typeof console.error;

// Hàm lấy tất cả lỗi
export function getErrorLogs(): ErrorLog[] {
  return [...errorLogs];
}

// Hàm xóa tất cả lỗi
export function clearErrorLogs(): void {
  errorLogs.length = 0;
  window.dispatchEvent(new CustomEvent('errors-cleared'));
}

// Hook để theo dõi lỗi
export function useErrorLogs() {
  const [logs, setLogs] = useState<ErrorLog[]>(getErrorLogs());

  useEffect(() => {
    const handleNewError = () => setLogs(getErrorLogs());
    const handleClearedErrors = () => setLogs([]);

    window.addEventListener('error-logged', handleNewError);
    window.addEventListener('errors-cleared', handleClearedErrors);

    return () => {
      window.removeEventListener('error-logged', handleNewError);
      window.removeEventListener('errors-cleared', handleClearedErrors);
    };
  }, []);

  return logs;
}

// Component hiển thị lỗi với thêm tính năng hiển thị chi tiết
export function ErrorDisplay() {
  const logs = useErrorLogs();
  const [isVisible, setIsVisible] = useState(true); // Đổi thành true để hiển thị mặc định
  const [activeTab, setActiveTab] = useState<'errors' | 'viteCheck'>('errors');
  const [pluginDetails, setPluginDetails] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    // Chủ động quét plugin khi component được tạo
    setPluginDetails(scanReactPlugin());

    // Thiết lập interval để quét lại định kỳ
    const interval = setInterval(() => {
      setPluginDetails(scanReactPlugin());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Tách các loại lỗi
  const vitePluginLogs = logs.filter(log => log.type === 'vitePlugin');
  const otherLogs = logs.filter(log => log.type !== 'vitePlugin');

  // Nếu không có lỗi và không hiển thị tab Vite Check, không hiển thị gì cả
  if (logs.length === 0 && activeTab !== 'viteCheck') return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: isVisible ? '0' : '-600px',
        right: '0',
        width: '90%', // Tăng kích thước
        maxWidth: '1000px',
        maxHeight: '80vh',
        backgroundColor: '#1e1e1e',
        color: 'white',
        borderTopLeftRadius: '8px',
        transition: 'bottom 0.3s ease',
        zIndex: 9999,
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 15px',
          backgroundColor: '#c41e3a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setIsVisible(!isVisible)}
      >
        <div>
          <strong>Log Viewer ({logs.length} lỗi)</strong> - Click để {isVisible ? 'ẩn' : 'hiện'} chi tiết
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {isVisible && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPluginDetails(scanReactPlugin());
                }}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid white',
                  color: 'white',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Quét React Plugin
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearErrorLogs();
                }}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid white',
                  color: 'white',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Xóa tất cả
              </button>
            </>
          )}
        </div>
      </div>

      {isVisible && (
        <>
          <div style={{
            display: 'flex',
            backgroundColor: '#333',
            borderBottom: '1px solid #555'
          }}>
            <button
              onClick={() => setActiveTab('errors')}
              style={{
                padding: '8px 15px',
                backgroundColor: activeTab === 'errors' ? '#555' : 'transparent',
                border: 'none',
                color: 'white',
                flex: '1',
                cursor: 'pointer',
              }}
            >
              Lỗi ({otherLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('viteCheck')}
              style={{
                padding: '8px 15px',
                backgroundColor: activeTab === 'viteCheck' ? '#555' : 'transparent',
                border: 'none',
                color: 'white',
                flex: '1',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              Vite Plugin Debug
              {vitePluginLogs.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  backgroundColor: 'red',
                  color: 'white',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {vitePluginLogs.length}
                </span>
              )}
            </button>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 90px)' }}>
            {activeTab === 'errors' ? (
              // Hiển thị tab lỗi
              otherLogs.length > 0 ? (
                otherLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '15px',
                      borderBottom: '1px solid #333',
                    }}
                  >
                    <div style={{ marginBottom: '5px', color: '#f88' }}>
                      <strong>{log.type === 'unhandledRejection' ? 'Unhandled Promise' : 'Error'}: </strong>
                      {log.message}
                    </div>

                    {(log.source || log.lineno) && (
                      <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '5px' }}>
                        {log.source && `Tại: ${log.source}`}
                        {log.lineno && `:${log.lineno}`}
                        {log.colno && `:${log.colno}`}
                      </div>
                    )}

                    {log.stack && (
                      <pre style={{
                        fontSize: '13px',
                        backgroundColor: '#2d2d2d',
                        padding: '10px',
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '200px',
                        whiteSpace: 'pre-wrap',
                        color: '#ddd'
                      }}>
                        {log.stack}
                      </pre>
                    )}

                    <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                      {log.timestamp.toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                  Không có lỗi nào được ghi nhận
                </div>
              )
            ) : (
              // Hiển thị tab kiểm tra Vite plugin
              <div style={{ padding: '15px' }}>
                <h3 style={{ marginTop: 0 }}>Thông tin Vite/React Plugin</h3>

                <div style={{ marginBottom: '20px' }}>
                  <button
                    onClick={() => {
                      setPluginDetails(scanReactPlugin());
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#0d6efd',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '10px'
                    }}
                  >
                    Quét lại
                  </button>

                  <button
                    onClick={() => {
                      logVitePluginError("Manual scan triggered by user");
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
                    Log kết quả quét
                  </button>
                </div>

                {pluginDetails && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '10px', marginBottom: '20px' }}>
                      <div style={{ fontWeight: 'bold' }}>Timestamp:</div>
                      <div>{pluginDetails.timestamp}</div>

                      <div style={{ fontWeight: 'bold' }}>React Version:</div>
                      <div>{pluginDetails.reactVersion}</div>

                      <div style={{ fontWeight: 'bold' }}>Vite Hot:</div>
                      <div style={{ color: pluginDetails.viteHot ? '#4caf50' : '#f44336' }}>
                        {pluginDetails.viteHot ? 'Đã tải' : 'Không tìm thấy'}
                      </div>

                      <div style={{ fontWeight: 'bold' }}>Vite Plugins:</div>
                      <div style={{ color: pluginDetails.vitePlugins ? '#4caf50' : '#f44336' }}>
                        {pluginDetails.vitePlugins ? 'Đã tải' : 'Không tìm thấy'}
                      </div>

                      <div style={{ fontWeight: 'bold' }}>React Refresh:</div>
                      <div style={{ color: pluginDetails.reactRefresh ? '#4caf50' : '#f44336' }}>
                        {pluginDetails.reactRefresh ? 'Đã tải' : 'Không tìm thấy'}
                      </div>

                      <div style={{ fontWeight: 'bold' }}>React Refresh Sig:</div>
                      <div style={{ color: pluginDetails.reactRefreshSig ? '#4caf50' : '#f44336' }}>
                        {pluginDetails.reactRefreshSig ? 'Đã tải' : 'Không tìm thấy'}
                      </div>

                      <div style={{ fontWeight: 'bold' }}>Script Count:</div>
                      <div>{pluginDetails.scriptCount}</div>
                    </div>

                    <h4>Script Tags</h4>
                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                      {pluginDetails.scripts.map((script: any, index: number) => (
                        <div key={index} style={{
                          padding: '10px',
                          marginBottom: '10px',
                          backgroundColor: '#2d2d2d',
                          borderRadius: '4px',
                          border: script.containsVitePlugin ? '1px solid #ffc107' : 'none'
                        }}>
                          <div><strong>#{script.index}</strong> ({script.type}) {script.containsVitePlugin && '⚠️ Contains Vite Plugin!'}</div>
                          <div style={{ wordBreak: 'break-all', fontSize: '13px' }}>{script.src}</div>
                          <div style={{ display: 'flex', gap: '10px', marginTop: '5px', fontSize: '12px' }}>
                            <span>ID: {script.id}</span>
                            <span>Async: {script.async ? 'Yes' : 'No'}</span>
                            <span>Defer: {script.defer ? 'Yes' : 'No'}</span>
                            <span>Length: {script.length}</span>
                          </div>
                          {script.excerpt && (
                            <pre style={{
                              marginTop: '5px',
                              padding: '5px',
                              backgroundColor: '#222',
                              fontSize: '12px',
                              maxHeight: '100px',
                              overflow: 'auto'
                            }}>
                              {script.excerpt}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Khởi tạo bắt lỗi toàn cục
export function initErrorLogging() {
  // Lưu lại console.error gốc
  originalConsoleError = console.error;

  // Bắt lỗi cụ thể của Vite/React plugin
  window.addEventListener('error', function(event) {
    if (event.message && event.message.includes('@vitejs/plugin-react')) {
      // Gọi hàm scan đặc biệt cho lỗi plugin
      logVitePluginError(event.message);
    }
  });

  window.onerror = function(message, source, lineno, colno, error) {
    logError({
      message: message.toString(),
      source,
      lineno,
      colno,
      error,
      type: 'error'
    });
    return false; // Cho phép xử lý lỗi mặc định tiếp tục
  };

  window.addEventListener('unhandledrejection', function(event) {
    logError({
      message: event.reason?.message || 'Unhandled Promise Rejection',
      stack: event.reason?.stack,
      error: event.reason,
      type: 'unhandledRejection'
    });
  });

  // Ghi đè console.error để log qua hệ thống này
  console.error = (...args) => {
    // Gọi hàm console.error gốc
    originalConsoleError(...args);

    // Chỉ log lỗi trong môi trường development hoặc nếu đặc biệt quan trọng
    if (import.meta.env.NODE_ENV === 'development') {
      try {
        const message = args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');

        logError({
          message,
          type: 'error'
        });
      } catch (error) {
        // Bỏ qua lỗi trong quá trình ghi log
      }
    }
  };
}
