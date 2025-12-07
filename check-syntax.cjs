const fs = require('fs');
const code = fs.readFileSync('js/components/App.jsx', 'utf8');

let braces = 0, parens = 0, brackets = 0;
for (let i = 0; i < code.length; i++) {
    if (code[i] === '{') braces++;
    if (code[i] === '}') braces--;
    if (code[i] === '(') parens++;
    if (code[i] === ')') parens--;
    if (code[i] === '[') brackets++;
    if (code[i] === ']') brackets--;
}

console.log('Brace balance (should be 0):', braces);
console.log('Paren balance (should be 0):', parens);
console.log('Bracket balance (should be 0):', brackets);

if (braces === 0 && parens === 0 && brackets === 0) {
    console.log('\n✅ No corruption detected - all brackets balanced!');
} else {
    console.log('\n❌ CORRUPTION DETECTED - unbalanced brackets!');
}
