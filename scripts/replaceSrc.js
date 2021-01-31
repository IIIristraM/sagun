const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '../tests/stress/index.js');
let content = fs.readFileSync(target, { encoding: 'utf-8' });
content = content.replace(/src/g, 'lib')
fs.writeFileSync(target, content);
