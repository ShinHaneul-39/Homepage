/**
 * @fileoverview Special Thanks 페이지 로직 및 인터랙션 스크립트
 * 
 * '고마운 사람들' 페이지의 핵심 기능을 담당하는 파일입니다.
 * CSV 데이터 로딩, 선물 카드 렌더링, 연도별/유형별 필터링,
 * 그리고 부드러운 스크롤 네비게이션 기능을 제공합니다.
 * 
 * 주요 기능:
 * 1. CSV 데이터 비동기 로드 및 파싱
 * 2. 연도별 선물 섹션 및 카드 동적 생성
 * 3. 탭(Tab) 기반의 선물 유형 필터링 (전체, Nitro, 배너 등)
 * 4. 연도별 스크롤 스파이(Scroll Spy) 및 네비게이션 연동
 * 5. 사용자 로케일에 맞는 날짜 및 시간 포맷팅
 */

class ThanksManager {
    /**
     * Thanks 매니저 초기화
     * DOM 요소들을 선택하고 기본 설정을 로드합니다.
     */
    constructor() {
        this.filterRoot = document.querySelector('.gift-filters');
        // 접근성을 고려하여 role="tab" 속성을 가진 요소를 탭으로 인식
        this.tabs = this.filterRoot ? Array.from(this.filterRoot.querySelectorAll('[role="tab"]')) : [];
        this.cards = Array.from(document.querySelectorAll('.gift-card.card'));
        // 사용자 시스템의 '동작 줄이기(Reduce Motion)' 설정 감지
        this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        // 네비게이션 컨트롤 요소
        this.yearSelect = document.querySelector('.year-select');
        this.yearLinks = document.querySelectorAll('.year-links a[href^="#"]');
        this.years = Array.from(document.querySelectorAll('.gift-year[id]'));
    }

    /**
     * 초기화 메서드
     * 데이터 로딩 프로세스를 시작합니다.
     */
    init() {
    this.loadData();
  }

  /**
   * CSV 데이터 로드 및 파싱
   * PapaParse 라이브러리를 사용하여 서버에서 CSV 파일을 가져와 객체로 변환합니다.
   */
  loadData() {
      if (typeof Papa === 'undefined') return;

      fetch('assets/data/thanks_data.csv')
          .then(r => r.text())
          .then(csvText => {
              Papa.parse(csvText, {
                  header: true, // 첫 줄을 키(Key)로 사용
                  skipEmptyLines: true,
                  complete: (results) => {
                      this.renderData(results.data); // 데이터 렌더링
                      this.sortCards(); // 초기 정렬 (최신순)
                      this.initFilters(); // 필터 탭 초기화
                      this.initScrollNav(); // 스크롤 네비게이션 초기화
                  }
              });
          });
  }

