import { describe, it, expect, beforeEach, vi } from 'vitest'

// kv 모킹 (@vercel/kv) — 메모리 기반 가짜 구현
const kvStore = new Map()
const kvTTL = new Map()
vi.mock('@vercel/kv', () => ({
    kv: {
        get: vi.fn(async (key) => kvStore.get(key) ?? null),
        set: vi.fn(async (key, value, opts) => {
            kvStore.set(key, value)
            if (opts?.ex) kvTTL.set(key, opts.ex)
            return 'OK'
        }),
        incr: vi.fn(async (key) => {
            const v = (kvStore.get(key) ?? 0) + 1
            kvStore.set(key, v)
            return v
        }),
        expire: vi.fn(async (key, sec) => {
            kvTTL.set(key, sec)
            return 1
        }),
    },
}))

import { checkRateLimit } from '../rateLimit.js'

describe('checkRateLimit', () => {
    beforeEach(() => {
        kvStore.clear()
        kvTTL.clear()
        vi.clearAllMocks()
    })

    it('한도 미만 → allowed:true, remaining 감소', async () => {
        const r1 = await checkRateLimit('user:abc', 3, 60)
        expect(r1.allowed).toBe(true)
        expect(r1.remaining).toBe(2)

        const r2 = await checkRateLimit('user:abc', 3, 60)
        expect(r2.allowed).toBe(true)
        expect(r2.remaining).toBe(1)

        const r3 = await checkRateLimit('user:abc', 3, 60)
        expect(r3.allowed).toBe(true)
        expect(r3.remaining).toBe(0)
    })

    it('한도 초과 → allowed:false', async () => {
        await checkRateLimit('user:over', 2, 60)
        await checkRateLimit('user:over', 2, 60)
        const r = await checkRateLimit('user:over', 2, 60)
        expect(r.allowed).toBe(false)
        expect(r.remaining).toBe(0)
    })

    it('서로 다른 key는 독립 카운터', async () => {
        await checkRateLimit('user:a', 1, 60)
        const r = await checkRateLimit('user:b', 1, 60)
        expect(r.allowed).toBe(true)
    })

    it('첫 호출 시 TTL이 설정됨', async () => {
        const { kv } = await import('@vercel/kv')
        await checkRateLimit('user:ttl', 5, 120)
        expect(kv.expire).toHaveBeenCalledWith(expect.any(String), 120)
    })

    it('KV 에러 시 fail-open (allowed:true) — 정상 사용자가 막히면 안 됨', async () => {
        const { kv } = await import('@vercel/kv')
        kv.incr.mockRejectedValueOnce(new Error('KV unavailable'))

        const r = await checkRateLimit('user:err', 5, 60)
        expect(r.allowed).toBe(true)
        expect(r.degraded).toBe(true)
    })
})
