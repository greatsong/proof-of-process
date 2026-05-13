import { describe, it, expect } from 'vitest'
import { validateEvaluateRequest, MODEL_ALLOWLIST, MIN_PROMPT_LEN, MAX_PROMPT_LEN } from '../validation.js'

const validPrompt = '학생: '.padEnd(MIN_PROMPT_LEN + 10, 'a')

describe('validateEvaluateRequest', () => {
    it('정상 요청 → ok:true', () => {
        const r = validateEvaluateRequest({ prompt: validPrompt, provider: 'gemini', model: 'gemini-2.5-flash' })
        expect(r.ok).toBe(true)
        expect(r.data.prompt).toBe(validPrompt)
        expect(r.data.provider).toBe('gemini')
    })

    it('prompt 없음 → 400', () => {
        const r = validateEvaluateRequest({ provider: 'gemini', model: 'gemini-2.5-flash' })
        expect(r.ok).toBe(false)
        expect(r.status).toBe(400)
        expect(r.error).toMatch(/prompt/i)
    })

    it('prompt 빈 문자열 → 400', () => {
        const r = validateEvaluateRequest({ prompt: '', provider: 'gemini', model: 'gemini-2.5-flash' })
        expect(r.ok).toBe(false)
        expect(r.status).toBe(400)
    })

    it('prompt 공백만 → 400', () => {
        const r = validateEvaluateRequest({ prompt: '   \n\t  ', provider: 'gemini', model: 'gemini-2.5-flash' })
        expect(r.ok).toBe(false)
        expect(r.status).toBe(400)
    })

    it('prompt 너무 짧음 → 400', () => {
        const r = validateEvaluateRequest({ prompt: 'short', provider: 'gemini', model: 'gemini-2.5-flash' })
        expect(r.ok).toBe(false)
        expect(r.status).toBe(400)
        expect(r.error).toMatch(/짧|짧습|short|min/i)
    })

    it('prompt 너무 김 → 400', () => {
        const r = validateEvaluateRequest({
            prompt: 'a'.repeat(MAX_PROMPT_LEN + 1),
            provider: 'gemini',
            model: 'gemini-2.5-flash'
        })
        expect(r.ok).toBe(false)
        expect(r.status).toBe(400)
        expect(r.error).toMatch(/긴|깁|long|max/i)
    })

    it('provider 누락 → 기본값 gemini 또는 400 (둘 중 하나여야 함)', () => {
        const r = validateEvaluateRequest({ prompt: validPrompt, model: 'gemini-2.5-flash' })
        // 디폴트 gemini로 fallback 한다면 ok, 아니면 400
        if (r.ok) expect(r.data.provider).toBe('gemini')
        else expect(r.status).toBe(400)
    })

    it('허용되지 않은 provider → 400', () => {
        const r = validateEvaluateRequest({ prompt: validPrompt, provider: 'evil-llm', model: 'x' })
        expect(r.ok).toBe(false)
        expect(r.status).toBe(400)
        expect(r.error).toMatch(/provider/i)
    })

    it('provider별 모델 화이트리스트 외 → 400', () => {
        const r = validateEvaluateRequest({ prompt: validPrompt, provider: 'gemini', model: 'gpt-4o' })
        expect(r.ok).toBe(false)
        expect(r.status).toBe(400)
        expect(r.error).toMatch(/model/i)
    })

    it('ensemble provider 허용', () => {
        const r = validateEvaluateRequest({ prompt: validPrompt, provider: 'ensemble' })
        expect(r.ok).toBe(true)
    })

    it('모든 provider의 허용 모델은 통과', () => {
        for (const [provider, models] of Object.entries(MODEL_ALLOWLIST)) {
            if (provider === 'ensemble') continue
            for (const model of models) {
                const r = validateEvaluateRequest({ prompt: validPrompt, provider, model })
                expect(r.ok, `${provider}/${model} should be valid`).toBe(true)
            }
        }
    })

    it('body가 객체가 아닐 때 → 400', () => {
        expect(validateEvaluateRequest(null).ok).toBe(false)
        expect(validateEvaluateRequest('string').ok).toBe(false)
        expect(validateEvaluateRequest(undefined).ok).toBe(false)
    })
})
