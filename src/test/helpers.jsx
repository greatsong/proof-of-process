import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/**
 * Context mock values
 */
export const defaultAuthContext = {
    adminPassword: null,
    isAdminAuthenticated: false,
    authenticateAdmin: vi.fn(),
    setNewAdminPassword: vi.fn(),
    logoutAdmin: vi.fn(),
}

export const defaultAPIContext = {
    apiSettings: {
        provider: 'gemini',
        apiKey: '',
        apiKeys: { gemini: '', openai: '', claude: '' },
        model: 'gemini-2.5-flash',
        models: { gemini: 'gemini-2.5-flash', openai: 'gpt-4o', claude: 'claude-3-5-sonnet-20241022' },
        evaluationRuns: 1,
        useServerSide: false,
    },
    setApiSettings: vi.fn(),
    saveGlobalSettings: vi.fn(),
    unlockApiWithPin: vi.fn(),
}

export const defaultEvaluationContext = {
    rubrics: [],
    currentRubric: null,
    evaluationResult: null,
    isLoading: false,
    selectRubric: vi.fn(),
    addRubric: vi.fn(),
    updateRubric: vi.fn(),
    deleteRubric: vi.fn(),
    setEvaluationResult: vi.fn(),
    setIsLoading: vi.fn(),
}

/**
 * Render with all providers
 */
export function renderWithRouter(ui, { route = '/' } = {}) {
    return render(
        <MemoryRouter initialEntries={[route]}>
            {ui}
        </MemoryRouter>
    )
}
