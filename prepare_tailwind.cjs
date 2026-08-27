const fs = require('fs');
const html = fs.readFileSync('generated_dashboard.html', 'utf8');
const scriptMatch = html.match(/<script id="tailwind-config">([\s\S]*?)<\/script>/i);
if (scriptMatch) {
  let configStr = scriptMatch[1].replace('tailwind.config =', 'export default');
  configStr = configStr.replace(/theme:/, 'content: [\"scratch_jsx.txt\"],\n  corePlugins: { preflight: false },\n  theme:');
  fs.writeFileSync('tailwind.admin.config.js', configStr);
  console.log('Saved to tailwind.admin.config.js');
}
