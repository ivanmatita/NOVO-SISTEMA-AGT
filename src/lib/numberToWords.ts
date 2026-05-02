/**
 * Conversor de números para extenso em Português (Portugal/Angola)
 */

export function numberToWords(n: number): string {
  if (n === 0) return 'zero';

  const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const tens = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const teens = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito', 'dezanove'];
  const hundreds = ['', 'cem', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  const getHundreds = (num: number): string => {
    if (num === 0) return '';
    if (num === 100) return 'cem';
    
    let res = '';
    const h = Math.floor(num / 100);
    const rest = num % 100;
    
    if (h > 0) {
      res = h === 1 ? 'cento' : hundreds[h];
    }
    
    if (rest > 0) {
       res += (res ? ' e ' : '') + getTens(rest);
    }
    
    return res;
  };

  const getTens = (num: number): string => {
    if (num < 10) return units[num];
    if (num >= 10 && num < 20) return teens[num - 10];
    
    const t = Math.floor(num / 10);
    const u = num % 10;
    
    return tens[t] + (u > 0 ? ' e ' : '') + units[u];
  };

  const parts: string[] = [];
  const billion = Math.floor(n / 1000000000);
  const million = Math.floor((n % 1000000000) / 1000000);
  const thousand = Math.floor((n % 1000000) / 1000);
  const remainder = Math.floor(n % 1000);
  const cents = Math.round((n % 1) * 100);

  if (billion > 0) {
    parts.push(billion === 1 ? 'um bilião' : getHundreds(billion) + ' biliões');
  }
  if (million > 0) {
    parts.push(million === 1 ? 'um milhão' : getHundreds(million) + ' milhões');
  }
  if (thousand > 0) {
    parts.push(thousand === 1 ? 'mil' : getHundreds(thousand) + ' mil');
  }
  if (remainder > 0) {
    parts.push(getHundreds(remainder));
  }

  let result = parts.join(', ').replace(/, ([^,]*)$/, ' e $1');
  
  if (n >= 1) {
    result += (billion === 1 && million === 0 && thousand === 0 && remainder === 0) ? ' de Kwanzas' : 
              (million === 1 && thousand === 0 && remainder === 0) ? ' de Kwanzas' : 
              (n === 1) ? ' Kwanza' : ' Kwanzas';
  }

  if (cents > 0) {
    result += (n >= 1 ? ' e ' : '') + getTens(cents) + (cents === 1 ? ' cêntimo' : ' cêntimos');
  } else if (n >= 1) {
    // Optionally add "certos" or nothing
  }

  return result.trim().charAt(0).toUpperCase() + result.trim().slice(1);
}
