#!/usr/bin/env node

/**
 * 배포 전 환경변수 검증 + Vercel 프로덕션 배포
 *
 * 사용법:
 *   npm run deploy         — 검증 + 배포
 *   npm run deploy:check   — 검증만 (배포 안 함)
 */

import { readFileSync } from 'fs'
import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const CHECK_ONLY = process.argv.includes('--check-only')

const EXPECTED_PROJECT = 'proofai'
const EXPECTED_DOMAIN = 'pro-of-ai.vercel.app'
const REQUIRED_ENV_VARS = ['GEMINI_API_KEY', 'CLAUDE_API_KEY', 'OPENAI_API_KEY', 'SECRET_API_PIN']

function log(msg) { console.log(`\x1b[36m[deploy]\x1b[0m ${msg}`) }
function warn(msg) { console.log(`\x1b[33m[경고]\x1b[0m ${msg}`) }
function fail(msg) { console.error(`\x1b[31m[오류]\x1b[0m ${msg}`); process.exit(1) }
function ok(msg) { console.log(`\x1b[32m[✓]\x1b[0m ${msg}`) }

// 1. .vercel/project.json 확인
log('Vercel 프로젝트 설정 확인...')
try {
    const projectJson = JSON.parse(readFileSync(resolve(ROOT, '.vercel/project.json'), 'utf-8'))
    if (projectJson.projectName !== EXPECTED_PROJECT) {
        fail(`Vercel 프로젝트가 "${projectJson.projectName}"으로 설정되어 있습니다. "${EXPECTED_PROJECT}"여야 합니다.\n  → npx vercel link --project ${EXPECTED_PROJECT} --yes`)
    }
    ok(`Vercel 프로젝트: ${projectJson.projectName}`)
} catch {
    fail('.vercel/project.json을 찾을 수 없습니다.\n  → npx vercel link --project proofai --yes')
}

// 2. Vercel 환경변수 확인
log('Vercel 환경변수 확인...')
try {
    const envOutput = execSync('npx vercel env ls 2>/dev/null', { cwd: ROOT, encoding: 'utf-8' })
    const missing = REQUIRED_ENV_VARS.filter(v => !envOutput.includes(v))
    if (missing.length > 0) {
        fail(`다음 환경변수가 Vercel에 설정되지 않았습니다: ${missing.join(', ')}\n  → Vercel 대시보드 또는 CLI로 추가: npx vercel env add <NAME> production`)
    }
    ok(`필수 환경변수 ${REQUIRED_ENV_VARS.length}개 모두 설정됨`)
} catch (e) {
    warn('Vercel 환경변수 목록을 가져올 수 없습니다. Vercel CLI 로그인 상태를 확인하세요.')
}

if (CHECK_ONLY) {
    log('검증 완료 (--check-only 모드)')
    process.exit(0)
}

// 3. 프로덕션 배포
log('프로덕션 배포 시작...')
try {
    execSync('npx vercel --prod --yes', { cwd: ROOT, stdio: 'inherit' })
    ok('배포 완료!')
} catch {
    fail('배포에 실패했습니다.')
}

// 4. 헬스체크
log('헬스체크 확인 중...')
setTimeout(() => {
    try {
        const health = execSync(`curl -s https://${EXPECTED_DOMAIN}/api/health`, { encoding: 'utf-8' })
        const result = JSON.parse(health)
        if (result.status === 'ok') {
            ok(`${EXPECTED_DOMAIN} 정상 작동 확인`)
        } else {
            warn(`헬스체크 결과: ${health}`)
        }
    } catch {
        warn('헬스체크를 확인할 수 없습니다. 수동으로 확인하세요.')
    }
}, 5000)
