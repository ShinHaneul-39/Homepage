/**
 * @fileoverview 데이터 추출 및 관리 유틸리티 모듈
 * 
 * HTML 파일에서 경력 및 감사 인사 데이터를 추출(Scraping)하고,
 * CSV 파일로 저장하거나 불러오는 기능을 제공하는 Node.js 모듈입니다.
 * 빌드 타임 또는 데이터 마이그레이션 시 사용됩니다.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio'); // HTML 파싱 라이브러리
const { stringify } = require('csv-stringify'); // CSV 생성 라이브러리
const { parse } = require('csv-parse'); // CSV 파싱 라이브러리

/**
 * HTML 문자열에서 경력 데이터 추출
 * 
 * @param {string} html - 파싱할 HTML 문자열
 * @returns {Array<Object>} 추출된 경력 데이터 객체 배열
 * 
 * [추출 로직]
 * 1. Cheerio를 사용해 HTML 로드
 * 2. `.discord-career-table tbody tr` 선택자로 행 순회
 * 3. 각 셀(td)의 텍스트 추출 및 정제
 * 4. 서버 이름과 비고(Note, sup 태그) 분리 처리
 */
function extractCareerData(html) {
    const $ = cheerio.load(html);
    const data = [];

    $('.discord-career-table tbody tr').each((i, row) => {
        const cells = $(row).find('td');
        if (cells.length === 0) return;

        // 서버 이름 & 비고(Note) 분리 로직
        const serverCell = $(cells[1]);
        const sup = serverCell.find('sup');
        let serverName = serverCell.text().trim();
        let note = '';

        if (sup.length > 0) {
            // sup 태그를 제외한 순수 서버 이름 추출을 위해 복제본 사용
            const tempCell = serverCell.clone();
            tempCell.find('sup').remove();
            serverName = tempCell.text().trim();
            
            // 비고 추출 (마커 + 상세 내용)
            const marker = sup.text().trim(); // 예: [리모델링]
            const detail = sup.attr('data-note') || '';
            note = detail ? `${marker} ${detail}` : marker;
        }

        data.push({
            no: $(cells[0]).text().trim(),
            serverName: serverName,
            note: note,
            category: $(cells[2]).text().trim(),
            count: $(cells[3]).text().trim(),
            department: $(cells[4]).text().trim(),
            position: $(cells[5]).text().trim(),
            job: $(cells[6]).text().trim(),
            term: $(cells[7]).text().trim()
        });
    });

    return data;
}

/**
 * HTML 문자열에서 Special Thanks 데이터 추출
 * 
 * @param {string} html - 파싱할 HTML 문자열
 * @returns {Array<Object>} 추출된 감사 인사 데이터 객체 배열
 * 
 * [추출 로직]
 * 1. 연도별 섹션(`.gift-year`) 순회
 * 2. 섹션 내의 선물 카드(`.gift-card`) 순회
 * 3. data-type, 사용자명, 아이템, 날짜 정보 등 추출
 */
function extractThanksData(html) {
    const $ = cheerio.load(html);
    const data = [];

    $('.gift-year').each((i, yearSection) => {
        const year = $(yearSection).find('.year-title').text().trim();
        
        $(yearSection).find('.gift-card').each((j, card) => {
            const $card = $(card);
            data.push({
                year: year,
                type: $card.attr('data-type') || 'unknown',
                number: $card.find('.gift-number').text().trim(),
                user: $card.find('.gift-user').text().trim(),
                item: $card.find('.gift-card-body .tag').text().trim(),
                date: $card.find('.gift-meta time').attr('datetime') || '',
                displayDate: $card.find('.gift-meta time').text().trim()
            });
        });
    });

    return data;
}

/**
 * 데이터를 CSV 파일로 저장 (스트림 방식 사용)
 * 
 * @param {Array<Object>} data - 저장할 데이터 배열
 * @param {string} filePath - 저장할 파일 경로 (절대 경로 권장)
 * @returns {Promise<void>} 완료 시 해결되는 프로미스
 */
function saveToCSV(data, filePath) {
    return new Promise((resolve, reject) => {
        if (!data || data.length === 0) {
            return resolve(); // 저장할 데이터가 없으면 바로 종료
        }

        const columns = Object.keys(data[0]);
        const stringifier = stringify({ header: true, columns: columns });
        const writableStream = fs.createWriteStream(filePath, { encoding: 'utf8' });

        // 파이프 연결: Stringifier -> File Write Stream
        stringifier.pipe(writableStream);

        // 데이터 쓰기
        data.forEach(row => {
            stringifier.write(row);
        });

        stringifier.end();

        writableStream.on('finish', () => resolve());
        writableStream.on('error', (err) => reject(err));
        stringifier.on('error', (err) => reject(err));
    });
}

/**
 * CSV 파일에서 데이터 로드 (스트림 방식 사용)
 * 
 * @param {string} filePath - 읽을 파일 경로
 * @returns {Promise<Array<Object>>} 로드된 데이터 객체 배열
 */
function loadFromCSV(filePath) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            return reject(new Error(`파일을 찾을 수 없습니다: ${filePath}`));
        }

        const data = [];
        const parser = fs.createReadStream(filePath)
            .pipe(parse({
                columns: true, // 첫 줄을 헤더로 인식
                trim: true,    // 공백 제거
                skip_empty_lines: true
            }));

        parser.on('readable', () => {
            let record;
            while ((record = parser.read()) !== null) {
                data.push(record);
            }
        });

        parser.on('error', (err) => reject(err));
        parser.on('end', () => resolve(data));
    });
}

/**
 * 경력 데이터 무결성 검증
 * 
 * @param {Array<Object>} data - 검증할 데이터
 * @returns {boolean} 유효성 여부 (필수 키 포함 여부)
 */
function validateCareerData(data) {
    if (!Array.isArray(data)) return false;
    if (data.length === 0) return true; // 빈 배열은 구조적으로는 유효함
    
    const requiredKeys = ['no', 'serverName', 'note', 'category', 'count', 'department', 'position', 'job', 'term'];
    return data.every(row => requiredKeys.every(key => key in row));
}

/**
 * 감사 인사 데이터 무결성 검증
 * 
 * @param {Array<Object>} data - 검증할 데이터
 * @returns {boolean} 유효성 여부
 */
function validateThanksData(data) {
    if (!Array.isArray(data)) return false;
    if (data.length === 0) return true;

    const requiredKeys = ['year', 'type', 'number', 'user', 'item', 'date', 'displayDate'];
    return data.every(row => requiredKeys.every(key => key in row));
}

module.exports = {
    extractCareerData,
    extractThanksData,
    saveToCSV,
    loadFromCSV,
    validateCareerData,
    validateThanksData
};
