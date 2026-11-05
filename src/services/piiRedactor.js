/**
 * 외부 AI로 보내기 전에 형식이 뚜렷한 개인정보를 가린다.
 * 이름이나 학번처럼 형식만으로 가릴 수 없는 값은 처리하지 못한다.
 */
const PATTERNS = [
    [/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g, '[이메일]'],
    [/(?<!\d)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])-?[1-8]\d{6}(?!\d)/g, '[주민등록번호]'],
    [/(?<!\d)01[016789][-. ]?\d{3,4}[-. ]?\d{4}(?!\d)/g, '[전화번호]'],
    [/(?<!\d)0(?:2|[3-6][1-5])[-. ]\d{3,4}[-. ]\d{4}(?!\d)/g, '[전화번호]'],
]

export function redactPII(text) {
    if (typeof text !== 'string') return text
    return PATTERNS.reduce((result, [pattern, label]) => result.replace(pattern, label), text)
}
