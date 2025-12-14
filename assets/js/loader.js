/**
 * @fileoverview 로딩 화면 및 리소스 관리 스크립트
 * 
 * 웹페이지의 초기 로딩 과정을 관리하는 파일입니다.
 * 이미지와 스타일시트 등 필수 리소스의 로딩 상태를 추적하여
 * 사용자에게 진행률(Progress Bar)을 시각적으로 제공하고,
 * 로딩이 완료되면 부드러운 애니메이션과 함께 본문 내용을 표시합니다.
 * 
 * 주요 기능:
 * 1. 리소스 캐싱 감지 및 로딩 화면 스킵
 * 2. 이미지 및 스타일시트 로딩 추적
 * 3. 로딩 진행률 계산 및 프로그레스 바 업데이트
 * 4. 로딩 오버레이(Overlay) 생성 및 제거 애니메이션
 */

// 간소화된 로딩 관리자 - 캐시 최적화
class LoadingManager {
  /**
   * 로딩 매니저 초기화
   * 생성자에서 즉시 로딩 프로세스를 시작하거나, 캐시된 상태라면 스킵합니다.
   */
  constructor() {
    /** @type {boolean} 현재 로딩 진행 중 여부 */
    this.isLoading = true;
    /** @type {number} 로딩 시작 시간 (타임스탬프) */
    this.startTime = Date.now();
    
    // 더 엄격한 캐시 감지로 로딩 화면 스킵 여부 결정
    if (this.shouldSkipLoadingScreen()) {
      this.completeImmediately();
      return;
    }
    
    this.init();
  }
  
  /**
   * 로딩 화면을 스킵해야 하는지 판단하는 메서드
   * 브라우저 캐시 등을 통해 이미 리소스가 로드된 경우 불필요한 로딩 화면을 방지합니다.
   * 
   * @returns {boolean} 스킵 여부 (true: 스킵, false: 로딩 진행)
   */
  shouldSkipLoadingScreen() {
    // 1. 페이지가 이미 완전히 로드된 상태(Complete)라면 스킵
    if (document.readyState === 'complete') {
      return true;
    }
    
    // 2. Performance API를 이용해 페이지가 캐시(Back-Forward Cache 등)에서 로드되었는지 확인
    // transferSize가 0이면 네트워크 통신 없이 로드된 것으로 간주
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    if (navigationEntry && navigationEntry.transferSize === 0) {
      return true; // 캐시에서 로드됨
    }

    const images = document.querySelectorAll('img');
    // 외부 CDN CSS는 로딩 추적에서 제외 (제어 불가능 및 CORS 문제 방지)
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).filter(link => {
      const href = link.getAttribute('href') || '';
      const isExternal = /^https?:\/\//i.test(href) || href.startsWith('//');
      return !isExternal;
    });

    // 3. 추적할 리소스가 아예 없으면 스킵
    if (images.length === 0 && stylesheets.length === 0) {
      return true;
    }

    // 4. 모든 이미지가 이미 로드 완료(complete) 상태이고, 자연 크기(naturalHeight)가 존재하는지 확인
    const allImagesCached = Array.from(images).every(img => img.complete && img.naturalHeight !== 0);
    
    // 5. 모든 로컬 스타일시트가 파싱 가능한지(cssRules 접근 가능) 확인
    const allStylesheetsLoaded = Array.from(stylesheets).every(link => {
      try {
        // 크로스 오리진(Cross-origin) 보안 정책으로 인해 접근 실패 시 예외 발생 가능
        return link.sheet && link.sheet.cssRules;
      } catch (e) {
        return false;
      }
    });

