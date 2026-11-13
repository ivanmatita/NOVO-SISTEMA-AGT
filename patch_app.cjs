
const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

// Line 10291 is index 10290, Line 10292 is index 10291
// I need to replace line 10290 and 10291
const selectLineIdx = 10290;
const divLineIdx = 10291;

// Prepare the replacement
const selectReplacement = '                      <select \n                        disabled={isCertified}\n                        value={item.tax || ALL_TAXES[0]}\n                        onChange={(e) => updateItem(idx, "tax", e.target.value)}\n                        className="w-full bg-white border border-zinc-200 rounded-none px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"\n                      >\n                        {ALL_TAXES.map((t, i) => <option key={i} value={t}>{t}</option>)}\n                      </select>\n                    </div>\n                    <div className="grid grid-cols-12 gap-4 items-end bg-white p-3 border border-zinc-100">';

// We need to replace line 10290 and 10291 with this.
lines[selectLineIdx] = selectReplacement;
lines[divLineIdx] = ''; // Remove the old div

fs.writeFileSync('src/App.tsx', lines.join('\n'));
console.log('File patched');
