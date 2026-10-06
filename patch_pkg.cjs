const fs = require('fs');
let content = fs.readFileSync('package.json', 'utf8');
content = content.replace(/<<<<<<< Updated upstream([\s\S]*?)=======([\s\S]*?)>>>>>>> Stashed changes/g, (match, up, stashed) => {
  // Keep huggingface and johnhenry from stashed, and newer deps from upstream
  return `@huggingface/transformers": "^4.2.0",\n    "@johnhenry/backend-cpu": "^0.3.2",\n    "@johnhenry/backend-webgpu": "^0.5.1",\n    "@johnhenry/laya-router": "^0.1.4",\n${up}`;
});
fs.writeFileSync('package.json', content);
