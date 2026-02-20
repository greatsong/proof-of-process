import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SelfEvaluation from '../SelfEvaluation'
import { mockRubric } from '../../test/fixtures/mockRubric'

describe('SelfEvaluation', () => {
    const defaultProps = {
        rubric: mockRubric,
        onComplete: vi.fn(),
        onSkip: vi.fn(),
    }

    it('루브릭 criteria 수만큼 평가 항목 렌더링', () => {
        render(<SelfEvaluation {...defaultProps} />)
        mockRubric.criteria.forEach(c => {
            expect(screen.getByText(c.name)).toBeInTheDocument()
        })
    })

    it('점수 버튼 클릭 → 선택 상태 변경', async () => {
        render(<SelfEvaluation {...defaultProps} />)
        // 첫 criteria의 score 5 버튼 클릭
        const score5Buttons = screen.getAllByText('5')
        await userEvent.click(score5Buttons[0])
        expect(score5Buttons[0].closest('button')).toHaveClass('selected')
    })

    it('모든 항목 미평가 → 버튼 disabled', () => {
        render(<SelfEvaluation {...defaultProps} />)
        const submitBtn = screen.getByText(/항목 평가됨/i)
        expect(submitBtn).toBeDisabled()
    })

    it('모든 항목 평가 완료 → "자기 평가 완료" 버튼 활성화', async () => {
        render(<SelfEvaluation {...defaultProps} />)

        // 각 criteria마다 score 5를 선택 (score 5 버튼들)
        const scoreButtons = screen.getAllByTitle('매우 명확하고 구체적이며 맥락 정보가 충분함')
        await userEvent.click(scoreButtons[0])

        const iterButtons = screen.getAllByTitle('응답을 분석하고 체계적으로 질문을 발전시킴')
        await userEvent.click(iterButtons[0])

        const critButtons = screen.getAllByTitle('AI 응답의 한계를 인식하고 검증/수정함')
        await userEvent.click(critButtons[0])

        const appButtons = screen.getAllByTitle('창의적이고 효과적으로 문제를 해결함')
        await userEvent.click(appButtons[0])

        const submitBtn = screen.getByText(/자기 평가 완료/i)
        expect(submitBtn).not.toBeDisabled()
    })

    it('완료 버튼 클릭 → onComplete(scores) 호출', async () => {
        const onComplete = vi.fn()
        render(<SelfEvaluation {...defaultProps} onComplete={onComplete} />)

        // 모든 항목 score 3 선택
        const score3Buttons = screen.getAllByText('3')
        for (const btn of score3Buttons) {
            await userEvent.click(btn)
        }

        const submitBtn = screen.getByText(/자기 평가 완료/i)
        await userEvent.click(submitBtn)

        expect(onComplete).toHaveBeenCalledTimes(1)
        const scores = onComplete.mock.calls[0][0]
        expect(scores).toHaveLength(mockRubric.criteria.length)
        expect(scores[0].score).toBe(3)
    })

    it('"건너뛰기" 버튼 클릭 → onSkip() 호출', async () => {
        const onSkip = vi.fn()
        render(<SelfEvaluation {...defaultProps} onSkip={onSkip} />)

        const skipBtn = screen.getByText(/건너뛰기/i)
        await userEvent.click(skipBtn)

        expect(onSkip).toHaveBeenCalledTimes(1)
    })

    it('reason input 입력 → 해당 항목의 reason 업데이트', async () => {
        render(<SelfEvaluation {...defaultProps} />)
        const reasonInputs = screen.getAllByPlaceholderText(/왜 이 점수를 줬나요/i)
        await userEvent.type(reasonInputs[0], '질문을 잘 했다고 생각합니다')
        expect(reasonInputs[0]).toHaveValue('질문을 잘 했다고 생각합니다')
    })
})
