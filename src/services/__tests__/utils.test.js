import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchWithTimeout } from '../utils'

describe('fetchWithTimeout', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('정상 fetch → Response 반환', async () => {
        const mockResponse = { ok: true, status: 200 }
        globalThis.fetch = vi.fn().mockResolvedValue(mockResponse)

        const result = await fetchWithTimeout('/api/test', {})
        expect(result).toEqual(mockResponse)
    })

    it('타임아웃 초과 → 시간 초과 에러 메시지', async () => {
        globalThis.fetch = vi.fn().mockImplementation(() =>
            new Promise((_, reject) => {
                // AbortController가 abort 시키면 AbortError 발생
                setTimeout(() => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })), 10)
            })
        )

        await expect(fetchWithTimeout('/api/test', {}, 5)).rejects.toThrow('시간 초과')
    })

    it('네트워크 에러 → 원본 에러 전파', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

        await expect(fetchWithTimeout('/api/test', {})).rejects.toThrow('Network Error')
    })

    it('AbortController signal이 fetch에 전달되는지 확인', async () => {
        const mockResponse = { ok: true }
        globalThis.fetch = vi.fn().mockResolvedValue(mockResponse)

        await fetchWithTimeout('/api/test', { method: 'POST' })

        expect(globalThis.fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
            method: 'POST',
            signal: expect.any(AbortSignal),
        }))
    })
})
