import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // 포트를 3000으로 변경
    open: true, // 서버 시작 시 브라우저 자동 열기
    proxy: {
      // "/api"로 시작하는 요청은 Laravel 서버(8080)로 전달
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
