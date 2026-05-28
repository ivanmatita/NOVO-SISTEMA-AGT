import fetch from 'node-fetch';

async function testLookup(username: string) {
  const url = `http://localhost:3000/api/auth/email-by-username?username=${encodeURIComponent(username)}`;
  console.log(`Testing lookup for: [${username}] at ${url}`);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(`Status: ${res.status}, Data:`, data);
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

// Replace with a known username from the previous inspect output
testLookup('laiznsnsn');
testLookup('Domingos');
