import { describe, it, expect } from 'vitest'
import { isAllowedOrigin } from '../origin.js'

describe('isAllowedOrigin', () => {
    const baseAllowed = ['https://pro-of-ai.vercel.app']

    it('정확히 일치하는 origin 허용', () => {
        expect(isAllowedOrigin('https://pro-of-ai.vercel.app', baseAllowed)).toBe(true)
    })

    it('http/https 다른 스킴 거부', () => {
        expect(isAllowedOrigin('http://pro-of-ai.vercel.app', baseAllowed)).toBe(false)
    })

    it('서브도메인이 아닌 임의 도메인 거부', () => {
        expect(isAllowedOrigin('https://evil.com', baseAllowed)).toBe(false)
        expect(isAllowedOrigin('https://attacker-pro-of-ai.vercel.app', baseAllowed)).toBe(false)
    })

    it('preview 배포 (proofai-xxx.vercel.app)는 허용 패턴에 포함 시 통과', () => {
        const allowed = [...baseAllowed, /^https:\/\/proofai-[a-z0-9]+-greatsongs-projects\.vercel\.app$/]
        expect(isAllowedOrigin('https://proofai-6l1268ib7-greatsongs-projects.vercel.app', allowed)).toBe(true)
    })

    it('localhost (dev) 허용', () => {
        const allowed = [...baseAllowed, 'http://localhost:5173']
        expect(isAllowedOrigin('http://localhost:5173', allowed)).toBe(true)
    })

    it('origin이 null/undefined/빈 문자열 → false', () => {
        expect(isAllowedOrigin(null, baseAllowed)).toBe(false)
        expect(isAllowedOrigin(undefined, baseAllowed)).toBe(false)
        expect(isAllowedOrigin('', baseAllowed)).toBe(false)
    })

    it('allowlist가 비어있으면 모두 거부', () => {
        expect(isAllowedOrigin('https://pro-of-ai.vercel.app', [])).toBe(false)
    })

    it('대소문자 정규화 (origin은 RFC상 소문자)', () => {
        expect(isAllowedOrigin('HTTPS://PRO-OF-AI.VERCEL.APP', baseAllowed)).toBe(true)
    })

    it('trailing slash 무시', () => {
        expect(isAllowedOrigin('https://pro-of-ai.vercel.app/', baseAllowed)).toBe(true)
    })
})
