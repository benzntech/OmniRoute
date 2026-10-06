const fs = require('fs');
let content = fs.readFileSync('open-sse/services/autoCombo/layaRouter.ts', 'utf8');
content = '/* eslint-disable @typescript-eslint/no-explicit-any */\n' + content;
fs.writeFileSync('open-sse/services/autoCombo/layaRouter.ts', content);
