import { describe, it, expect } from 'vitest'
import { redactPII } from '../piiRedactor'

describe('redactPII', () => {
    it('이메일, 휴대전화, 일반전화, 주민등록번호를 가린다', () => {
        expect(redactPII('메일 test.user+1@example.co.kr 로')).toBe('메일 [이메일] 로')
        expect(redactPII('연락처 010-1234-5678')).toBe('연락처 [전화번호]')
        expect(redactPII('연락처 01012345678입니다')).toBe('연락처 [전화번호]입니다')
        expect(redactPII('학교 02-123-4567')).toBe('학교 [전화번호]')
        expect(redactPII('번호 080101-3123456')).toBe('번호 [주민등록번호]')
        expect(redactPII('사무실 070-1234-5678')).toBe('사무실 [전화번호]')
        expect(redactPII('010-1234-5678')).toBe('[전화번호]')
        expect(redactPII('연락처 0212345678')).toBe('연락처 [전화번호]')
        expect(redactPII('연락처 0311234567')).toBe('연락처 [전화번호]')
    })

    it('평가에 필요한 일반 숫자는 그대로 둔다', () => {
        const text = 'for i in range(1000): print(i * 20260105) # 10305번 문제, 점수 95.5, 2026-11-05'
        expect(redactPII(text)).toBe(text)
    })

    it('@ 없는 긴 문자열도 빠르게 처리한다', () => {
        const text = 'a'.repeat(200000)
        const start = performance.now()
        expect(redactPII(text)).toBe(text)
        expect(performance.now() - start).toBeLessThan(2000)
    })

    it('문자열이 아니면 그대로 돌려준다', () => {
        expect(redactPII(null)).toBe(null)
        expect(redactPII(undefined)).toBe(undefined)
    })
})
