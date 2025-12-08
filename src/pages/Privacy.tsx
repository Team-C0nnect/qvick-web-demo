import '../styles/Legal.css';

export default function Privacy() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <header className="legal-header">
          <div className="legal-logo">Qvick</div>
          <h1>개인정보 처리방침</h1>
          <p className="last-updated">최종 수정일: 2025년 12월 8일</p>
        </header>

        <div className="legal-content">
          <section className="legal-section">
            <h2>제1조 (개인정보의 처리 목적)</h2>
            <p>
              Qvick(이하 "서비스")은 다음의 목적을 위하여 개인정보를 처리합니다. 
              처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 
              이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ul>
              <li><strong>회원 가입 및 관리:</strong> 회원 가입의사 확인, 본인 식별·인증, 회원자격 유지·관리</li>
              <li><strong>서비스 제공:</strong> 출석 관리, 공지사항 전달, 기숙사 관리 등 서비스 제공</li>
              <li><strong>민원 처리:</strong> 민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락·통지, 처리결과 통보</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>제2조 (수집하는 개인정보의 항목)</h2>
            <p>서비스는 다음의 개인정보 항목을 수집합니다:</p>
            <table className="legal-table">
              <thead>
                <tr>
                  <th>구분</th>
                  <th>수집 항목</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>필수항목</td>
                  <td>이름, 이메일, 비밀번호, 학년, 반, 번호, 호실, 연락처, 성별</td>
                </tr>
                <tr>
                  <td>자동수집항목</td>
                  <td>서비스 이용 기록, 접속 로그, 접속 IP 정보</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="legal-section">
            <h2>제3조 (개인정보의 처리 및 보유 기간)</h2>
            <p>
              서비스는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 
              동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
            </p>
            <ul>
              <li><strong>회원 정보:</strong> 회원 탈퇴 시까지 (탈퇴 후 30일 이내 파기)</li>
              <li><strong>출석 기록:</strong> 해당 학년도 종료 후 1년</li>
              <li><strong>서비스 이용 기록:</strong> 3개월</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>제4조 (개인정보의 제3자 제공)</h2>
            <p>
              서비스는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 
              정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에 해당하는 경우에만 
              개인정보를 제3자에게 제공합니다.
            </p>
          </section>

          <section className="legal-section">
            <h2>제5조 (정보주체의 권리·의무 및 행사방법)</h2>
            <p>정보주체는 서비스에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:</p>
            <ol>
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리정지 요구</li>
            </ol>
            <p>
              권리 행사는 서비스에 대해 서면, 전자우편 등을 통하여 하실 수 있으며, 
              서비스는 이에 대해 지체없이 조치하겠습니다.
            </p>
          </section>

          <section className="legal-section">
            <h2>제6조 (개인정보의 파기)</h2>
            <p>
              서비스는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 
              지체없이 해당 개인정보를 파기합니다.
            </p>
            <ul>
              <li><strong>전자적 파일:</strong> 복구 및 재생이 불가능하도록 영구 삭제</li>
              <li><strong>종이 문서:</strong> 분쇄기로 분쇄하거나 소각</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>제7조 (개인정보의 안전성 확보조치)</h2>
            <p>서비스는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:</p>
            <ul>
              <li>개인정보 취급 직원의 최소화 및 교육</li>
              <li>개인정보에 대한 접근 제한</li>
              <li>개인정보의 암호화</li>
              <li>해킹 등에 대비한 기술적 대책</li>
              <li>접속기록의 보관 및 위변조 방지</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>제8조 (개인정보 보호책임자)</h2>
            <p>
              서비스는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 
              개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 
              아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className="contact-info">
              <p><strong>개인정보 보호책임자</strong></p>
              <p>담당자: Qvick 관리팀</p>
              <p>이메일: privacy@qvick.xyz</p>
            </div>
          </section>

          <section className="legal-section">
            <h2>제9조 (개인정보 처리방침 변경)</h2>
            <p>
              이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 
              변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
          </section>

          <section className="legal-section">
            <h2>부칙</h2>
            <p>본 개인정보 처리방침은 2025년 12월 8일부터 시행됩니다.</p>
          </section>
        </div>

        <footer className="legal-footer">
          <p>© 2025 Qvick. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
