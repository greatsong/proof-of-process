import '@testing-library/jest-dom'

// localStorage mock for jsdom
const localStorageMock = (() => {
    let store = {}
    return {
        getItem: vi.fn((key) => store[key] ?? null),
        setItem: vi.fn((key, value) => { store[key] = String(value) }),
        removeItem: vi.fn((key) => { delete store[key] }),
        clear: vi.fn(() => { store = {} }),
        get length() { return Object.keys(store).length },
        key: vi.fn((i) => Object.keys(store)[i] ?? null),
    }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

// Make Object.keys(localStorage) work
const originalKeys = Object.keys
Object.keys = function (obj) {
    if (obj === localStorage) {
        const keys = []
        for (let i = 0; i < localStorage.length; i++) {
            keys.push(localStorage.key(i))
        }
        return keys
    }
    return originalKeys(obj)
}

// Reset localStorage between tests
beforeEach(() => {
    localStorageMock.clear()
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
})

// Mock Chart.js (canvas not available in jsdom)
vi.mock('react-chartjs-2', () => ({
    Line: () => null,
    Radar: () => null,
}))

vi.mock('chart.js', () => ({
    Chart: { register: vi.fn() },
    CategoryScale: vi.fn(),
    LinearScale: vi.fn(),
    PointElement: vi.fn(),
    LineElement: vi.fn(),
    RadialLinearScale: vi.fn(),
    Filler: vi.fn(),
    Tooltip: vi.fn(),
    Legend: vi.fn(),
}))

// Mock html2pdf.js
vi.mock('html2pdf.js', () => ({
    default: () => ({
        set: () => ({ from: () => ({ save: vi.fn() }) }),
    }),
}))
