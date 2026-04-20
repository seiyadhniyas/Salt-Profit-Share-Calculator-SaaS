const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/App.jsx');
let content = fs.readFileSync(file, 'utf8');

// Fix revenue icon
content = content.replace(
  /id: 'revenue'[\s\S]*?icon: '([^']*)?'/,
  match => match.replace(/icon: '[^']*'/, "icon: '💵'")
);

// Fix inventory icon  
content = content.replace(
  /id: 'inventory'[\s\S]*?icon: '([^']*)?'/,
  match => match.replace(/icon: '[^']*'/, "icon: '📦'")
);

fs.writeFileSync(file, content, 'utf8');
console.log('✅ Fixed: REVENUE=💵, INVENTORY=📦');
