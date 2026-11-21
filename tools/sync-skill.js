#!/usr/bin/env node
// sync-skill.js: copy the runnable kit into skills/animated-sprite-stacks/template/, so an installed copy of the
// skill can start a new project without this repository. Run it after changing the kit:
//
//   node tools/sync-skill.js
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), dest = path.join(root, 'skills', 'animated-sprite-stacks', 'template');
const KIT = ['index.html', 'character.js', 'js', 'art', 'tools/build-art.js', 'tools/capture.py', 'tools/encode.sh', 'examples/robot/character.js', 'examples/robot/art', 'docs/TUTORIAL.md', 'docs/steps'];
let n = 0;
function copy(from, to) {
  const st = fs.statSync(from);
  if (st.isDirectory()) { fs.mkdirSync(to, { recursive: true }); for (const f of fs.readdirSync(from)) copy(path.join(from, f), path.join(to, f)); return; }
  fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); n++;
}
for (const k of KIT) copy(path.join(root, k), path.join(dest, k));
console.log('template: ' + n + ' files copied to ' + path.relative(root, dest));
