/**
 * Claude API 호출 모듈
 * CORS 제한으로 항상 서버 프록시(/api/evaluate) 경유
 */
import { fetchWithTimeout } from '../utils'

/**
 * Claude API 호출 (서버 프록시 경유)
 */
export async function callClaudeAPI(prompt, apiKey, model = 'claude-haiku-4-5-20251001', serverToken) {
    const headers = { 'Content-Type': 'application/json' }
    if (serverToken) headers.Authorization = `Bearer ${serverToken}`

    const response = await fetchWithTimeout('/api/evaluate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, provider: 'claude', model })
    }, 60000)

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        const errMsg = typeof error.error === 'string' ? error.error : `Claude API 오류: ${response.status}`
        throw new Error(errMsg)
    }

    const data = await response.json()
    return data.text || ''
}
