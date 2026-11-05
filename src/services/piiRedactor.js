/**
 * 외부 AI로 보내기 전에 형식이 뚜렷한 개인정보를 가린다.
 * 이름이나 학번처럼 형식만으로 가릴 수 없는 값은 처리하지 못한다.
 *
 * lookbehind를 사용하지 않는다. 지원하지 않는 구형 Safari에서는 번들 전체가 구문 오류로 멈춘다.
 */
const EMAIL = /[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63})+/g
const RESIDENT_NUMBER = /(^|\D)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])-?[1-8]\d{6}(?!\d)/g
const MOBILE = /(^|\D)01[016789][-. ]?\d{3,4}[-. ]?\d{4}(?!\d)/g
const LANDLINE = /(^|\D)0(?:2|[3-6][1-5]|70)[-. ]\d{3,4}[-. ]\d{4}(?!\d)/g

export function redactPII(text) {
    if (typeof text !== 'string') return text
    return text
        .replace(EMAIL, '[이메일]')
        .replace(RESIDENT_NUMBER, '$1[주민등록번호]')
        .replace(MOBILE, '$1[전화번호]')
        .replace(LANDLINE, '$1[전화번호]')
}
