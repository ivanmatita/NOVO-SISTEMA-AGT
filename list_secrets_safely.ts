console.log("Secret keys available:", Object.keys(process.env).filter(k => k.includes("KEY") || k.includes("SECRET") || k.includes("PASSWORD") || k.includes("SUPABASE")));
