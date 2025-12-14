/**
 * thanks.js - Logic for the Special Thanks page
 * Handles filtering, animations, and scroll navigation
 */

class ThanksManager {
    constructor() {
        this.filterRoot = document.querySelector('.gift-filters');
        this.tabs = this.filterRoot ? Array.from(this.filterRoot.querySelectorAll('[role="tab"]')) : [];
        this.cards = Array.from(document.querySelectorAll('.gift-card.card'));
        this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.yearSelect = document.querySelector('.year-select');
        this.yearLinks = document.querySelectorAll('.year-links a[href^="#"]');
        this.years = Array.from(document.querySelectorAll('.gift-year[id]'));
    }

    init() {
    this.loadData();
  }

  loadData() {
      if (typeof Papa === 'undefined') return;

      fetch('assets/data/thanks_data.csv')
          .then(r => r.text())
          .then(csvText => {
              Papa.parse(csvText, {
                  header: true,
                  skipEmptyLines: true,
                  complete: (results) => {
                      this.renderData(results.data);
                      this.sortCards(); // Initial sort
                      this.initFilters();
                      this.initScrollNav();
                  }
              });
          });
  }

  renderData(data) {
      const container = document.getElementById('gift-list-container');
      const yearLinksNav = document.querySelector('.year-links');
      const yearSelect = document.querySelector('.year-select');
      
      if (!container || !yearLinksNav || !yearSelect) return;

      const userLocale = navigator.language || 'ko-KR';
      const dateFormatter = new Intl.DateTimeFormat(userLocale, {
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false
      });
      const offsetFormatter = new Intl.DateTimeFormat('en-US', { timeZoneName: 'shortOffset' });

      container.innerHTML = '';
      yearLinksNav.innerHTML = '';
      yearSelect.innerHTML = '';

      // Group by year
      const years = {};
      data.forEach(row => {
          if (!years[row.year]) years[row.year] = [];
          years[row.year].push(row);
      });

      // Sort years descending
      const sortedYears = Object.keys(years).sort((a, b) => b - a);

      sortedYears.forEach(year => {
          // 1. Create Nav Link
          const link = document.createElement('a');
          link.className = 'chip';
          link.href = `#year-${year}`;
          link.textContent = year;
          yearLinksNav.appendChild(link);

          // 2. Create Select Option
          const option = document.createElement('option');
          option.value = `year-${year}`;
          option.textContent = year;
          yearSelect.appendChild(option);

          // 3. Create Year Section
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

          years[year].forEach(item => {
              const article = document.createElement('article');
              article.className = 'gift-card card';
              article.dataset.type = item.type; // nitro, banner, etc.

              // Determine tag class based on type/item
              let tagClass = 'tag-etc';
              if (item.type === 'nitro') tagClass = 'tag-nitro';
              else if (item.type === 'banner') tagClass = 'tag-banner';
              
              // Create Header
              const headerDiv = document.createElement('div');
              headerDiv.className = 'gift-card-header';
              
              const numberSpan = document.createElement('span');
              numberSpan.className = 'gift-number';
              numberSpan.textContent = item.number;
              
              const userDiv = document.createElement('div');
              userDiv.className = 'gift-user';
              userDiv.textContent = item.user; // Secure: textContent escapes HTML
              
              headerDiv.appendChild(numberSpan);
              headerDiv.appendChild(userDiv);
              
              // Create Body
              const bodyDiv = document.createElement('div');
              bodyDiv.className = 'gift-card-body';
              
              const tagSpan = document.createElement('span');
              tagSpan.className = `tag ${tagClass}`;
              tagSpan.textContent = item.item; // Secure
              
              bodyDiv.appendChild(tagSpan);
              
              // Create Meta
              const metaDiv = document.createElement('div');
              metaDiv.className = 'gift-meta';
              
              const timeEl = document.createElement('time');
              timeEl.setAttribute('datetime', item.date);
              
              // Format date to user's locale
              try {
                  const dateObj = new Date(item.date);
                  const dateStr = dateFormatter.format(dateObj);
                  const offsetPart = offsetFormatter.formatToParts(dateObj).find(p => p.type === 'timeZoneName');
                  const offsetStr = offsetPart ? offsetPart.value : '';
                  
                  timeEl.textContent = `${dateStr} (${offsetStr})`;
              } catch (e) {
                  timeEl.textContent = item.displayDate; // Fallback
              }

              metaDiv.appendChild(timeEl);
              
              // Append all to article
              article.appendChild(headerDiv);
              article.appendChild(bodyDiv);
              article.appendChild(metaDiv);

              grid.appendChild(article);
          });

          yearSection.appendChild(grid);
          container.appendChild(yearSection);
      });
  }

