async function run() {
  try {
    const res = await fetch('http://localhost:3000/src/App.tsx');
    console.log("STATUS:", res.status);
    const text = await res.text();
    if (res.status !== 200) {
      console.log("TEXT START:", text.substring(0, 1000));
    } else {
      console.log("SUCCESS");
    }
  } catch (e) {
    console.error("ERROR:", e);
  }
}
run();
