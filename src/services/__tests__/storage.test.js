import { describe, it, expect, beforeEach } from 'vitest'
import {
    loadFromStorage,
    saveToStorage,
    removeFromStorage,
    clearAllStorage,
    encodeApiKey,
    decodeApiKey,
    hashPassword,
    verifyPassword,
    isHashed,
} from '../storage'

describe('storage', () => {
    describe('loadFromStorage', () => {
        it('존재하는 키 → JSON 파싱된 값 반환', () => {
            localStorage.setItem('ai-chat-eval-test', JSON.stringify({ a: 1 }))
            expect(loadFromStorage('test')).toEqual({ a: 1 })
        })

        it('존재하지 않는 키 → null', () => {
            expect(loadFromStorage('nonexistent')).toBeNull()
        })

        it('유효하지 않은 JSON → null', () => {
            localStorage.setItem('ai-chat-eval-bad', 'not-json{{{')
            expect(loadFromStorage('bad')).toBeNull()
        })
    })

    describe('saveToStorage', () => {
        it('정상 저장 → true', () => {
            const result = saveToStorage('key1', { hello: 'world' })
            expect(result).toBe(true)
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'ai-chat-eval-key1',
                JSON.stringify({ hello: 'world' })
            )
        })

        it('저장 실패 시 → false', () => {
            localStorage.setItem.mockImplementationOnce(() => {
                throw new Error('QuotaExceeded')
            })
            expect(saveToStorage('fail', {})).toBe(false)
        })
    })

    describe('removeFromStorage', () => {
        it('존재하는 키 삭제 → true', () => {
            localStorage.setItem('ai-chat-eval-del', '"value"')
            expect(removeFromStorage('del')).toBe(true)
            expect(localStorage.removeItem).toHaveBeenCalledWith('ai-chat-eval-del')
        })
    })

    describe('clearAllStorage', () => {
        it('prefix가 붙은 키만 삭제, 다른 키는 보존', () => {
            localStorage.setItem('ai-chat-eval-a', '1')
            localStorage.setItem('ai-chat-eval-b', '2')
            localStorage.setItem('other-key', '3')

            clearAllStorage()

            expect(localStorage.getItem('ai-chat-eval-a')).toBeNull()
            expect(localStorage.getItem('ai-chat-eval-b')).toBeNull()
            expect(localStorage.getItem('other-key')).toBe('3')
        })
    })

    describe('encodeApiKey / decodeApiKey', () => {
        it('빈 문자열 → 빈 문자열', () => {
            expect(encodeApiKey('')).toBe('')
            expect(decodeApiKey('')).toBe('')
        })

        it('왕복 인코딩/디코딩 일치', () => {
            const key = 'sk-ant-api-key-12345'
            expect(decodeApiKey(encodeApiKey(key))).toBe(key)
        })

        it('유효하지 않은 base64 → 원본 반환', () => {
            // atob throws on truly invalid base64 — the function catches and returns original
            expect(decodeApiKey('not-base64!@#$%')).toBe('not-base64!@#$%')
        })
    })

    describe('hashPassword', () => {
        it('동일 입력 → 동일 해시', async () => {
            const hash1 = await hashPassword('mypassword')
            const hash2 = await hashPassword('mypassword')
            expect(hash1).toBe(hash2)
        })

        it('64자 hex 문자열 반환', async () => {
            const hash = await hashPassword('test')
            expect(hash).toMatch(/^[a-f0-9]{64}$/)
        })
    })

    describe('verifyPassword', () => {
        it('올바른 비밀번호 → true', async () => {
            const hash = await hashPassword('correct')
            expect(await verifyPassword('correct', hash)).toBe(true)
        })

        it('잘못된 비밀번호 → false', async () => {
            const hash = await hashPassword('correct')
            expect(await verifyPassword('wrong', hash)).toBe(false)
        })
    })

    describe('isHashed', () => {
        it('64자 hex → true', () => {
            expect(isHashed('a'.repeat(64))).toBe(true)
        })

        it('짧은 문자열 → false', () => {
            expect(isHashed('short')).toBe(false)
        })

        it('비hex 문자 → false', () => {
            expect(isHashed('g'.repeat(64))).toBe(false)
        })

        it('null → false', () => {
            expect(isHashed(null)).toBe(false)
        })
    })
})