    // 이미지와 스타일시트 모두 준비되었다면 로딩 스킵
    return allImagesCached && allStylesheetsLoaded;
  }
  
  /**
   * 로딩 과정을 즉시 완료 처리하는 메서드
   * 로딩 화면을 표시하지 않고 바로 콘텐츠를 노출합니다.
   */
  completeImmediately() {
    this.isLoading = false;
    
    // 로딩 오버레이 요소 제거
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
    
    // 본문 숨김 클래스 제거
    document.body.classList.remove('loading');

    // 로딩 완료 커스텀 이벤트 발생 (다른 스크립트에서 감지 가능)
    document.dispatchEvent(new CustomEvent('loadingComplete'));
    console.log('캐시된 리소스로 인해 로딩 화면 스킵됨');
  }

  /**
   * 로딩 프로세스 초기화 및 시작
   * 오버레이 생성, 리소스 카운팅, 추적 시작을 순차적으로 수행합니다.
   */
  init() {
    /** @type {number} 로드 완료된 리소스 개수 */
    this.loadedResources = 0;
    /** @type {number} 로드해야 할 총 리소스 개수 */
    this.totalResources = 0;
    /** @type {HTMLElement|null} 프로그레스 바 DOM 요소 */
    this.progressBar = null;

    this.createLoadingOverlay();
    this.countResources();
    
    // 실제 로딩이 필요한 경우에만 트래킹 및 화면 표시 수행
    if (this.isLoading) {
      this.startResourceTracking();
      this.showLoadingScreen();
    }
  }

  /**
   * 로딩 오버레이(Loading Overlay) DOM 생성 및 삽입
   * 화면 전체를 덮는 로딩 화면 HTML을 동적으로 생성합니다.
   */
  createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loading-overlay';
    overlay.style.display = 'none'; // 최초 페인트 전 플래시(깜빡임) 방지
    
    // 로딩 화면 내부 HTML 구조 (스피너, 텍스트, 프로그레스 바)
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">신하늘의 포트폴리오</div>
        <div class="loading-progress">
          <div class="loading-progress-bar" id="loading-progress-bar"></div>
        </div>
        <div class="loading-subtext">페이지 로딩 중...</div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    // body에 loading 클래스를 추가하여 스크롤 등을 방지
    document.body.classList.add('loading');
    this.progressBar = document.getElementById('loading-progress-bar');
  }

  /**
   * 로딩해야 할 리소스(이미지, CSS)의 총 개수 계산
   * 이미 완료된 리소스는 제외하고, 실제 로딩이 필요한 항목만 카운트합니다.
   */
  countResources() {
    // 1. 아직 로드되지 않은 이미지 필터링
    const images = Array.from(document.querySelectorAll('img')).filter(img => !img.complete);
    
    // 2. 로컬 스타일시트 중 아직 파싱되지 않은 항목 필터링
    const localStylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).filter(link => {
      const href = link.getAttribute('href') || '';
      const isExternal = /^https?:\/\//i.test(href) || href.startsWith('//');
      if (isExternal) return false; // 외부 CSS는 제외
      
      try {
        // sheet 또는 cssRules가 없으면 아직 로딩 중으로 간주
        return !link.sheet || !link.sheet.cssRules;
      } catch (e) {
        return true; // 접근 불가 시 로딩 중으로 보수적 판단
      }
    });
    
    this.totalResources = images.length + localStylesheets.length;
    
    // 실제로 로딩할 것이 없으면(0개) 즉시 완료 처리 (오버레이 표시 안 함)
    if (this.totalResources === 0) {
      this.isLoading = false;
      setTimeout(() => this.completeImmediately(), 0);
      return;
    }
    
    console.log(`로딩할 리소스: ${this.totalResources}개`);
  }

  /**
   * 각 리소스의 로딩 이벤트를 감지하여 추적 시작
   * Promise.all을 사용하여 모든 리소스가 로드될 때까지 대기합니다.
   */
  startResourceTracking() {
    // 1. 이미지 로딩 추적 (로드 이벤트 또는 에러 이벤트 감지)
    const images = Array.from(document.querySelectorAll('img')).filter(img => !img.complete);
    let imagePromises = images.map(img => {
      return new Promise((resolve) => {
        // 이미 완료된 경우 (경쟁 상태 방지)
        if (img.complete) {
          this.updateProgress();
          resolve();
        } else {
          // 로드 성공 시
          img.addEventListener('load', () => {
            this.updateProgress();
            resolve();
          });
          // 로드 실패 시에도 진행률은 업데이트 (무한 대기 방지)
          img.addEventListener('error', () => {
            this.updateProgress();
            resolve();
          });
        }
      });
    });

    // 2. 스타일시트 로딩 추적
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).filter(link => {
      const href = link.getAttribute('href') || '';
      const isExternal = /^https?:\/\//i.test(href) || href.startsWith('//');
      if (isExternal) return false;
      try {
        return !link.sheet || !link.sheet.cssRules;
      } catch (e) {
        return true;
      }
    });
    
    let stylesheetPromises = stylesheets.map(link => {
      return new Promise((resolve) => {
        try {
          if (link.sheet && link.sheet.cssRules) {
            this.updateProgress();
            resolve();
            return;
          }
        } catch (e) {
          // 아직 로딩 중
        }
        
        link.addEventListener('load', () => {
          this.updateProgress();
          resolve();
        });
        link.addEventListener('error', () => {
          this.updateProgress();
          resolve();
        });
      });
    });

    // 모든 필요한 리소스(이미지 + CSS) 로딩 완료 대기
    Promise.all([...imagePromises, ...stylesheetPromises])
      .then(() => {
        this.onAllResourcesLoaded();
      });
  }

  /**
   * 리소스 하나가 로드될 때마다 진행률(Progress) 업데이트
   * 프로그레스 바의 너비를 조절합니다.
   */
  updateProgress() {
    this.loadedResources++;
    // 진행률 계산 (0 ~ 100%)
    const progress = Math.min((this.loadedResources / this.totalResources) * 100, 100);
    
    if (this.progressBar) {
      // 즉시 스타일 업데이트 (애니메이션 지연 제거로 반응성 향상)
      this.progressBar.style.width = `${progress}%`;
    }
    
    console.log(`로딩 진행률: ${progress.toFixed(1)}% (${this.loadedResources}/${this.totalResources})`);
  }

  /**
   * 모든 리소스 로딩이 완료되었을 때 호출되는 메서드
   * 로딩 화면을 숨기는 절차를 시작합니다.
   */
  onAllResourcesLoaded() {
    // 어떤 지연도 없이 바로 로딩 화면 숨김 처리 시작
    this.hideLoadingScreen();
  }

  /**
   * 로딩 화면을 보이게 설정
   * 이미 스킵된 상태가 아니라면 display 속성을 flex로 변경합니다.
   */
  showLoadingScreen() {
    const overlay = document.getElementById('loading-overlay');
    if (!this.isLoading) return; // 이미 스킵된 경우 표시하지 않음
    if (overlay) {
      overlay.style.display = 'flex';
    }
  }

  /**
   * 로딩 화면을 부드럽게 숨김 (Fade-out 애니메이션)
   * 애니메이션 완료 후 DOM에서 요소를 제거합니다.
   */
  hideLoadingScreen() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      // CSS 클래스 추가로 페이드아웃 애니메이션 시작
      overlay.classList.add('fade-out');
      
      // 애니메이션 시간(0.1초) 후 요소 제거 및 정리
      setTimeout(() => {
        overlay.remove();
        document.body.classList.remove('loading');
        this.isLoading = false;
        
        // 최종 로딩 완료 이벤트 발생
        document.dispatchEvent(new CustomEvent('loadingComplete'));
        console.log('로딩 완료!');
      }, 100); // 매우 빠른 페이드아웃 (0.1초) 설정
    }
  }

  /**
   * 강제로 로딩을 완료 처리하는 메서드 (비상용)
   * 페이지 이탈 등의 상황에서 호출될 수 있습니다.
   */
  forceComplete() {
    if (this.isLoading) {
      this.onAllResourcesLoaded();
    }
  }
}

// DOM(문서 객체 모델)이 준비되면 즉시 로딩 매니저 시작
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.loadingManager = new LoadingManager();
  });
} else {
  // 이미 DOM이 로드된 상태라면 바로 인스턴스 생성
  window.loadingManager = new LoadingManager();
}

// 페이지 이탈(Unload) 시 정리 작업
// 로딩 중 페이지를 떠날 때 상태를 강제로 완료하여 찌꺼기 방지
window.addEventListener('beforeunload', () => {
  if (window.loadingManager && window.loadingManager.isLoading) {
    window.loadingManager.forceComplete();
  }
});
