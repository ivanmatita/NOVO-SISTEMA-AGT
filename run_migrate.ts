async function run() {
    const res = await fetch('http://localhost:3000/api/migrate-ativo');
    console.log(await res.text());
}
run();
