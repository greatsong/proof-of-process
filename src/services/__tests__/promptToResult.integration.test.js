import { describe, it, expect } from 'vitest'
import { buildEvaluationPrompt } from '../prompts'
import { parseEvaluationResponse } from '../responseParser'
import { verifyEvidence } from '../evidenceVerifier'
import { mockRubric } from '../../test/fixtures/mockRubric'
import { chatGPTFormat, unstructuredText } from '../../test/fixtures/mockChatContent'
import { mockEvaluationResultInCodeBlock } from '../../test/fixtures/mockEvaluationResult'

describe('prompts → responseParser → evidenceVerifier 파이프라인', () => {
    it('프롬프트 생성 → mock 응답 → 파싱 → 인용 검증 전체 파이프라인', () => {
        // 1. 프롬프트 생성
        const prompt = buildEvaluationPrompt(chatGPTFormat, mockRubric, '')
        expect(prompt).toContain(mockRubric.name)

        // 2. 파싱
        const parsed = parseEvaluationResponse(mockEvaluationResultInCodeBlock, mockRubric)
        expect(parsed.totalScore).toBe(85)
        expect(parsed.criteriaScores).toHaveLength(4)

        // 3. 인용 검증
        const verified = verifyEvidence(parsed, chatGPTFormat)
        expect(verified.verificationSummary).toBeDefined()
        expect(verified.verificationSummary.totalQuotes).toBeGreaterThan(0)
    })

    it('파싱된 채팅(구조화) → 프롬프트에 턴 번호 + 시계열 분석 포함', () => {
        const prompt = buildEvaluationPrompt(chatGPTFormat, mockRubric, '')
        expect(prompt).toContain('시계열 분석 지침')
        expect(prompt).toContain('[학생 턴')
        expect(prompt).toContain('대화 구조 분석 결과')
    })

    it('비파싱 채팅(원본) → 프롬프트에 노이즈 경고 포함', () => {
        const prompt = buildEvaluationPrompt(unstructuredText, mockRubric, '')
        expect(prompt).toContain('노이즈')
        expect(prompt).not.toContain('시계열 분석 지침')
    })

    it('인용 검증: 실제 채팅 텍스트에 있는 인용 → verified', () => {
        const result = {
            totalScore: 80,
            criteriaScores: [{
                name: 'test',
                evidence: '학생이 「구체적으로 설명해주세요」라고 요청함',
            }],
        }
        const chatWithQuote = 'You: 구체적으로 설명해주세요\nChatGPT: 네'
        const verified = verifyEvidence(result, chatWithQuote)
        const v = verified.criteriaScores[0].evidenceVerification[0]
        expect(v.status).toBe('verified')
    })

    it('인용 검증: 채팅에 없는 인용 → unverified', () => {
        const result = {
            totalScore: 80,
            criteriaScores: [{
                name: 'test',
                evidence: '학생이 「양자역학에 대해 알려줘」라고 요청함',
            }],
        }
        const chatWithoutQuote = 'You: 프롬프트 엔지니어링이란?\nChatGPT: 네'
        const verified = verifyEvidence(result, chatWithoutQuote)
        const v = verified.criteriaScores[0].evidenceVerification[0]
        expect(v.status).toBe('unverified')
    })
})
