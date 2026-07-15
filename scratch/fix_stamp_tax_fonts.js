const fs = require('fs');
const path = 'c:\\Users\\Ivan\\Downloads\\novo anty agt 2\\NOVO-SISTEMA-AGT-main (3)\\NOVO-SISTEMA-AGT-main\\src\\App.tsx';

let content = fs.readFileSync(path, 'utf8');

// Target segment to update
const target = `         <div className="bg-[#003366] text-white p-1 text-[10px] font-bold uppercase border-b border-white flex justify-between items-center px-4">`;

if (content.includes(target)) {
  console.log('Found target section in App.tsx!');
} else {
  console.log('Warning: Target section not found exactly. Checking alternative spacing...');
}

// Perform replacements:
// 1. Text sizes in Section 04/05 titles: bg-[#003366] text-white p-1 text-[10px] -> p-1.5 text-xs
content = content.replace(
  /bg-\[\#003366\] text-white p-1 text-\[10px\] font-bold uppercase border-t border-white/g,
  'bg-[#003366] text-white p-1.5 text-xs font-bold uppercase border-t border-white'
);

// 2. Text sizes in "04- IDENTIFICACAO" / "05- RELACAO" etc labels: text-[10px] -> text-xs
content = content.replace(
  /col-span-3 text-\[10px\] font-bold text-zinc-400/g,
  'col-span-3 text-xs font-bold text-zinc-400'
);

// 3. Table font size: text-[9px] -> text-[11.5px]
content = content.replace(
  /<table className="w-full text-\[9px\] border-collapse font-bold uppercase">/g,
  '<table className="w-full text-[11.5px] border-collapse font-bold uppercase">'
);

fs.writeFileSync(path, content, 'utf8');
console.log('App.tsx successfully updated!');
