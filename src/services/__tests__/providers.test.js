import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getProvider } from '../providers'
import { callGeminiAPI } from '../providers/gemini'
import { callOpenAIAPI } from '../providers/openai'
import { callClaudeAPI } from '../providers/claude'

// Mock fetchWithTimeout
vi.mock('../utils', () => ({
    fetchWithTimeout: vi.fn(),
}))

import { fetchWithTimeout } from '../utils'

describe('getProvider', () => {
    it('gemini → callGeminiAPI 함수 반환', () => {
        const provider = getProvider('gemini')
        expect(typeof provider).toBe('function')
    })

    it('openai → callOpenAIAPI 함수 반환', () => {
        const provider = getProvider('openai')
        expect(typeof provider).toBe('function')
    })

    it('claude → callClaudeAPI 함수 반환', () => {
        const provider = getProvider('claude')
        expect(typeof provider).toBe('function')
    })

    it('unknown → Error throw', () => {
        expect(() => getProvider('unknown')).toThrow('지원하지 않는 AI 제공업체입니다: unknown')
    })
})

describe('callGeminiAPI', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('성공 응답 → candidates[0].content.parts[0].text 추출', async () => {
        fetchWithTimeout.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                candidates: [{ content: { parts: [{ text: 'Gemini response' }] } }]
            })
        })

        const result = await callGeminiAPI('prompt', 'api-key', 'gemini-2.5-flash')
        expect(result).toBe('Gemini response')
    })

    it('HTTP 에러 → Error throw', async () => {
        fetchWithTimeout.mockResolvedValue({
            ok: false,
            status: 429,
            json: () => Promise.resolve({ error: { message: 'Rate limit' } })
        })

        await expect(callGeminiAPI('prompt', 'key', 'model')).rejects.toThrow('Rate limit')
    })

    it('빈 응답 → 빈 문자열', async () => {
        fetchWithTimeout.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ candidates: [] })
        })

        const result = await callGeminiAPI('prompt', 'key', 'model')
        expect(result).toBe('')
    })
})

describe('callOpenAIAPI', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('성공 응답 → choices[0].message.content 추출', async () => {
        fetchWithTimeout.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                choices: [{ message: { content: 'OpenAI response' } }]
            })
        })

        const result = await callOpenAIAPI('prompt', 'api-key', 'gpt-4o')
        expect(result).toBe('OpenAI response')
    })

    it('HTTP 에러 → Error throw', async () => {
        fetchWithTimeout.mockResolvedValue({
            ok: false,
            status: 401,
            json: () => Promise.resolve({ error: { message: 'Invalid API key' } })
        })

        await expect(callOpenAIAPI('prompt', 'key', 'model')).rejects.toThrow('Invalid API key')
    })
})

describe('callClaudeAPI', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('성공 응답 → content[0].text 추출', async () => {
        fetchWithTimeout.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                content: [{ text: 'Claude response' }]
            })
        })

        const result = await callClaudeAPI('prompt', 'api-key', 'claude-3-5-sonnet-20241022')
        expect(result).toBe('Claude response')
    })

    it('HTTP 에러 → Error throw', async () => {
        fetchWithTimeout.mockResolvedValue({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: { message: 'Internal server error' } })
        })

        await expect(callClaudeAPI('prompt', 'key', 'model')).rejects.toThrow('Internal server error')
    })
})
