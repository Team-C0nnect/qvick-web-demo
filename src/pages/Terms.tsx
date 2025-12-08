import '../styles/Legal.css';

export default function Terms() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <header className="legal-header">
          <div className="legal-logo">Qvick</div>
          <h1>이용약관</h1>
          <p className="last-updated">최종 수정일: 2025년 12월 8일</p>
        </header>

        <div className="legal-content">
          <section className="legal-section">
            <h2>제1조 (목적)</h2>
            <p>
              이 약관은 Qvick(이하 "서비스")을 이용함에 있어 서비스와 이용자 간의 권리, 의무 및 책임사항, 
              기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section className="legal-section">
            <h2>제2조 (정의)</h2>
            <ol>
              <li>"서비스"란 Qvick에서 제공하는 온라인 기숙사 관리 플랫폼을 의미합니다.</li>
              <li>"이용자"란 본 약관에 따라 서비스를 이용하는 학생, 교사, 관리자를 의미합니다.</li>
              <li>"계정"이란 이용자가 서비스를 이용하기 위해 등록한 이메일 및 비밀번호의 조합을 의미합니다.</li>
            </ol>
          </section>

          <section className="legal-section">
            <h2>제3조 (약관의 효력 및 변경)</h2>
            <ol>
              <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력을 발생합니다.</li>
              <li>서비스는 필요한 경우 관련 법령을 위배하지 않는 범위 내에서 본 약관을 변경할 수 있습니다.</li>
              <li>변경된 약관은 공지 후 7일 이후부터 효력이 발생합니다.</li>
            </ol>
          </section>

          <section className="legal-section">
            <h2>제4조 (서비스의 제공)</h2>
            <p>서비스는 다음과 같은 기능을 제공합니다:</p>
            <ul>
              <li>기숙사 출석 관리 및 확인</li>
              <li>공지사항 등록 및 열람</li>
              <li>출석 스케줄 관리</li>
              <li>호실 관리</li>
              <li>기타 서비스가 정하는 업무</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>제5조 (이용자의 의무)</h2>
            <ol>
              <li>이용자는 본 약관 및 서비스가 정한 규정을 준수하여야 합니다.</li>
              <li>이용자는 자신의 계정 정보를 안전하게 관리할 책임이 있습니다.</li>
              <li>이용자는 타인의 개인정보를 침해하거나 부정하게 사용해서는 안 됩니다.</li>
              <li>이용자는 서비스의 안정적 운영을 방해하는 행위를 해서는 안 됩니다.</li>
            </ol>
          </section>

          <section className="legal-section">
            <h2>제6조 (서비스의 중단)</h2>
            <p>
              서비스는 시스템 점검, 교체, 고장 또는 통신 두절 등의 사유가 발생한 경우 
              서비스의 제공을 일시적으로 중단할 수 있습니다.
            </p>
          </section>

          <section className="legal-section">
            <h2>제7조 (면책 조항)</h2>
            <ol>
              <li>서비스는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적인 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
              <li>서비스는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
            </ol>
          </section>

          <section className="legal-section">
            <h2>제8조 (준거법 및 관할법원)</h2>
            <p>
              본 약관의 해석 및 서비스와 이용자 간의 분쟁에 대해서는 대한민국 법률을 적용하며, 
              분쟁이 발생한 경우 서비스 소재지를 관할하는 법원을 전속관할법원으로 합니다.
            </p>
          </section>

          <section className="legal-section">
            <h2>부칙</h2>
            <p>본 약관은 2025년 12월 8일부터 시행됩니다.</p>
          </section>
        </div>

        <footer className="legal-footer">
          <p>© 2025 Qvick. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
