// 간소화된 로딩 관리자 - 캐시 최적화
class LoadingManager {
  constructor() {
    this.isLoading = true;
    this.startTime = Date.now();
    
    // 더 엄격한 캐시 감지로 로딩 화면 스킵
    if (this.shouldSkipLoadingScreen()) {
      this.completeImmediately();
      return;
    }
    
    this.init();
  }
  
  // 개선된 캐시 상태 확인 - 더 빠른 감지
  shouldSkipLoadingScreen() {
    // 페이지가 이미 완전히 로드된 상태라면 스킵
    if (document.readyState === 'complete') {
      return true;
    }
    
    // 성능 API를 이용해 캐시에서 로드되었는지 확인
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    if (navigationEntry && navigationEntry.transferSize === 0) {
      return true; // 캐시에서 로드됨
    }

    const images = document.querySelectorAll('img');
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).filter(link => {
      const href = link.getAttribute('href') || '';
      const isExternal = /^https?:\/\//i.test(href) || href.startsWith('//');
      return !isExternal; // 외부 CDN CSS는 제외
    });

    // 리소스가 없으면 스킵
    if (images.length === 0 && stylesheets.length === 0) {
      return true;
    }

    // 모든 이미지가 완전히 캐시되어 있고, 로컬 스타일시트가 로드되어 있으면 스킵
    const allImagesCached = Array.from(images).every(img => img.complete && img.naturalHeight !== 0);
    const allStylesheetsLoaded = Array.from(stylesheets).every(link => {
      try {
        return link.sheet && link.sheet.cssRules;
      } catch (e) {
        return false;
      }
    });

    return allImagesCached && allStylesheetsLoaded;
  }
  
  // 즉시 완료 처리 (로딩 화면 없음)
  completeImmediately() {
    this.isLoading = false;
    // 오버레이 정리
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
    document.body.classList.remove('loading');

    document.dispatchEvent(new CustomEvent('loadingComplete'));
    console.log('캐시된 리소스로 인해 로딩 화면 스킵됨');
  }

  init() {
    this.loadedResources = 0;
    this.totalResources = 0;
    this.progressBar = null;

    this.createLoadingOverlay();
    this.countResources();
    // 실제 로딩이 필요한 경우에만 트래킹/표시
    if (this.isLoading) {
      this.startResourceTracking();
      this.showLoadingScreen();
    }
  }

  // 로딩 오버레이 생성
  createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loading-overlay';
    overlay.style.display = 'none'; // 최초 페인트 전 플래시 방지
    
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
    document.body.classList.add('loading');
    this.progressBar = document.getElementById('loading-progress-bar');
  }

  // 로딩할 리소스 개수 카운트 (필수 리소스만)
  countResources() {
    // 실제 로딩이 필요한 리소스만 카운트
    const images = Array.from(document.querySelectorAll('img')).filter(img => !img.complete);
    const localStylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).filter(link => {
      const href = link.getAttribute('href') || '';
      const isExternal = /^https?:\/\//i.test(href) || href.startsWith('//');
      if (isExternal) return false; // 외부 CSS 제외
      try {
        return !link.sheet || !link.sheet.cssRules;
      } catch (e) {
        return true; // 접근할 수 없으면 로딩 중으로 간주
      }
    });
    
    this.totalResources = images.length + localStylesheets.length;
    
    // 실제로 로딩할 것이 없으면 즉시 완료 (오버레이 표시도 안 함)
    if (this.totalResources === 0) {
      this.isLoading = false;
      setTimeout(() => this.completeImmediately(), 0);
      return;
    }
    
    console.log(`로딩할 리소스: ${this.totalResources}개`);
  }

  // 리소스 로딩 추적 시작 (필요한 것만)
  startResourceTracking() {
    // 완료되지 않은 이미지만 추적
    const images = Array.from(document.querySelectorAll('img')).filter(img => !img.complete);
    let imagePromises = images.map(img => {
      return new Promise((resolve) => {
        if (img.complete) {
          this.updateProgress();
          resolve();
        } else {
          img.addEventListener('load', () => {
            this.updateProgress();
            resolve();
          });
          img.addEventListener('error', () => {
            this.updateProgress();
            resolve();
          });
        }
      });
    });

    // 로드되지 않은 로컬 스타일시트만 추적
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

    // 모든 필요한 리소스 로딩 완료 대기
    Promise.all([...imagePromises, ...stylesheetPromises])
      .then(() => {
        this.onAllResourcesLoaded();
      });
  }

  // 진행률 업데이트 (더 빠른 애니메이션)
  updateProgress() {
    this.loadedResources++;
    const progress = Math.min((this.loadedResources / this.totalResources) * 100, 100);
    
    if (this.progressBar) {
      // 즉시 업데이트 - 애니메이션 지연 제거
      this.progressBar.style.width = `${progress}%`;
    }
    
    console.log(`로딩 진행률: ${progress.toFixed(1)}% (${this.loadedResources}/${this.totalResources})`);
  }

  // 모든 리소스 로딩 완료 시 호출 (즉시 페이지 전환)
  onAllResourcesLoaded() {
    // 어떤 지연도 없이 바로 로딩 화면 숨김 처리
    this.hideLoadingScreen();
  }

  // 로딩 화면 표시
  showLoadingScreen() {
    const overlay = document.getElementById('loading-overlay');
    if (!this.isLoading) return; // 이미 스킵된 경우 표시하지 않음
    if (overlay) {
      overlay.style.display = 'flex';
    }
  }

  // 로딩 화면 숨기기 (매우 빠른 페이드아웃)
  hideLoadingScreen() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('fade-out');
      
      setTimeout(() => {
        overlay.remove();
        document.body.classList.remove('loading');
        this.isLoading = false;
        
        // 로딩 완료 이벤트 발생
        document.dispatchEvent(new CustomEvent('loadingComplete'));
        console.log('로딩 완료!');
      }, 100); // 매우 빠른 페이드아웃 (0.1초)
    }
  }

  // 수동으로 로딩 완료 처리 (필요 시)
  forceComplete() {
    if (this.isLoading) {
      this.onAllResourcesLoaded();
    }
  }
}

// DOM이 준비되면 즉시 로딩 매니저 시작
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.loadingManager = new LoadingManager();
  });
} else {
  window.loadingManager = new LoadingManager();
}

// 페이지 이탈 시 정리
window.addEventListener('beforeunload', () => {
  if (window.loadingManager && window.loadingManager.isLoading) {
    window.loadingManager.forceComplete();
  }
});