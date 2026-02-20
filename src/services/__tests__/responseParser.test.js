import { describe, it, expect } from 'vitest'
import { parseEvaluationResponse } from '../responseParser'
import { mockRubric } from '../../test/fixtures/mockRubric'
import { mockEvaluationResult, mockEvaluationResultJSON, mockEvaluationResultInCodeBlock } from '../../test/fixtures/mockEvaluationResult'

describe('parseEvaluationResponse', () => {
    it('정상 JSON 문자열 파싱 → 올바른 result 객체 반환', () => {
        const result = parseEvaluationResponse(mockEvaluationResultJSON, mockRubric)
        expect(result.totalScore).toBe(85)
        expect(result.grade).toBe('B+')
        expect(result.criteriaScores).toHaveLength(4)
    })

    it('```json ... ``` 마크다운 코드블록 내 JSON 추출', () => {
        const result = parseEvaluationResponse(mockEvaluationResultInCodeBlock, mockRubric)
        expect(result.totalScore).toBe(85)
        expect(result.criteriaScores).toHaveLength(4)
    })

    it('``` ... ``` (json 키워드 없이) 코드블록 추출', () => {
        const response = '```\n' + mockEvaluationResultJSON + '\n```'
        const result = parseEvaluationResponse(response, mockRubric)
        expect(result.totalScore).toBe(85)
    })

    it('totalScore 누락 시 기본값 0', () => {
        const json = JSON.stringify({ grade: 'A', criteriaScores: [] })
        const result = parseEvaluationResponse(json, mockRubric)
        expect(result.totalScore).toBe(0)
    })

    it('grade 누락 시 기본값 N/A', () => {
        const json = JSON.stringify({ totalScore: 80, criteriaScores: [] })
        const result = parseEvaluationResponse(json, mockRubric)
        expect(result.grade).toBe('N/A')
    })

    it('criteriaScores 빈 배열일 때 빈 배열 반환', () => {
        const json = JSON.stringify({ totalScore: 50, grade: 'C', criteriaScores: [] })
        const result = parseEvaluationResponse(json, mockRubric)
        expect(result.criteriaScores).toEqual([])
    })

    it('percentage 자동 계산 (score/maxScore * 100)', () => {
        const json = JSON.stringify({
            totalScore: 80,
            grade: 'B',
            criteriaScores: [{ score: 4, maxScore: 5, name: 'test' }],
        })
        const result = parseEvaluationResponse(json, mockRubric)
        expect(result.criteriaScores[0].percentage).toBe(80)
    })

    it('percentage가 있으면 자동 계산으로 덮어쓰지 않음', () => {
        const json = JSON.stringify({
            totalScore: 80,
            grade: 'B',
            criteriaScores: [{ score: 4, maxScore: 5, percentage: 90, name: 'test' }],
        })
        const result = parseEvaluationResponse(json, mockRubric)
        expect(result.criteriaScores[0].percentage).toBe(90)
    })

    it('evidence 누락 시 feedback으로 fallback', () => {
        const json = JSON.stringify({
            totalScore: 80,
            grade: 'B',
            criteriaScores: [{ score: 4, maxScore: 5, name: 'test', feedback: '좋습니다' }],
        })
        const result = parseEvaluationResponse(json, mockRubric)
        expect(result.criteriaScores[0].evidence).toBe('좋습니다')
    })

    it('evidence와 feedback 모두 없으면 기본 메시지', () => {
        const json = JSON.stringify({
            totalScore: 80,
            grade: 'B',
            criteriaScores: [{ score: 4, maxScore: 5, name: 'test' }],
        })
        const result = parseEvaluationResponse(json, mockRubric)
        expect(result.criteriaScores[0].evidence).toBe('근거가 제공되지 않았습니다.')
    })

    it('유효하지 않은 JSON → rubric 기반 기본 응답 생성', () => {
        const result = parseEvaluationResponse('not valid json at all', mockRubric)
        expect(result.totalScore).toBe(0)
        expect(result.grade).toBe('N/A')
        expect(result.criteriaScores).toHaveLength(mockRubric.criteria.length)
        expect(result.criteriaScores[0].name).toBe('질문의 명확성')
    })

    it('빈 문자열 → rubric 기반 기본 응답', () => {
        const result = parseEvaluationResponse('', mockRubric)
        expect(result.totalScore).toBe(0)
        expect(result.criteriaScores).toHaveLength(mockRubric.criteria.length)
    })

    it('studentRecordDraft 누락 시 빈 문자열', () => {
        const json = JSON.stringify({ totalScore: 80, grade: 'B', criteriaScores: [] })
        const result = parseEvaluationResponse(json, mockRubric)
        expect(result.studentRecordDraft).toBe('')
    })

    it('suggestions 누락 시 빈 배열', () => {
        const json = JSON.stringify({ totalScore: 80, grade: 'B', criteriaScores: [] })
        const result = parseEvaluationResponse(json, mockRubric)
        expect(result.suggestions).toEqual([])
    })

    it('characteristics 누락 시 빈 배열', () => {
        const json = JSON.stringify({ totalScore: 80, grade: 'B', criteriaScores: [] })
        const result = parseEvaluationResponse(json, mockRubric)
        expect(result.characteristics).toEqual([])
    })
})
