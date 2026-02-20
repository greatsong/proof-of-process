import { describe, it, expect } from 'vitest'
import { calculateGrade, getGradeColor, GRADE_COLOR_DEFAULT } from '../constants'

describe('calculateGrade', () => {
    it('100점 → A+', () => {
        expect(calculateGrade(100)).toBe('A+')
    })

    it('95점 → A+', () => {
        expect(calculateGrade(95)).toBe('A+')
    })

    it('94점 → A', () => {
        expect(calculateGrade(94)).toBe('A')
    })

    it('90점 → A', () => {
        expect(calculateGrade(90)).toBe('A')
    })

    it('85점 → B+', () => {
        expect(calculateGrade(85)).toBe('B+')
    })

    it('80점 → B', () => {
        expect(calculateGrade(80)).toBe('B')
    })

    it('75점 → C+', () => {
        expect(calculateGrade(75)).toBe('C+')
    })

    it('70점 → C', () => {
        expect(calculateGrade(70)).toBe('C')
    })

    it('65점 → D+', () => {
        expect(calculateGrade(65)).toBe('D+')
    })

    it('60점 → D', () => {
        expect(calculateGrade(60)).toBe('D')
    })

    it('59점 → F', () => {
        expect(calculateGrade(59)).toBe('F')
    })

    it('0점 → F', () => {
        expect(calculateGrade(0)).toBe('F')
    })
})

describe('getGradeColor', () => {
    it('A+ → success 색상', () => {
        const color = getGradeColor('A+')
        expect(color.color).toContain('success')
    })

    it('B+ → primary 색상', () => {
        const color = getGradeColor('B+')
        expect(color.color).toContain('primary')
    })

    it('C → warning 색상', () => {
        const color = getGradeColor('C')
        expect(color.color).toContain('warning')
    })

    it('알 수 없는 등급 → default 색상', () => {
        const color = getGradeColor('Z')
        expect(color).toEqual(GRADE_COLOR_DEFAULT)
    })
})
