const fs = require('fs');
let content = fs.readFileSync('open-sse/services/autoCombo/layaRouter.ts', 'utf8');

// Change getRouter to handle missing module gracefully
content = content.replace(/async function getRouter\(\): Promise<any> \{[\s\S]*?defaultLogger\.info\("LAYA_ROUTER", "Initialized Laya JS Router \(ModernBERT\/mmBERT\)"\);\n  return routerInstance;\n\}/, 
`let layaRouterUnavailable = false;

async function getRouter(): Promise<any> {
  if (routerInstance) return routerInstance;
  if (layaRouterUnavailable) throw new Error("Laya router unavailable");
  try {
    // @ts-ignore — dynamic require bypasses Turbopack static analysis
    const { Router } = await import(/* webpackIgnore: true */ "@johnhenry/laya-router");
    routerInstance = new Router({
      mlxRepos: true,
      loadOptions: { backend: "auto", dtype: "f16" }
    });
    defaultLogger.info("LAYA_ROUTER", "Initialized Laya JS Router (ModernBERT/mmBERT)");
    return routerInstance;
  } catch (e) {
    layaRouterUnavailable = true;
    defaultLogger.info("LAYA_ROUTER", "Laya JS router not installed. Complexity routing will fall back to default.");
    throw e;
  }
}`);

fs.writeFileSync('open-sse/services/autoCombo/layaRouter.ts', content);
