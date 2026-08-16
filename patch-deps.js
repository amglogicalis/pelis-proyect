const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, 'node_modules', 'uint8-util', 'dist', 'src', 'node.js'),
  path.join(__dirname, 'node_modules', 'uint8-util', 'dist', 'src', 'index.js')
];

for (const file of targets) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes("typeof data === 'string'")) {
      content = content.replace(
        "export const arr2hex = (data) => Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('hex');",
        "export const arr2hex = (data) => typeof data === 'string' ? data : (data ? Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('hex') : '');"
      );
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Patched: ${file}`);
    }
  }
}
