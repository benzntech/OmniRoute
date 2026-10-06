import fs from "fs";

const file =
  "src/app/(dashboard)/dashboard/providers/[id]/components/WebSessionCredentialGuide.tsx";
let content = fs.readFileSync(file, "utf8");

if (!content.includes("Capture ChatGPT Session")) {
  const replacement = `
          {guideSteps ? (
            <div className="space-y-4">
              {requirement.credentialName.includes("Session JSON") && (
                <div className="rounded border border-sky-500/30 bg-sky-500/10 p-3">
                  <p className="font-semibold text-sky-400 mb-2">⚡ Option 1: 1-Click Auto-Capture (Recommended)</p>
                  <p className="mb-2 text-sm text-text-muted">1. Drag this button to your Bookmarks Bar:</p>
                  <a
                    className="inline-block bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded text-sm font-medium border border-dashed border-sky-300 cursor-grab mb-2"
                    href="javascript:(function(){if(!window.location.hostname.includes('chatgpt.com')){alert('⚠️ Go to chatgpt.com first!');window.open('https://chatgpt.com','_blank');return;}fetch('https://chatgpt.com/api/auth/session').then(r=>r.json()).then(d=>{if(!d||!d.accessToken)throw new Error('Not logged in');return fetch('http://localhost:20128/api/providers/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:JSON.stringify(d)})});}).then(r=>{if(r&&r.ok){alert('✓ Captured into OmniRoute!')}else{alert('Failed to reach OmniRoute.')}}).catch(e=>alert('Error: '+e.message));})();"
                    onClick={(e) => { e.preventDefault(); alert("Drag this button to your bookmarks bar, then click it on chatgpt.com!"); }}
                  >
                    ⚡ Capture ChatGPT Session
                  </a>
                  <p className="text-sm text-text-muted">2. Open <a href="https://chatgpt.com" target="_blank" className="text-sky-400 hover:underline">chatgpt.com</a> and click the bookmark.</p>
                </div>
              )}
              
              <p className="font-semibold text-text-main mt-4">Option 2: Manual Copy & Paste</p>
              <ol className="list-decimal space-y-1 pl-5">
                {guideSteps.map((step, index) => (
                  <li key={step}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
`;
  content = content.replace(/\{guideSteps \? \([\s\S]*?\) : \(/, replacement);
  fs.writeFileSync(file, content, "utf8");
}
