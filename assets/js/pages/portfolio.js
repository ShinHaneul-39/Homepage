/**
 * @fileoverview 포트폴리오(경력) 테이블 관리 스크립트
 * 
 * Discord 관리자 경력 테이블의 핵심 기능을 담당하는 파일입니다.
 * CSV 데이터 로딩, 테이블 렌더링, 필터링, 정렬, 그리고 UI 장식(태그, 툴팁) 기능을 제공합니다.
 * FLIP 애니메이션을 사용하여 필터링 및 정렬 시 부드러운 시각적 효과를 구현했습니다.
 * 
 * 주요 기능:
 * 1. CSV 데이터 비동기 로드 및 파싱 (PapaParse 사용)
 * 2. 테이블 동적 렌더링 및 태그/칩 스타일 적용
 * 3. 다중 조건 필터링 (카테고리, 부서, 직급)
 * 4. 컬럼별 정렬 (숫자, 날짜, 문자열)
 * 5. FLIP 애니메이션을 통한 행 재배치 효과
 * 6. 비고(Note) 팝오버/툴팁 관리
 */

// 전역 스코프 오염 방지를 위한 IIFE(즉시 실행 함수) 패턴 사용
(function(){
  'use strict';

  // 태그 색상 설정 (CSS 클래스 매핑)
  // 카테고리, 부서, 직급별로 지정된 색상 클래스를 정의합니다.
  const TagConfig = {
    category: {
      '친목': 'tag-yellow',
      '홍보': 'tag-rose',
      '이모지': 'tag-orange',
      '커뮤니티': 'tag-indigo',
      '개발': 'tag-blue',
      '_default': 'tag-slate' // 기본값
    },
    department: {
      '연합팀': 'tag-yellow',
      '홍보팀': 'tag-rose',
      '안내팀': 'tag-sky',
      '봇 관리자': 'tag-purple',
      '운영팀': 'tag-slate',
      '보안팀': 'tag-red',
      '_default': 'tag-slate'
    },
    position: {
      '팀원': 'tag-green',
      '팀장': 'tag-purple',
      '소유자': 'tag-cyan',
      '공동 소유자': 'tag-cyan',
      '총 관리자': 'tag-red',
      '부 관리자': 'tag-orange',
      '매니저': 'tag-blue',
      '_default': 'tag-slate'
    }
  };

  /**
   * DOM 준비 상태 확인 헬퍼 함수
   * DOMContentLoaded 이벤트가 이미 발생했는지 확인하고 콜백을 실행합니다.
   * @param {Function} fn - 실행할 콜백 함수
   */
  function ready(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn();
  }

  // ===== CSV 로딩 및 데이터 처리 로직 =====

  /**
   * 경력 데이터 CSV 파일 로드 함수 (캐싱 적용)
   * localStorage를 활용하여 초기 로딩 속도를 최적화합니다.
   * Stale-While-Revalidate 전략: 캐시가 있으면 즉시 표시하고, 백그라운드에서 최신 데이터를 받아 캐시를 갱신합니다.
   * 
   * @param {Function} callback - 로드 완료 후 실행할 콜백
   */
  function loadCareerData(callback) {
    if (typeof Papa === 'undefined') {
        console.error('PapaParse 라이브러리가 로드되지 않았습니다.');
        return;
    }
    
    // 경력 테이블이 있는 페이지인지 확인
    if (!document.querySelector('.discord-career-table')) return;

    const CACHE_KEY = 'career_data_v1';
    const cachedData = localStorage.getItem(CACHE_KEY);

    // 1. 캐시된 데이터가 있으면 즉시 렌더링 (Fast Path)
    if (cachedData) {
        try {
            const parsedData = JSON.parse(cachedData);
            renderCareerTable(parsedData);
            if (callback) callback();
            
            // 백그라운드에서 최신 데이터 확인 및 캐시 갱신
            fetchCareerData(CACHE_KEY, null); // 콜백 없이 갱신만 수행
            return;
        } catch (e) {
            console.error('캐시 파싱 실패, 네트워크 로드로 전환', e);
            localStorage.removeItem(CACHE_KEY);
        }
    }

    // 2. 캐시가 없거나 실패 시 네트워크 로드
    fetchCareerData(CACHE_KEY, callback);
  }

  /**
   * 실제 네트워크 요청 및 캐시 저장 처리
   */
  function fetchCareerData(cacheKey, callback) {
    fetch('../assets/data/career_data.csv?t=' + Date.now())
      .then(response => response.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true, // 첫 줄을 헤더로 사용
          skipEmptyLines: true, // 빈 줄 무시
          complete: (results) => {
            // 데이터가 유효한지 확인
            if (results.data && results.data.length > 0) {
                // 캐시 업데이트
                localStorage.setItem(cacheKey, JSON.stringify(results.data));
                
                // 콜백이 제공된 경우(초기 로딩)에만 렌더링 및 콜백 실행
                if (callback) {
                    renderCareerTable(results.data);
                    callback();
                } else {
                    console.log('경력 데이터 캐시가 백그라운드에서 갱신되었습니다.');
                }
            }
          },
          error: (err) => console.error('CSV 파싱 오류:', err)
        });
      })
      .catch(err => console.error('경력 데이터 로드 실패:', err));
  }

  /**
   * 경력 테이블 HTML 렌더링 함수
   * 파싱된 데이터를 기반으로 테이블 행(tr)을 생성하여 tbody에 삽입합니다.
   * 
   * @param {Array<Object>} data - 파싱된 경력 데이터 배열
   */
  function renderCareerTable(data) {
    const tbody = document.querySelector('.discord-career-table tbody');
    if (!tbody) return;
    tbody.innerHTML = ''; // 기존 내용 초기화

    // 각 행 데이터 처리 및 DOM 생성
    data.forEach(row => {
      const tr = document.createElement('tr');
      
      // 서버 이름 및 비고(Note) 처리
      // 비고가 있는 경우 sup 태그로 뱃지/마커를 추가합니다.
      let serverNameHtml = row.serverName;
      if (row.note) {
          // 비고 형식 파싱: 여러 개의 "[태그] 상세내용" 지원
          // 정규식 설명: \[([^\]]+)\] 로 [태그] 부분을 찾고, 그 뒤에 나오는 텍스트를 다음 [태그]가 나오기 전까지 매칭합니다.
          const noteRegex = /\[([^\]]+)\]([^\[]*)/g;
          let match;
          let hasMatch = false;
          let supTags = '';
          
          while ((match = noteRegex.exec(row.note)) !== null) {
              hasMatch = true;
              const tag = `[${match[1]}]`;
              // 태그를 포함한 전체 문자열을 각주 내용으로 사용합니다.
              const fullNoteContent = `${tag} ${match[2].trim()}`.replace(/"/g, '&quot;');
              supTags += `<sup data-note="${fullNoteContent}">${tag}</sup>`;
          }
          
          if (hasMatch) {
              serverNameHtml += supTags;
          } else {
               // 태그가 없는 경우 기본값 사용
               const noteContent = row.note.trim().replace(/"/g, '&quot;');
               if (noteContent) {
                   serverNameHtml += `<sup data-note="${noteContent}">[비고]</sup>`; 
               }
          }
      }
      
      // 행 HTML 구성
      // 실제 태그/칩 장식(Decoration)은 PortfolioManager 클래스에서 후처리로 수행합니다.
      tr.innerHTML = `
        <td>${row.no}</td>
        <td>${serverNameHtml}</td>
        <td>${row.category}</td>
        <td>${row.count}</td>
        <td>${row.department}</td>
        <td>${row.position}</td>
        <td>${row.job}</td>
        <td>${row.term}</td>
      `;
      
      tbody.appendChild(tr);
    });
  }
  // =============================

  /**
   * 포트폴리오 관리 클래스
   * 테이블의 필터링, 정렬, UI 인터랙션을 총괄합니다.
   */
  class PortfolioManager{
    constructor(){
      this.table = document.querySelector('.discord-career-table');
      if(!this.table) return;
      this.tbody = this.table.querySelector('tbody');
      
      // 정렬 초기화를 위해 원본 순서를 저장합니다.
      this.originalRows = Array.from(this.tbody ? this.tbody.rows : []);
      this.originalRows.forEach((tr, idx)=>{ try { tr.dataset.originalIndex = idx; } catch(e){} });
      
      this.filterHeaders = Array.from(this.table.querySelectorAll('th.filter-th'));
      this.typeToIndex = this._mapFilterTypeToColumnIndex(); // 필터 타입별 컬럼 인덱스 매핑
      
      // 주요 컬럼 인덱스 찾기
      const headers = Array.from(this.table.querySelectorAll('thead th'));
      this.termColIndex = headers.findIndex(th => th.textContent.includes('임기'));
      // No 컬럼 인덱스 찾기 (정확한 매칭을 위해 trim 및 대소문자 확인)
      this.noColIndex = headers.findIndex(th => {
          const text = th.textContent.trim().toLowerCase();
          return text.startsWith('no') || text === '#';
      });

      // 필터 상태 관리 (Set을 사용하여 다중 선택 지원)
      this.state = { category:new Set(), department:new Set(), position:new Set() };
      
      // '현직만 보기' 토글 스위치 바인딩
      this.currentTermCheckbox = document.getElementById('current-term-only');
      if (this.currentTermCheckbox) {
        // Change 이벤트: 실제 필터링 로직 트리거
        this.currentTermCheckbox.addEventListener('change', (e) => {
             if (e.target.dataset.role !== 'toggle-checkbox') return;
             console.log('체크박스 변경됨:', e.target.checked);
             this._applyFilters();
        });
        
        // 클릭 이벤트 버블링 방지 (헤더 정렬 기능과 충돌 방지)
        this.currentTermCheckbox.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // 라벨 클릭 시에도 버블링 방지
        const label = this.currentTermCheckbox.closest('label');
        if(label) {
            label.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // 키보드 접근성 (Enter/Space로 토글)
            label.setAttribute('tabindex', '0');
            label.addEventListener('keydown', (e) => {
                if(e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.currentTermCheckbox.checked = !this.currentTermCheckbox.checked;
                    this._applyFilters();
                }
            });
        }
      }

      // 초기화 작업 수행
      this._buildAllOptions(); // 필터 드롭다운 옵션 생성
      this._bindGlobalHandlers(); // 전역 이벤트(외부 클릭 등) 바인딩
      
      // 셀 내용 장식 (텍스트 -> 태그/칩 변환)
      this._decorateCategoryCells();
      this._decoratePositionCells();
      this._decorateDepartmentCells();
      
      this._initNotes(); // 비고 팝오버 초기화
      this._bindSortHandlers(); // 정렬 핸들러 설정
      
      // 저장된 정렬 상태 복원 (로컬 스토리지)
      // [수정] 자동 정렬 기능 비활성화: 데이터가 원본(CSV) 순서대로 표시되도록 변경
      // this._restoreSortState();
    }

    /**
     * 로컬 스토리지에서 정렬 상태를 복원하는 메서드
     * 사용자가 마지막으로 보던 정렬 상태를 유지합니다.
     */
    _restoreSortState() {
        const saved = localStorage.getItem('career_table_sort');
        if (saved) {
            try {
                const { index, dir, type } = JSON.parse(saved);
                if (index !== -1 && dir !== 'none') {
                    // DOM 렌더링 후 적용을 위해 requestAnimationFrame 사용
                    requestAnimationFrame(() => {
                         this.sortState = { index, dir };
                         this._sortByColumn(index, type, dir);
                         const allHeaders = Array.from(this.table.querySelectorAll('thead th'));
                         this._updateSortIcons(allHeaders, allHeaders[index], dir);
                    });
                } else {
                    this._applyDefaultSort();
                }
            } catch (e) {
                console.error('정렬 상태 복원 실패:', e);
                this._applyDefaultSort();
            }
        } else {
             this._applyDefaultSort();
        }
    }

    /**
     * 기본 정렬 적용 (No 컬럼 오름차순)
     * 캐시가 없거나 오류 발생 시 호출됩니다.
     */
    _applyDefaultSort() {
        // requestAnimationFrame을 사용하여 DOM이 완전히 준비된 후 실행 보장
        requestAnimationFrame(() => {
            // 기본 정렬: No 컬럼 오름차순 (1, 2, 3...)
            if (this.noColIndex > -1) {
                this.sortState = { index: this.noColIndex, dir: 'asc' };
                this._sortByColumn(this.noColIndex, 'number', 'asc');
                
                const allHeaders = Array.from(this.table.querySelectorAll('thead th'));
                this._updateSortIcons(allHeaders, allHeaders[this.noColIndex], 'asc');
            } else if (this.termColIndex > -1) {
                // Fallback: 임기순
                this.sortState = { index: this.termColIndex, dir: 'asc' }; 
                this._sortByColumn(this.termColIndex, 'term', 'asc');
            }
        });
    }

    /**
     * 필터 타입(category 등)을 실제 테이블 컬럼 인덱스로 매핑
     * @returns {Object} { 'category': 2, ... } 형태의 맵
     */
    _mapFilterTypeToColumnIndex(){
      const map={};
      const ths = Array.from(this.table.querySelectorAll('thead th'));
      this.filterHeaders.forEach(h=>{ map[h.dataset.filterType]=ths.indexOf(h); });
      return map;
    }

    /**
     * 특정 컬럼의 고유 값 목록 추출 (필터 옵션 생성용)
     * @param {number} colIdx - 컬럼 인덱스
     * @returns {Array<string>} 정렬된 고유 값 배열
     */
    _uniqueValues(colIdx){
      const s=new Set();
      const ignore = new Set(['-', '—', '–']);
      Array.from(this.tbody.rows).forEach(tr=>{
        const cell = tr.cells[colIdx];
        const v = cell?.dataset.filterRaw || cell?.textContent.trim();
        if(v && !ignore.has(v)) s.add(v);
      });
      return Array.from(s).sort((a,b)=>a.localeCompare(b,'ko'));
    }

    /**
     * 모든 필터 헤더에 대한 드롭다운 옵션 UI 생성
     */
    _buildAllOptions(){
      this.filterHeaders.forEach(header=>{
        const type = header.dataset.filterType;
        const col = this.typeToIndex[type];
        const container = header.querySelector('.filter-options');
        if(!container) return;
        const values = this._uniqueValues(col);
        
        // 컨테이너 초기화 및 접근성 속성 설정
        container.innerHTML = '';
        container.setAttribute('role','dialog');
        container.setAttribute('aria-label', `${type} 필터 옵션`);
        container.dataset.filterType = type;
        container.__headerRef = header; // 포털 이동 시 참조 유지

        // '모두 보기' (초기화) 버튼 생성
        const ctrl = document.createElement('div');
        ctrl.className='filter-controls';
        const resetBtn=document.createElement('button');
        resetBtn.type='button';
        resetBtn.className='btn-reset';
        resetBtn.textContent='모두 보기';
        
        resetBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            // 1. 상태 초기화
            this.state[type].clear();
            // 2. 체크박스 UI 해제
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
            // 3. 필터 적용
            this._applyFilters();
            // 4. 헤더 활성 상태 업데이트
            this._updateHeaderActive(header);
        });
        ctrl.appendChild(resetBtn);
        container.appendChild(ctrl);

        // 옵션 목록 생성
        const list=document.createElement('div');
        list.className='filter-list';
        values.forEach(v=>{
          const id = `filter-${type}-${v}`.replace(/\s+/g,'-');
          const label=document.createElement('label');
          label.className='filter-option';
          
          const cb=document.createElement('input');
          cb.type='checkbox'; cb.value=v; cb.id=id; cb.setAttribute('aria-label',`${v} 필터`);
          
          cb.addEventListener('change',()=>{
            if(cb.checked) this.state[type].add(v); else this.state[type].delete(v);
            this._applyFilters();
            this._updateHeaderActive(header);
          });
          
          const text=document.createElement('span'); text.textContent=v;
          label.appendChild(cb); label.appendChild(text);
          list.appendChild(label);
        });
        container.appendChild(list);

        // 헤더 클릭 시 드롭다운 토글
        header.addEventListener('click',(e)=>{
          e.stopPropagation();
          // 포털(Portal) 처리: z-index 이슈 해결을 위해 body로 이동
          if(container.parentElement !== document.body){
            document.body.appendChild(container);
          }
          this._toggleDropdown(header, container);
        });
      });
    }

    /**
     * 전역 이벤트 리스너 바인딩
     * 외부 클릭 시 드롭다운 닫기, 스크롤/리사이즈 시 위치 재조정 등을 처리합니다.
     */
    _bindGlobalHandlers(){
      document.addEventListener('click',(e)=>{
        // 드롭다운 외부 클릭 시 닫기
        if(!e.target.closest('.filter-th') && !e.target.closest('.filter-options')){
          this._closeAll();
        }
      });
      // 위치 재계산 (스크롤/리사이즈)
      const reposition=()=>this._repositionActive();
      window.addEventListener('resize', reposition);
      window.addEventListener('scroll', reposition, true); // 캡처링 단계 사용
    }

    /**
     * 드롭다운 토글 메서드
     * @param {HTMLElement} header - 클릭된 헤더 요소
     * @param {HTMLElement} container - 드롭다운 컨테이너
     */
    _toggleDropdown(header, container){
      const alreadyActive = container.classList.contains('active');
      this._closeAll(); // 다른 열린 드롭다운 닫기
      if(!alreadyActive){
        container.classList.add('active');
        header.classList.add('is-open');
        this._positionDropdown(header, container);
      }
    }

    /**
     * 모든 활성화된 드롭다운 닫기
     */
    _closeAll(){
      document.querySelectorAll('.filter-options.active').forEach(el=>el.classList.remove('active'));
      document.querySelectorAll('.filter-th.is-open').forEach(el=>el.classList.remove('is-open'));
    }

    /**
     * 활성화된 드롭다운의 위치 재조정
     * 스크롤이나 창 크기 변경 시 호출됩니다.
     */
    _repositionActive(){
      document.querySelectorAll('.filter-options.active').forEach(el=>{
        const header = el.__headerRef || document.querySelector(`th.filter-th[data-filter-type="${el.dataset.filterType||''}"]`);
        if(header) this._positionDropdown(header, el);
      });
    }

    /**
     * 드롭다운 위치 계산 및 적용 (Popper와 유사한 로직)
     * 화면 경계를 벗어나지 않도록 위치를 조정합니다.
     */
    _positionDropdown(header, panel){
      panel.style.position='fixed';
      const rect = header.getBoundingClientRect();
      
      const panelW = Math.max(220, Math.round(rect.width));
      panel.style.width = panelW + 'px';

      const margin = 12;
      const offsetY = 8;
      const viewportH = window.innerHeight;

      const availBelow = viewportH - rect.bottom - margin - offsetY;
      const availAbove = rect.top - margin - offsetY;
      const minBelowThreshold = 100;

      // 아래 공간이 충분하면 아래, 아니면 위로 배치
      let placeBelow;
      if (availBelow >= minBelowThreshold) {
        placeBelow = true;
      } else if (availAbove >= minBelowThreshold) {
        placeBelow = false;
      } else {
        placeBelow = availBelow >= availAbove;
      }

      const maxH = 400; 
      const availableH = placeBelow ? availBelow : availAbove;
      const actualMaxH = Math.min(maxH, availableH);
      
      panel.style.maxHeight = `${actualMaxH}px`;
      
      const panelHeight = Math.min(panel.offsetHeight, actualMaxH);

      let top = placeBelow
        ? rect.bottom + offsetY
        : rect.top - panelHeight - offsetY;

      // 좌우 위치 조정 (화면 밖으로 나가지 않게)
      let left = Math.min(window.innerWidth - panelW - margin, Math.max(margin, rect.left));
      left = Math.max(margin, Math.min(left, window.innerWidth - margin - panelW));

      panel.style.top = `${top}px`;
      panel.style.left = `${left}px`;
      panel.setAttribute('aria-modal','true');
    }

    /**
     * 현직자 여부 판단 헬퍼 함수
     * 임기 텍스트(예: "23.01 ~")를 분석하여 현재 재직 중인지 확인합니다.
     * @param {string} term - 임기 텍스트
     * @returns {boolean} 현직 여부
     */
    _isIncumbent(term) {
      if (!term) return false;
      const trimmed = term.trim();
      // "현직" 기준: 임기 시작일은 있지만 종료일이 없는 경우 ('~'로 끝남)
      if (!trimmed.endsWith('~')) return false; 
      
      // 시작일 파싱 및 미래 날짜 체크 (미래 시작 예정은 현직 아님)
      const startStr = trimmed.replace('~', '').trim();
      if (!startStr) return false;
      
      const parts = startStr.split('.');
      if (parts.length !== 2) return false;
      
      const year = 2000 + parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      if (year > currentYear) return false;
      if (year === currentYear && month > currentMonth) return false;
      
      return true;
    }

    /**
     * 필터 적용 메인 로직
     * 선택된 필터 조건에 따라 행을 숨기거나 표시하고, FLIP 애니메이션을 실행합니다.
     */
    _applyFilters(){
      // 셀 값 추출 헬퍼
      const getVals=(tr, type)=>{
        const idx=this.typeToIndex[type];
        const cell = tr.cells[idx];
        if(!cell) return [];
        const raw = (cell.dataset.filterRaw) || (cell.textContent.trim()) || '';
        if(!raw) return [];
        
        const ignore = new Set(['-', '—', '–']);
        
        // 파이프(|)나 콤마 등으로 구분된 다중 값 처리
        const tokens = (cell.dataset.filterTokens ? cell.dataset.filterTokens.split('|') : raw.split(/[,，、\/|]/))
          .map(s=>s.trim())
          .filter(s => s && !ignore.has(s));
          
        return Array.from(new Set(tokens));
      };

      // 필터 조건 매칭 확인 헬퍼
      const active = (type,vals)=>{
        const set=this.state[type];
        if(set.size===0) return true; // 선택된 필터가 없으면 통과
        return vals.some(v=>set.has(v)); // 하나라도 매칭되면 통과
      };

      const showCurrentOnly = this.currentTermCheckbox ? this.currentTermCheckbox.checked : false;

      // 애니메이션: 현재 위치 캡처 (First)
      this._captureVisiblePositions();

      let anyHide = false;
      Array.from(this.tbody.rows).forEach(tr=>{
        let ok = active('category', getVals(tr,'category')) &&
                   active('department', getVals(tr,'department')) &&
                   active('position', getVals(tr,'position'));
        
        // 현직자 필터 적용
        if (ok && showCurrentOnly) {
            const termCell = tr.cells[this.termColIndex];
            const termText = termCell ? termCell.textContent.trim() : '';
            if (!this._isIncumbent(termText)) {
                ok = false;
            }
        }

        if (ok) {
          this._showRowAnimated(tr);
        } else {
          anyHide = true;
          this._hideRowAnimated(tr);
        }
      });

      // 애니메이션: 변경된 위치로 이동 (Last & Invert & Play)
      if(!anyHide){
        this._animateFromCapturedPositions();
      }
    }

    // ===== FLIP 애니메이션 관련 메서드 =====
    
    /**
     * 현재 보이는 행들의 화면상 위치(Y좌표)를 캡처
     */
    _captureVisiblePositions(){
      if(!this.tbody) return;
      const base = this.tbody.getBoundingClientRect();
      this._lastPositions = new Map();
      Array.from(this.tbody.rows).forEach(tr=>{
        if(tr.hidden) return;
        const r = tr.getBoundingClientRect();
        this._lastPositions.set(tr, r.top - base.top);
      });
    }

    /**
     * 캡처된 위치에서 현재 위치로 부드럽게 이동하는 애니메이션 실행
     */
    _animateFromCapturedPositions(){
      if(!this.tbody || !this._lastPositions) return;
      const base = this.tbody.getBoundingClientRect();
      const nextPositions = new Map();
      
      // 현재 보이는 행들의 새로운 위치 파악
      Array.from(this.tbody.rows).forEach(tr=>{
        if(tr.hidden || tr.classList.contains('is-hiding')) return;
        const r = tr.getBoundingClientRect();
        nextPositions.set(tr, r.top - base.top);
      });

      // 위치 차이(Delta)만큼 transform 적용 후 해제하여 애니메이션
      nextPositions.forEach((lastTop, tr)=>{
        const firstTop = this._lastPositions.get(tr);
        if(firstTop == null) return;
        const dy = firstTop - lastTop;
        if(Math.abs(dy) < 0.5) return;
        
        // Invert
        tr.style.transform = `translateY(${dy}px)`;
        tr.style.willChange = 'transform';
        
        // Force Reflow
        void tr.getBoundingClientRect();
        
        // Play
        tr.style.transform = '';
        const onEnd = (e)=>{
          if(e.propertyName !== 'transform') return;
          tr.style.willChange = '';
          tr.removeEventListener('transitionend', onEnd);
        };
        tr.addEventListener('transitionend', onEnd);
      });
      this._lastPositions = nextPositions;
    }

    /**
     * 행 숨김 애니메이션
     * @param {HTMLTableRowElement} tr 
     */
    _hideRowAnimated(tr){
      if (!tr || tr.hidden || tr.classList.contains('is-hiding')) return;
      let done = false;
      const finish = () => {
        tr.hidden = true;
        tr.classList.remove('is-hiding');
        tr.removeEventListener('transitionend', onEnd);
        // 숨겨진 후 나머지 행들 재정렬 애니메이션
        this._animateFromCapturedPositions();
      };
      const onEnd = (e) => {
        if (e.target !== tr) return;
        if (done) return;
        done = true;
        finish();
      };
      tr.addEventListener('transitionend', onEnd);
      requestAnimationFrame(() => {
        tr.classList.add('is-hiding'); // CSS에서 투명도/높이 조절
      });
      // 안전장치: 이벤트 미발생 시 강제 완료
      setTimeout(() => {
        if (done) return;
        done = true;
        finish();
      }, 220);
    }

    /**
     * 행 표시 애니메이션
     * @param {HTMLTableRowElement} tr 
     */
    _showRowAnimated(tr){
      if (!tr) return;
      if (!tr.hidden && !tr.classList.contains('is-hiding')) return;
      
      tr.classList.add('is-hiding'); // 일단 숨김 상태 스타일 적용
      tr.hidden = false;
      
      void tr.offsetWidth; // Reflow
      
      requestAnimationFrame(() => {
        tr.classList.remove('is-hiding'); // 스타일 제거하여 페이드인
      });
    }

    /**
     * 헤더의 필터 활성화 상태 아이콘 업데이트
     */
    _updateHeaderActive(header){
      const type=header.dataset.filterType;
      const has = this.state[type].size>0;
      header.classList.toggle('has-active-filter', has);
      const icon=header.querySelector('.filter-toggle-icon');
      if(icon) icon.classList.toggle('active', has);
    }

    // ===== 정렬 기능 =====
    
    /**
     * 정렬 핸들러 바인딩
     * 컬럼 헤더 클릭 시 정렬 수행
     */
    _bindSortHandlers(){
      const allHeaders = Array.from(this.table.querySelectorAll('thead th'));
      this.sortState = { index: -1, dir: 'none' };
  
      allHeaders.forEach((th, colIdx)=>{
        const sortType = th.dataset.sortType;
        const isFilter = th.classList.contains('filter-th');
        if(!sortType || isFilter) return; // 필터 헤더는 정렬 제외
  
        th.style.cursor = 'pointer';
        th.addEventListener('click', (e)=>{
          // 필터용 체크박스 클릭 시 정렬 방지
          if (e.target.closest('.term-filter') || e.target.dataset.role === 'toggle-checkbox') {
              return;
          }

          const sameCol = this.sortState.index === colIdx;
          let nextDir;
          
          if (sortType === 'term') {
              // 임기: 2단계 토글 (오름차순 <-> 내림차순)
              if (sameCol) {
                  nextDir = (this.sortState.dir === 'asc') ? 'desc' : 'asc';
              } else {
                  nextDir = 'asc';
              }
          } else {
              // 기타: 3단계 토글 (오름 -> 내림 -> 초기화)
              if(sameCol){
                if(this.sortState.dir === 'asc') nextDir = 'desc';
                else if(this.sortState.dir === 'desc') nextDir = 'none';
                else nextDir = 'asc';
              } else {
                nextDir = 'asc';
              }
          }
  
          if(nextDir === 'none'){
            this.sortState = { index: -1, dir: 'none' };
            this._resetSort(allHeaders);
            return;
          }
  
          this.sortState = { index: colIdx, dir: nextDir };
          this._sortByColumn(colIdx, sortType, nextDir);
          this._updateSortIcons(allHeaders, th, nextDir);
        });
      });
    }
  
    /**
     * 정렬 초기화 (원본 순서 복원)
     */
    _resetSort(headers){
      if(!this.tbody || !this.originalRows) return;
      this._animateReorder(()=>{
        const frag = document.createDocumentFragment();
        this.originalRows.forEach(tr => frag.appendChild(tr));
        this.tbody.appendChild(frag);
      });
      this._updateSortIcons(headers, null, 'none');
    }
  
    /**
     * 정렬 아이콘(화살표) 업데이트
     */
    _updateSortIcons(headers, activeTh, dir){
      headers.forEach(th=>{
        const icon = th.querySelector('i.fas.fa-sort, i.fas.fa-sort-up, i.fas.fa-sort-down');
        if(!icon) return;
        
        if(!activeTh || dir === 'none'){
          icon.classList.remove('fa-sort-up','fa-sort-down');
          icon.classList.add('fa-sort');
          return;
        }
        
        if(th === activeTh){
          const type = th.dataset.sortType;
          icon.classList.remove('fa-sort');
          
          if (type === 'term') {
              // 임기: Asc=과거순(Down), Desc=최신순(Up)
              icon.classList.toggle('fa-sort-down', dir === 'asc');
              icon.classList.toggle('fa-sort-up', dir === 'desc');
              if (dir === 'asc') icon.classList.remove('fa-sort-up');
              if (dir === 'desc') icon.classList.remove('fa-sort-down');
          } else {
              // 일반: Asc=오름차순(Up), Desc=내림차순(Down)
              icon.classList.toggle('fa-sort-up', dir==='asc');
              icon.classList.toggle('fa-sort-down', dir==='desc');
              if(dir==='asc') icon.classList.remove('fa-sort-down');
              if(dir==='desc') icon.classList.remove('fa-sort-up');
          }
        } else {
          icon.classList.remove('fa-sort-up','fa-sort-down');
          icon.classList.add('fa-sort');
        }
      });
    }

    /**
     * 행 재정렬 시 FLIP 애니메이션 적용
     * @param {Function} mutFn - DOM 조작 함수
     */
    _animateReorder(mutFn){
      if(!this.tbody) { mutFn(); return; }
      const visible = Array.from(this.tbody.rows).filter(r=>!r.hidden);
      const firstPos = new Map();
      const firstTBodyRect = this.tbody.getBoundingClientRect();
      visible.forEach(r=>{
        const rect = r.getBoundingClientRect();
        firstPos.set(r, rect.top - firstTBodyRect.top);
      });

      // 실제 DOM 변경
      mutFn();

      const lastTBodyRect = this.tbody.getBoundingClientRect();
      visible.forEach(r=>{
        if(!r.isConnected || r.hidden) return;
        const rect = r.getBoundingClientRect();
        const lastTop = rect.top - lastTBodyRect.top;
        const firstTop = firstPos.get(r);
        if(firstTop == null) return;
        const dy = firstTop - lastTop;
        if(Math.abs(dy) < 0.5) return;
        
        r.style.transform = `translateY(${dy}px)`;
        r.style.willChange = 'transform';
        void r.getBoundingClientRect();
        r.style.transform = '';
        
        const onEnd = (e)=>{
          if(e.propertyName !== 'transform') return;
          r.style.willChange = '';
          r.removeEventListener('transitionend', onEnd);
        };
        r.addEventListener('transitionend', onEnd);
      });
    }
  
    /**
     * 특정 컬럼 기준으로 행 정렬
     */
    _sortByColumn(colIdx, sortType, dir){
      try {
          const rows = Array.from(this.tbody.rows);
          if (rows.length === 0) return;

          // 안정 정렬(Stable Sort)을 위해 원래 인덱스 유지
          const withIndex = rows.map((tr, i)=>({ tr, i }));
      
          // 숫자 파싱 로직 개선 (음수, 소수점 지원, # 제거)
          const parseNumber = (text)=>{
            if(!text) return -Infinity; // 빈 값은 맨 뒤/앞으로 (정렬 방향에 따라 다름, 여기선 최소값 취급)
            // 텍스트에서 숫자만 추출 (예: "#1" -> 1, "No. 10" -> 10)
            const cleanText = text.replace(/[^\d.\-]/g, '');
            const num = parseFloat(cleanText);
            return isNaN(num) ? -Infinity : num;
          };

          const parseTermDate = (text) => {
               if (!text) return -Infinity; 
               const parts = text.split('~');
               const startStr = parts[0].trim(); 
               if(!startStr) return -Infinity;
               const yymm = startStr.split('.');
               if(yymm.length < 2) return -Infinity;
               
               let year = parseInt(yymm[0], 10);
               let month = parseInt(yymm[1], 10);
               
               if (isNaN(year) || isNaN(month)) return -Infinity;
               if (year < 100) year += 2000;
               
               return year * 100 + month; 
           };
      
          const cmp = (a, b)=>{
            const ta = a.tr.cells[colIdx]?.textContent.trim() ?? '';
            const tb = b.tr.cells[colIdx]?.textContent.trim() ?? '';
      
            if(sortType === 'number'){
              const na = parseNumber(ta);
              const nb = parseNumber(tb);
              
              // 둘 다 유효한 숫자인 경우
              if(na !== -Infinity && nb !== -Infinity){
                return na - nb;
              }
              // 둘 다 숫자가 아닌 경우 원래 순서 유지
              if(na === -Infinity && nb === -Infinity){
                return a.i - b.i;
              }
              // 하나만 숫자인 경우 (숫자가 우선)
              return na === -Infinity ? 1 : -1;
            } else if (sortType === 'term') {
               const dateA = parseTermDate(ta);
               const dateB = parseTermDate(tb);
               if (dateA !== dateB) return dateA - dateB;
               return a.i - b.i;
            } else {
              // 문자열 정렬 (필요시 localeCompare 사용 가능)
              // 현재는 기본 정렬 로직이 없으므로 원래 순서 유지
              return a.i - b.i;
            }
          };
      
          withIndex.sort((x,y)=> dir==='asc' ? cmp(x,y) : cmp(y,x));
      
          this._animateReorder(()=>{
            const frag = document.createDocumentFragment();
            withIndex.forEach(({tr})=> frag.appendChild(tr));
            this.tbody.appendChild(frag);
          });
          
          localStorage.setItem('career_table_sort', JSON.stringify({ index: colIdx, dir: dir, type: sortType }));
      } catch (err) {
          console.error('정렬 중 오류 발생:', err);
      }
    }

    // ===== UI 장식 (Decoration) 기능 =====

    /**
     * 카테고리 셀을 태그/칩 형태로 장식
     */
    _decorateCategoryCells(){
      const idx = this.typeToIndex['category'];
      if(idx == null || idx < 0) return;

      const classMap = (TagConfig && TagConfig.category) || {};
      const defaultClass = classMap._default || 'tag-slate';
      const emojiMap = {
        '친목': '👥', '홍보': '📣', '커뮤니티': '👥', '이모지': '😀',
        '개발': '💻', '정보': '📚', '연애': '💖', '상담': '💬',
        '스트리머': '🎥', '태그': '🏷️'
      };

      Array.from(this.tbody.rows).forEach(tr=>{
        const cell = tr.cells[idx];
        if(!cell) return;
        const raw = (cell.dataset.filterRaw || cell.textContent.trim());
        if(!raw) return;
        cell.dataset.filterRaw = raw; // 필터용 원본 보존

        if (raw === '-' || raw === '—' || raw === '–') return;
        if(cell.querySelector('.tag')) return;

        let emojiChar = '';
        let textContent = raw;

        // 이모지 매핑 확인
        for (const key in emojiMap) {
            if (raw.includes(key)) {
                emojiChar = emojiMap[key];
                textContent = raw.replace(emojiChar, '').trim(); 
                textContent = textContent.replace(/[\u{1F300}-\u{1F9FF}\u2600-\u26FF\u2700-\u27BF]/gu, '').trim();
                break;
            }
        }

        // 매핑 없으면 텍스트 내 이모지 추출 시도
        if (!emojiChar) {
            const match = raw.match(/^([\u{1F300}-\u{1F9FF}\u2600-\u26FF\u2700-\u27BF])\s*(.*)$/u);
            if (match) {
                emojiChar = match[1];
                textContent = match[2];
            } else {
                emojiChar = '🏷️';
            }
        }
        
        const colorKey = textContent.trim();
        const tagClass = classMap[colorKey] || defaultClass;

        const chip = document.createElement('span');
        chip.className = `tag ${tagClass}`;
        
        const emoji = document.createElement('span');
        emoji.className = 'tag-emoji';
        emoji.textContent = emojiChar;
        chip.appendChild(emoji);
        chip.appendChild(document.createTextNode(textContent));

        cell.textContent = '';
        cell.appendChild(chip);
      });
    }

    /**
     * 직급 셀 장식
     */
    _decoratePositionCells(){
      const idx = this.typeToIndex['position'];
      if(idx == null || idx < 0) return;

      const emojiMap = {
        '소유자': '👑', '공동 소유자': '🤝', '총 관리자': '🛡️',
        '부 관리자': '🛠️', '관리자': '🛠️', '매니저': '🧑\u200d💼',
        '팀장': '🧭', '팀원': '👤'
      };
    
      Array.from(this.tbody.rows).forEach(tr=>{
        const cell = tr.cells[idx];
        if(!cell) return;
        const raw = (cell.dataset.filterRaw || cell.textContent.trim());
        if(!raw) return;
        cell.dataset.filterRaw = raw;

        if (raw === '-' || raw === '—' || raw === '–') return;
        if(cell.querySelector('.tag')) return;

        let emojiChar = '';
        let textContent = raw;
        
        for (const key in emojiMap) {
            if (raw.includes(key)) {
                emojiChar = emojiMap[key];
                textContent = raw.replace(emojiChar, '').trim();
                textContent = textContent.replace(/[\u{1F300}-\u{1F9FF}\u2600-\u26FF\u2700-\u27BF]/gu, '').trim();
                break;
            }
        }

        if (!emojiChar) {
            const match = raw.match(/^([\u{1F300}-\u{1F9FF}\u2600-\u26FF\u2700-\u27BF])\s*(.*)$/u);
            if (match) {
                emojiChar = match[1];
                textContent = match[2];
            } else {
                emojiChar = '🎖️';
            }
        }
        
        const colorKey = textContent.trim();
        const posClasses = (TagConfig.position) || {};
        const catClasses = (TagConfig.category) || {};
        const defaultClass = posClasses._default || catClasses._default || 'tag-slate';
        const tagClass = posClasses[colorKey] || defaultClass;

        const chip = document.createElement('span');
        chip.className = `tag ${tagClass}`;
        
        const emoji = document.createElement('span');
        emoji.className = 'tag-emoji';
        emoji.textContent = emojiChar;
        chip.appendChild(emoji);
        chip.appendChild(document.createTextNode(textContent));
    
        cell.textContent = '';
        cell.appendChild(chip);
      });
    }

    /**
     * 부서 셀 장식 (다중 부서 지원)
     */
    _decorateDepartmentCells(){
      const idx = this.typeToIndex['department'];
      if(idx == null || idx < 0) return;

      const emojiMap = {
        '연합팀': '🤝', '홍보팀': '📣', '안내팀': '👋',
        '봇 관리자': '🤖', '운영팀': '🛠️', '보안팀': '🔒'
      };

      Array.from(this.tbody.rows).forEach(tr => {
        const cell = tr.cells[idx];
        if(!cell) return;
        const raw = (cell.dataset.filterRaw || cell.textContent.trim());
        if(!raw) return;
        cell.dataset.filterRaw = raw;

        if (raw === '-' || raw === '—' || raw === '–') return;
        if(cell.querySelector('.tag')) return;

        // 쉼표 등으로 구분된 다중 부서 파싱
        let parts = [];
        const emojiRegex = /([\u{1F300}-\u{1F9FF}\u2600-\u26FF\u2700-\u27BF])\s*([^,，、\/|\u{1F300}-\u{1F9FF}\u2600-\u26FF\u2700-\u27BF]*)/gu;
        
        let match;
        let hasEmoji = false;
        while ((match = emojiRegex.exec(raw)) !== null) {
            hasEmoji = true;
            parts.push({ emoji: match[1], text: match[2].trim() });
        }

        if (!hasEmoji) {
             const textParts = raw.split(/[,，、\/|]/).map(s=>s.trim()).filter(Boolean);
             textParts.forEach(t => {
                 let emoji = '🏷️';
                 for (const key in emojiMap) {
                     if (t.includes(key)) {
                         emoji = emojiMap[key];
                         break;
                     }
                 }
                 parts.push({ emoji: emoji, text: t });
             });
        }
        
        if(parts.length === 0) return; 

        cell.dataset.filterTokens = parts.map(p => p.text).join('|');

        const deptClasses = (TagConfig.department) || {};
        const catClasses = (TagConfig.category) || {};
        const defaultClass = deptClasses._default || catClasses._default || 'tag-slate';

        cell.textContent = '';
        parts.forEach(part => {
          const tagClass = deptClasses[part.text] || defaultClass;
          
          const chip = document.createElement('span');
          chip.className = `tag ${tagClass}`;
          
          const emojiSpan = document.createElement('span');
          emojiSpan.className = 'tag-emoji';
          emojiSpan.textContent = part.emoji;
          chip.appendChild(emojiSpan);
          chip.appendChild(document.createTextNode(part.text));
          
          cell.appendChild(chip);
        });
      });
    }

    /**
     * 비고(Note) 팝오버 초기화
     * 마우스 오버 시 상세 내용을 보여주는 툴팁 기능
     */
    _initNotes() {
      const triggers = Array.from(document.querySelectorAll('sup[data-note]'));
      if (triggers.length === 0) return;

      // 단일 팝오버 요소 생성 및 재사용
      let popover = document.getElementById('shared-note-popover');
      if (!popover) {
        popover = document.createElement('div');
        popover.id = 'shared-note-popover';
        popover.className = 'note-popover';
        popover.setAttribute('role', 'tooltip');
        document.body.appendChild(popover);
      }

      let activeTrigger = null;
      let hideTimeout = null;

      const showPopover = (trigger) => {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
        
        // \n 문자열을 실제 줄바꿈으로 변환
        popover.textContent = trigger.dataset.note.replace(/\\n/g, '\n');
        
        const rect = trigger.getBoundingClientRect();
        const pWidth = popover.offsetWidth;
        const pHeight = popover.offsetHeight;
        
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const margin = 10;

        let top = rect.bottom + 8;
        let left = rect.left + (rect.width / 2) - (pWidth / 2);

        if (left + pWidth + margin > viewportW) left = viewportW - pWidth - margin;
        if (left < margin) left = margin;
        if (top + pHeight + margin > viewportH) top = rect.top - pHeight - 8;

        popover.style.top = `${top}px`;
        popover.style.left = `${left}px`;
        
        popover.classList.add('visible');
        activeTrigger = trigger;
      };

      const hidePopover = () => {
        popover.classList.remove('visible');
        activeTrigger = null;
        if (hideTimeout) {
             clearTimeout(hideTimeout);
             hideTimeout = null;
        }
      };

      triggers.forEach(trigger => {
        trigger.classList.add('note-trigger');
        trigger.setAttribute('tabindex', '0');
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('aria-label', '비고 보기');

        trigger.addEventListener('mouseenter', () => showPopover(trigger));
        trigger.addEventListener('mouseleave', () => hidePopover());

        trigger.addEventListener('focus', () => showPopover(trigger));
        trigger.addEventListener('blur', () => hidePopover());

        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (activeTrigger === trigger && popover.classList.contains('visible')) {
            hidePopover();
          } else {
            showPopover(trigger);
          }
        });
      });

      // 외부 클릭 시 닫기
      document.addEventListener('click', (e) => {
        if (activeTrigger && !e.target.closest('.note-trigger') && !e.target.closest('.note-popover')) {
          hidePopover();
        }
      });
      
      // 마우스 이탈 안전장치
      document.addEventListener('mousemove', (e) => {
        if (!activeTrigger) return;
        const triggerRect = activeTrigger.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        const buffer = 10;

        const inTrigger = x >= triggerRect.left - buffer && x <= triggerRect.right + buffer &&
                          y >= triggerRect.top - buffer && y <= triggerRect.bottom + buffer;
        const inPopover = popover.classList.contains('visible') && 
                          x >= popoverRect.left - buffer && x <= popoverRect.right + buffer &&
                          y >= popoverRect.top - buffer && y <= popoverRect.bottom + buffer;

        if (!inTrigger && !inPopover) {
            hidePopover();
        }
      });
      
      window.addEventListener('scroll', () => {
        if (activeTrigger) hidePopover();
      }, { passive: true });
    }
  }

  // 앱 실행 진입점
  ready(() => {
    loadCareerData(() => {
        new PortfolioManager();
    });
  });
})();