  /**
   * 데이터를 기반으로 DOM 렌더링
   * 연도별로 섹션을 나누고 각 선물 카드를 생성합니다.
   * 
   * @param {Array<Object>} data - 파싱된 선물 데이터 배열
   */
  renderData(data) {
      const container = document.getElementById('gift-list-container');
      const yearLinksNav = document.querySelector('.year-links');
      const yearSelect = document.querySelector('.year-select');
      
      if (!container || !yearLinksNav || !yearSelect) return;

      // 날짜 포맷터 설정 (사용자 로케일 자동 감지)
      const userLocale = navigator.language || 'ko-KR';
      const dateFormatter = new Intl.DateTimeFormat(userLocale, {
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false // 24시간제
      });
      // 타임존 오프셋 포맷터 (예: GMT+9)
      const offsetFormatter = new Intl.DateTimeFormat('en-US', { timeZoneName: 'shortOffset' });

      // 컨테이너 초기화
      container.innerHTML = '';
      yearLinksNav.innerHTML = '';
      yearSelect.innerHTML = '';

      // 데이터를 연도별로 그룹화
      const years = {};
      data.forEach(row => {
          if (!years[row.year]) years[row.year] = [];
          years[row.year].push(row);
      });

      // 연도 내림차순 정렬 (최신 연도가 위로)
      const sortedYears = Object.keys(years).sort((a, b) => b - a);

      sortedYears.forEach(year => {
          // 1. 상단 네비게이션 링크(칩) 생성
          const link = document.createElement('a');
          link.className = 'chip';
          link.href = `#year-${year}`;
          link.textContent = year;
          yearLinksNav.appendChild(link);

          // 2. 모바일용 셀렉트 옵션 생성
          const option = document.createElement('option');
          option.value = `year-${year}`;
          option.textContent = year;
          yearSelect.appendChild(option);

          // 3. 연도별 섹션 본문 생성
          const yearSection = document.createElement('div');
          yearSection.className = 'gift-year';
          yearSection.id = `year-${year}`;
          yearSection.setAttribute('aria-label', `${year}년 선물`);
          
          const title = document.createElement('h3');
          title.className = 'year-title';
          title.textContent = year;
          yearSection.appendChild(title);

          const grid = document.createElement('div');
          grid.className = 'gift-grid';

          // 해당 연도의 선물 카드 생성
          years[year].forEach(item => {
              const article = document.createElement('article');
              article.className = 'gift-card card';
              article.dataset.type = item.type; // 필터링용 데이터 속성 (nitro, banner 등)

              // 선물 유형에 따른 태그 스타일 클래스 결정
              let tagClass = 'tag-etc';
              if (item.type === 'nitro') tagClass = 'tag-nitro';
              else if (item.type === 'banner') tagClass = 'tag-banner';
              
              // 카드 헤더 (번호, 사용자명)
              const headerDiv = document.createElement('div');
              headerDiv.className = 'gift-card-header';
              
              const numberSpan = document.createElement('span');
              numberSpan.className = 'gift-number';
              numberSpan.textContent = item.number;
              
              const userDiv = document.createElement('div');
              userDiv.className = 'gift-user';
              userDiv.textContent = item.user; // textContent를 사용하여 XSS 방지
              
              headerDiv.appendChild(numberSpan);
              headerDiv.appendChild(userDiv);
              
              // 카드 본문 (선물 아이템 태그)
              const bodyDiv = document.createElement('div');
              bodyDiv.className = 'gift-card-body';
              
              const tagSpan = document.createElement('span');
              tagSpan.className = `tag ${tagClass}`;
              tagSpan.textContent = item.item;
              
              bodyDiv.appendChild(tagSpan);
              
              // 카드 하단 (날짜 정보)
              const metaDiv = document.createElement('div');
              metaDiv.className = 'gift-meta';
              
              const timeEl = document.createElement('time');
              timeEl.setAttribute('datetime', item.date);
              
              // 날짜 포맷팅 및 타임존 표시
              try {
                  const dateObj = new Date(item.date);
                  const dateStr = dateFormatter.format(dateObj);
                  const offsetPart = offsetFormatter.formatToParts(dateObj).find(p => p.type === 'timeZoneName');
                  const offsetStr = offsetPart ? offsetPart.value : '';
                  
                  timeEl.textContent = `${dateStr} (${offsetStr})`;
              } catch (e) {
                  timeEl.textContent = item.displayDate; // 포맷팅 실패 시 원본 문자열 사용
              }

              metaDiv.appendChild(timeEl);
              
              // 요소 조립
              article.appendChild(headerDiv);
              article.appendChild(bodyDiv);
              article.appendChild(metaDiv);

              grid.appendChild(article);
          });

          yearSection.appendChild(grid);
          container.appendChild(yearSection);
      });
  }

  /**
   * 선물 카드 정렬 (최신순)
   * DOM에 렌더링된 후 날짜(datetime)를 기준으로 내림차순 정렬합니다.
   */
  sortCards() {
      const grids = document.querySelectorAll('.gift-grid');
      grids.forEach(grid => {
          const cards = Array.from(grid.querySelectorAll('.gift-card'));
          cards.sort((a, b) => {
              const timeA = a.querySelector('time')?.getAttribute('datetime') || '';
              const timeB = b.querySelector('time')?.getAttribute('datetime') || '';
              return timeB.localeCompare(timeA); // 문자열 비교 (ISO 날짜는 문자열 비교 가능)
          });
          cards.forEach(card => grid.appendChild(card)); // 정렬된 순서로 재삽입
      });
      // 정렬 후 카드 목록 참조 갱신
      this.cards = Array.from(document.querySelectorAll('.gift-card.card'));
  }

  /**
   * 필터 탭 초기화 및 이벤트 바인딩
   * 키보드 접근성(화살표 키 이동)을 지원합니다.
   */
  initFilters() {
        if (this.tabs.length) {
            this.tabs.forEach((tab, idx) => {
                // 클릭 이벤트
                tab.addEventListener('click', (e) => { 
                    e.preventDefault(); 
                    this.setActiveTab(tab); 
                    tab.focus(); 
                });
                
                // 키보드 네비게이션 (접근성)
                tab.addEventListener('keydown', (e) => {
                    const key = e.key;
                    if (key === 'ArrowRight' || key === 'ArrowLeft') {
                        e.preventDefault();
                        const dir = key === 'ArrowRight' ? 1 : -1;
                        // 순환 탐색
                        const nextIndex = (idx + dir + this.tabs.length) % this.tabs.length;
                        this.tabs[nextIndex].focus();
                    } else if (key === 'Home') {
                        e.preventDefault(); 
                        this.tabs[0].focus();
                    } else if (key === 'End') {
                        e.preventDefault(); 
                        this.tabs[this.tabs.length - 1].focus();
                    } else if (key === 'Enter' || key === ' ') {
                        e.preventDefault(); 
                        this.setActiveTab(tab);
                    }
                });
            });

            // 초기 활성 탭 설정
            const current = this.tabs.find(t => t.getAttribute('aria-selected') === 'true') || this.tabs[0];
            this.setActiveTab(current);
        }
    }

