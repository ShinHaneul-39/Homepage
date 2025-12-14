/**
 * @fileoverview UI 컴포넌트 관리 및 동적 렌더링 스크립트
 * 
 * 웹사이트의 공통 UI 요소인 헤더(Header), 푸터(Footer), 모바일 네비게이션 등을
 * 동적으로 생성하고 관리하는 파일입니다.
 * 모든 페이지에서 공통적으로 사용되며, 유지보수성을 높이기 위해 자바스크립트로 렌더링합니다.
 * 
 * 주요 기능:
 * 1. 헤더 및 푸터 동적 렌더링
 * 2. 현재 페이지에 따른 네비게이션 활성 상태(Active State) 표시
 * 3. 모바일 반응형 메뉴(사이드바) 제어
 * 4. 다크 모드(Dark Mode) 토글 및 로컬 스토리지 저장
 */

class ComponentManager {
  /**
   * 컴포넌트 매니저 초기화
   * 생성자 호출 시 즉시 초기화 메서드를 실행합니다.
   */
  constructor() {
    this.init();
  }

  /**
   * 초기화 로직 실행
   * 경로 접두사 계산, UI 렌더링, 이벤트 리스너 등록 등을 순차적으로 수행합니다.
   */
  init() {
    // 1. 경로 접두사 계산 (서브 디렉토리 지원)
    this.basePath = this.getPathPrefix();
    
    // 2. UI 컴포넌트 렌더링
    this.renderHeader();
    this.renderFooter();
    this.renderMobileNav(); // 모바일 네비게이션을 body에 렌더링
    
    // 3. 상태 설정 및 이벤트 바인딩
    this.setActiveNavLink(); // 현재 페이지 하이라이팅
    this.setupMobileMenu(); // 모바일 메뉴 이벤트 설정
    this.setupTheme(); // 테마 토글 기능 설정
    
    // 4. 컴포넌트 로딩 완료 이벤트 발생 (main.js 등 다른 스크립트에서 감지 가능)
    document.dispatchEvent(new Event('componentsLoaded'));
  }

