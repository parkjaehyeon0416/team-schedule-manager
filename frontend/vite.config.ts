import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // ★ v18.40 — 배포: 빌드 결과를 백엔드 public/admin-app 에 넣고, 화면은 http://서버/admin 으로 열림
  //   (Laravel web.php의 /admin/* 라우트가 admin-app/index.html을 돌려줌)
  base: "/admin-app/",
  build: {
    outDir: "../backend/public/admin-app",
    emptyOutDir: true,
  },
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
