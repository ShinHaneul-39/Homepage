// 공통 기능 모듈
class SiteManager {
  constructor() {
    this.init();
  }

  init() {
    // this.setupHeaderCollapse(); // 축소 모드 비활성화
    this.setupDarkModeToggle();
    this.setupGiftDates();
    this.setupSmoothScrolling();
    this.setupKeyboardNavigation();
    this.setupInlineNotes();
  }

  // 헤더(배너) 축소 전환: 최상단에서는 전체 표시, 스크롤하면 적당히 잘리도록
  setupHeaderCollapse() {
    const header = document.querySelector('header.banner.site-header');
    if (!header) return;

    let ticking = false;
    const threshold = 120; // 이 값 이상 스크롤되면 컴팩트 모드 전환

    const applyState = () => {
      if (window.scrollY > threshold) {
        document.body.classList.add('compact-header');
      } else {
        document.body.classList.remove('compact-header');
      }
      ticking = false;
    };

    // 초기 상태 적용 (새로고침/앵커 이동 시)
    applyState();

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(applyState);
        ticking = true;
      }
    }, { passive: true });
  }

  // 다크 모드 토글 기능
  setupDarkModeToggle() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // 테마 적용 함수 (UI 업데이트만 담당)
    const setTheme = (isDark) => {
      document.body.classList.toggle('dark-mode', isDark);
      
      const btn = document.getElementById('dark-mode-toggle');
      if (btn) {
        const icon = btn.querySelector('i');
        if (icon) {
          icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }
        btn.setAttribute('aria-label', isDark ? '라이트 모드로 전환' : '다크 모드로 전환');
        btn.setAttribute('title', isDark ? '라이트 모드로 전환' : '다크 모드로 전환');
      }
    };

    // 초기화 및 이벤트 바인딩
    const init = () => {
      const btn = document.getElementById('dark-mode-toggle');
      if (!btn) return;

      // 기존 리스너 제거 및 새 버튼으로 교체 (중복 방지)
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      // 토글 버튼 클릭 이벤트
      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const isCurrentDark = document.body.classList.contains('dark-mode');
        const nextIsDark = !isCurrentDark;
        
        setTheme(nextIsDark);
        localStorage.setItem('theme', nextIsDark ? 'dark' : 'light');
      });

      // 초기 상태 적용 (localStorage 우선, 없으면 시스템 설정)
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        setTheme(savedTheme === 'dark');
      } else {
        setTheme(mediaQuery.matches);
      }
    };

    // 시스템 테마 변경 실시간 감지
    const handleSystemChange = (e) => {
      // 사용자가 수동으로 설정한 값이 없을 때만 시스템 설정 따름
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches);
      }
    };

    // 이벤트 리스너 등록 (구형 브라우저 호환)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
    } else {
      mediaQuery.addListener(handleSystemChange);
    }

    // 실행 시점 보장
    init();
    document.addEventListener('componentsLoaded', init);
  }

  // 선물 날짜 현지화 (special_thanks.html용)
  setupGiftDates() {
    const giftDates = document.querySelectorAll('.gift-date[data-epoch]');
    if (giftDates.length === 0) return;

    const userLocale = navigator.language || 'ko-KR';

    giftDates.forEach(el => {
      try {
        const timestamp = parseInt(el.getAttribute('data-epoch'), 10) * 1000;
        const date = new Date(timestamp);
        
        // 상대 시간 표시 추가
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let relativeTime = '';
        if (diffDays === 1) {
          relativeTime = ' (어제)';
        } else if (diffDays < 30) {
          relativeTime = ` (${diffDays}일 전)`;
        } else if (diffDays < 365) {
          const months = Math.floor(diffDays / 30);
          relativeTime = ` (${months}개월 전)`;
        }

        // Intl.DateTimeFormat을 사용하여 일관된 포맷 적용
        const dateTimeFormatter = new Intl.DateTimeFormat(userLocale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        // GMT 오프셋 (GMT+9 등)
        const offsetFormatter = new Intl.DateTimeFormat('en-US', { timeZoneName: 'shortOffset' });
        const offsetPart = offsetFormatter.formatToParts(date).find(p => p.type === 'timeZoneName');
        const offsetString = offsetPart ? offsetPart.value : '';

        el.textContent = `${dateTimeFormatter.format(date)} (${offsetString})${relativeTime}`;
        el.setAttribute('title', `정확한 시간: ${date.toISOString()}`);
      } catch (error) {
        console.warn('Invalid date format:', el.getAttribute('data-epoch'));
        el.textContent = '날짜 정보 없음';
        el.classList.add('text-error');
      }
    });
  }

  // 부드러운 스크롤링
  setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }

  // 키보드 내비게이션 지원
  setupKeyboardNavigation() {
    // Tab 키로 포커스 이동 시 outline 표시
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('using-keyboard');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('using-keyboard');
    });

    // ESC 키로 필터 옵션 닫기 (career_table.html용)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeFilters = document.querySelectorAll('.filter-options.active');
        activeFilters.forEach(filter => {
          filter.classList.remove('active');
        });
      }
    });
  }

  // 페이지 어디서든 sup/sub에 data-note로 비고(팝오버) 표시
  setupInlineNotes() {
    try {
      const triggers = document.querySelectorAll('sup[data-note], sub[data-note]');
      if (triggers.length === 0) return;

      // 공용 팝오버 엘리먼트 생성
      this.notePopoverEl = document.createElement('div');
      this.notePopoverEl.className = 'note-popover';
      this.notePopoverEl.setAttribute('role', 'tooltip');
      this.notePopoverEl.style.display = 'none';
      document.body.appendChild(this.notePopoverEl);

      const supportsHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;

      const show = (el) => this.showNotePopover(el);
      const hide = () => this.hideNotePopover();

      triggers.forEach(el => {
        el.classList.add('note-trigger');
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
        el.setAttribute('aria-haspopup', 'true');

        // 키보드 접근성
        el.addEventListener('focus', () => show(el));
        el.addEventListener('blur', () => hide());

        // 데스크톱: 호버 시 표시 (기본: 오른쪽 아래, 공간 부족 시 오른쪽 위)
        if (supportsHover) {
          el.addEventListener('mouseenter', () => {
            show(el);
            this.positionNotePopoverRight(el);
          });
          el.addEventListener('mouseleave', () => {
            hide();
          });
        }

        // 모바일: 탭/클릭으로 토글
        el.addEventListener('click', (e) => {
          if (supportsHover) return; // 데스크톱은 호버 우선
          e.preventDefault();
          // 같은 트리거를 다시 누르면 닫기
          const visible = this.notePopoverEl && this.notePopoverEl.style.display !== 'none';
          if (visible && this.currentNoteTrigger === el) {
            hide();
          } else {
            show(el);
          }
        });
      });

      // 바깥 클릭 시 닫기 (모바일용)
      document.addEventListener('click', (e) => {
        if (!this.notePopoverEl || this.notePopoverEl.style.display === 'none') return;
        if (this.currentNoteTrigger && (this.currentNoteTrigger.contains(e.target) || this.notePopoverEl.contains(e.target))) return;
        hide();
      });

      // 스크롤/리사이즈 시 위치 재계산
      const reflow = () => {
        if (this.currentNoteTrigger && this.notePopoverEl && this.notePopoverEl.style.display !== 'none') {
          this.positionNotePopover(this.currentNoteTrigger);
        }
      };
      window.addEventListener('scroll', reflow, true);
      window.addEventListener('resize', reflow);
    } catch (_) {
      // no-op
    }
  }

  showNotePopover(trigger) {
    if (!trigger) return;
    const content = trigger.getAttribute('data-note');
    if (!content) return;

    // 텍스트만 허용 (보안)
    this.notePopoverEl.textContent = content;
    this.notePopoverEl.style.display = 'block';
    this.currentNoteTrigger = trigger;

    const prefer = trigger.tagName.toLowerCase() === 'sub' ? 'bottom' : 'top';
    this.positionNotePopover(trigger, prefer);
  }

  hideNotePopover() {
    if (this.notePopoverEl) {
      this.notePopoverEl.style.display = 'none';
    }
    this.currentNoteTrigger = null;
  }

  positionNotePopover(trigger, prefer = 'top') {
    if (!this.notePopoverEl) return;
    const rect = trigger.getBoundingClientRect();
    const pop = this.notePopoverEl;

    // 적절한 폭 계산
    const maxW = Math.min(320, Math.max(220, rect.width + 120));
    pop.style.maxWidth = `${maxW}px`;

    // 임시로 배치 후 실제 크기 측정
    pop.style.visibility = 'hidden';
    pop.style.left = '0px';
    pop.style.top = '0px';
    // 이미 display:block 상태
    const popRect = pop.getBoundingClientRect();
    const popW = popRect.width || Math.min(maxW, 280);
    const popH = popRect.height || 0;

    let placement = prefer; // 'top' | 'bottom'
    let top = (placement === 'top')
      ? (rect.top + window.scrollY - popH - 8)
      : (rect.bottom + window.scrollY + 8);

    // 화면 밖으로 나가면 방향 뒤집기
    if (placement === 'top' && top < window.scrollY + 8) {
      placement = 'bottom';
      top = rect.bottom + window.scrollY + 8;
    } else if (placement === 'bottom' && (top + popH > window.scrollY + window.innerHeight - 8)) {
      placement = 'top';
      top = rect.top + window.scrollY - popH - 8;
    }

    let left = rect.left + window.scrollX + (rect.width / 2) - (popW / 2);
    left = Math.max(window.scrollX + 8, Math.min(left, window.scrollX + window.innerWidth - popW - 8));

    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    pop.dataset.placement = placement;
    pop.style.visibility = 'visible';
  }

  // 마우스 좌표(clientX, clientY) 기준 팝오버 위치 지정 (데스크톱용)
  positionNotePopoverAt(clientX, clientY) {
    if (!this.notePopoverEl) return;
    const pop = this.notePopoverEl;

    // 현재 크기 측정을 위해 잠시 숨긴 상태로 크기만 가져옵니다.
    pop.style.visibility = 'hidden';
    const popRect = pop.getBoundingClientRect();
    const popW = popRect.width || 260;
    const popH = popRect.height || 0;

    const margin = 8;   // 화면 가장자리 여백
    const offsetX = 12; // 커서 오른쪽 여백
    const offsetY = 10; // 커서 아래 여백

    let left = clientX + offsetX;
    let top = clientY + offsetY;

    // 우/하단으로 넘치면 좌/상단으로 뒤집기
    if (left + popW > window.innerWidth - margin) {
      left = Math.max(margin, clientX - popW - offsetX);
    }
    if (top + popH > window.innerHeight - margin) {
      top = Math.max(margin, clientY - popH - offsetY);
    }

    // 최종 클램핑
    left = Math.max(margin, Math.min(left, window.innerWidth - popW - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - popH - margin));

    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    pop.dataset.placement = 'cursor';
    pop.style.visibility = 'visible';
  }

  // 앵커 요소 기준 오른쪽 정렬 팝오버 배치
  // 기본: 오른쪽 아래, 공간 부족 시 오른쪽 위
  positionNotePopoverRight(anchorEl) {
    if (!this.notePopoverEl || !anchorEl) return;
    const pop = this.notePopoverEl;

    // 크기 측정
    pop.style.visibility = 'hidden';
    const popRect = pop.getBoundingClientRect();
    const popW = popRect.width || 260;
    const popH = popRect.height || 0;

    const rect = anchorEl.getBoundingClientRect();
    const margin = 8;    // 화면 가장자리 여백
    const offsetX = 4;   // 앵커 바깥쪽 수평 간격
    const offsetY = 4;   // 앵커와의 세로 간격

    // 수직 배치: 아래 가능 시 아래, 아니면 위
    let vertical = 'bottom';
    if (rect.bottom + offsetY + popH <= window.innerHeight - margin) {
      vertical = 'bottom';
    } else {
      vertical = 'top';
    }

    // 수평 배치: 오른쪽 여유 공간 확인, 부족하면 왼쪽으로
    const canPlaceRight = rect.right + offsetX + popW <= window.innerWidth - margin;
    const horizontal = canPlaceRight ? 'right' : 'left';

    // 좌표 계산
    let left = canPlaceRight
      ? rect.right + offsetX
      : rect.left - popW - offsetX;

    let top = vertical === 'bottom'
      ? rect.bottom + offsetY
      : rect.top - popH - offsetY;

    // 화면 클램핑
    left = Math.max(margin, Math.min(left, window.innerWidth - popW - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - popH - margin));

    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    pop.dataset.placement = `${vertical}-${horizontal}`;
    pop.style.visibility = 'visible';
  }
}

// DOM 로드 완료 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SiteManager());
} else {
  new SiteManager();
}

// 로딩 완료 후 한 번 더 내비게이션 상태 동기화
// 이미지/폰트 적용 이후에 높이가 달라질 수 있어 스크롤 상태를 재계산합니다.
document.addEventListener('loadingComplete', () => {
  try {
    // 스크롤 이벤트 강제 트리거로 nav 상태 갱신
    window.dispatchEvent(new Event('scroll'));
  } catch (e) {
    // no-op
  }
});

// 성능 모니터링 (개발 모드에서만)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.addEventListener('load', () => {
    if ('performance' in window) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      console.log(`페이지 로드 시간: ${loadTime}ms`);
    }
  });
}