  sortCards() {
      const grids = document.querySelectorAll('.gift-grid');
      grids.forEach(grid => {
          const cards = Array.from(grid.querySelectorAll('.gift-card'));
          cards.sort((a, b) => {
              const timeA = a.querySelector('time')?.getAttribute('datetime') || '';
              const timeB = b.querySelector('time')?.getAttribute('datetime') || '';
              return timeB.localeCompare(timeA); // Descending order (Newest first)
          });
          cards.forEach(card => grid.appendChild(card));
      });
      this.cards = Array.from(document.querySelectorAll('.gift-card.card'));
  }

  initFilters() {
        if (this.tabs.length) {
            this.tabs.forEach((tab, idx) => {
                tab.addEventListener('click', (e) => { 
                    e.preventDefault(); 
                    this.setActiveTab(tab); 
                    tab.focus(); 
                });
                
                tab.addEventListener('keydown', (e) => {
                    const key = e.key;
                    if (key === 'ArrowRight' || key === 'ArrowLeft') {
                        e.preventDefault();
                        const dir = key === 'ArrowRight' ? 1 : -1;
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

            // Set initial active tab
            const current = this.tabs.find(t => t.getAttribute('aria-selected') === 'true') || this.tabs[0];
            this.setActiveTab(current);
        }
    }

    setActiveTab(newTab) {
        this.tabs.forEach(tab => {
            const isActive = tab === newTab;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
            tab.tabIndex = isActive ? 0 : -1;
        });
        this.applyFilter(newTab.dataset.filter || 'all');
    }

    applyFilter(filter) {
        const f = (filter || 'all').toLowerCase();
        
        this.cards.forEach(card => {
            const type = (card.dataset.type || '').toLowerCase();
            const show = f === 'all' || type === f;
            
            if (show) {
                if (card.hidden) {
                    card.hidden = false;
                    card.classList.remove('is-hiding');
                    if (!this.reduceMotion) {
                        card.classList.add('is-hiding');
                        requestAnimationFrame(() => card.classList.remove('is-hiding'));
                    }
                }
            } else {
                if (!card.hidden) {
                    if (this.reduceMotion) {
                        card.hidden = true;
                        card.classList.remove('is-hiding');
                    } else {
                        card.classList.add('is-hiding');
                        
                        const finish = () => {
                            card.hidden = true;
                            card.classList.remove('is-hiding');
                            card.removeEventListener('transitionend', onEnd);
                        };
                        
                        const onEnd = (ev) => {
                            if (ev.propertyName === 'opacity') finish();
                        };
                        
                        card.addEventListener('transitionend', onEnd);
                        // Fallback timeout
                        setTimeout(finish, 250);
                    }
                }
            }
        });
    }

    initScrollNav() {
        if (this.yearSelect) {
            this.yearSelect.addEventListener('change', () => this.scrollToId(this.yearSelect.value));
        }

        this.yearLinks.forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const id = a.getAttribute('href').slice(1);
                this.scrollToId(id);
            });
        });

        // Intersection Observer for scroll spy
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    if (this.yearSelect) this.yearSelect.value = id;
                    
                    document.querySelectorAll('.year-links a').forEach(a => {
                        a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
                    });
                }
            });
        }, { root: null, rootMargin: '-72px 0px -70% 0px', threshold: 0.01 });

        this.years.forEach(y => io.observe(y));
    }

    scrollToId(id) {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.replaceState(null, '', `#${id}`);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const manager = new ThanksManager();
    manager.init();
});
