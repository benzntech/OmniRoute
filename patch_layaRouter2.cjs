const fs = require('fs');
let content = fs.readFileSync('open-sse/services/autoCombo/layaRouter.ts', 'utf8');

// replace explicit any with eslint-disable comments or unknown
content = content.replace(/let routerInstance: any = null;/g, '// eslint-disable-next-line @typescript-eslint/no-explicit-any\nlet routerInstance: any = null;');
content = content.replace(/\(globalThis as any\)/g, '(globalThis as /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any)');
content = content.replace(/Promise<any>/g, 'Promise<unknown>');

fs.writeFileSync('open-sse/services/autoCombo/layaRouter.ts', content);
