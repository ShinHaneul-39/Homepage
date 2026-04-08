/**
 * @fileoverview 다국어 지원(i18n) 관리 스크립트
 */

class I18nManager {
  constructor() {
    this.translations = null;
    this.supportedLangs = ['ko', 'en', 'zh', 'ja'];
    this.currentLang = this.getInitialLanguage();
    this.isReady = false;
  }

  getInitialLanguage() {
    const saved = localStorage.getItem('language');
    if (saved && this.supportedLangs.includes(saved)) return saved;
    
    const browserLang = navigator.language.split('-')[0];
    return this.supportedLangs.includes(browserLang) ? browserLang : 'ko';
  }

  async init() {
    try {
      console.log('[I18n] 초기화 중...');
      const prefix = this.getPathPrefix();
      const res = await fetch(`${prefix}assets/data/translations.json`);
      if (!res.ok) throw new Error('번역 파일을 찾을 수 없습니다.');
      
      this.translations = await res.json();
      this.isReady = true;
      
      this.updateHtmlLang();
      this.applyTranslations();
      
      document.dispatchEvent(new CustomEvent('i18nReady', { detail: { lang: this.currentLang } }));
      console.log('[I18n] 초기화 완료:', this.currentLang);
      return true;
    } catch (err) {
      console.error('[I18n] 초기화 실패:', err);
      return false;
    }
  }

  updateHtmlLang() {
    document.documentElement.lang = this.currentLang;
  }

  getPathPrefix() {
    const p = window.location.pathname.toLowerCase();
    return (p.includes('/posts/') || p.includes('/pages/') || p.includes('\\posts\\') || p.includes('\\pages\\')) ? '../' : '';
  }

  applyTranslations() {
    if (!this.isReady || !this.translations) return;
    const data = this.translations[this.currentLang];
    if (!data) return;

    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = data[key];
      if (!val) return;

      const translated = val.replace('{year}', new Date().getFullYear());

      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translated;
      } else {
        if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', translated);
        
        // 아이콘 등 자식 요소를 유지하면서 텍스트만 교체
        let updated = false;
        for (let node of el.childNodes) {
          if (node.nodeType === 3) { // Text Node
            node.textContent = translated;
            updated = true;
            break;
          }
        }
        if (!updated) {
          if (el.children.length === 0) {
            el.textContent = translated;
          } else {
            // 자식이 있는데 텍스트 노드가 없는 경우 마지막에 추가
            el.appendChild(document.createTextNode(translated));
          }
        }
      }
    });

    // 번역 적용 완료 이벤트 발생 (time-utils.js 등에서 감지)
    document.dispatchEvent(new Event('translationsApplied'));
  }

  async setLanguage(lang) {
    if (!this.supportedLangs.includes(lang)) return;
    console.log('[I18n] 언어 변경:', lang);
    this.currentLang = lang;
    localStorage.setItem('language', lang);
    this.updateHtmlLang();
    this.applyTranslations();
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  }

  getCurrentLang() { return this.currentLang; }
}

window.i18n = new I18nManager();
window.i18n.init();
