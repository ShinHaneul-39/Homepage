const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { stringify } = require('csv-stringify');
const { parse } = require('csv-parse');

/**
 * Extracts career data from HTML string
 * @param {string} html 
 * @returns {Array<Object>}
 */
function extractCareerData(html) {
    const $ = cheerio.load(html);
    const data = [];

    $('.discord-career-table tbody tr').each((i, row) => {
        const cells = $(row).find('td');
        if (cells.length === 0) return;

        // Server Name & Note Separation
        const serverCell = $(cells[1]);
        const sup = serverCell.find('sup');
        let serverName = serverCell.text().trim();
        let note = '';

        if (sup.length > 0) {
            // Remove sup from server name extraction
            const tempCell = serverCell.clone();
            tempCell.find('sup').remove();
            serverName = tempCell.text().trim();
            
            // Extract note (marker + detail)
            const marker = sup.text().trim(); // e.g. [리모델링]
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
 * Extracts special thanks data from HTML string
 * @param {string} html 
 * @returns {Array<Object>}
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
 * Saves data to CSV file using streams
 * @param {Array<Object>} data 
 * @param {string} filePath 
 * @returns {Promise<void>}
 */
function saveToCSV(data, filePath) {
    return new Promise((resolve, reject) => {
        if (!data || data.length === 0) {
            return resolve(); // Nothing to write
        }

        const columns = Object.keys(data[0]);
        const stringifier = stringify({ header: true, columns: columns });
        const writableStream = fs.createWriteStream(filePath, { encoding: 'utf8' });

        stringifier.pipe(writableStream);

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
 * Loads data from CSV file using streams
 * @param {string} filePath 
 * @returns {Promise<Array<Object>>}
 */
function loadFromCSV(filePath) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            return reject(new Error(`File not found: ${filePath}`));
        }

        const data = [];
        const parser = fs.createReadStream(filePath)
            .pipe(parse({
                columns: true,
                trim: true,
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
 * Validates integrity of loaded career data
 * @param {Array<Object>} data 
 * @returns {boolean}
 */
function validateCareerData(data) {
    if (!Array.isArray(data)) return false;
    if (data.length === 0) return true; // Empty is valid but suspicious, but technically valid structure
    
    const requiredKeys = ['no', 'serverName', 'note', 'category', 'count', 'department', 'position', 'job', 'term'];
    return data.every(row => requiredKeys.every(key => key in row));
}

/**
 * Validates integrity of loaded thanks data
 * @param {Array<Object>} data 
 * @returns {boolean}
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
