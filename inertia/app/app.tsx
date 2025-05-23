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

// Lấy CSRF token từ meta tag
const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
if (csrfToken) {
  axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken
  console.log('Đã cấu hình CSRF token:', csrfToken)
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
    
    // Kiểm tra các plugin đã tải
    console.info('Loaded scripts:', 
      Array.from(document.querySelectorAll('script'))
        .map(s => s.src || `[inline] ${s.type || 'unknown type'}`)
        .join('\n')
    );
  }
};

// Thêm tham chiếu vào window để gọi được từ console
declare global {
  interface Window {
    DEBUG: {
      showReactVersionInfo: () => void;
    };
    auth?: any;
  }
}

// Cấu hình mặc định cho tất cả các điều hướng Inertia để tăng cường SPA UX
router.on('before', (event) => {
  // Hạn chế đường dẫn cần tải lại trang (ví dụ: logout, auth...)
  const hardReloadPaths = ['/logout', '/login'];
  
  // Nếu là đường dẫn cần tải lại toàn trang (full reload)
  if (hardReloadPaths.includes(event.detail.visit.url.pathname)) {
    // Không can thiệp, để Inertia xử lý mặc định
    return;
  }
  
  // Cấu hình mặc định cho SPA
  event.detail.visit.preserveScroll = event.detail.visit.preserveScroll ?? true;
  event.detail.visit.preserveState = event.detail.visit.preserveState ?? true;
})

// Thêm log để kiểm tra thông tin auth
document.addEventListener('DOMContentLoaded', () => {
  console.group('=== Auth Debug Info ===');
  console.log('Window Auth Object:', (window as any).auth);
  if ((window as any).auth?.user) {
    console.log('Auth User ID:', (window as any).auth.user.id);
    console.log('Auth User Name:', (window as any).auth.user.full_name);
  } else {
    console.error('Không tìm thấy auth.user trong window!');
  }
  console.groupEnd();
});

// Component wrapper để đảm bảo auth được đặt vào window từ props
const AuthInitializer = ({ children, auth }: { children: React.ReactNode, auth: any }) => {
  React.useEffect(() => {
    if (auth?.user && !window.auth) {
      console.log('Khởi tạo window.auth từ props:', auth);
      window.auth = auth;
    }
  }, [auth]);

  return <>{children}</>;
};

createInertiaApp({
  resolve: async (name) => {
    return resolvePageComponent(`../pages/${name}.tsx`, import.meta.glob('../pages/**/*.tsx'))
  },
  setup({ el, App, props }: { el: HTMLElement, App: any, props: any }) {
    // Lấy thông tin auth từ props và đặt vào window
    const authData = props.initialPage?.props?.user?.auth;
    if (authData) {
      window.auth = authData;
      console.log('Khởi tạo window.auth từ initialPage:', authData);
    }
    
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
  },
}) 

