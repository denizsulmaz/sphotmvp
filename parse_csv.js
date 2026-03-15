const fs = require('fs');

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  const headers = lines[0].split(',').map(header => header.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const obj = {};
    const line = lines[i];
    let inQuotes = false;
    let currentVal = '';
    let colIndex = 0;

    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        obj[headers[colIndex]] = currentVal.trim().replace(/^"|"$/g, '');
        currentVal = '';
        colIndex++;
      } else {
        currentVal += char;
      }
    }
    obj[headers[colIndex]] = currentVal.trim().replace(/^"|"$/g, '');
    data.push(obj);
  }
  return data;
}

const csvFile = fs.readFileSync('photographersInfo.csv', 'utf-8');
const jsonData = parseCSV(csvFile);

fs.writeFileSync('photographers.json', JSON.stringify(jsonData, null, 2));
console.log('Successfully generated photographers.json');
