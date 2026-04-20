const fs = require('fs');

const filePath = 'i:\\Salt-Profit-Share-Calculator-SaaS\\src\\App.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix revenue icon from 📦 to 💵
content = content.replace(/icon: '📦',\s+color: 'bg-\[#ffe4c4\]'/g, "icon: '💵',\n                  color: 'bg-[#ffe4c4]'");

// Fix inventory icon from 💾 to 📦
content = content.replace(/icon: '💾',\s+color: 'bg-\[#ecffb1\]'/g, "icon: '📦',\n                  color: 'bg-[#ecffb1]'");

// Fix overlay revenue icon
content = content.replace(/activeModule === 'revenue' \? '📦'/g, "activeModule === 'revenue' ? '💵'");

// Fix overlay inventory icon
content = content.replace(/activeModule === 'inventory' \? '💾'/g, "activeModule === 'inventory' ? '📦'");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Icons fixed successfully!');