  /**
   * 다크 모드/라이트 모드 테마 설정 및 토글 기능
   * 시스템 설정을 감지하고 사용자 설정을 로컬 스토리지에 저장합니다.
   */
  setupTheme() {
    const toggleBtn = document.getElementById('dark-mode-toggle');
    if (!toggleBtn) return;
    
    const icon = toggleBtn.querySelector('i');
    
    /**
     * 테마 아이콘 업데이트 함수
     * @param {boolean} isDark - 다크 모드 여부
     */
    const updateIcon = (isDark) => {
        if (isDark) {
            icon.classList.remove('fa-moon'); // 달 아이콘 제거
            icon.classList.add('fa-sun');     // 해 아이콘 추가
        } else {
            icon.classList.remove('fa-sun');  // 해 아이콘 제거
            icon.classList.add('fa-moon');    // 달 아이콘 추가
        }
    };
    
    // 1. 초기 상태 확인 (HTML에 이미 적용된 클래스 기준)
    const isDark = document.documentElement.classList.contains('dark-mode');
    updateIcon(isDark);
    
    // 2. 시스템 테마 변경 감지 (사용자가 수동 설정을 하지 않은 경우에만 자동 반응)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) { // 로컬 스토리지에 설정이 없을 때만
            const newIsDark = e.matches;
            if (newIsDark) document.documentElement.classList.add('dark-mode');
            else document.documentElement.classList.remove('dark-mode');
            updateIcon(newIsDark);
        }
    });
    
    // 3. 토글 버튼 클릭 이벤트 리스너
    toggleBtn.addEventListener('click', () => {
        // 클래스 토글
        document.documentElement.classList.toggle('dark-mode');
        const currentIsDark = document.documentElement.classList.contains('dark-mode');
        
        // 로컬 스토리지에 상태 저장 (영구 보존)
        localStorage.setItem('theme', currentIsDark ? 'dark' : 'light');
        
        // 아이콘 업데이트
        updateIcon(currentIsDark);
    });
  }

  /**
   * 현재 페이지의 깊이(Depth)에 따른 경로 접두사 계산
   * 'posts' 디렉토리 등 하위 폴더에 있을 경우 상위 경로(../)를 반환합니다.
   * 
   * @returns {string} 경로 접두사 (예: '../' 또는 '')
   */
  getPathPrefix() {
    // URL 구조를 기반으로 현재 위치가 'posts' 디렉토리인지 확인
    // 로컬 파일 시스템과 호스팅 환경 모두 지원
    // 대소문자 구분 없이 견고하게 체크
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/posts/') || path.includes('\\posts\\')) {
      return '../';
    }
    return '';
  }

  /**
   * 헤더(Header) HTML 렌더링
   * 로고, 데스크톱 네비게이션, 테마 토글, 모바일 메뉴 버튼을 포함합니다.
   */
  renderHeader() {
    const headerEl = document.getElementById('site-header');
    if (!headerEl) return;

    headerEl.innerHTML = `
      <div class="container topbar-inner">
        <div class="brand">
          <a href="${this.basePath}index.html" aria-label="홈으로 이동">신하늘</a>
        </div>
        
        <!-- 데스크톱 네비게이션 (모바일에서는 숨김) -->
        <nav class="nav desktop-nav" aria-label="주 메뉴">
          <a href="${this.basePath}index.html" data-page="index">프로필</a>
          <a href="${this.basePath}career-table.html" data-page="career-table">Discord 관리자 경력</a>
          <a href="${this.basePath}blog.html" data-page="blog">블로그</a>
          <a href="${this.basePath}special-thanks.html" data-page="special-thanks">고마운 사람들</a>
        </nav>

        <div class="header-actions">
            <!-- 다크 모드 토글 버튼 -->
            <button id="dark-mode-toggle" class="btn-icon" aria-label="테마 변경">
            <i class="fas fa-moon"></i>
            </button>
            
            <!-- 모바일 메뉴 토글 버튼 (데스크톱에서는 숨김) -->
            <button id="mobile-menu-toggle" class="btn-icon mobile-only" aria-label="메뉴 열기">
            <i class="fas fa-bars"></i>
            </button>
        </div>
      </div>
    `;
    
    // 스타일 적용을 위한 클래스 추가
    headerEl.className = 'topbar';
  }

  /**
   * 모바일 네비게이션(사이드바) HTML 렌더링
   * body 요소의 끝에 오버레이와 함께 추가합니다.
   */
  renderMobileNav() {
    // 중복 렌더링 방지
    if (document.getElementById('mobile-nav')) return;

    const navHTML = `
      <!-- 모바일 네비게이션 배경 오버레이 (클릭 시 닫힘) -->
      <div id="mobile-nav-overlay" class="mobile-nav-overlay"></div>
      
      <!-- 모바일 네비게이션 사이드바 본문 -->
      <nav id="mobile-nav" class="mobile-nav" aria-label="모바일 주 메뉴">
        <div class="mobile-nav-header">
            <span class="mobile-brand">신하늘</span>
            <button id="mobile-menu-close" class="btn-icon" aria-label="메뉴 닫기">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="mobile-nav-links">
          <a href="${this.basePath}index.html" data-page="index">프로필</a>
          <a href="${this.basePath}career-table.html" data-page="career-table">Discord 관리자 경력</a>
          <a href="${this.basePath}blog.html" data-page="blog">블로그</a>
          <a href="${this.basePath}special-thanks.html" data-page="special-thanks">고마운 사람들</a>
        </div>
      </nav>
    `;

    // HTML 문자열을 DOM으로 파싱하여 body 끝에 추가
    document.body.insertAdjacentHTML('beforeend', navHTML);
  }

  /**
   * 모바일 메뉴 열기/닫기 이벤트 핸들링
   * 오버레이 클릭, 닫기 버튼, 링크 클릭 시 메뉴를 닫습니다.
   */
  setupMobileMenu() {
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const closeBtn = document.getElementById('mobile-menu-close');
    const overlay = document.getElementById('mobile-nav-overlay');
    const mobileNav = document.getElementById('mobile-nav');
    const body = document.body;

    if (!toggleBtn || !mobileNav) return;

    // 메뉴 열기 함수
    const openMenu = () => {
        mobileNav.classList.add('active'); // 메뉴 슬라이드 인
        overlay.classList.add('active');   // 오버레이 페이드 인
        body.classList.add('menu-open');   // 배경 스크롤 방지 및 블러 효과
        body.style.overflow = 'hidden';    // 스크롤 원천 차단
        toggleBtn.setAttribute('aria-expanded', 'true'); // 접근성 속성 업데이트
    };

    // 메뉴 닫기 함수
    const closeMenu = () => {
        mobileNav.classList.remove('active');
        overlay.classList.remove('active');
        body.classList.remove('menu-open');
        body.style.overflow = '';          // 스크롤 복원
        toggleBtn.setAttribute('aria-expanded', 'false');
    };

    // 이벤트 리스너 등록
    toggleBtn.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    // 메뉴 내 링크 클릭 시에도 메뉴 닫기 (페이지 이동 전 UX)
    mobileNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });
  }

  /**
   * 푸터(Footer) HTML 렌더링
   * 사이트 링크, 소셜 미디어 아이콘, 저작권 정보를 포함합니다.
   */
  renderFooter() {
    const footerEl = document.getElementById('site-footer');
    if (!footerEl) return;

    footerEl.innerHTML = `
      <div class="container">
        <div class="footer-content">
          <nav aria-label="푸터 네비게이션">
            <div class="footer-links">
              <a href="${this.basePath}index.html">프로필</a>
              <a href="${this.basePath}career-table.html">Discord 관리자 경력</a>
              <a href="${this.basePath}blog.html">블로그</a>
              <a href="${this.basePath}special-thanks.html">고마운 사람들</a>
            </div>
          </nav>
          <div class="social-links" aria-label="소셜 미디어 링크">
            <a href="https://github.com/ShinHaneul-39" target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub">
              <i class="fab fa-github" aria-hidden="true"></i>
            </a>
            <a href="https://www.youtube.com/@shin._.haneul" target="_blank" rel="noopener noreferrer" aria-label="YouTube" title="YouTube">
              <i class="fab fa-youtube" aria-hidden="true"></i>
            </a>
            <a href="https://open.spotify.com/user/312a6vtoanw5rvzhshbsx7k52cwu" target="_blank" rel="noopener noreferrer" aria-label="Spotify" title="Spotify">
              <i class="fab fa-spotify" aria-hidden="true"></i>
            </a>
            <a href="discord://-/users/959784288717520937" title="Discord로 연락하기" aria-label="Discord">
              <i class="fab fa-discord" aria-hidden="true"></i>
            </a>
          </div>
        </div>
        <div class="footer-copyright">
          © ${new Date().getFullYear()} 신하늘 | All Rights Reserved
        </div>
      </div>
    `;
    
    footerEl.className = 'footer';
  }

  /**
   * 현재 URL에 기반하여 네비게이션 링크 활성화(Highlight)
   * 데스크톱 및 모바일 메뉴 모두에 적용됩니다.
   */
  setActiveNavLink() {
    const path = window.location.pathname;
    let pageName = '';
    
    // 블로그 포스트 페이지인 경우 'blog' 메뉴 활성화
    if (path.includes('/posts/')) {
        pageName = 'blog';
    } else {
        // 파일명 추출 (예: index.html -> index)
        const page = path.split('/').pop() || 'index.html';
        pageName = page.replace('.html', '') || 'index';
    }
    
    // 데스크톱 네비게이션 활성화
    const activeLink = document.querySelector(`.nav a[data-page="${pageName}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
      activeLink.setAttribute('aria-current', 'page'); // 접근성: 현재 페이지임 명시
    }
    
    // 모바일 네비게이션 활성화
    const mobileActiveLink = document.querySelector(`.mobile-nav-links a[data-page="${pageName}"]`);
    if (mobileActiveLink) {
        mobileActiveLink.classList.add('active');
        mobileActiveLink.setAttribute('aria-current', 'page');
    }
  }
}

// DOM 로드 완료 시 컴포넌트 매니저 인스턴스 생성 및 실행
document.addEventListener('DOMContentLoaded', () => {
  new ComponentManager();
});
