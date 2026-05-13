
import { kv } from '@vercel/kv';
import { signToken } from './_lib/auth.js';

export const config = {
    runtime: 'edge',
};

const CONFIG_KEY = 'AI_EVAL_GLOBAL_CONFIG';
const TOKEN_TTL_SEC = 4 * 60 * 60; // 4시간

export default async function handler(req) {
    // GET: Retrieve Global Config
    if (req.method === 'GET') {
        try {
            const config = await kv.get(CONFIG_KEY) || {};
            return new Response(JSON.stringify(config), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('KV Get Error:', error);
            // Fallback to empty if KV not configured yet
            return new Response(JSON.stringify({ error: 'Failed to fetch config (KV not connected?)' }), { status: 200 });
        }
    }

    // POST: Update Global Config or PIN Unlock
    if (req.method === 'POST') {
        try {
            const body = await req.json();

            // PIN unlock: PIN 검증 후 단기 JWT 발급
            if (body.action === 'unlock') {
                const validPin = process.env.SECRET_API_PIN || '';
                const jwtSecret = process.env.JWT_SECRET || '';

                if (body.pin === validPin && validPin !== '') {
                    let token = null;
                    let expiresAt = null;
                    try {
                        if (jwtSecret) {
                            token = await signToken({ sub: 'pin-user' }, jwtSecret, TOKEN_TTL_SEC);
                            expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
                        } else {
                            console.warn('JWT_SECRET not configured — unlock without token');
                        }
                    } catch (e) {
                        console.error('Token sign failed:', e);
                    }

                    return new Response(JSON.stringify({ unlocked: true, token, expiresAt }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                return new Response(JSON.stringify({ unlocked: false }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Config save
            const { settings } = body;
            await kv.set(CONFIG_KEY, settings);

            return new Response(JSON.stringify({ success: true, settings }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('KV Set Error:', error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    return new Response('Method not allowed', { status: 405 });
}
