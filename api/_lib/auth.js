/**
 * HMAC-SHA256 기반 단기 토큰 (JWT 호환 3-part 포맷)
 * Edge runtime + Node test env 모두에서 동작하도록 Web Crypto API 사용.
 *
 * 토큰 구조: base64url(header).base64url(payload).base64url(signature)
 *   header  = {"alg":"HS256","typ":"JWT"}
 *   payload = { sub, iat, exp, ...claims }
 */

const enc = new TextEncoder()
const dec = new TextDecoder()

function b64url(bytes) {
    let bin = ''
    for (const b of bytes) bin += String.fromCharCode(b)
    return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function b64urlDecode(str) {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4)
    const bin = atob(padded)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
}

function b64urlJSON(obj) {
    return b64url(enc.encode(JSON.stringify(obj)))
}

function b64urlDecodeJSON(str) {
    return JSON.parse(dec.decode(b64urlDecode(str)))
}

async function importKey(secret) {
    if (typeof secret !== 'string' || secret.length === 0) {
        throw new Error('JWT secret is empty')
    }
    return crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    )
}

/**
 * @param {object} claims  ex) { sub: 'pin-user' }
 * @param {string} secret  HMAC key
 * @param {number} ttlSec  유효기간 (초). 음수면 즉시 만료.
 * @returns {Promise<string>} JWT 형식 토큰
 */
export async function signToken(claims, secret, ttlSec) {
    const key = await importKey(secret)
    const now = Math.floor(Date.now() / 1000)
    const payload = { ...claims, iat: now, exp: now + ttlSec }
    const header = { alg: 'HS256', typ: 'JWT' }

    const signingInput = `${b64urlJSON(header)}.${b64urlJSON(payload)}`
    const sigBytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(signingInput)))
    return `${signingInput}.${b64url(sigBytes)}`
}

/**
 * @param {string} token
 * @param {string} secret
 * @returns {Promise<object>} payload
 * @throws Error  signature/expired/format
 */
export async function verifyToken(token, secret) {
    if (typeof secret !== 'string' || secret.length === 0) {
        throw new Error('JWT secret is empty')
    }
    if (typeof token !== 'string' || token.length === 0) {
        throw new Error('Invalid token format')
    }

    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('Invalid token format')

    const [h, p, s] = parts
    const key = await importKey(secret)
    const signingInput = enc.encode(`${h}.${p}`)
    const sigBytes = b64urlDecode(s)

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, signingInput)
    if (!valid) throw new Error('Invalid signature')

    let payload
    try {
        payload = b64urlDecodeJSON(p)
    } catch {
        throw new Error('Invalid token payload')
    }

    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired')
    }
    return payload
}

/**
 * Authorization 헤더에서 Bearer 토큰 추출
 * @param {Request|{headers: Headers}} req
 * @returns {string|null}
 */
export function extractBearerToken(req) {
    const auth = req?.headers?.get?.('authorization') || req?.headers?.get?.('Authorization')
    if (!auth) return null
    const m = /^Bearer\s+(.+)$/i.exec(auth)
    return m ? m[1].trim() : null
}
