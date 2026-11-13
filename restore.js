import { execSync } from 'child_process';
try {
  execSync('git checkout server.ts', { stdio: 'inherit' });
  console.log('Restored server.ts');
} catch (e) {
  console.error('Failed to checkout:', e);
}
