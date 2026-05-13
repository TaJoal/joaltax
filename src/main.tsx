import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import koKR from 'antd/locale/ko_KR';
import 'dayjs/locale/ko';
import { App } from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ConfigProvider
      locale={koKR}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#0a0a0a',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          colorInfo: '#4f46e5',
          borderRadius: 12,
          colorText: '#0a0a0a',
          colorTextSecondary: '#6b7280',
          colorBorder: 'rgba(10,10,10,0.1)',
          fontFamily:
            '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", system-ui, sans-serif',
          fontSize: 14,
        },
      }}
    >
      <AntApp message={{ maxCount: 2 }}>
        <App />
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
