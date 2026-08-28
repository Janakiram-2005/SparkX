const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.jsx') || file.endsWith('.js')) results.push(file);
    }
  });
  return results;
}

const files = walk('src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const targetStr = "${import.meta.env.PROD ? '' : 'http://localhost:5000'}";
  if (content.includes(targetStr)) {
    content = content.split(targetStr).join("${import.meta.env.PROD ? '/sparkx' : 'http://localhost:6012'}");
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
console.log('Done replacement.');
