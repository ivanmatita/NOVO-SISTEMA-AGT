async function run() {
    const res = await fetch('http://localhost:3000/api/run-hr-setup');
    console.log(await res.text());
}
run();
