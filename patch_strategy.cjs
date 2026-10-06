const fs = require('fs');

let content = fs.readFileSync('open-sse/services/combo/resolveAutoStrategy.ts', 'utf8');
content = content.replace(/<<<<<<< Updated upstream\nimport type { ScoringWeights } from "\.\.\/autoCombo\/scoring\.ts";\n=======\nimport { evaluateWithLaya } from "\.\.\/autoCombo\/layaRouter\.ts";\n>>>>>>> Stashed changes/, 
'import type { ScoringWeights } from "../autoCombo/scoring.ts";\nimport { evaluateWithLaya } from "../autoCombo/layaRouter.ts";');

content = content.replace(/<<<<<<< Updated upstream\n=======\n([\s\S]*?)>>>>>>> Stashed changes/, 
`$1`);

fs.writeFileSync('open-sse/services/combo/resolveAutoStrategy.ts', content);
