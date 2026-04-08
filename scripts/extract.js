/**
 * @fileoverview 데이터 추출 실행 스크립트
 * 
 * HTML 파일에서 데이터를 추출하여 CSV 파일로 저장하는 메인 실행 파일입니다.
 * `utils/dataManager.js` 모듈을 사용하여 실제 추출 및 저장 로직을 수행합니다.
 * CI/CD 파이프라인이나 로컬 개발 환경에서 데이터를 갱신할 때 실행합니다.
 */

const fs = require('fs');
const path = require('path');
// 데이터 관리 모듈 가져오기 (구조 분해 할당)
const { 
    extractCareerData, 
    extractThanksData, 
    saveToCSV, 
    validateCareerData, 
    validateThanksData 
} = require('./utils/data-manager');

// 경로 상수 정의
const ROOT_DIR = path.join(__dirname, '..'); // 프로젝트 루트 디렉토리
const DATA_DIR = path.join(ROOT_DIR, 'assets', 'data'); // 데이터 저장 디렉토리

// 데이터 디렉토리가 없으면 생성 (재귀적 생성)
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * 메인 실행 함수
 * 비동기 처리를 위해 async/await 패턴을 사용합니다.
 */
async function main() {
    try {
        console.log('데이터 추출 프로세스를 시작합니다...');

        // 1. 경력 데이터(Career Data) 처리
        const careerHtmlPath = path.join(ROOT_DIR, 'career-table.html');
        const careerHtml = fs.readFileSync(careerHtmlPath, 'utf8');
        
        // HTML에서 데이터 추출
        const careerData = extractCareerData(careerHtml);
        
        // 데이터 유효성 검증 및 저장
        if (validateCareerData(careerData)) {
            const careerCsvPath = path.join(DATA_DIR, 'career_data.csv');
            await saveToCSV(careerData, careerCsvPath);
            console.log(`[성공] 경력 데이터가 저장되었습니다: ${careerCsvPath} (${careerData.length}건)`);
        } else {
            console.error('[오류] 경력 데이터 검증 실패: 필수 필드가 누락되었습니다.');
        }

        // 2. 감사 인사 데이터(Thanks Data) 처리
        const thanksHtmlPath = path.join(ROOT_DIR, 'special-thanks.html');
        const thanksHtml = fs.readFileSync(thanksHtmlPath, 'utf8');
        
        // HTML에서 데이터 추출
        const thanksData = extractThanksData(thanksHtml);

        // 데이터 유효성 검증 및 저장
        if (validateThanksData(thanksData)) {
            const thanksCsvPath = path.join(DATA_DIR, 'thanks_data.csv');
            await saveToCSV(thanksData, thanksCsvPath);
            console.log(`[성공] 감사 인사 데이터가 저장되었습니다: ${thanksCsvPath} (${thanksData.length}건)`);
        } else {
            console.error('[오류] 감사 인사 데이터 검증 실패: 필수 필드가 누락되었습니다.');
        }

    } catch (error) {
        console.error('추출 프로세스 중 치명적인 오류 발생:', error);
        process.exit(1); // 비정상 종료 코드 반환
    }
}

// 메인 함수 실행
main();