    /**
     * 탭 활성화 처리
     * @param {HTMLElement} newTab - 활성화할 탭 요소
     */
    setActiveTab(newTab) {
        this.tabs.forEach(tab => {
            const isActive = tab === newTab;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
            tab.tabIndex = isActive ? 0 : -1; // 활성 탭만 포커스 가능
        });
        // 해당 탭의 필터 적용
        this.applyFilter(newTab.dataset.filter || 'all');
    }

    /**
     * 필터링 적용 로직
     * 선택된 유형에 맞는 카드만 표시하고 나머지는 숨깁니다.
     * 애니메이션을 포함하여 부드러운 전환 효과를 제공합니다.
     * 
     * @param {string} filter - 필터 유형 (all, nitro, banner 등)
     */
    applyFilter(filter) {
        const f = (filter || 'all').toLowerCase();
        
        // 동적으로 추가된 카드까지 포함하여 최신 목록 갱신
        this.cards = Array.from(document.querySelectorAll('.gift-card.card'));

        this.cards.forEach(card => {
            const type = (card.dataset.type || '').toLowerCase();
            const show = f === 'all' || type === f;
            
            if (show) {
                // 표시해야 할 카드
                if (card.hidden || card.style.display === 'none') {
                    card.hidden = false;
                    card.style.display = ''; // 인라인 스타일 제거
                    card.classList.remove('is-hiding');
                    
                    // 모션 감소 설정이 아닐 경우 페이드인 애니메이션 적용
                    if (!this.reduceMotion) {
                        card.style.opacity = '0';
                        card.style.transform = 'scale(0.95)';
                        
                        // Reflow 강제 후 스타일 원복으로 트랜지션 유도
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                card.style.opacity = '';
                                card.style.transform = '';
                            });
                        });
                    }
                }
            } else {
                // 숨겨야 할 카드
                if (!card.hidden) {
                    if (this.reduceMotion) {
                        // 즉시 숨김
                        card.hidden = true;
                        card.style.display = 'none';
                    } else {
                        // 페이드아웃 애니메이션 후 숨김
                        card.classList.add('is-hiding');
                        
                        const finish = () => {
                            if (card.classList.contains('is-hiding')) {
                                card.hidden = true;
                                card.style.display = 'none';
                                card.classList.remove('is-hiding');
                            }
                        };
                        
                        // CSS 트랜지션 시간(300ms)에 맞춰 실행
                        setTimeout(finish, 300); 
                    }
                }
            }
        });
    }

    /**
     * 스크롤 네비게이션 초기화
     * 연도 링크 클릭 시 스크롤 이동 및 현재 보고 있는 연도 감지(ScrollSpy) 기능을 설정합니다.
     */
    initScrollNav() {
        // 셀렉트 박스(모바일) 변경 시 이동
        if (this.yearSelect) {
            this.yearSelect.addEventListener('change', () => this.scrollToId(this.yearSelect.value));
        }

        // 상단 링크(데스크톱) 클릭 시 이동
        this.yearLinks.forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const id = a.getAttribute('href').slice(1);
                this.scrollToId(id);
            });
        });

        // IntersectionObserver를 이용한 스크롤 스파이 구현
        // 현재 화면에 보이는 연도 섹션을 감지하여 네비게이션 상태를 업데이트합니다.
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    // 셀렉트 박스 동기화
                    if (this.yearSelect) this.yearSelect.value = id;
                    
                    // 링크 활성 상태 동기화
                    document.querySelectorAll('.year-links a').forEach(a => {
                        a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
                    });
                }
            });
        }, { root: null, rootMargin: '-72px 0px -70% 0px', threshold: 0.01 }); // 헤더 높이 등을 고려한 마진 설정

        this.years.forEach(y => io.observe(y));
    }

    /**
     * 특정 ID 요소로 부드럽게 스크롤 이동
     * @param {string} id - 이동할 요소의 ID
     */
    scrollToId(id) {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // URL 해시 업데이트 (히스토리 관리)
            history.replaceState(null, '', `#${id}`);
        }
    }
}

// DOM이 준비되면 매니저 인스턴스 생성 및 실행
document.addEventListener('DOMContentLoaded', () => {
    const manager = new ThanksManager();
    manager.init();
});
