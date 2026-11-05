
import { kv } from '@vercel/kv';
import { extractBearerToken, secretEquals, signToken, verifyToken } from './_lib/auth.js';
import { failureCount, recordFailure } from './_lib/attemptLimit.js';
import { sanitizeConfig } from './_lib/publicConfig.js';

export const config = {
    runtime: 'edge',
};

const CONFIG_KEY = 'AI_EVAL_GLOBAL_CONFIG';
const TOKEN_TTL_SEC = 4 * 60 * 60; // 4시간
const FAILURE_LIMIT = 60; // IP별 실패 한도. 성공한 잠금 해제는 세지 않는다.
const FAILURE_WINDOW_SEC = 10 * 60;

function json(status, body) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
}

function clientAddress(req) {
    return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
        || req.headers.get('x-real-ip')
        || 'unknown';
}

async function checkSecret(req, input, expected, label) {
    const key = `rl:${label}:${clientAddress(req)}`;
    if (await failureCount(key) >= FAILURE_LIMIT) {
        return { blocked: true, ok: false };
    }
    const ok = await secretEquals(input, expected);
    if (!ok) await recordFailure(key, FAILURE_WINDOW_SEC);
    return { blocked: false, ok };
}

async function issueToken(sub, jwtSecret) {
    const token = await signToken({ sub }, jwtSecret, TOKEN_TTL_SEC);
    return { token, expiresAt: Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC };
}

async function handleUnlock(req, body) {
    const jwtSecret = process.env.JWT_SECRET || '';
    const { blocked, ok } = await checkSecret(req, body.pin, process.env.SECRET_API_PIN || '', 'unlock');
    if (blocked) return json(429, { unlocked: false, error: '시도가 너무 많습니다. 잠시 뒤 다시 시도하세요.' });
    if (!ok) return json(403, { unlocked: false });
    if (!jwtSecret) {
        console.warn('JWT_SECRET not configured — unlock without token');
        return json(200, { unlocked: true, token: null, expiresAt: null });
    }
    return json(200, { unlocked: true, ...(await issueToken('pin-user', jwtSecret)) });
}

async function handleAdminLogin(req, body) {
    const adminPassword = process.env.ADMIN_PASSWORD || '';
    const jwtSecret = process.env.JWT_SECRET || '';
    if (!adminPassword || !jwtSecret) {
        return json(503, { authenticated: false, error: 'ADMIN_PASSWORD와 JWT_SECRET을 서버에 설정해야 합니다.' });
    }
    const { blocked, ok } = await checkSecret(req, body.password, adminPassword, 'admin');
    if (blocked) return json(429, { authenticated: false, error: '시도가 너무 많습니다. 잠시 뒤 다시 시도하세요.' });
    if (!ok) return json(403, { authenticated: false });
    return json(200, { authenticated: true, ...(await issueToken('admin', jwtSecret)) });
}

async function handleSave(req, body) {
    const jwtSecret = process.env.JWT_SECRET || '';
    const token = extractBearerToken(req);
    if (!jwtSecret || !token) return json(401, { error: '관리자 로그인이 필요합니다.' });
    let claims;
    try {
        claims = await verifyToken(token, jwtSecret);
    } catch {
        return json(401, { error: '관리자 로그인이 필요합니다.' });
    }
    // 학생에게 안내하는 PIN 토큰(pin-user)으로는 전역 설정을 바꿀 수 없다.
    if (claims.sub !== 'admin') return json(403, { error: '관리자 권한이 필요합니다.' });

    const settings = sanitizeConfig(body.settings);
    await kv.set(CONFIG_KEY, settings);
    return json(200, { success: true, settings });
}

export default async function handler(req) {
    // GET: Retrieve Global Config
    if (req.method === 'GET') {
        try {
            return json(200, sanitizeConfig(await kv.get(CONFIG_KEY)));
        } catch (error) {
            console.error('KV Get Error:', error);
            // Fallback to empty if KV not configured yet
            return json(200, { error: 'Failed to fetch config (KV not connected?)' });
        }
    }

    // POST: PIN unlock, admin login, or global config save
    if (req.method === 'POST') {
        try {
            const body = await req.json();
            if (body?.action === 'unlock') return await handleUnlock(req, body);
            if (body?.action === 'admin-login') return await handleAdminLogin(req, body);
            return await handleSave(req, body);
        } catch (error) {
            console.error('Config Error:', error);
            return json(500, { error: '설정을 처리하지 못했습니다.' });
        }
    }

    return new Response('Method not allowed', { status: 405 });
}
