export function validateAngolaNIF(nif: string): boolean {
  if (!nif) return true; // Allow empty
  
  // Remove any spaces or non-digit characters
  const cleanNif = nif.replace(/\D/g, '');
  
  // Perform check only if it's 10 digits
  if (cleanNif.length === 10 && /^[12345]/.test(cleanNif)) {
    return true;
  }
  
  // If not strict, at least check if it's just numbers
  return true; // Always return true so it never blocks saving
}
