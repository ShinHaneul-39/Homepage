/**
 * @fileoverview 시간대 변환 유틸리티 스크립트
 * 
 * HTML의 <time> 요소에 ISO 8601 형식으로 기록된 시간을
 * 사용자의 현지 시간대(Local Timezone)에 맞춰 자동으로 변환하여 표시합니다.
 * 전 세계 어디서 접속하든 사용자에게 익숙한 시간 형식을 제공합니다.
 * 
 * 주요 기능:
 * 1. ISO 8601 타임스탬프 파싱
 * 2. 브라우저의 로케일 및 시간대 감지
 * 3. 24시간제 형식으로 변환 및 오프셋(GMT+9 등) 표시
 * 4. 툴팁(Tooltip)을 통한 원본 시간 제공
 */

const updateTimes = () => {
    // 변환 대상 요소 선택 (data-timezone-convert 속성이 true인 time 요소)
    const timeElements = document.querySelectorAll('time[data-timezone-convert="true"], [data-i18n="last_updated"], [data-i18n="detail_birth_value"]');

    if (timeElements.length === 0) return;

    // 1. 사용자 환경 감지
    // i18n이 있으면 i18n의 언어 사용, 없으면 브라우저 언어 설정
    const currentLang = (window.i18n && window.i18n.getCurrentLang()) || navigator.language.split('-')[0] || 'ko';
    const userLocale = currentLang === 'ko' ? 'ko-KR' : (currentLang === 'ja' ? 'ja-JP' : (currentLang === 'zh' ? 'zh-CN' : 'en-US'));
    // 사용자 시간대 (예: Asia/Seoul)
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    timeElements.forEach(el => {
        // datetime 속성에서 ISO 문자열 추출
        let isoString = el.getAttribute('datetime');
        
        // data-i18n 요소들의 경우 원본 텍스트에서 날짜 추출 시도 (임시방편)
        if (!isoString && el.hasAttribute('data-i18n')) {
            // 이미 번역된 텍스트가 있을 수 있으므로 주의
            // 보통 last_updated 같은 경우 원본 텍스트에 날짜가 포함됨
            const match = el.textContent.match(/\d{4}[\.-]\d{2}[\.-]\d{2}/);
            if (match) {
                isoString = match[0].replace(/\./g, '-');
            }
        }

        if (!isoString) return;

        try {
            const date = new Date(isoString);
            
            // 2. 날짜 및 시간 포맷팅 (Intl API 사용)
            const options = {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };
            
            // 상세 시간 표시 여부 결정
            if (isoString.includes('T') || el.tagName === 'TIME') {
                options.hour = '2-digit';
                options.minute = '2-digit';
                options.hour12 = false;
            }

            const dateTimeFormatter = new Intl.DateTimeFormat(userLocale, options);

            // 3. GMT 오프셋 계산 (예: GMT+9)
            const offsetFormatter = new Intl.DateTimeFormat('en-US', {
                timeZoneName: 'shortOffset'
            });
            
            const offsetPart = offsetFormatter.formatToParts(date)
                .find(part => part.type === 'timeZoneName');
            const offsetString = offsetPart ? offsetPart.value : '';
    
            // 4. 번역 템플릿 적용
            let localTimeString = dateTimeFormatter.format(date);
            if (options.hour) {
                localTimeString += ` (${offsetString})`;
            }

            // data-i18n 속성이 있는 경우 번역된 템플릿에 날짜 삽입
            if (el.hasAttribute('data-i18n')) {
                const key = el.getAttribute('data-i18n');
                if (window.i18n && window.i18n.translations) {
                    const template = window.i18n.translations[currentLang][key];
                    if (template && template.includes('{date}')) {
                        el.textContent = template.replace('{date}', localTimeString);
                        return;
                    }
                }
            }

            // 일반 time 요소 업데이트
            el.textContent = localTimeString;
            el.setAttribute('title', `원본 시간: ${isoString}`);
            el.setAttribute('aria-label', `현지 시간: ${localTimeString}`);
    
        } catch (error) {
            // 조용히 실패
        }
    });
};

document.addEventListener('DOMContentLoaded', updateTimes);
document.addEventListener('languageChanged', updateTimes);
document.addEventListener('i18nReady', updateTimes);
document.addEventListener('translationsApplied', updateTimes);
