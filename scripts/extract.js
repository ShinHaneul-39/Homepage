const fs = require('fs');
const path = require('path');
const { 
    extractCareerData, 
    extractThanksData, 
    saveToCSV, 
    validateCareerData, 
    validateThanksData 
} = require('../utils/dataManager');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'assets', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function main() {
    try {
        console.log('Starting data extraction...');

        // 1. Process Career Data
        const careerHtmlPath = path.join(ROOT_DIR, 'career_table.html');
        const careerHtml = fs.readFileSync(careerHtmlPath, 'utf8');
        const careerData = extractCareerData(careerHtml);
        
        if (validateCareerData(careerData)) {
            const careerCsvPath = path.join(DATA_DIR, 'career_data.csv');
            await saveToCSV(careerData, careerCsvPath);
            console.log(`[Success] Career data saved to ${careerCsvPath} (${careerData.length} records)`);
        } else {
            console.error('[Error] Career data validation failed');
        }

        // 2. Process Thanks Data
        const thanksHtmlPath = path.join(ROOT_DIR, 'special_thanks.html');
        const thanksHtml = fs.readFileSync(thanksHtmlPath, 'utf8');
        const thanksData = extractThanksData(thanksHtml);

        if (validateThanksData(thanksData)) {
            const thanksCsvPath = path.join(DATA_DIR, 'thanks_data.csv');
            await saveToCSV(thanksData, thanksCsvPath);
            console.log(`[Success] Thanks data saved to ${thanksCsvPath} (${thanksData.length} records)`);
        } else {
            console.error('[Error] Thanks data validation failed');
        }

    } catch (error) {
        console.error('Extraction failed:', error);
        process.exit(1);
    }
}

main();
