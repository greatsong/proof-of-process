import { mockEvaluationResultJSON } from './mockEvaluationResult'

export const validGeminiResponse = {
    candidates: [{
        content: {
            parts: [{ text: mockEvaluationResultJSON }]
        }
    }]
}

export const validOpenAIResponse = {
    choices: [{
        message: {
            content: mockEvaluationResultJSON
        }
    }]
}

export const validClaudeResponse = {
    content: [{
        text: mockEvaluationResultJSON
    }]
}

export const emptyGeminiResponse = {
    candidates: [{ content: { parts: [{ text: '' }] } }]
}

export const errorResponse = {
    error: { message: 'API rate limit exceeded' }
}
