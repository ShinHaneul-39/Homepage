// Portfolio filters and safe dropdown positioning
(function(){
  'use strict';

  // 태그 색상 설정 (HTML 인라인 스크립트에서 이동)
  const TagConfig = {
    category: {
      '친목': { bg: '#FFF69C', fg: '#1f2937' },
      '홍보': { bg: '#FFB3A7', fg: '#1f2937' },
      '이모지': { bg: '#fdba74', fg: '#1f2937' },
      '커뮤니티': { bg: '#BFD3FF', fg: '#1f2937' },
      '개발': { bg: '#C7D2FE', fg: '#1f2937' },
      '_default': { bg: '#e2e8f0', fg: '#1f2937' }
    },
    department: {
      '연합팀': { bg: '#FEF3C7', fg: '#1f2937' },
      '홍보팀': { bg: '#FFB3A7', fg: '#1f2937' },
      '안내팀': { bg: '#bae6fd', fg: '#1f2937' },
      '봇 관리자': { bg: '#AFC6FF', fg: '#1f2937' },
      '_default': { bg: '#e2e8f0', fg: '#1f2937' }
    },
    position: {
      '팀원': { bg: '#9EFFCF', fg: '#1f2937' },
      '팀장': { bg: '#E9D5FF', fg: '#1f2937' },
      '소유자': { bg: '#87CEEB', fg: '#1f2937' },
      '_default': { bg: '#e2e8f0', fg: '#1f2937' }
    }
  };

  function ready(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn();
  }

  // ===== CSV Loading Logic =====
  function loadCareerData(callback) {
    if (typeof Papa === 'undefined') {
        console.error('PapaParse is not loaded.');
        return;
    }
    
    // Check if we are on the career page
    if (!document.querySelector('.discord-career-table')) return;

    fetch('assets/data/career_data.csv')
      .then(response => response.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            renderCareerTable(results.data);
            if (callback) callback();
          },
          error: (err) => console.error('CSV Parsing Error:', err)
        });
      })
      .catch(err => console.error('Failed to load career data:', err));
  }

  function renderCareerTable(data) {
    const tbody = document.querySelector('.discord-career-table tbody');
    if (!tbody) return;
    tbody.innerHTML = ''; // Clear existing

    // Helper to create tags is moved inside the class logic or kept here
    // But since the class handles decoration logic (decorateCategoryCells etc.),
    // we should render raw text and let the class decorate it, OR do it all here.
    // The existing class has robust decoration logic. Let's reuse it by rendering plain text/attributes first.
    
    data.forEach(row => {
      const tr = document.createElement('tr');
      
      // Server Name with Note
      let serverNameHtml = row.serverName;
      if (row.note) {
          // Parse note: "[Tag] Detail" -> Tag and Detail
          // Note format from extraction: "[Tag] Detail" or just "Detail"
          // We stored it as text.
          // Let's check for the square bracket pattern for the badge
          const match = row.note.match(/^(\[[^\]]+\])\s*(.*)$/);
          if (match) {
              serverNameHtml += `<sup data-note="${match[2]}">${match[1]}</sup>`;
          } else {
               serverNameHtml += `<sup data-note="${row.note}">[비고]</sup>`; // Default badge if none found
          }
      }
      
      // We render RAW values here, and the PortfolioManager will decorate them
      // OR we just assume the PortfolioManager will run AFTER this.
      
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

  class PortfolioManager{
    constructor(){
      this.table = document.querySelector('.discord-career-table');
      if(!this.table) return;
      this.tbody = this.table.querySelector('tbody');
      // 초기 원본 행 순서를 보존하여 정렬 초기화 시 복원
      this.originalRows = Array.from(this.tbody ? this.tbody.rows : []);
      this.originalRows.forEach((tr, idx)=>{ try { tr.dataset.originalIndex = idx; } catch(e){} });
      this.filterHeaders = Array.from(this.table.querySelectorAll('th.filter-th'));
      this.typeToIndex = this._mapFilterTypeToColumnIndex();
      this.state = { category:new Set(), department:new Set(), position:new Set() };
      
      this._buildAllOptions();
      this._bindGlobalHandlers();
      // 카테고리 텍스트를 칩(태그) 형태로 장식
      this._decorateCategoryCells();
      // 직급 텍스트도 칩(태그) 형태로 장식
      this._decoratePositionCells();
      // 부서 텍스트도 칩(태그) 형태로 장식
      this._decorateDepartmentCells();
      // 비고(sup)에 대한 팝오버 초기화
      this._initNotes();
      // 정렬 핸들러 바인딩
      this._bindSortHandlers();
    }
    // ... (rest of the class methods remain the same)


    _mapFilterTypeToColumnIndex(){
      const map={};
      const ths = Array.from(this.table.querySelectorAll('thead th'));
      this.filterHeaders.forEach(h=>{ map[h.dataset.filterType]=ths.indexOf(h); });
      return map;
    }

    _uniqueValues(colIdx){
      const s=new Set();
      Array.from(this.tbody.rows).forEach(tr=>{
        const cell = tr.cells[colIdx];
        const v = cell?.dataset.filterRaw || cell?.textContent.trim();
        if(v) s.add(v);
      });
      return Array.from(s).sort((a,b)=>a.localeCompare(b,'ko'));
    }

    _buildAllOptions(){
      this.filterHeaders.forEach(header=>{
        const type = header.dataset.filterType;
        const col = this.typeToIndex[type];
        const container = header.querySelector('.filter-options');
        if(!container) return;
        const values = this._uniqueValues(col);
        container.innerHTML = '';
        container.setAttribute('role','dialog');
        container.setAttribute('aria-label', `${type} 필터 옵션`);
        // 포털용 메타데이터 저장 (헤더 참조 및 타입)
        container.dataset.filterType = type;
        container.__headerRef = header;

        // 선택 해제/초기화 버튼
        const ctrl = document.createElement('div');
        ctrl.className='filter-controls';
        const resetBtn=document.createElement('button');
        resetBtn.type='button';
        resetBtn.className='btn-reset';
        resetBtn.textContent='모두 보기';
        resetBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 드롭다운 닫힘 방지 (선택 사항) 또는 닫힘 허용
            // 1. 상태 초기화
            this.state[type].clear();
            
            // 2. UI 체크박스 모두 해제
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
            
            // 3. 필터 적용 (모든 데이터 표시)
            this._applyFilters();
            
            // 4. 헤더 활성 상태 업데이트
            this._updateHeaderActive(header);
            
            // 5. 드롭다운 닫기 (사용자 경험상 닫는게 깔끔함)
            this._closeAll();
        });
        ctrl.appendChild(resetBtn);
        container.appendChild(ctrl);

        // 옵션 목록
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

        // 헤더 클릭 시 토글
        header.addEventListener('click',(e)=>{
          // 아이콘 클릭 포함 전체 헤더 클릭 허용, 단 정렬 아이콘은 제외
          e.stopPropagation();
          // 포털: body로 이동 (스타일/접근성 보존)
          if(container.parentElement !== document.body){
            document.body.appendChild(container);
          }
          this._toggleDropdown(header, container);
        });
      });
    }

    _bindGlobalHandlers(){
      document.addEventListener('click',(e)=>{
        // 드롭다운 외부 클릭 닫기
        if(!e.target.closest('.filter-th') && !e.target.closest('.filter-options')){
          this._closeAll();
        }
      });
      // 스크롤/리사이즈 시 위치 재계산 (캡처 단계 포함)
      const reposition=()=>this._repositionActive();
      window.addEventListener('resize', reposition);
      window.addEventListener('scroll', reposition, true);
    }

    _toggleDropdown(header, container){
      const alreadyActive = container.classList.contains('active');
      this._closeAll();
      if(!alreadyActive){
        container.classList.add('active');
        this._positionDropdown(header, container);
      }
    }

    _closeAll(){
      document.querySelectorAll('.filter-options.active').forEach(el=>el.classList.remove('active'));
    }

    _repositionActive(){
      document.querySelectorAll('.filter-options.active').forEach(el=>{
        // 포털 이동 후에도 헤더 참조를 통해 위치 결정
        const header = el.__headerRef || document.querySelector(`th.filter-th[data-filter-type="${el.dataset.filterType||''}"]`);
        if(header) this._positionDropdown(header, el);
      });
    }

    _positionDropdown(header, panel){
      panel.style.position='fixed';
      panel.style.overflow='auto';
      const rect = header.getBoundingClientRect();
      // 디자인 되돌림: 헤더 폭을 기본으로 사용하고 과도한 가로 확장을 제거
      const panelW = Math.max(180, Math.round(rect.width));
      panel.style.width = panelW + 'px';

      const margin = 12;
      const offsetY = 8;
      const viewportH = window.innerHeight;

      const availBelow = viewportH - rect.bottom - margin - offsetY;
      const availAbove = rect.top - margin - offsetY;
      const minBelowThreshold = 72; // 최소한의 공간 기준

      let placeBelow;
      if (availBelow >= minBelowThreshold) {
        placeBelow = true;
      } else if (availAbove >= minBelowThreshold) {
        placeBelow = false;
      } else {
        // 둘 다 충분치 않다면 더 넓은 쪽을 선택 (동률 시 아래 우선)
        placeBelow = availBelow >= availAbove;
      }

      // 디자인 되돌림: 높이는 CSS의 내부 스크롤 규칙(.filter-list max-height 등)에 맡김
      // 단, 화면을 벗어나지 않도록 top만 안전하게 클램프
      const panelHeight = Math.min(panel.offsetHeight || 0, viewportH - margin * 2);

      let top = placeBelow
        ? Math.min(rect.bottom + offsetY, viewportH - margin - panelHeight)
        : Math.max(margin, rect.top - (panelHeight || 0) - offsetY);

      let left = Math.min(window.innerWidth - panelW - margin, Math.max(margin, rect.left));

      // 안전 클램프
      left = Math.max(margin, Math.min(left, window.innerWidth - margin - panelW));

      panel.style.top = `${top}px`;
      panel.style.left = `${left}px`;
      panel.setAttribute('aria-modal','true');
    }

    _applyFilters(){
      const getVals=(tr, type)=>{
        const idx=this.typeToIndex[type];
        const cell = tr.cells[idx];
        if(!cell) return [];
        const raw = (cell.dataset.filterRaw) || (cell.textContent.trim()) || '';
        if(!raw) return [];
        const tokens = (cell.dataset.filterTokens ? cell.dataset.filterTokens.split('|') : raw.split(/[,，、\/|]/)).map(s=>s.trim()).filter(Boolean);
        return Array.from(new Set(tokens.length ? tokens : [raw]));
      };

      const active = (type,vals)=>{
        const set=this.state[type];
        if(set.size===0) return true;
        return vals.some(v=>set.has(v));
      };

      // 필터 적용 전, 현재 보이는 행들의 위치를 캡처 (FLIP-첫번째 단계)
      this._captureVisiblePositions();

      let anyHide = false;
      Array.from(this.tbody.rows).forEach(tr=>{
        const ok = active('category', getVals(tr,'category')) &&
                   active('department', getVals(tr,'department')) &&
                   active('position', getVals(tr,'position'));
        if (ok) {
          this._showRowAnimated(tr);
        } else {
          anyHide = true;
          this._hideRowAnimated(tr);
        }
      });

      // 숨김이 없는 경우(보여주기만 있을 때)는 즉시 위치 전환 애니메이션 수행
      if(!anyHide){
        this._animateFromCapturedPositions();
      }
    }

    // 현재 보이는 행들의 상대 위치를 캡처
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

    // 캡처된 위치에서 현재 레이아웃 위치로 자연스럽게 이동(FLIP-마지막 단계)
    _animateFromCapturedPositions(){
      if(!this.tbody || !this._lastPositions) return;
      const base = this.tbody.getBoundingClientRect();
      const nextPositions = new Map();
      Array.from(this.tbody.rows).forEach(tr=>{
        if(tr.hidden || tr.classList.contains('is-hiding')) return; // 사라지는 중/숨김 제외, 남는 행만 이동
        const r = tr.getBoundingClientRect();
        nextPositions.set(tr, r.top - base.top);
      });
      nextPositions.forEach((lastTop, tr)=>{
        const firstTop = this._lastPositions.get(tr);
        if(firstTop == null) return;
        const dy = firstTop - lastTop;
        if(Math.abs(dy) < 0.5) return;
        tr.style.transform = `translateY(${dy}px)`;
        tr.style.willChange = 'transform';
        // 리플로우로 시작점 고정 후 전환 시작
        void tr.getBoundingClientRect();
        tr.style.transform = '';
        const onEnd = (e)=>{
          if(e.propertyName !== 'transform') return;
          tr.style.willChange = '';
          tr.removeEventListener('transitionend', onEnd);
        };
        tr.addEventListener('transitionend', onEnd);
      });
      // 다음 변화에 대비해 최신 위치로 갱신
      this._lastPositions = nextPositions;
    }

    _hideRowAnimated(tr){
      if (!tr || tr.hidden || tr.classList.contains('is-hiding')) return;
      let done = false;
      const finish = () => {
        tr.hidden = true;
        tr.classList.remove('is-hiding');
        tr.removeEventListener('transitionend', onEnd);
        // 숨김 완료 후 남아있는 행들의 이동을 FLIP으로 수행
        this._animateFromCapturedPositions();
      };
      const onEnd = (e) => {
        if (e.target !== tr) return;
        if (done) return;
        done = true;
        finish();
      };
      tr.addEventListener('transitionend', onEnd);
      // Start transition on next frame to ensure styles are applied
      requestAnimationFrame(() => {
        tr.classList.add('is-hiding');
      });
      // Fallback in case transitionend doesn't fire (reduced-motion, old browsers)
      setTimeout(() => {
        if (done) return;
        done = true;
        finish();
      }, 220);
    }

    _showRowAnimated(tr){
      if (!tr) return;
      // If already visible and not animating, skip
      if (!tr.hidden && !tr.classList.contains('is-hiding')) return;
      // Ensure we start from hidden style then fade in
      tr.classList.add('is-hiding');
      tr.hidden = false;
      // Force reflow so removal of class will transition
      void tr.offsetWidth;
      requestAnimationFrame(() => {
        tr.classList.remove('is-hiding');
      });
    }

    _updateHeaderActive(header){
      const type=header.dataset.filterType;
      const has = this.state[type].size>0;
      header.classList.toggle('has-active-filter', has);
      const icon=header.querySelector('.filter-toggle-icon');
      if(icon) icon.classList.toggle('active', has);
    }

    // ===== 정렬 기능 시작 =====
    _bindSortHandlers(){
      const allHeaders = Array.from(this.table.querySelectorAll('thead th'));
      this.sortState = { index: -1, dir: 'none' };
  
      allHeaders.forEach((th, colIdx)=>{
        const sortType = th.dataset.sortType;
        const isFilter = th.classList.contains('filter-th');
        if(!sortType || isFilter) return; // 필터 헤더는 정렬 제외
  
        th.style.cursor = 'pointer';
        th.addEventListener('click', (e)=>{
          const sameCol = this.sortState.index === colIdx;
          let nextDir;
          if(sameCol){
            // asc -> desc -> none(기본)
            if(this.sortState.dir === 'asc') nextDir = 'desc';
            else if(this.sortState.dir === 'desc') nextDir = 'none';
            else nextDir = 'asc';
          } else {
            nextDir = 'asc';
          }
  
          if(nextDir === 'none'){
            // 기본 순서로 복원
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
  
    _resetSort(headers){
      if(!this.tbody || !this.originalRows) return;
      // 원래 순서로 복원 (FLIP 애니메이션 적용)
      this._animateReorder(()=>{
        const frag = document.createDocumentFragment();
        this.originalRows.forEach(tr => frag.appendChild(tr));
        this.tbody.appendChild(frag);
      });
      // 아이콘을 기본 상태로 리셋
      this._updateSortIcons(headers, null, 'none');
    }
  
    _updateSortIcons(headers, activeTh, dir){
      headers.forEach(th=>{
        const icon = th.querySelector('i.fas.fa-sort, i.fas.fa-sort-up, i.fas.fa-sort-down');
        if(!icon) return;
        // 기본 상태
        if(!activeTh || dir === 'none'){
          icon.classList.remove('fa-sort-up','fa-sort-down');
          icon.classList.add('fa-sort');
          return;
        }
        if(th === activeTh){
          icon.classList.remove('fa-sort');
          icon.classList.toggle('fa-sort-up', dir==='asc');
          icon.classList.toggle('fa-sort-down', dir==='desc');
          if(dir==='asc') icon.classList.remove('fa-sort-down');
          if(dir==='desc') icon.classList.remove('fa-sort-up');
        } else {
          icon.classList.remove('fa-sort-up','fa-sort-down');
          icon.classList.add('fa-sort');
        }
      });
    }

    // 리스트 재정렬 시 자연스러운 이동을 위한 FLIP 애니메이션
    _animateReorder(mutFn){
      if(!this.tbody) { mutFn(); return; }
      const visible = Array.from(this.tbody.rows).filter(r=>!r.hidden);
      const firstPos = new Map();
      const firstTBodyRect = this.tbody.getBoundingClientRect();
      visible.forEach(r=>{
        const rect = r.getBoundingClientRect();
        firstPos.set(r, rect.top - firstTBodyRect.top);
      });

      // DOM 변경 수행 (정렬/복원 등)
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
        // 강제 리플로우 후 원위치로 전환하여 애니메이션
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
  
    _sortByColumn(colIdx, sortType, dir){
      const rows = Array.from(this.tbody.rows);
      // 안정 정렬을 위해 원래 인덱스 유지
      const withIndex = rows.map((tr, i)=>({ tr, i }));
  
      const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });
  
      const parseNumber = (text)=>{
        if(!text) return null;
        const m = text.replace(/[\,\s]/g,'').match(/\d+/);
        return m ? parseInt(m[0],10) : null;
      };
  
      const cmp = (a, b)=>{
        const ta = a.tr.cells[colIdx]?.textContent.trim() ?? '';
        const tb = b.tr.cells[colIdx]?.textContent.trim() ?? '';
  
        if(sortType === 'number'){
          // '1000+', '50+', 'N/A', '-' 등 처리
          const na = parseNumber(ta);
          const nb = parseNumber(tb);
          const isNullA = (na===null || isNaN(na));
          const isNullB = (nb===null || isNaN(nb));
          if(!isNullA && !isNullB){
            return na - nb;
          } else if(isNullA && isNullB){
            // 둘 다 N/A인 경우 원래 순서 유지
            return a.i - b.i;
          } else {
            // N/A는 항상 맨 뒤로
            return isNullA ? 1 : -1;
          }
        } else {
          // 문자열 정렬
          const res = collator.compare(ta, tb);
          if(res !== 0) return res;
          return a.i - b.i; // 안정성
        }
      };
  
      withIndex.sort((x,y)=> dir==='asc' ? cmp(x,y) : cmp(y,x));
  
      // DOM에 재배치 (FLIP 애니메이션 적용)
      this._animateReorder(()=>{
        const frag = document.createDocumentFragment();
        withIndex.forEach(({tr})=> frag.appendChild(tr));
        this.tbody.appendChild(frag);
      });
    }
    // ===== 정렬 기능 끝 =====
    // 카테고리 텍스트를 칩 형태로 변환하고 색상/이모지 적용
    _decorateCategoryCells(){
      const idx = this.typeToIndex['category'];
      if(idx == null || idx < 0) return;

      const colors = (TagConfig && TagConfig.category) || {};
      const defaultColor = colors._default || { bg:'#e2e8f0', fg:'#1f2937' };
      const emojiMap = {
        '친목': '👥',
        '홍보': '📣',
        '커뮤니티': '👥',
        '이모지': '😀',
        '개발': '💻',
        '정보': '📚',
        '연애': '💖',
        '상담': '💬',
        '스트리머': '🎥',
        '태그': '🏷️'
      };

      Array.from(this.tbody.rows).forEach(tr=>{
        const cell = tr.cells[idx];
        if(!cell) return;
        const raw = (cell.dataset.filterRaw || cell.textContent.trim());
        if(!raw) return;
        cell.dataset.filterRaw = raw; // 필터는 원본 텍스트 기준으로 동작

        // '-' placeholder는 칩으로 만들지 않음
        if (raw === '-' || raw === '—' || raw === '–') return;

        // 이미 렌더링된 경우 중복 방지
        if(cell.querySelector('.tag')) return;

      // 이모지와 텍스트 분리 (정규식: 이모지 + 나머지)
        // CSV 데이터 예시: "👥친목"
        let emojiChar = '';
        let textContent = raw;

        // 이모지 매핑 테이블 (우선 순위 높음)
        // 키워드가 포함되어 있으면 해당 이모지를 사용
        for (const key in emojiMap) {
            if (raw.includes(key)) {
                emojiChar = emojiMap[key];
                // 텍스트에서 키워드만 남길지, 이모지만 뺄지 결정
                // 여기서는 기존 로직대로 텍스트 전체를 사용하되 이모지 문자가 있다면 제거
                textContent = raw.replace(emojiChar, '').trim(); 
                // 만약 raw가 "👥친목"이고 key가 "친목"이면 emojiChar="👥"
                // textContent는 "👥"를 제거한 "친목"이 됨.
                // 하지만 raw에 이모지가 없는 경우("친목")에는 textContent="친목"이 됨.
                
                // 추가: raw 자체에 다른 이모지가 있을 수 있으므로 정규식으로 한번 더 청소
                textContent = textContent.replace(/[\u{1F300}-\u{1F9FF}\u2600-\u26FF\u2700-\u27BF]/gu, '').trim();
                break;
            }
        }

        // 매핑에 없으면 정규식으로 추출 시도
        if (!emojiChar) {
            const match = raw.match(/^([\u{1F300}-\u{1F9FF}\u2600-\u26FF\u2700-\u27BF])\s*(.*)$/u);
            if (match) {
                emojiChar = match[1];
                textContent = match[2];
            } else {
                // 이모지도 없고 매핑도 안되면 기본값
                emojiChar = '🏷️';
            }
        }
        
        // 색상 키 추출 (이모지 제외한 텍스트 기준)
        const colorKey = textContent.trim();
        const color = colors[colorKey] || defaultColor;

        const chip = document.createElement('span');
        chip.className = 'tag';
        const emoji = document.createElement('span');
        emoji.className = 'tag-emoji';
        emoji.textContent = emojiChar;
        chip.appendChild(emoji);
        chip.appendChild(document.createTextNode(textContent));

        if(color.bg) {
          chip.style.setProperty('--tag-bg', color.bg);
          chip.style.setProperty('--tag-bg-alpha', '0.35');
        }
        if(color.fg) {
          chip.style.setProperty('--tag-fg', color.fg);
          chip.style.color = color.fg;
        }

        cell.textContent = '';
        cell.appendChild(chip);
      });
    }
    // 직급 텍스트를 칩 형태로 변환 (이모지 비포함, 중립 색상)
    _decoratePositionCells(){
      const idx = this.typeToIndex['position'];
      if(idx == null || idx < 0) return;

      // 직급 이모지 매핑
      const emojiMap = {
        '소유자': '👑',
        '공동 소유자': '🤝',
        '총 관리자': '🛡️',
        '부 관리자': '🛠️',
        '관리자': '🛠️',
        '매니저': '🧑\u200d💼',
        '팀장': '🧭',
        '팀원': '👤'
      };
    
      Array.from(this.tbody.rows).forEach(tr=>{
        const cell = tr.cells[idx];
        if(!cell) return;
        const raw = (cell.dataset.filterRaw || cell.textContent.trim());
        if(!raw) return;
        cell.dataset.filterRaw = raw; // 필터는 원본 텍스트 기준으로 동작

        // '-' placeholder는 칩으로 만들지 않음
        if (raw === '-' || raw === '—' || raw === '–') return;

        // 이미 렌더링된 경우 중복 방지
        if(cell.querySelector('.tag')) return;

        // 이모지 분리 로직 (Category와 동일)
        let emojiChar = '';
        let textContent = raw;
        
        // 이모지 매핑 우선
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

        const chip = document.createElement('span');
        chip.className = 'tag';
        const emoji = document.createElement('span');
        emoji.className = 'tag-emoji';
        emoji.textContent = emojiChar;
        chip.appendChild(emoji);
        chip.appendChild(document.createTextNode(textContent));

        // 직급 색상: position 맵 우선, 없으면 category의 _default 사용
        const posColors = (TagConfig.position) || {};
        const catColors = (TagConfig.category) || {};
        const defaultColor = posColors._default || catColors._default || { bg:'#e2e8f0', fg:'#1f2937' };
        const color = posColors[colorKey] || defaultColor;
        if (color.bg) {
          chip.style.setProperty('--tag-bg', color.bg);
        }
        if (color.fg) {
          chip.style.setProperty('--tag-fg', color.fg);
        }
        // Per-cell override via data attributes on the td (e.g., data-tag-bg, data-tag-fg)
        const bgOverride = cell.dataset.tagBg;
        const fgOverride = cell.dataset.tagFg;
        if (bgOverride) {
          chip.style.setProperty('--tag-bg', bgOverride);
        }
        if (fgOverride) {
          chip.style.setProperty('--tag-fg', fgOverride);
          chip.style.color = fgOverride;
        }
    
        cell.textContent = '';
        cell.appendChild(chip);
      });
    }

    // 부서 텍스트를 칩 형태로 변환 (이모지 비포함, 기본색은 카테고리 기본과 동일)
    _decorateDepartmentCells(){
      const idx = this.typeToIndex['department'];
      if(idx == null || idx < 0) return;

      // 부서 이모지 매핑
      const emojiMap = {
        '연합팀': '🤝',
        '홍보팀': '📣',
        '안내팀': '👋',
        '봇 관리자': '🤖',
        '운영팀': '🛠️',
        '보안팀': '🔒'
      };

      Array.from(this.tbody.rows).forEach(tr => {
        const cell = tr.cells[idx];
        if(!cell) return;
        const raw = (cell.dataset.filterRaw || cell.textContent.trim());
        if(!raw) return;
        cell.dataset.filterRaw = raw; // 필터는 원본 텍스트 기준으로 동작

        // '-' placeholder는 칩으로 만들지 않음
        if (raw === '-' || raw === '—' || raw === '–') return;

        // 이미 렌더링된 경우 중복 방지
        if(cell.querySelector('.tag')) return;

        // 쉼표 등 구분자로 다중 부서를 분리하여 여러 칩으로 렌더링
        // 이모지가 구분자 역할을 할 수도 있음 (예: "📣홍보팀👋안내팀")
        // 정규식으로 이모지+텍스트 덩어리를 찾아서 분리
        // (\p{Emoji}...)(text...)
        
        let parts = [];
        // 이모지가 포함된 경우 이모지를 기준으로 분리 시도
        // 예: "📣홍보팀👋안내팀" -> ["📣홍보팀", "👋안내팀"]
        // 정규식: 이모지로 시작하고 다음 이모지 전까지의 문자열 매칭
        const emojiRegex = /([\u{1F300}-\u{1F9FF}\u2600-\u26FF\u2700-\u27BF])\s*([^,，、\/|\u{1F300}-\u{1F9FF}\u2600-\u26FF\u2700-\u27BF]*)/gu;
        
        let match;
        let hasEmoji = false;
        while ((match = emojiRegex.exec(raw)) !== null) {
            hasEmoji = true;
            parts.push({ emoji: match[1], text: match[2].trim() });
        }

        if (!hasEmoji) {
            // 이모지가 없으면 기존 방식대로 구분자로 분리
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
        
        if(parts.length === 0) return; // Should not happen if raw exists

        cell.dataset.filterTokens = parts.map(p => p.text).join('|');

        // 부서 색상: department 맵 우선, 없으면 category의 _default 사용
        const deptColors = (TagConfig.department) || {};
        const catColors = (TagConfig.category) || {};
        const defaultColor = deptColors._default || catColors._default || { bg:'#e2e8f0', fg:'#1f2937' };

        cell.textContent = '';
        parts.forEach(part => {
          const chip = document.createElement('span');
          chip.className = 'tag';
          const emojiSpan = document.createElement('span');
          emojiSpan.className = 'tag-emoji';
          emojiSpan.textContent = part.emoji;
          chip.appendChild(emojiSpan);
          chip.appendChild(document.createTextNode(part.text));
          
          const color = deptColors[part.text] || defaultColor;
          if (color.bg) {
            chip.style.setProperty('--tag-bg', color.bg);
            chip.style.setProperty('--tag-bg-alpha', '0.35');
          }
          if (color.fg) {
            chip.style.setProperty('--tag-fg', color.fg);
            chip.style.color = color.fg;
          }
          cell.appendChild(chip);
        });
      });
    }

    // ===== 노트 팝오버 기능 =====
    _initNotes() {
      // 1. 노트 트리거 식별 및 초기화
      const triggers = Array.from(document.querySelectorAll('sup[data-note]'));
      if (triggers.length === 0) return;

      // 공유 팝오버 엘리먼트 생성 (하나만 사용하여 재활용)
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
        
        // 내용 설정
        popover.textContent = trigger.dataset.note;
        
        // 위치 계산 (Fixed positioning)
        const rect = trigger.getBoundingClientRect();
        
        // CSS에서 기본적으로 display: block (visibility로 제어)이므로
        // 별도의 display 설정 불필요. 크기 측정 가능.
        
        const pWidth = popover.offsetWidth;
        const pHeight = popover.offsetHeight;
        
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const margin = 10;

        // 기본 위치: 트리거 하단 중앙
        let top = rect.bottom + 8;
        let left = rect.left + (rect.width / 2) - (pWidth / 2);

        // 화면 오른쪽 넘어감 방지
        if (left + pWidth + margin > viewportW) {
          left = viewportW - pWidth - margin;
        }
        // 화면 왼쪽 넘어감 방지
        if (left < margin) {
          left = margin;
        }
        
        // 화면 아래쪽 넘어감 방지 -> 위로 표시
        if (top + pHeight + margin > viewportH) {
          top = rect.top - pHeight - 8;
        }

        popover.style.top = `${top}px`;
        popover.style.left = `${left}px`;
        
        // 활성화
        popover.classList.add('visible');
        activeTrigger = trigger;
      };

      const hidePopover = () => {
        popover.classList.remove('visible');
        // 애니메이션 후 display: none 처리 필요 시 setTimeout 사용 가능하나,
        // CSS transition과 함께 사용 시 visible 클래스 제거만으로 충분할 수 있음.
        // 여기서는 즉시 사라짐을 보장하기 위해 visible 제거.
        // display: none 처리는 transitionend에서 하거나, CSS에서 opacity로 제어.
        
        // 안전하게 상태 초기화
        activeTrigger = null;
        if (hideTimeout) {
             clearTimeout(hideTimeout);
             hideTimeout = null;
        }
      };

      // 이벤트 핸들러
      triggers.forEach(trigger => {
        trigger.classList.add('note-trigger');
        trigger.setAttribute('tabindex', '0');
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('aria-label', '비고 보기');

        // 데스크톱: 호버 (즉시 반응 및 안전 지연)
        trigger.addEventListener('mouseenter', () => showPopover(trigger));
        trigger.addEventListener('mouseleave', () => {
          // 마우스가 팝오버로 이동하는 경우를 고려하여 약간의 지연 후 닫기
          // 만약 즉시 닫아야 한다면 delay를 0으로 하거나 setTimeout을 제거
          // 요구사항: "마우스 포인터가 각주 영역을 완전히 벗어난 직후 팝업이 즉시 사라짐"
          // -> 지연 없이 즉시 닫기 호출
          hidePopover();
        });

        // 키보드 접근성
        trigger.addEventListener('focus', () => showPopover(trigger));
        trigger.addEventListener('blur', () => hidePopover());

        // 모바일/클릭: 토글
        trigger.addEventListener('click', (e) => {
          e.preventDefault(); // 기본 동작 방지 (혹시 모를 링크 이동 등)
          e.stopPropagation();
          // 터치 디바이스에서는 click이 주된 인터랙션이므로 호버와 충돌 방지
          if (activeTrigger === trigger && popover.classList.contains('visible')) {
            hidePopover();
          } else {
            showPopover(trigger);
          }
        });
      });

      // 팝오버 자체에 마우스가 올라갔을 때 닫기 방지 (선택 사항이나, 사용자 경험상 좋음)
      // 하지만 요구사항은 "각주 영역을 벗어나면 즉시 사라짐"이므로 이 기능은 오히려 방해가 될 수 있음.
      // 따라서 팝오버 호버 핸들링은 추가하지 않음 (각주에서 떼면 바로 닫힘).

      // 외부 클릭 시 닫기
      document.addEventListener('click', (e) => {
        // 모바일 등에서 클릭으로 열었을 때 외부 클릭으로 닫기 위함
        if (activeTrigger && !e.target.closest('.note-trigger') && !e.target.closest('.note-popover')) {
          hidePopover();
        }
      });
      
      // 안전장치: 마우스가 트리거와 팝업 영역 밖으로 벗어나면 강제로 닫기
      // mouseleave 이벤트가 누락되거나 빠른 이동 시 발생하는 문제를 방지
      document.addEventListener('mousemove', (e) => {
        if (!activeTrigger) return;
        
        const triggerRect = activeTrigger.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        const buffer = 10; // 여유 공간

        const inTrigger = x >= triggerRect.left - buffer && x <= triggerRect.right + buffer &&
                          y >= triggerRect.top - buffer && y <= triggerRect.bottom + buffer;
                          
        // 팝업이 보이는 상태라면 팝업 영역도 안전 구역으로 포함
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

  ready(() => {
    // 먼저 CSV 데이터를 로드하고, 완료되면 PortfolioManager를 초기화
    loadCareerData(() => {
        new PortfolioManager();
    });
  });
})();