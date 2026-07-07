import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Mock API plugin for development
    {
      name: 'mock-api',
      configureServer(server) {
        // Mock /api/config for local development
        server.middlewares.use('/api/config', (req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({}))
        })
        // Mock /api/evaluate — 로컬 개발에서 평가 흐름을 끝까지 확인할 수 있는 목업 응답
        server.middlewares.use('/api/evaluate', (req, res) => {
          const mockResult = {
            totalScore: 82,
            grade: 'B',
            criteriaScores: [
              { criterionId: 'clarity', name: '질문의 명확성', score: 4, maxScore: 5, evidence: '[로컬 목업] 질문이 대체로 명확합니다.', strengths: '구체적인 맥락 제시', improvement: '원하는 결과물의 형태를 함께 명시해보세요.' },
              { criterionId: 'iteration', name: '반복적 개선', score: 4, maxScore: 5, evidence: '[로컬 목업] 후속 질문으로 내용을 발전시켰습니다.', strengths: '응답 기반 후속 질문', improvement: '이전 응답의 요약을 포함해보세요.' },
              { criterionId: 'critical', name: '비판적 사고', score: 4, maxScore: 5, evidence: '[로컬 목업] AI 응답에 의문을 제기했습니다.', strengths: '검증 시도', improvement: '외부 자료와 교차 검증해보세요.' },
              { criterionId: 'application', name: '실제 적용', score: 4, maxScore: 5, evidence: '[로컬 목업] 문제 해결에 적용했습니다.', strengths: '실전 적용', improvement: '적용 결과를 되돌아보는 질문을 추가해보세요.' }
            ],
            characteristics: ['로컬 개발 목업 응답'],
            qualitativeEvaluation: '⚠️ 이것은 로컬 개발 환경의 목업 평가입니다. 실제 AI 평가는 Vercel 배포 환경에서 동작합니다.',
            suggestions: ['배포 환경에서 실제 평가를 실행해보세요.']
          }
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ text: JSON.stringify(mockResult) }))
        })
        server.middlewares.use('/api/parse-chat', (req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            error: '로컬 개발 환경에서는 링크 파싱이 지원되지 않습니다. Vercel에 배포하면 사용 가능합니다.',
            hint: '지금은 "직접 붙여넣기" 탭을 이용해주세요.'
          }))
        })
      }
    }
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
    exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/**'],
  },
})
