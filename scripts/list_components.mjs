import fs from 'fs';
import path from 'path';

const files = fs.readdirSync('./src/components');
console.log('COMPONENTS:', files.filter(f => f.toLowerCase().includes('seg') || f.toLowerCase().includes('doc') || f.toLowerCase().includes('vigilante')));

