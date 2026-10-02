import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // ★ v18.40 — 배포: 빌드 결과를 백엔드 public/admin-app 에 넣고, 화면은 http://서버/admin 으로 열림
  //   (Laravel web.php의 /admin/* 라우트가 admin-app/index.html을 돌려줌)
  //   개발 서버는 http://localhost:3000/admin/ 에서 열림(라우터 basename과 맞춤)
  base: command === "build" ? "/admin-app/" : "/admin/",
  build: {
    outDir: "../backend/public/admin-app",
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: false,
    proxy: {
      // "/api"로 시작하는 요청은 로컬 Laravel 서버(8000)로 전달
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // ★ v18.41 — 업로드 이미지(배너 등)
      "/storage": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
}));
