import { describe, it, expect } from 'vitest'
import { synthesizeKRunResults, synthesizeResults } from '../synthesis'

describe('synthesizeKRunResults', () => {
    const makeResult = (score, criteria = []) => ({
        totalScore: score,
        grade: 'B',
        criteriaScores: criteria,
        characteristics: [`특징-${score}`],
        qualitativeEvaluation: `평가-${score}`,
        conversationFlow: `흐름-${'x'.repeat(score)}`,
        suggestions: [`제안-${score}`],
        studentRecordDraft: `기록-${'y'.repeat(score)}`,
    })

    it('결과 1개 → 그대로 반환 (평균 = 원본)', () => {
        const result = synthesizeKRunResults([makeResult(85)])
        expect(result.totalScore).toBe(85)
        expect(result.evaluationMeta.runs).toBe(1)
    })

    it('결과 3개 → 평균 점수 계산 정확성', () => {
        const results = [makeResult(80), makeResult(90), makeResult(85)]
        const result = synthesizeKRunResults(results)
        expect(result.totalScore).toBe(85) // (80+90+85)/3 = 85
    })

    it('scoreRange (min/max) 정확성', () => {
        const results = [makeResult(70), makeResult(90), makeResult(80)]
        const result = synthesizeKRunResults(results)
        expect(result.evaluationMeta.scoreRange.min).toBe(70)
        expect(result.evaluationMeta.scoreRange.max).toBe(90)
    })

    it('variance = max - min', () => {
        const results = [makeResult(70), makeResult(90)]
        const result = synthesizeKRunResults(results)
        expect(result.evaluationMeta.variance).toBe(20)
    })

    it('evaluationMeta.runs 카운트 정확성', () => {
        const results = [makeResult(80), makeResult(85), makeResult(90)]
        const result = synthesizeKRunResults(results)
        expect(result.evaluationMeta.runs).toBe(3)
    })

    it('grade: calculateGrade(avgScore) 적용 확인', () => {
        const results = [makeResult(95), makeResult(96)]
        const result = synthesizeKRunResults(results)
        // 평균 95.5 → 반올림 96 → A+
        expect(result.grade).toBe('A+')
    })

    it('criteriaScores 평균 계산 (소수점 반올림)', () => {
        const cs = (score) => [{ name: '질문', score, maxScore: 5 }]
        const results = [
            { ...makeResult(80), criteriaScores: cs(3) },
            { ...makeResult(85), criteriaScores: cs(4) },
            { ...makeResult(90), criteriaScores: cs(5) },
        ]
        const result = synthesizeKRunResults(results)
        expect(result.criteriaScores[0].score).toBe(4) // (3+4+5)/3 = 4
    })

    it('characteristics 중복 제거 (Set), 최대 5개', () => {
        const results = [
            { ...makeResult(80), characteristics: ['A', 'B', 'C'] },
            { ...makeResult(85), characteristics: ['B', 'C', 'D'] },
            { ...makeResult(90), characteristics: ['D', 'E', 'F'] },
        ]
        const result = synthesizeKRunResults(results)
        expect(result.characteristics.length).toBeLessThanOrEqual(5)
        expect(new Set(result.characteristics).size).toBe(result.characteristics.length)
    })

    it('suggestions 중복 제거, 최대 4개', () => {
        const results = [
            { ...makeResult(80), suggestions: ['S1', 'S2'] },
            { ...makeResult(85), suggestions: ['S2', 'S3'] },
            { ...makeResult(90), suggestions: ['S3', 'S4', 'S5'] },
        ]
        const result = synthesizeKRunResults(results)
        expect(result.suggestions.length).toBeLessThanOrEqual(4)
    })

    it('studentRecordDraft: 가장 긴 것 선택', () => {
        const results = [
            { ...makeResult(80), studentRecordDraft: 'short' },
            { ...makeResult(85), studentRecordDraft: 'this is the longest record draft available' },
            { ...makeResult(90), studentRecordDraft: 'medium text' },
        ]
        const result = synthesizeKRunResults(results)
        expect(result.studentRecordDraft).toBe('this is the longest record draft available')
    })

    it('conversationFlow: 가장 긴 것 선택', () => {
        const results = [
            { ...makeResult(80), conversationFlow: 'a' },
            { ...makeResult(85), conversationFlow: 'abc' },
            { ...makeResult(90), conversationFlow: 'ab' },
        ]
        const result = synthesizeKRunResults(results)
        expect(result.conversationFlow).toBe('abc')
    })
})

describe('synthesizeResults', () => {
    const makeJSON = (score) => JSON.stringify({
        totalScore: score,
        grade: 'B',
        criteriaScores: [{ name: '질문', score: 4, maxScore: 5 }],
        characteristics: [`특징-${score}`],
        qualitativeEvaluation: `평가-${score}`,
        suggestions: [`제안-${score}`],
    })

    it('정상 JSON 텍스트 3개 → 종합 JSON 문자열 반환', () => {
        const texts = [makeJSON(80), makeJSON(90), makeJSON(85)]
        const result = JSON.parse(synthesizeResults(texts))
        expect(result.totalScore).toBe(85)
    })

    it('마크다운 코드블록 JSON 추출', () => {
        const texts = ['```json\n' + makeJSON(80) + '\n```', makeJSON(90)]
        const result = JSON.parse(synthesizeResults(texts))
        expect(result.totalScore).toBe(85)
    })

    it('파싱 실패한 항목 무시', () => {
        const texts = [makeJSON(80), 'invalid json', makeJSON(90)]
        const result = JSON.parse(synthesizeResults(texts))
        expect(result.totalScore).toBe(85)
    })

    it('전부 파싱 실패 → 첫 텍스트 원본 반환', () => {
        const texts = ['invalid1', 'invalid2']
        const result = synthesizeResults(texts)
        expect(result).toBe('invalid1')
    })

    it('criteriaScores 인덱스 기반 평균', () => {
        const texts = [
            JSON.stringify({ totalScore: 80, criteriaScores: [{ name: '질문', score: 3, maxScore: 5 }], qualitativeEvaluation: 'a', characteristics: [], suggestions: [] }),
            JSON.stringify({ totalScore: 90, criteriaScores: [{ name: '질문', score: 5, maxScore: 5 }], qualitativeEvaluation: 'b', characteristics: [], suggestions: [] }),
        ]
        const result = JSON.parse(synthesizeResults(texts))
        expect(result.criteriaScores[0].score).toBe(4) // (3+5)/2 = 4
    })

    it('qualitativeEvaluation: "[의견 N]" 형식 병합', () => {
        const texts = [
            JSON.stringify({ totalScore: 80, criteriaScores: [], qualitativeEvaluation: '좋음', characteristics: [], suggestions: [] }),
            JSON.stringify({ totalScore: 90, criteriaScores: [], qualitativeEvaluation: '우수', characteristics: [], suggestions: [] }),
        ]
        const result = JSON.parse(synthesizeResults(texts))
        expect(result.qualitativeEvaluation).toContain('[의견 1]')
        expect(result.qualitativeEvaluation).toContain('[의견 2]')
    })
})
