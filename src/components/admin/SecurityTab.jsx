/**
 * SecurityTab - 관리자 비밀번호 안내
 * 비밀번호는 서버 환경변수 ADMIN_PASSWORD로 관리한다.
 */
function SecurityTab() {
    return (
        <div className="card animate-fadeIn">
            <h2 className="card-title">비밀번호 관리</h2>
            <p className="card-description">
                관리자 비밀번호는 Vercel 환경변수 ADMIN_PASSWORD로 관리합니다. 값을 바꾼 뒤 다시 배포하면 적용됩니다.
            </p>
        </div>
    )
}

export default SecurityTab
