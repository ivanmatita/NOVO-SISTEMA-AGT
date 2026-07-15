const fs = require('fs');
const readline = require('readline');

async function run() {
  const fileStream = fs.createReadStream('C:\\\\Users\\\\Ivan\\\\.gemini\\\\antigravity\\\\brain\\\\be78e213-5723-49e9-911a-18e7204fa8a9\\\\.system_generated\\\\logs\\\\transcript_full.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const data = JSON.parse(line);
    if (data.step_index === 187) {
      console.log('Found step 187!');
      fs.writeFileSync('scratch/recovered_diff.txt', data.content, 'utf8');
      console.log('Saved diff to scratch/recovered_diff.txt');
      break;
    }
  }
}

run().catch(console.error);
