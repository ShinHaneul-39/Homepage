/**
 * Post Image Manager
 * Handles Lazy Loading, Auto Captions, and Lightbox functionality
 */

class PostImageManager {
  constructor() {
    this.images = document.querySelectorAll('.post-content img');
    this.init();
  }

  init() {
    if (this.images.length === 0) return;

    this.setupLazyLoading();
    this.setupCaptions();
    this.setupLightbox();
    this.setupInteractiveClasses();
  }

  // 1. Setup Lazy Loading
  setupLazyLoading() {
    if ('loading' in HTMLImageElement.prototype) {
      this.images.forEach(img => {
        if (!img.hasAttribute('loading')) {
          img.setAttribute('loading', 'lazy');
        }
      });
    } else {
      // Fallback for older browsers (using Intersection Observer)
      const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            observer.unobserve(img);
          }
        });
      });
      
      this.images.forEach(img => {
        if (!img.getAttribute('src') && img.dataset.src) {
          observer.observe(img);
        }
      });
    }
  }

  // 2. Auto Generate Captions from alt text
  setupCaptions() {
    this.images.forEach(img => {
      // Check if wrapped in figure, if not, wrap it
      // But only if it's a direct child of p or div, not inside a grid/figure already
      const parent = img.parentElement;
      const altText = img.getAttribute('alt');

      if (altText && parent.tagName !== 'FIGURE' && parent.tagName !== 'PICTURE') {
        // If image has alt text but no caption, we can optionally create one
        // For now, we only style existing figcaptions or use title attribute
        if (img.title) {
          const figure = document.createElement('figure');
          figure.className = 'post-figure auto-generated';
          
          // Insert figure before img
          img.parentNode.insertBefore(figure, img);
          
          // Move img into figure
          figure.appendChild(img);
          
          // Create caption
          const figcaption = document.createElement('figcaption');
          figcaption.textContent = img.title; // Use title for visible caption
          figure.appendChild(figcaption);
        }
      }
    });
  }

  // 3. Setup Lightbox
  setupLightbox() {
    // Create Lightbox DOM
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

    // Open Lightbox
    const openLightbox = (src, alt, caption) => {
      lightboxImg.src = src;
      lightboxImg.alt = alt || '';
      lightboxCaption.textContent = caption || alt || '';
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent scrolling
    };

    // Close Lightbox
    const closeLightbox = () => {
      lightbox.classList.remove('active');
      setTimeout(() => {
        lightboxImg.src = ''; // Clear src
        document.body.style.overflow = ''; // Restore scrolling
      }, 300);
    };

    // Attach Click Events to Images
    this.images.forEach(img => {
      // Skip icons or small images
      if (img.width < 50 || img.height < 50 || img.classList.contains('no-lightbox')) return;

      img.classList.add('interactive');
      img.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent bubbling
        const caption = img.title || (img.nextElementSibling?.tagName === 'FIGCAPTION' ? img.nextElementSibling.textContent : '');
        openLightbox(img.src, img.alt, caption);
      });
    });

    // Close events
    closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
        closeLightbox();
      }
    });
    
    // Keyboard support (ESC)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        closeLightbox();
      }
    });
  }

  // Helper to add classes based on layout rules if needed
  setupInteractiveClasses() {
    // Future expansion: auto-detect layout needs
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new PostImageManager();
});
