import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { removeFromStorage } from '../services/storage'

const AuthContext = createContext()

// 운영 빌드에서는 import.meta.env.DEV가 false로 고정되어 이 값이 번들에 들어가지 않는다.
// 관리자 비밀번호는 서버 환경변수 ADMIN_PASSWORD로만 검증한다.
const DEV_ADMIN_PASSWORD = import.meta.env.DEV ? (import.meta.env.VITE_ADMIN_PASSWORD || '') : ''

export function AuthProvider({ children }) {
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
    const [adminToken, setAdminToken] = useState(null)

    // 예전에 브라우저에 저장한 비밀번호 해시를 지운다
    useEffect(() => {
        removeFromStorage('adminPassword')
    }, [])

    const authenticateAdmin = useCallback(async (password) => {
        // vite 개발 서버에는 /api가 없다
        if (import.meta.env.DEV) {
            const valid = password === DEV_ADMIN_PASSWORD
            setIsAdminAuthenticated(valid)
            return valid
        }
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'admin-login', password })
            })
            const data = await res.json()
            if (res.ok && data.authenticated) {
                setAdminToken(data.token)
                setIsAdminAuthenticated(true)
                return true
            }
            return false
        } catch {
            return false
        }
    }, [])

    const logoutAdmin = useCallback(() => {
        setAdminToken(null)
        setIsAdminAuthenticated(false)
    }, [])

    const value = useMemo(() => ({
        isAdminAuthenticated,
        adminToken,
        authenticateAdmin,
        logoutAdmin,
        hasAdminPassword: !import.meta.env.DEV || DEV_ADMIN_PASSWORD !== ''
    }), [isAdminAuthenticated, adminToken, authenticateAdmin, logoutAdmin])

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}

export default AuthContext
