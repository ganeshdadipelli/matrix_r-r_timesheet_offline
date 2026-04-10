const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('./app2-rr/app/(dashboard)');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replaces
  content = content.replace(/bg-white/g, 'bg-[#1b2533]');
  content = content.replace(/bg-slate-50\/50/g, 'bg-[#151c27]');
  content = content.replace(/bg-slate-50(\s|\/|"|')/g, 'bg-[#111823]$1');
  content = content.replace(/bg-slate-100/g, 'bg-[#222f42]');
  content = content.replace(/bg-slate-200/g, 'bg-[#314056]');
  
  content = content.replace(/text-slate-900/g, 'text-slate-100');
  content = content.replace(/text-slate-800/g, 'text-slate-200');
  content = content.replace(/text-slate-700/g, 'text-slate-300');
  content = content.replace(/text-slate-600/g, 'text-slate-400');
  content = content.replace(/text-slate-500/g, 'text-slate-400');
  
  content = content.replace(/border-slate-100/g, 'border-[#2d3a4d]');
  content = content.replace(/border-slate-200/g, 'border-[#2d3a4d]');
  
  content = content.replace(/bg-primary-50/g, 'bg-primary-900');
  content = content.replace(/bg-primary-100/g, 'bg-primary-800');
  content = content.replace(/border-primary-100/g, 'border-primary-800');
  content = content.replace(/text-primary-800/g, 'text-primary-200');
  content = content.replace(/text-primary-700/g, 'text-primary-300');
  content = content.replace(/text-primary-900/g, 'text-primary-100');
  
  fs.writeFileSync(file, content);
});

console.log('Colors replaced successfully!');
