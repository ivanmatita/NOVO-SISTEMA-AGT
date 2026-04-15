export function validateAngolaNIF(nif: string): boolean {
  if (!nif) return false;
  
  // Remove any spaces or non-digit characters
  const cleanNif = nif.replace(/\D/g, '');
  
  if (cleanNif.length !== 10) return false;
  
  // NIFs in Angola typically start with 1, 2, 3, 4, or 5
  if (!/^[12345]/.test(cleanNif)) return false;
  
  return true;
}
