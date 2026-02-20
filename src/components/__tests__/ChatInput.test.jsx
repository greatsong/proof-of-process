import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatInput from '../ChatInput'

describe('ChatInput', () => {
    const defaultProps = {
        onSubmit: vi.fn(),
        isLoading: false,
        disabled: false,
    }

    it('초기 렌더링: 텍스트 영역 + 제출 버튼 표시', () => {
        render(<ChatInput {...defaultProps} />)
        expect(screen.getByRole('textbox', { name: /AI 채팅 내용/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /평가 시작/i })).toBeInTheDocument()
    })

    it('탭 전환: "직접 붙여넣기" ↔ "파일 업로드"', async () => {
        render(<ChatInput {...defaultProps} />)
        const fileTab = screen.getByText(/파일 업로드/i)

        await userEvent.click(fileTab)
        expect(screen.getByText(/채팅 파일 업로드/i)).toBeInTheDocument()

        const pasteTab = screen.getByText(/직접 붙여넣기/i)
        await userEvent.click(pasteTab)
        expect(screen.getByRole('textbox', { name: /AI 채팅 내용/i })).toBeInTheDocument()
    })

    it('텍스트 입력 후 제출 → onSubmit(content, reflection) 호출', async () => {
        const onSubmit = vi.fn()
        render(<ChatInput {...defaultProps} onSubmit={onSubmit} />)

        const textarea = screen.getByRole('textbox', { name: /AI 채팅 내용/i })
        await userEvent.type(textarea, 'You: 질문\nChatGPT: 답변')

        const submitBtn = screen.getByRole('button', { name: /평가 시작/i })
        await userEvent.click(submitBtn)

        expect(onSubmit).toHaveBeenCalledTimes(1)
        expect(onSubmit).toHaveBeenCalledWith(expect.any(String), expect.any(String))
    })

    it('빈 텍스트로 제출 → onSubmit 호출 안 됨', async () => {
        const onSubmit = vi.fn()
        render(<ChatInput {...defaultProps} onSubmit={onSubmit} />)

        const submitBtn = screen.getByRole('button', { name: /평가 시작/i })
        await userEvent.click(submitBtn)

        expect(onSubmit).not.toHaveBeenCalled()
    })

    it('disabled=true → textarea와 button 모두 disabled', () => {
        render(<ChatInput {...defaultProps} disabled={true} />)

        expect(screen.getByRole('textbox', { name: /AI 채팅 내용/i })).toBeDisabled()
        expect(screen.getByRole('button', { name: /평가 시작/i })).toBeDisabled()
    })

    it('isLoading=true → 버튼 disabled', () => {
        render(<ChatInput {...defaultProps} isLoading={true} />)
        expect(screen.getByRole('button', { name: /평가 시작 중/i })).toBeDisabled()
    })

    it('reflection textarea 입력 확인', async () => {
        render(<ChatInput {...defaultProps} />)
        const reflectionInput = screen.getByPlaceholderText(/AI 채팅에는 없지만/i)
        await userEvent.type(reflectionInput, '추가 맥락')
        expect(reflectionInput).toHaveValue('추가 맥락')
    })
})
