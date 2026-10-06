const fs = require('fs');
let content = fs.readFileSync('package.json', 'utf8');
content = content.replace(/""@huggingface\/transformers": "\^4\.2\.0",/g, '"@huggingface/transformers": "^4.2.0",');
fs.writeFileSync('package.json', content);
