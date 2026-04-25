const fs = require('fs');

function parseCSV(csvText) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentVal += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (currentVal !== '' || currentRow.length > 0) {
        currentRow.push(currentVal.trim());
        rows.push(currentRow);
        currentRow = [];
        currentVal = '';
      }
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      currentVal += char;
    }
  }

  if (currentVal !== '' || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    rows.push(currentRow);
  }

  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
}

const csvFile = fs.readFileSync('photographersInfo.csv', 'utf-8');
const jsonData = parseCSV(csvFile);

fs.writeFileSync('photographers.json', JSON.stringify(jsonData, null, 2));
fs.writeFileSync('src/data/photographers.json', JSON.stringify(jsonData, null, 2));
console.log('Successfully generated photographers.json and src/data/photographers.json');
