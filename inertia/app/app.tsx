/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/inertia.ts" />

import React from 'react'
import '@/css/app.css'
import { createRoot } from 'react-dom/client'
import { createInertiaApp, router, usePage } from '@inertiajs/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { initErrorLogging } from '@/lib/error-logger'
import axios from 'axios'
import { ThemeProvider } from '@/context/theme_context'
import { CommandMenu } from '@/components/command_menu'
import { NavigationProgress } from '@/components/navigation_progress'
import { UIToasterProvider } from '@/components/ui/toaster_provider'
import { SearchProvider } from '@/context/search_context'

// Cấu hình Axios để tự động gửi CSRF token
axios.defaults.withCredentials = true

// Thêm cơ chế quản lý debug info
window.DEBUG_MODE = process.env.NODE_ENV === 'development';

// Tạo hàm log chỉ hiện trong development mode
const debugLog = (message: string, ...args: any[]) => {
  if (window.DEBUG_MODE) {
    console.log(message, ...args);
  }
};

// Tạo hàm log lỗi hiện trong mọi môi trường
const errorLog = (message: string, ...args: any[]) => {
  console.error(message, ...args);
};

// Lấy CSRF token từ meta tag
const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
if (csrfToken) {
  axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken
  debugLog('Đã cấu hình CSRF token', '[hidden for security]')
} else {
  console.warn('Không tìm thấy CSRF token trong meta tags')
}

// Thêm interceptor để xử lý lỗi mạng
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.message === 'Network Error') {
      console.error('Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet của bạn.');
    }
    return Promise.reject(error);
  }
);

// Khởi tạo hệ thống log lỗi
initErrorLogging();

// Đặt DEBUG vào window để truy cập từ console
window.DEBUG = {
  showReactVersionInfo: () => {
    console.info('React version:', React.version);
    console.info('Environment:', import.meta.env.MODE);
    console.info('Node Env:', import.meta.env.NODE_ENV);
    console.info('Vite HMR:', import.meta.hot ? 'Enabled' : 'Disabled');
  },
  enableLogging: () => {
    window.DEBUG_MODE = true;
    console.info('Debug logging enabled');
  },
  disableLogging: () => {
    window.DEBUG_MODE = false;
    console.info('Debug logging disabled');
  }
};

// Thêm tham chiếu vào window để gọi được từ console
declare global {
  interface Window {
    DEBUG: {
      showReactVersionInfo: () => void;
      enableLogging: () => void;
      disableLogging: () => void;
    };
    DEBUG_MODE: boolean;
    auth?: any;
  }
}

// Cấu hình mặc định cho tất cả các điều hướng Inertia để tăng cường SPA UX
router.on('before', (event) => {
  console.log('\n=== [Inertia Router] Sự kiện BEFORE ===')
  console.log('[Inertia Router] Thời gian bắt đầu:', new Date().toISOString())
  console.log('[Inertia Router] URL điều hướng:', event.detail.visit.url.href)
  console.log('[Inertia Router] Phương thức:', event.detail.visit.method)
  console.log('[Inertia Router] Thông tin chi tiết:', {
    data: event.detail.visit.data,
    preserveScroll: event.detail.visit.preserveScroll,
    preserveState: event.detail.visit.preserveState,
    replace: event.detail.visit.replace,
    showProgress: event.detail.visit.showProgress
  })
  
  // Hạn chế đường dẫn cần tải lại trang (ví dụ: logout, auth...)
  const hardReloadPaths = ['/logout', '/login'];
  
  // Nếu là đường dẫn cần tải lại toàn trang (full reload)
  if (hardReloadPaths.includes(event.detail.visit.url.pathname)) {
    console.log('[Inertia Router] Phát hiện đường dẫn yêu cầu tải lại toàn trang:', event.detail.visit.url.pathname)
    // Không can thiệp, để Inertia xử lý mặc định
    return;
  }
  
  // Kiểm tra nếu là điều hướng đến trang projects
  if (event.detail.visit.url.pathname === '/projects') {
    console.log('[Inertia Router] Phát hiện điều hướng đến trang Projects')
    console.log('[Inertia Router] Chi tiết điều hướng Projects:', {
      url: event.detail.visit.url.href,
      method: event.detail.visit.method,
      data: event.detail.visit.data
    })
  }
  
  // Cấu hình mặc định cho SPA
  event.detail.visit.preserveScroll = event.detail.visit.preserveScroll ?? true;
  event.detail.visit.preserveState = event.detail.visit.preserveState ?? true;
  
  console.log('[Inertia Router] Cấu hình sau khi xử lý:', {
    preserveScroll: event.detail.visit.preserveScroll,
    preserveState: event.detail.visit.preserveState
  })
})

// Thêm các sự kiện khác để theo dõi toàn bộ quá trình điều hướng
router.on('start', (event) => {
  console.log('\n=== [Inertia Router] Sự kiện START ===')
  console.log('[Inertia Router] Bắt đầu điều hướng đến:', event.detail.visit.url.href)
  console.log('[Inertia Router] Thời gian bắt đầu:', new Date().toISOString())
})

