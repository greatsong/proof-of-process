import { describe, it, expect, vi, beforeEach } from 'vitest'
import { evaluateChat } from '../evaluator'
import { mockRubric } from '../../test/fixtures/mockRubric'
import { mockEvaluationResultJSON } from '../../test/fixtures/mockEvaluationResult'

// Mock providers
vi.mock('../providers', () => ({
    getProvider: vi.fn(),
}))

// Mock fetch for server proxy
vi.mock('../utils', () => ({
    fetchWithTimeout: vi.fn(),
}))

import { getProvider } from '../providers'
import { fetchWithTimeout } from '../utils'

describe('evaluateChat 통합 테스트', () => {
    const baseSettings = {
        provider: 'gemini',
        apiKeys: { gemini: 'test-key' },
        models: { gemini: 'gemini-2.5-flash' },
        evaluationRuns: 1,
        useServerSide: false,
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('단일 실행: provider → parser 전체 파이프라인 성공', async () => {
        const mockAPI = vi.fn().mockResolvedValue(mockEvaluationResultJSON)
        getProvider.mockReturnValue(mockAPI)

        const result = await evaluateChat({
            chatContent: 'You: 질문\nChatGPT: 답변',
            reflection: '',
            rubric: mockRubric,
            apiSettings: baseSettings,
        })

        expect(result.totalScore).toBe(85)
        expect(result.grade).toBe('B+')
        expect(result.criteriaScores).toHaveLength(4)
        expect(mockAPI).toHaveBeenCalledTimes(1)
    })

    it('K-run(3회): 3개 병렬 실행 → synthesis 합성', async () => {
        const makeResponse = (score) => JSON.stringify({
            totalScore: score,
            grade: 'B',
            criteriaScores: mockRubric.criteria.map(c => ({
                criterionId: c.id, name: c.name, score: 4, maxScore: 5, percentage: 80,
                evidence: 'test', strengths: 'good', weaknesses: 'ok', improvement: 'better',
            })),
            characteristics: ['test'],
            qualitativeEvaluation: '좋음',
            suggestions: ['제안'],
            studentRecordDraft: '기록',
        })

        let callCount = 0
        const mockAPI = vi.fn().mockImplementation(() => {
            callCount++
            return Promise.resolve(makeResponse(80 + callCount * 5))
        })
        getProvider.mockReturnValue(mockAPI)

        const result = await evaluateChat({
            chatContent: 'You: 질문\nChatGPT: 답변',
            reflection: '',
            rubric: mockRubric,
            apiSettings: { ...baseSettings, evaluationRuns: 3 },
        })

        expect(mockAPI).toHaveBeenCalledTimes(3)
        expect(result.totalScore).toBeGreaterThan(0)
        expect(result.evaluationMeta).toBeDefined()
        expect(result.evaluationMeta.runs).toBe(3)
    })

    it('K-run: 일부 실패(2/3 성공) → 성공한 결과만 합성', async () => {
        let callCount = 0
        const mockAPI = vi.fn().mockImplementation(() => {
            callCount++
            if (callCount === 2) return Promise.reject(new Error('API error'))
            return Promise.resolve(JSON.stringify({
                totalScore: 80,
                grade: 'B',
                criteriaScores: [{ name: '질문', score: 4, maxScore: 5 }],
                characteristics: [],
                qualitativeEvaluation: '',
                suggestions: [],
                studentRecordDraft: '',
            }))
        })
        getProvider.mockReturnValue(mockAPI)

        const result = await evaluateChat({
            chatContent: 'You: 질문\nChatGPT: 답변',
            reflection: '',
            rubric: mockRubric,
            apiSettings: { ...baseSettings, evaluationRuns: 3 },
        })

        expect(result.totalScore).toBe(80)
        expect(result.evaluationMeta.runs).toBe(2)
    })

    it('K-run: 전부 실패 → 에러 throw', async () => {
        const mockAPI = vi.fn().mockRejectedValue(new Error('All failed'))
        getProvider.mockReturnValue(mockAPI)

        await expect(evaluateChat({
            chatContent: 'You: 질문\nChatGPT: 답변',
            reflection: '',
            rubric: mockRubric,
            apiSettings: { ...baseSettings, evaluationRuns: 3 },
        })).rejects.toThrow('모든 평가 시도가 실패했습니다')
    })

    it('모델명 없음/custom → 에러 throw', async () => {
        await expect(evaluateChat({
            chatContent: 'test',
            reflection: '',
            rubric: mockRubric,
            apiSettings: { ...baseSettings, models: { gemini: 'custom' } },
        })).rejects.toThrow('모델 이름이 올바르지 않습니다')
    })

    it('모델명 빈 문자열 → 에러 throw', async () => {
        await expect(evaluateChat({
            chatContent: 'test',
            reflection: '',
            rubric: mockRubric,
            apiSettings: { ...baseSettings, models: { gemini: '' } },
        })).rejects.toThrow('모델 이름이 올바르지 않습니다')
    })

    it('재시도: 1차 실패 → 2차 성공', async () => {
        let callCount = 0
        const mockAPI = vi.fn().mockImplementation(() => {
            callCount++
            if (callCount === 1) return Promise.reject(new Error('Temporary'))
            return Promise.resolve(mockEvaluationResultJSON)
        })
        getProvider.mockReturnValue(mockAPI)

        const result = await evaluateChat({
            chatContent: 'You: 질문\nChatGPT: 답변',
            reflection: '',
            rubric: mockRubric,
            apiSettings: baseSettings,
        })

        expect(result.totalScore).toBe(85)
        expect(mockAPI).toHaveBeenCalledTimes(2)
    })

    it('재시도 3회 + server proxy fallback 성공', async () => {
        const mockAPI = vi.fn().mockRejectedValue(new Error('Always fails'))
        getProvider.mockReturnValue(mockAPI)

        fetchWithTimeout.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ text: mockEvaluationResultJSON }),
        })

        const result = await evaluateChat({
            chatContent: 'You: 질문\nChatGPT: 답변',
            reflection: '',
            rubric: mockRubric,
            apiSettings: baseSettings,
        })

        expect(result.totalScore).toBe(85)
        expect(fetchWithTimeout).toHaveBeenCalled()
    })

    it('재시도 3회 + server proxy도 실패 → 에러 throw', async () => {
        const mockAPI = vi.fn().mockRejectedValue(new Error('Client fail'))
        getProvider.mockReturnValue(mockAPI)

        fetchWithTimeout.mockResolvedValue({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Server fail' }),
        })

        await expect(evaluateChat({
            chatContent: 'You: 질문\nChatGPT: 답변',
            reflection: '',
            rubric: mockRubric,
            apiSettings: baseSettings,
        })).rejects.toThrow()
    })

    it('API key 없음 → server proxy 사용', async () => {
        fetchWithTimeout.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ text: mockEvaluationResultJSON }),
        })

        const result = await evaluateChat({
            chatContent: 'You: 질문\nChatGPT: 답변',
            reflection: '',
            rubric: mockRubric,
            apiSettings: { ...baseSettings, apiKeys: { gemini: '' } },
        })

        expect(result.totalScore).toBe(85)
        expect(fetchWithTimeout).toHaveBeenCalledWith(
            '/api/evaluate',
            expect.any(Object),
            30000
        )
    })
})
