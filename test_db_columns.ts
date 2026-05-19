import 'dotenv/config';

console.log('--- Env Keys ---');
Object.keys(process.env).forEach(key => {
  if (key.includes('SUPABASE') || key.includes('DATABASE') || key.includes('DB') || key.includes('PG') || key.includes('KEY')) {
    console.log(`${key}: isSet=${!!process.env[key]}, length=${(process.env[key] || '').length}`);
  }
});
