import { describe, it, expect } from 'vitest'
import { signToken, verifyToken, extractBearerToken } from '../auth.js'

const SECRET = 'test-secret-abc-123'

describe('auth.signToken/verifyToken', () => {
    it('정상 페이로드 → round-trip 통과', async () => {
        const token = await signToken({ sub: 'pin-user' }, SECRET, 3600)
        expect(typeof token).toBe('string')
        expect(token.split('.').length).toBe(3)

        const payload = await verifyToken(token, SECRET)
        expect(payload.sub).toBe('pin-user')
        expect(typeof payload.exp).toBe('number')
        expect(typeof payload.iat).toBe('number')
    })

    it('서명 변조 시 verifyToken은 throw', async () => {
        const token = await signToken({ sub: 'x' }, SECRET, 3600)
        const [h, p] = token.split('.')
        const tampered = `${h}.${p}.AAAAAAAAAAAAAAAAAAAAAAAA`

        await expect(verifyToken(tampered, SECRET)).rejects.toThrow(/signature/i)
    })

    it('payload 변조 시 verifyToken은 throw', async () => {
        const token = await signToken({ sub: 'x' }, SECRET, 3600)
        const [h, , s] = token.split('.')
        // 다른 payload (base64url)
        const fake = btoa(JSON.stringify({ sub: 'attacker', exp: 9999999999 }))
            .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
        const tampered = `${h}.${fake}.${s}`

        await expect(verifyToken(tampered, SECRET)).rejects.toThrow(/signature/i)
    })

    it('만료된 토큰 → throw', async () => {
        // ttl=-1 이면 즉시 만료
        const token = await signToken({ sub: 'x' }, SECRET, -1)
        await expect(verifyToken(token, SECRET)).rejects.toThrow(/expired/i)
    })

    it('다른 secret으로 검증 → throw', async () => {
        const token = await signToken({ sub: 'x' }, SECRET, 3600)
        await expect(verifyToken(token, 'wrong-secret')).rejects.toThrow(/signature/i)
    })

    it('잘못된 토큰 포맷 → throw', async () => {
        await expect(verifyToken('not.a.token', SECRET)).rejects.toThrow()
        await expect(verifyToken('only-one-part', SECRET)).rejects.toThrow()
        await expect(verifyToken('', SECRET)).rejects.toThrow()
    })

    it('secret이 비어있으면 sign/verify 모두 throw', async () => {
        await expect(signToken({ sub: 'x' }, '', 3600)).rejects.toThrow(/secret/i)
        await expect(verifyToken('a.b.c', '')).rejects.toThrow(/secret/i)
    })
})

describe('auth.extractBearerToken', () => {
    const req = (auth) => ({ headers: { get: (n) => (n.toLowerCase() === 'authorization' ? auth : null) } })

    it('Bearer prefix → 토큰만 추출', () => {
        expect(extractBearerToken(req('Bearer abc.def.ghi'))).toBe('abc.def.ghi')
    })

    it('case-insensitive prefix', () => {
        expect(extractBearerToken(req('bearer abc.def.ghi'))).toBe('abc.def.ghi')
        expect(extractBearerToken(req('BEARER abc.def.ghi'))).toBe('abc.def.ghi')
    })

    it('Authorization 헤더 없음 → null', () => {
        expect(extractBearerToken(req(null))).toBeNull()
    })

    it('Bearer prefix 누락 → null', () => {
        expect(extractBearerToken(req('abc.def.ghi'))).toBeNull()
    })
})
