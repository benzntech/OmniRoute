const fs = require('fs');

const addLaya = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  // strip conflict markers if they exist
  content = content.replace(/<<<<<<<[\s\S]*?=======\n/g, '').replace(/>>>>>>>[\s\S]*?\n/g, '');
  
  if (content.includes('add: []')) {
    content = content.replace('add: []', `add: [{
      id: "laya",
      name: "Laya",
      contextLength: 1048576,
      maxOutputTokens: 65536,
      supportsReasoning: true,
      supportsVision: true,
      toolCalling: true,
    }]`);
  }
  fs.writeFileSync(file, content);
};

addLaya('open-sse/config/agyModels.ts');
addLaya('open-sse/config/antigravityModelAliases.ts');
