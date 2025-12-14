/**
 * Components Manager
 * 헤더와 푸터를 동적으로 렌더링하여 유지보수성을 높입니다.
 */

class ComponentManager {
  constructor() {
    this.init();
  }

  init() {
    this.basePath = this.getPathPrefix();
    this.renderHeader();
    this.renderFooter();
    this.renderMobileNav(); // Render Mobile Nav to Body
    this.setActiveNavLink();
    this.setupMobileMenu(); // Mobile Menu Setup
    
    // 컴포넌트 렌더링 완료 이벤트 발생 (main.js 등에서 감지 가능)
    document.dispatchEvent(new Event('componentsLoaded'));
  }

  getPathPrefix() {
    // Check if we are in the 'posts' directory based on URL structure
    // This handles both local file system and hosted environments
    // Case-insensitive check for robustness
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/posts/') || path.includes('\\posts\\')) {
      return '../';
    }
    return '';
  }

  renderHeader() {
    const headerEl = document.getElementById('site-header');
    if (!headerEl) return;

    headerEl.innerHTML = `
      <div class="container topbar-inner">
        <div class="brand">
          <a href="${this.basePath}index.html" aria-label="홈으로 이동">신하늘</a>
        </div>
        
        <!-- Desktop Nav -->
        <nav class="nav desktop-nav" aria-label="주 메뉴">
          <a href="${this.basePath}index.html" data-page="index">프로필</a>
          <a href="${this.basePath}career_table.html" data-page="career_table">Discord 관리자 경력</a>
          <a href="${this.basePath}blog.html" data-page="blog">블로그</a>
          <a href="${this.basePath}special_thanks.html" data-page="special_thanks">고마운 사람들</a>
        </nav>

        <div class="header-actions">
            <button id="dark-mode-toggle" class="btn-icon" aria-label="테마 변경">
            <i class="fas fa-moon"></i>
            </button>
            
            <!-- Mobile Menu Toggle -->
            <button id="mobile-menu-toggle" class="btn-icon mobile-only" aria-label="메뉴 열기">
            <i class="fas fa-bars"></i>
            </button>
        </div>
      </div>
    `;
    
    // Topbar 클래스 추가 (기존 CSS 호환)
    headerEl.className = 'topbar';
  }

  renderMobileNav() {
    // Check if already rendered
    if (document.getElementById('mobile-nav')) return;

    const navHTML = `
      <!-- Mobile Nav Overlay -->
      <div id="mobile-nav-overlay" class="mobile-nav-overlay"></div>
      
      <!-- Mobile Nav Sidebar -->
      <nav id="mobile-nav" class="mobile-nav" aria-label="모바일 주 메뉴">
        <div class="mobile-nav-header">
            <span class="mobile-brand">신하늘</span>
            <button id="mobile-menu-close" class="btn-icon" aria-label="메뉴 닫기">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="mobile-nav-links">
          <a href="${this.basePath}index.html" data-page="index">프로필</a>
          <a href="${this.basePath}career_table.html" data-page="career_table">Discord 관리자 경력</a>
          <a href="${this.basePath}blog.html" data-page="blog">블로그</a>
          <a href="${this.basePath}special_thanks.html" data-page="special_thanks">고마운 사람들</a>
        </div>
      </nav>
    `;

    document.body.insertAdjacentHTML('beforeend', navHTML);
  }

  setupMobileMenu() {
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const closeBtn = document.getElementById('mobile-menu-close');
    const overlay = document.getElementById('mobile-nav-overlay');
    const mobileNav = document.getElementById('mobile-nav');
    const body = document.body;

    if (!toggleBtn || !mobileNav) return;

    const openMenu = () => {
        mobileNav.classList.add('active');
        overlay.classList.add('active');
        body.classList.add('menu-open'); // Add class for blur effect
        body.style.overflow = 'hidden'; // Prevent scrolling
        toggleBtn.setAttribute('aria-expanded', 'true');
    };

    const closeMenu = () => {
        mobileNav.classList.remove('active');
        overlay.classList.remove('active');
        body.classList.remove('menu-open'); // Remove class
        body.style.overflow = '';
        toggleBtn.setAttribute('aria-expanded', 'false');
    };

    toggleBtn.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    // Close menu when clicking a link
    mobileNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });
  }

  renderFooter() {
    const footerEl = document.getElementById('site-footer');
    if (!footerEl) return;

    footerEl.innerHTML = `
      <div class="container">
        <div class="footer-content">
          <nav aria-label="푸터 네비게이션">
            <div class="footer-links">
              <a href="${this.basePath}index.html">프로필</a>
              <a href="${this.basePath}career_table.html">Discord 관리자 경력</a>
              <a href="${this.basePath}blog.html">블로그</a>
              <a href="${this.basePath}special_thanks.html">고마운 사람들</a>
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

  setActiveNavLink() {
    const path = window.location.pathname;
    let pageName = '';
    
    // If we are in a post, highlight the blog link
    if (path.includes('/posts/')) {
        pageName = 'blog';
    } else {
        const page = path.split('/').pop() || 'index.html';
        pageName = page.replace('.html', '') || 'index';
    }
    
    const activeLink = document.querySelector(`.nav a[data-page="${pageName}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
      activeLink.setAttribute('aria-current', 'page');
    }
    
    // Mobile nav active state
    const mobileActiveLink = document.querySelector(`.mobile-nav-links a[data-page="${pageName}"]`);
    if (mobileActiveLink) {
        mobileActiveLink.classList.add('active');
        mobileActiveLink.setAttribute('aria-current', 'page');
    }
  }
}

// DOM이 로드되면 실행
document.addEventListener('DOMContentLoaded', () => {
  new ComponentManager();
});
