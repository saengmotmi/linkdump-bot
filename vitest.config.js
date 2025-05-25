import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'workers/complete-app.js', // Workers 런타임 환경이 필요한 메인 파일
      ]
    }
  }
})