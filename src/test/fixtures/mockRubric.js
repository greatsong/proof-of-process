export const mockRubric = {
    id: 'test-rubric-1',
    name: '테스트 AI 활용 역량 평가',
    description: '테스트용 루브릭',
    criteria: [
        {
            id: 'c1',
            name: '질문의 명확성',
            description: '프롬프트가 명확하고 구체적인가',
            weight: 25,
            levels: [
                { score: 5, description: '매우 명확하고 구체적이며 맥락 정보가 충분함' },
                { score: 4, description: '대체로 명확하고 이해 가능함' },
                { score: 3, description: '기본적인 의도는 파악 가능하나 모호한 부분 있음' },
                { score: 2, description: '불분명하여 해석이 필요함' },
                { score: 1, description: '매우 모호하고 불분명함' },
            ],
        },
        {
            id: 'c2',
            name: '반복적 개선',
            description: 'AI 응답을 바탕으로 질문을 개선하고 발전시켰는가',
            weight: 25,
            levels: [
                { score: 5, description: '응답을 분석하고 체계적으로 질문을 발전시킴' },
                { score: 4, description: '응답을 참고하여 후속 질문을 개선함' },
                { score: 3, description: '일부 개선 시도가 있음' },
                { score: 2, description: '개선 시도가 미흡함' },
                { score: 1, description: '반복적 개선이 없음' },
            ],
        },
        {
            id: 'c3',
            name: '비판적 사고',
            description: 'AI 응답을 비판적으로 검토하고 검증했는가',
            weight: 25,
            levels: [
                { score: 5, description: 'AI 응답의 한계를 인식하고 검증/수정함' },
                { score: 4, description: '응답의 정확성을 확인하려는 시도가 있음' },
                { score: 3, description: '일부 의문을 제기함' },
                { score: 2, description: '대부분 무비판적으로 수용' },
                { score: 1, description: '전혀 검증하지 않음' },
            ],
        },
        {
            id: 'c4',
            name: '실제 적용',
            description: 'AI의 도움을 실제 문제 해결에 효과적으로 적용했는가',
            weight: 25,
            levels: [
                { score: 5, description: '창의적이고 효과적으로 문제를 해결함' },
                { score: 4, description: '문제 해결에 잘 활용함' },
                { score: 3, description: '어느 정도 활용함' },
                { score: 2, description: '활용이 미흡함' },
                { score: 1, description: '실제 적용이 없음' },
            ],
        },
    ],
}
