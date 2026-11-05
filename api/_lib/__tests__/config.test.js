import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const kvState = vi.hoisted(() => ({ store: new Map(), broken: false }))
vi.mock('@vercel/kv', () => ({
    kv: {
        get: vi.fn(async (key) => {
            if (kvState.broken) throw new Error('kv down')
            return kvState.store.get(key) ?? null
        }),
        set: vi.fn(async (key, value) => {
            if (kvState.broken) throw new Error('kv down')
            kvState.store.set(key, value)
            return 'OK'
        }),
        incr: vi.fn(async (key) => {
            if (kvState.broken) throw new Error('kv down')
            const next = (kvState.store.get(key) ?? 0) + 1
            kvState.store.set(key, next)
            return next
        }),
        expire: vi.fn(async () => 1),
    },
}))

import handler from '../../config.js'
import { resetAttemptMemory } from '../attemptLimit.js'
import { signToken } from '../auth.js'

const CONFIG_KEY = 'AI_EVAL_GLOBAL_CONFIG'
const JWT = 'test-jwt-secret'

function post(body, headers = {}) {
    return new Request('https://pro-of-ai.vercel.app/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.9', ...headers },
        body: JSON.stringify(body),
    })
}

describe('/api/config', () => {
    beforeEach(() => {
        kvState.store.clear()
        kvState.broken = false
        resetAttemptMemory()
        vi.stubEnv('JWT_SECRET', JWT)
        vi.stubEnv('SECRET_API_PIN', '4321')
        vi.stubEnv('ADMIN_PASSWORD', 'test-admin-password')
    })
    afterEach(() => vi.unstubAllEnvs())

    it('인증 없는 저장은 거절하고 KV를 바꾸지 않는다', async () => {
        const res = await handler(post({ settings: { provider: 'claude' } }))
        expect(res.status).toBe(401)
        expect(kvState.store.has(CONFIG_KEY)).toBe(false)
    })

    it('학생용 PIN 토큰으로는 전역 설정을 저장할 수 없다', async () => {
        const token = await signToken({ sub: 'pin-user' }, JWT, 60)
        const res = await handler(post({ settings: { provider: 'claude' } }, { Authorization: `Bearer ${token}` }))
        expect(res.status).toBe(403)
        expect(kvState.store.has(CONFIG_KEY)).toBe(false)
    })

    it('관리자 저장은 허용 필드만 남기고 API 키와 토큰을 버린다', async () => {
        const login = await (await handler(post({ action: 'admin-login', password: 'test-admin-password' }))).json()
        const res = await handler(post({
            settings: {
                provider: 'gemini',
                model: 'gemini-3.5-flash',
                allowEnsemble: true,
                apiKeys: { gemini: 'secret-key' },
                apiKey: 'secret-key',
                serverToken: 'secret-token',
            },
        }, { Authorization: `Bearer ${login.token}` }))
        expect(res.status).toBe(200)
        expect(kvState.store.get(CONFIG_KEY)).toEqual({ provider: 'gemini', model: 'gemini-3.5-flash', allowEnsemble: true })
    })

    it('GET은 예전에 저장된 민감 필드를 내보내지 않는다', async () => {
        kvState.store.set(CONFIG_KEY, { provider: 'claude', apiKeys: { claude: 'secret-key' }, serverToken: 'secret-token' })
        const res = await handler(new Request('https://pro-of-ai.vercel.app/api/config'))
        const text = await res.text()
        expect(JSON.parse(text)).toEqual({ provider: 'claude' })
        expect(text).not.toContain('secret')
    })

    it('올바른 PIN은 pin-user 토큰을 발급하고, 틀린 PIN은 403이다', async () => {
        const wrong = await handler(post({ action: 'unlock', pin: '0000' }))
        expect(wrong.status).toBe(403)
        const right = await handler(post({ action: 'unlock', pin: '4321' }))
        expect(right.status).toBe(200)
        const body = await right.json()
        expect(body.unlocked).toBe(true)
        expect(body.token).toEqual(expect.any(String))
    })

    it('KV가 끊겨도 PIN 대입은 실패 한도에서 막힌다', async () => {
        kvState.broken = true
        for (let i = 0; i < 60; i++) {
            expect((await handler(post({ action: 'unlock', pin: '0000' }))).status).toBe(403)
        }
        const blocked = await handler(post({ action: 'unlock', pin: '4321' }))
        expect(blocked.status).toBe(429)
    })

    it('성공한 잠금 해제는 실패 횟수에 들어가지 않는다', async () => {
        for (let i = 0; i < 100; i++) {
            expect((await handler(post({ action: 'unlock', pin: '4321' }))).status).toBe(200)
        }
    })

    it('ADMIN_PASSWORD가 없으면 관리자 로그인이 열리지 않는다', async () => {
        vi.stubEnv('ADMIN_PASSWORD', '')
        const res = await handler(post({ action: 'admin-login', password: '' }))
        expect(res.status).toBe(503)
    })
})
