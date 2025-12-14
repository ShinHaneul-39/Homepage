/**
 * @fileoverview 블로그 포스트 이미지 관리 스크립트
 * 
 * 블로그 포스트 내의 이미지들에 대한 사용자 경험(UX)을 향상시키는 스크립트입니다.
 * 이미지의 지연 로딩(Lazy Loading)을 통해 성능을 최적화하고,
 * alt 속성을 기반으로 자동 캡션을 생성하며,
 * 클릭 시 확대해서 볼 수 있는 라이트박스(Lightbox) 기능을 제공합니다.
 * 
 * 주요 기능:
 * 1. 이미지 지연 로딩 (Native Lazy Loading 및 IntersectionObserver 폴백)
 * 2. 이미지 캡션 자동 생성 (figure/figcaption 구조화)
 * 3. 라이트박스 이미지 뷰어 (확대 보기, 키보드 접근성 지원)
 */

class PostImageManager {
  /**
   * 포스트 이미지 매니저 초기화
   * 생성자에서 포스트 본문 내의 모든 이미지를 선택하고 초기화 작업을 수행합니다.
   */
  constructor() {
    // '.post-content' 클래스 내부의 이미지들만 대상으로 함
    this.images = document.querySelectorAll('.post-content img');
    this.init();
  }

  /**
   * 초기화 로직 실행
   * 이미지가 존재하는 경우에만 각 기능을 설정합니다.
   */
  init() {
    if (this.images.length === 0) return;

    this.setupLazyLoading(); // 지연 로딩 설정
    this.setupCaptions();    // 캡션 자동 생성
    this.setupLightbox();    // 라이트박스 뷰어 설정
    this.setupInteractiveClasses(); // 추가 스타일 클래스 설정
  }

  /**
   * 1. 이미지 지연 로딩(Lazy Loading) 설정
   * 브라우저의 네이티브 기능을 우선 사용하고, 지원하지 않을 경우 IntersectionObserver를 사용합니다.
   */
  setupLazyLoading() {
    // 브라우저가 기본적으로 loading="lazy"를 지원하는지 확인
    if ('loading' in HTMLImageElement.prototype) {
      this.images.forEach(img => {
        // 이미 loading 속성이 설정되어 있지 않다면 추가
        if (!img.hasAttribute('loading')) {
          img.setAttribute('loading', 'lazy');
        }
      });
    } else {
      // 폴백(Fallback): 구형 브라우저를 위한 IntersectionObserver 구현
      const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            // data-src 속성의 값을 src로 이동하여 로딩 시작
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            observer.unobserve(img); // 한 번 로드되면 관찰 중단
          }
        });
      });
      
      this.images.forEach(img => {
        // src가 없고 data-src만 있는 경우 관찰 대상에 추가
        if (!img.getAttribute('src') && img.dataset.src) {
          observer.observe(img);
        }
      });
    }
  }

  /**
   * 2. 이미지 캡션 자동 생성
   * 이미지의 alt 또는 title 속성을 사용하여 figcaption을 자동으로 생성합니다.
   * 접근성을 높이고 이미지에 대한 설명을 시각적으로 제공합니다.
   */
  setupCaptions() {
    this.images.forEach(img => {
      // 이미 figure 태그로 감싸져 있는지 확인 (중복 생성 방지)
      // p 또는 div의 직계 자식인 경우에만 처리 (복잡한 레이아웃 제외)
      const parent = img.parentElement;
      const altText = img.getAttribute('alt');

      if (altText && parent.tagName !== 'FIGURE' && parent.tagName !== 'PICTURE') {
        // title 속성이 있는 경우에만 시각적 캡션(figcaption) 생성
        // (alt는 스크린 리더용이므로 시각적으로 보여주지 않을 수도 있음)
        if (img.title) {
          const figure = document.createElement('figure');
          figure.className = 'post-figure auto-generated';
          
          // 이미지를 감싸기 위해 figure를 이미지 앞에 삽입하고 이미지를 figure 내부로 이동
          img.parentNode.insertBefore(figure, img);
          figure.appendChild(img);
          
          // 캡션 요소 생성 및 추가
          const figcaption = document.createElement('figcaption');
          figcaption.textContent = img.title; // title 속성값을 캡션 텍스트로 사용
          figure.appendChild(figcaption);
        }
      }
    });
  }

  /**
   * 3. 라이트박스(Lightbox) 뷰어 설정
   * 이미지를 클릭했을 때 전체 화면 오버레이로 확대해서 보여주는 기능입니다.
   */
  setupLightbox() {
    // 라이트박스 DOM 요소 동적 생성
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox-overlay';
    lightbox.innerHTML = `
      <div class="lightbox-close">&times;</div>
      <div class="lightbox-content">
        <img class="lightbox-image" src="" alt="">
        <div class="lightbox-caption"></div>
      </div>
    `;
    document.body.appendChild(lightbox);

    const lightboxImg = lightbox.querySelector('.lightbox-image');
    const lightboxCaption = lightbox.querySelector('.lightbox-caption');
    const closeBtn = lightbox.querySelector('.lightbox-close');

    /**
     * 라이트박스 열기 함수
     * @param {string} src - 이미지 경로
     * @param {string} alt - 대체 텍스트
     * @param {string} caption - 캡션 텍스트
     */
    const openLightbox = (src, alt, caption) => {
      lightboxImg.src = src;
      lightboxImg.alt = alt || '';
      lightboxCaption.textContent = caption || alt || '';
      lightbox.classList.add('active'); // CSS 클래스로 표시 제어
      document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
    };

    /**
     * 라이트박스 닫기 함수
     */
    const closeLightbox = () => {
      lightbox.classList.remove('active');
      // 페이드아웃 애니메이션 시간(300ms) 대기 후 리소스 정리
      setTimeout(() => {
        lightboxImg.src = ''; // src 초기화 (메모리 관리)
        document.body.style.overflow = ''; // 스크롤 복원
      }, 300);
    };

    // 각 이미지에 클릭 이벤트 연결
    this.images.forEach(img => {
      // 아이콘이나 너무 작은 이미지는 제외 (50x50 미만)
      // .no-lightbox 클래스가 있는 경우도 제외
      if (img.width < 50 || img.height < 50 || img.classList.contains('no-lightbox')) return;

      img.classList.add('interactive'); // 커서를 포인터로 변경하는 클래스 추가
      img.addEventListener('click', (e) => {
        e.stopPropagation(); // 이벤트 버블링 방지
        // 캡션 우선순위: title > figcaption 내용 > 빈 문자열
        const caption = img.title || (img.nextElementSibling?.tagName === 'FIGCAPTION' ? img.nextElementSibling.textContent : '');
        openLightbox(img.src, img.alt, caption);
      });
    });

    // 닫기 버튼 이벤트
    closeBtn.addEventListener('click', closeLightbox);
    
    // 오버레이 배경 클릭 시 닫기
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
        closeLightbox();
      }
    });
    
    // 키보드 접근성 (ESC 키로 닫기)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        closeLightbox();
      }
    });
  }

  /**
   * 추가적인 인터랙티브 클래스 설정 (확장성 고려)
   * 현재는 비어있으나, 추후 레이아웃 규칙에 따른 클래스 추가 등에 사용 가능합니다.
   */
  setupInteractiveClasses() {
    // 추후 확장: 이미지 비율에 따른 클래스 추가 등
  }
}

// DOM 로드 완료 시 인스턴스 생성 및 실행
document.addEventListener('DOMContentLoaded', () => {
  new PostImageManager();
});
