import { describe, it, expect } from 'vitest'
import { extractQuotes, verifyEvidence } from '../evidenceVerifier'

describe('extractQuotes', () => {
    it('「quote1」「quote2」 → 2개 추출', () => {
        const text = '학생이 「구체적으로 설명해줘」라고 요청하고 「좋은 질문이야」라고 함'
        expect(extractQuotes(text)).toEqual(['구체적으로 설명해줘', '좋은 질문이야'])
    })

    it('빈 문자열 → []', () => {
        expect(extractQuotes('')).toEqual([])
    })

    it('null/undefined → []', () => {
        expect(extractQuotes(null)).toEqual([])
        expect(extractQuotes(undefined)).toEqual([])
    })

    it('「」 없는 텍스트 → []', () => {
        expect(extractQuotes('인용 없는 일반 텍스트')).toEqual([])
    })
})

describe('verifyEvidence', () => {
    const chatContent = '사용자: 구체적으로 고등학생 수준에서 설명해줘\nAI: 네 알겠습니다. 프롬프트 엔지니어링은 AI에게 효과적으로 질문하는 방법입니다.'

    const baseResult = {
        totalScore: 80,
        grade: 'B',
        criteriaScores: [
            {
                criterionId: 'c1',
                name: '질문의 명확성',
                score: 4,
                maxScore: 5,
                evidence: '학생이 「구체적으로 고등학생 수준에서 설명해줘」라고 요청하여 명확성이 높음',
            },
        ],
    }

    it('정확히 일치하는 인용 → verified', () => {
        const result = verifyEvidence(baseResult, chatContent)
        const verification = result.criteriaScores[0].evidenceVerification[0]
        expect(verification.status).toBe('verified')
        expect(verification.similarity).toBeGreaterThanOrEqual(0.85)
    })

    it('유사한 인용 (공백/구두점 차이) → similar', () => {
        const resultWithSimilar = {
            ...baseResult,
            criteriaScores: [{
                ...baseResult.criteriaScores[0],
                evidence: '학생이 「고등학생 수준 설명」이라고 말함',
            }],
        }
        const result = verifyEvidence(resultWithSimilar, chatContent)
        const verification = result.criteriaScores[0].evidenceVerification[0]
        expect(['verified', 'similar']).toContain(verification.status)
    })

    it('존재하지 않는 인용 → unverified', () => {
        const resultWithFake = {
            ...baseResult,
            criteriaScores: [{
                ...baseResult.criteriaScores[0],
                evidence: '학생이 「양자역학에 대해 알려줘」라고 요청함',
            }],
        }
        const result = verifyEvidence(resultWithFake, chatContent)
        const verification = result.criteriaScores[0].evidenceVerification[0]
        expect(verification.status).toBe('unverified')
    })

    it('verificationSummary.totalQuotes 카운트', () => {
        const result = verifyEvidence(baseResult, chatContent)
        expect(result.verificationSummary.totalQuotes).toBe(1)
    })

    it('reliability 계산: (verified + similar*0.5) / total * 100', () => {
        const result = verifyEvidence(baseResult, chatContent)
        expect(result.verificationSummary.reliability).toBeGreaterThan(0)
        expect(result.verificationSummary.reliability).toBeLessThanOrEqual(100)
    })

    it('인용이 없는 경우 reliability: null', () => {
        const noQuotesResult = {
            ...baseResult,
            criteriaScores: [{
                ...baseResult.criteriaScores[0],
                evidence: '인용 없이 일반적인 평가만 작성됨',
            }],
        }
        const result = verifyEvidence(noQuotesResult, chatContent)
        expect(result.verificationSummary.reliability).toBeNull()
    })

    it('null evaluationResult → 그대로 반환', () => {
        expect(verifyEvidence(null, chatContent)).toBeNull()
    })

    it('null chatContent → 그대로 반환', () => {
        const result = verifyEvidence(baseResult, null)
        expect(result).toEqual(baseResult)
    })

    it('criteriaScores에 evidenceVerification 배열 추가 확인', () => {
        const result = verifyEvidence(baseResult, chatContent)
        expect(Array.isArray(result.criteriaScores[0].evidenceVerification)).toBe(true)
    })
})
