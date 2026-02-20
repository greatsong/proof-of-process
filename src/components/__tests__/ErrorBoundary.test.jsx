import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from '../ErrorBoundary'

function BrokenChild() {
    throw new Error('테스트 에러')
}

function GoodChild() {
    return <div>정상 컴포넌트</div>
}

describe('ErrorBoundary', () => {
    // Suppress console.error for expected errors in tests
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        console.error.mockRestore()
    })

    it('자식 컴포넌트 에러 → 에러 UI 표시', () => {
        render(
            <ErrorBoundary>
                <BrokenChild />
            </ErrorBoundary>
        )
        expect(screen.getByText(/오류가 발생했습니다|문제가 발생|error/i)).toBeInTheDocument()
    })

    it('정상 자식 → 자식 그대로 렌더링', () => {
        render(
            <ErrorBoundary>
                <GoodChild />
            </ErrorBoundary>
        )
        expect(screen.getByText('정상 컴포넌트')).toBeInTheDocument()
    })
})
