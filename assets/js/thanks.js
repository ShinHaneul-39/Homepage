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
        this.sortCards();
        this.initFilters();
        this.initScrollNav();
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
            
            // Re-append sorted cards
            cards.forEach(card => grid.appendChild(card));
        });
        
        // Refresh the cards list for filtering
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
