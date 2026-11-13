async function run() {
  const payload = { 
    cliente_id: null, 
    client_name: "Consumidor Final",
    date: "2026-06-10", 
    due_date: "2026-06-10",
    items: [],
    document_type: "Fatura",
    vat_withholding: 0,
    exchange_rate: 1,
    currency: "AOA",
    moeda: "AOA",
    counter_value: 0,
    cash_box: "",
    payment_method: "A Prazo",
    series_id: 64,
    total: 100,
    total_in_words: "Cem Kwanzas",
    empresa_id: "2ebafa88-9a6e-4243-b127-b146410815eb",
    criado_por: "d90fb35e-184b-4bb6-8545-5f62067cc3e8"
  };

  try {
    const res = await fetch('http://localhost:3000/api/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('Response Status:', res.status);
    const data = await res.json();
    console.log('Response Data:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
