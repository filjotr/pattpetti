const fs = require('fs');
const path = require('path');
const pagesDir = path.join(__dirname, 'client', 'src', 'pages');

const files = fs.readdirSync(pagesDir);
for (const file of files) {
  if (file.endsWith('.jsx')) {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace hardcoded dark blue with neumorphic background
    content = content.replace(/background:\s*['"]#0F172A['"]/g, "background: 'var(--bg)'");
    
    // Replace min-h-screen with min-h-[100dvh]
    content = content.replace(/className="min-h-screen/g, 'className="min-h-[100dvh]');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
  }
}
