const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

const templatesMatch = code.match(/ {12}\{subTab === 'templates' && \([\s\S]*?\n {12}\)\}/);
const standardsMatch = code.match(/ {12}\{subTab === 'standards' && \([\s\S]*?\n {12}\)\}/);

if (!templatesMatch || !standardsMatch) {
  console.log("Blocks not found");
  process.exit(1);
}

const templatesCode = templatesMatch[0];
const standardsCode = standardsMatch[0];

code = code.replace(templatesCode, '');
code = code.replace(standardsCode, '');

const oldSettingsTabs = /<div className="flex items-center gap-2 bg-white p-1\.5 rounded-2xl border border-slate-200 shadow-sm scrollable-tabs">[\s\S]*?<\/div>/g;
const newSettingsTabs = `<div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm scrollable-tabs">
              <button onClick={() => setSubTab('margins')} className={\`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap \${subTab === 'margins' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}\`}>Маржинальность</button>
              <button onClick={() => setSubTab('templates')} className={\`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap \${subTab === 'templates' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}\`}>Шаблоны склада</button>
              <button onClick={() => setSubTab('standards')} className={\`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap \${subTab === 'standards' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}\`}>Стандарты склада</button>
              <button onClick={() => setSubTab('debug')} className={\`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap \${subTab === 'debug' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}\`}>Система</button>
            </div>`;

// Only replace the last occurrence (which is settings)
let matches = [...code.matchAll(oldSettingsTabs)];
if(matches.length > 0) {
  let lastMatch = matches[matches.length - 1];
  code = code.substring(0, lastMatch.index) + newSettingsTabs + code.substring(lastMatch.index + lastMatch[0].length);
}

const employeesSettingsMatch = code.match(/ {12}\{subTab === 'employees' && \([\s\S]*?\n {12}\)\}/);
if (employeesSettingsMatch) {
  code = code.replace(employeesSettingsMatch[0], '');
}

const insertPoint = "{subTab === 'margins' && (";
code = code.replace(insertPoint, templatesCode + '\n\n' + standardsCode + '\n\n            ' + insertPoint);

fs.writeFileSync('src/components/AdminDashboard.jsx', code);
console.log("Success");
