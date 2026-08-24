import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // `?react` 쿼리로 임포트한 SVG만 React 컴포넌트로 변환 (currentColor 지원)
    svgr({ include: '**/*.svg?react', svgrOptions: { exportType: 'default' } }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 엑셀 내보내기 청크는 사용자 요청 시에만 로드되며 라이브러리 자체가 큽니다.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    assetsInlineLimit: 0,
  },
  base: '/',
});
