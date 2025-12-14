const { test, describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { 
    extractCareerData, 
    extractThanksData, 
    saveToCSV, 
    loadFromCSV, 
    validateCareerData, 
    validateThanksData 
} = require('../utils/dataManager');

const TEMP_DIR = path.join(__dirname, 'temp');

describe('DataManager Utility', () => {
    
    before(() => {
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR);
        }
    });

    after(() => {
        if (fs.existsSync(TEMP_DIR)) {
            fs.rmSync(TEMP_DIR, { recursive: true, force: true });
        }
    });

    describe('HTML Extraction', () => {
        it('should extract career data correctly', () => {
            const html = `
                <table class="discord-career-table">
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td>Test Server<sup data-note="Details">[Note]</sup></td>
                            <td>Category</td>
                            <td>100</td>
                            <td>Dept</td>
                            <td>Pos</td>
                            <td>Job Desc</td>
                            <td>2023-2024</td>
                        </tr>
                    </tbody>
                </table>
            `;
            const data = extractCareerData(html);
            assert.strictEqual(data.length, 1);
            assert.strictEqual(data[0].serverName, 'Test Server');
            assert.strictEqual(data[0].note, '[Note] Details');
            assert.strictEqual(data[0].count, '100');
        });

        it('should extract thanks data correctly', () => {
            const html = `
                <div class="gift-year">
                    <h3 class="year-title">2024</h3>
                    <div class="gift-card" data-type="nitro">
                        <span class="gift-number">1</span>
                        <div class="gift-user">User1</div>
                        <div class="gift-card-body"><span class="tag">Nitro</span></div>
                        <div class="gift-meta"><time datetime="2024-01-01">2024-01-01</time></div>
                    </div>
                </div>
            `;
            const data = extractThanksData(html);
            assert.strictEqual(data.length, 1);
            assert.strictEqual(data[0].year, '2024');
            assert.strictEqual(data[0].user, 'User1');
            assert.strictEqual(data[0].type, 'nitro');
        });
    });

    describe('CSV Operations', () => {
        it('should save and load career data', async () => {
            const testData = [{
                no: '1', serverName: 'S1', note: 'N1', category: 'C1', count: '10', 
                department: 'D1', position: 'P1', job: 'J1', term: 'T1'
            }];
            const filePath = path.join(TEMP_DIR, 'test_career.csv');
            
            await saveToCSV(testData, filePath);
            assert.ok(fs.existsSync(filePath));

            const loadedData = await loadFromCSV(filePath);
            assert.deepStrictEqual(loadedData, testData);
        });

        it('should save and load thanks data', async () => {
            const testData = [{
                year: '2024', type: 'nitro', number: '1', user: 'U1', 
                item: 'I1', date: 'D1', displayDate: 'DD1'
            }];
            const filePath = path.join(TEMP_DIR, 'test_thanks.csv');
            
            await saveToCSV(testData, filePath);
            const loadedData = await loadFromCSV(filePath);
            assert.deepStrictEqual(loadedData, testData);
        });
    });

    describe('Validation', () => {
        it('should validate correct career data structure', () => {
            const validData = [{
                no: '1', serverName: 'S1', note: 'N1', category: 'C1', count: '10', 
                department: 'D1', position: 'P1', job: 'J1', term: 'T1'
            }];
            assert.strictEqual(validateCareerData(validData), true);
        });

        it('should reject invalid career data structure', () => {
            const invalidData = [{ no: '1', serverName: 'S1' }]; // Missing fields
            assert.strictEqual(validateCareerData(invalidData), false);
        });
    });
});