router.on('progress', (event) => {
  if (event.detail.progress) {
    console.log('[Inertia Router] Tiến trình:', event.detail.progress.percentage + '%')
  }
})

router.on('success', (event) => {
  console.log('\n=== [Inertia Router] Sự kiện SUCCESS ===')
  console.log('[Inertia Router] Điều hướng thành công đến:', event.detail.page.url)
  console.log('[Inertia Router] Thời gian hoàn thành:', new Date().toISOString())
  console.log('[Inertia Router] Component:', event.detail.page.component)
  console.log('[Inertia Router] Props:', Object.keys(event.detail.page.props))
})

router.on('error', (event) => {
  console.error('\n=== [Inertia Router] Sự kiện ERROR ===')
  console.error('[Inertia Router] Lỗi khi điều hướng:', event.detail.errors)
})

router.on('invalid', (event) => {
  console.warn('\n=== [Inertia Router] Sự kiện INVALID ===')
  console.warn('[Inertia Router] Điều hướng không hợp lệ:', event.detail.response.status)
})

router.on('finish', (event) => {
  console.log('\n=== [Inertia Router] Sự kiện FINISH ===')
  console.log('[Inertia Router] Kết thúc điều hướng đến:', event.detail.visit.url.href)
  console.log('[Inertia Router] Thời gian kết thúc:', new Date().toISOString())
})

// Thêm log để kiểm tra thông tin auth
document.addEventListener('DOMContentLoaded', () => {
  if (window.DEBUG_MODE) {
    console.group('=== Auth Debug Info ===');
    console.log('Window Auth Object:', window.auth ? 'Initialized' : 'undefined');
    if (window.auth?.user) {
      console.log('Auth User ID:', window.auth.user.id);
    } else {
      console.error('Không tìm thấy auth.user trong window!');
    }
    console.groupEnd();
  }
});

// Component wrapper để đảm bảo auth được đặt vào window từ props
const AuthInitializer = ({ children, auth }: { children: React.ReactNode, auth: any }) => {
  React.useEffect(() => {
    if (auth?.user && !window.auth) {
      debugLog('Khởi tạo window.auth từ props', 'Successful');
      window.auth = auth;
    }
  }, [auth]);

  return <>{children}</>;
};

console.log('\n=== [Inertia App] Bắt đầu khởi tạo ứng dụng ===')
console.log('[Inertia App] Thời gian bắt đầu:', new Date().toISOString())

createInertiaApp({
  resolve: async (name) => {
    console.log(`[Inertia App] Đang resolve component: ${name}`)
    const startTime = performance.now()
    
    try {
      const component = await resolvePageComponent(`../pages/${name}.tsx`, import.meta.glob('../pages/**/*.tsx'))
      const endTime = performance.now()
      console.log(`[Inertia App] Đã resolve component ${name} trong ${(endTime - startTime).toFixed(2)}ms`)
      return component
    } catch (error) {
      console.error(`[Inertia App] Lỗi khi resolve component ${name}:`, error)
      throw error
    }
  },
  setup({ el, App, props }: { el: HTMLElement, App: any, props: any }) {
    console.log('[Inertia App] Bắt đầu setup ứng dụng')
    console.log('[Inertia App] Initial page:', props.initialPage?.component)
    console.log('[Inertia App] Initial props keys:', Object.keys(props.initialPage?.props || {}))
    
    // Lấy thông tin auth từ props và đặt vào window
    const authData = props.initialPage?.props?.user?.auth;
    if (authData) {
      window.auth = authData;
      console.log('[Inertia App] Khởi tạo window.auth từ initialPage', 'Successful');
      console.log('[Inertia App] User ID:', authData.user?.id)
    } else {
      console.warn('[Inertia App] Không tìm thấy dữ liệu auth trong initialPage')
    }
    
    console.log('[Inertia App] Bắt đầu render ứng dụng')
    const startRenderTime = performance.now()
    
    createRoot(el).render(
      React.createElement(React.StrictMode, null,
        React.createElement(ThemeProvider, null,
          React.createElement(SearchProvider, null,
            React.createElement(AuthInitializer, { 
              auth: authData, 
              children: [
                React.createElement(UIToasterProvider, { key: 'toaster' }),
                React.createElement(NavigationProgress, { key: 'navigation-progress' }),
                React.createElement(CommandMenu, { key: 'command-menu' }),
                React.createElement(App, { ...props, key: 'app' })
              ]
            })
          )
        )
      )
    )
    
    const endRenderTime = performance.now()
    console.log('[Inertia App] Đã render ứng dụng trong', (endRenderTime - startRenderTime).toFixed(2), 'ms')
    console.log('[Inertia App] Khởi tạo ứng dụng hoàn tất')
    console.log('=== [Inertia App] Kết thúc khởi tạo ứng dụng ===\n')
  },
})

