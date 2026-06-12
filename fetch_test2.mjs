async function run() {
  try {
    const res = await fetch('http://localhost:3000/src/main.tsx');
    console.log("STATUS:", res.status);
    console.log("HEADERS:", res.headers);
    const text = await res.text();
    console.log("TEXT START:", text.substring(0, 500));
  } catch (e) {
    console.error("ERROR:", e);
  }
}
run();
