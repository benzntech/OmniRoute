const fs = require('fs');
const file = 'open-sse/services/combo/resolveAutoStrategy.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove the existing expandAutoComboCandidatePool call
code = code.replace(/\s*eligibleTargets = await expandAutoComboCandidatePool\(eligibleTargets, combo\);/, "");

// 2. Insert it at the top
code = code.replace(
  /let eligibleTargets = \[\.\.\.orderedTargets\];/,
  `let eligibleTargets = [...orderedTargets];
  eligibleTargets = await expandAutoComboCandidatePool(eligibleTargets, combo);`
);

fs.writeFileSync(file, code);
