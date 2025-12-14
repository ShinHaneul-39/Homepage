/**
 * Timezone Conversion Utility
 * Automatically converts ISO 8601 timestamps in <time> elements to the user's local timezone.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Select all time elements marked for conversion
    const timeElements = document.querySelectorAll('time[data-timezone-convert="true"]');
  
    if (timeElements.length === 0) return;
  
    // Detect user's locale and timezone
    const userLocale = navigator.language || 'ko-KR';
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
    console.log(`[TimeUtils] Detected User Locale: ${userLocale}, TimeZone: ${userTimeZone}`);
  
    timeElements.forEach(el => {
      const isoString = el.getAttribute('datetime');
      if (!isoString) return;
  
      try {
        const date = new Date(isoString);
        
        // Format the date to the user's local time with 24-hour format
        // Using Intl.DateTimeFormat for robust localization
        const dateTimeFormatter = new Intl.DateTimeFormat(userLocale, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false // 24-hour format
        });

        // Get GMT offset string (e.g., "GMT+9")
        // Using en-US for offset part to ensure "GMT" prefix consistency
        const offsetFormatter = new Intl.DateTimeFormat('en-US', {
          timeZoneName: 'shortOffset'
        });
        
        const offsetPart = offsetFormatter.formatToParts(date)
          .find(part => part.type === 'timeZoneName');
        const offsetString = offsetPart ? offsetPart.value : '';
  
        const localTimeString = `${dateTimeFormatter.format(date)} (${offsetString})`;
  
        // Update the element's text content directly with the localized time
        el.textContent = localTimeString;
        
        // Add a tooltip showing the original time (ISO format) for reference
        el.setAttribute('title', `원본 시간: ${isoString}`);
        el.setAttribute('aria-label', `현지 시간: ${localTimeString}`);
  
      } catch (error) {
        console.error('[TimeUtils] Failed to convert time:', error);
      }
    });
  });
