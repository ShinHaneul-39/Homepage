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

document.addEventListener('DOMContentLoaded', () => {
    // 변환 대상 요소 선택 (data-timezone-convert 속성이 true인 time 요소)
    const timeElements = document.querySelectorAll('time[data-timezone-convert="true"]');
  
    if (timeElements.length === 0) return;
  
    // 1. 사용자 환경 감지
    // 브라우저 언어 설정 (없으면 한국어 기본)
    const userLocale = navigator.language || 'ko-KR';
    // 사용자 시간대 (예: Asia/Seoul)
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
    console.log(`[TimeUtils] 감지된 로케일: ${userLocale}, 시간대: ${userTimeZone}`);
  
    timeElements.forEach(el => {
      // datetime 속성에서 ISO 문자열 추출
      const isoString = el.getAttribute('datetime');
      if (!isoString) return;
  
      try {
        const date = new Date(isoString);
        
        // 2. 날짜 및 시간 포맷팅 (Intl API 사용)
        // 사용자의 로케일에 맞춰 년월일 시분을 포맷팅합니다.
        const dateTimeFormatter = new Intl.DateTimeFormat(userLocale, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false // 24시간제 사용 (명확성)
        });

        // 3. GMT 오프셋 계산 (예: GMT+9)
        // 오프셋 부분만 별도로 포맷팅하여 추출 (en-US 기준이 포맷 파싱에 용이)
        const offsetFormatter = new Intl.DateTimeFormat('en-US', {
          timeZoneName: 'shortOffset'
        });
        
        const offsetPart = offsetFormatter.formatToParts(date)
          .find(part => part.type === 'timeZoneName');
        const offsetString = offsetPart ? offsetPart.value : '';
  
        // 최종 표시 문자열 조합: "2023년 10월 1일 14:00 (GMT+9)"
        const localTimeString = `${dateTimeFormatter.format(date)} (${offsetString})`;
  
        // 4. DOM 업데이트
        // 텍스트 콘텐츠를 현지 시간으로 변경
        el.textContent = localTimeString;
        
        // 원본 시간은 툴팁(title)으로 제공하여 참조 가능하게 함
        el.setAttribute('title', `원본 시간: ${isoString}`);
        // 스크린 리더를 위한 접근성 레이블 추가
        el.setAttribute('aria-label', `현지 시간: ${localTimeString}`);
  
      } catch (error) {
        console.error('[TimeUtils] 시간 변환 실패:', error);
        // 에러 발생 시 원본 텍스트 유지 (조용히 실패)
      }
    });
  });
