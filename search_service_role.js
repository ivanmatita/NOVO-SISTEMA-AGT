import fs from 'fs';
import path from 'path';

function searchFiles(dir) {
    let results = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fullPath.includes('node_modules') || fullPath.includes('.git') || fullPath.includes('dist')) continue;
        
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            results = results.concat(searchFiles(fullPath));
        } else if (stat.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.env') || fullPath.endsWith('.env.example'))) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (content.includes('SERVICE_ROLE_KEY') || content.includes('service_role') || content.includes('SERVICE_ROLE')) {
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                    if (line.includes('SERVICE_ROLE_KEY') || line.includes('service_role') || line.includes('SERVICE_ROLE')) {
                        results.push({ path: fullPath, line: index + 1, text: line.trim() });
                    }
                });
            }
        }
    }
    return results;
}

const res = searchFiles('.');
console.log(JSON.stringify(res, null, 2));
