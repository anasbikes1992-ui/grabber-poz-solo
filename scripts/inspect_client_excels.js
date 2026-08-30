import fs from 'fs';
import path from 'path';

// Let's inspect the CSV first
const csvPath = path.resolve('excel/Shopping Station Products data.csv');
if (fs.existsSync(csvPath)) {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter(Boolean);
  console.log('--- SHOPPING STATION CSV HEADER & FIRST 3 ROWS ---');
  console.log('Total Lines:', lines.length);
  console.log('Header:', lines[0]);
  console.log('Row 1:', lines[1]);
  console.log('Row 2:', lines[2]);
}
