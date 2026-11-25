// Lectura de la razón social y la fecha a partir del texto del OCR.
// Son heurísticas: el usuario siempre puede corregir el resultado antes de guardar.

const MESES = {
  enero: 1, ene: 1, febrero: 2, feb: 2, marzo: 3, mar: 3, abril: 4, abr: 4,
  mayo: 5, may: 5, junio: 6, jun: 6, julio: 7, jul: 7, agosto: 8, ago: 8,
  septiembre: 9, setiembre: 9, sep: 9, sept: 9, set: 9, octubre: 10, oct: 10,
  noviembre: 11, nov: 11, diciembre: 12, dic: 12,
};

function fechaValida(d, m, y) {
  if (y < 100) y += 2000;
  const hoy = new Date();
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  if (y < 2000 || y > hoy.getFullYear() + 1) return null;
  const f = new Date(y, m - 1, d);
  if (f.getDate() !== d) return null; // 31-02, etc.
  return { d, m, y };
}

/** Devuelve la fecha más probable como "AAAA-MM-DD" (para <input type=date>) o "". */
export function extraerFecha(texto) {
  const lineas = texto.split(/\r?\n/);
  const candidatas = [];
  const nombresMes = Object.keys(MESES).sort((a, b) => b.length - a.length).join("|");
  const reNum = /(?<!\d)(\d{1,2})\s?[\/\-\.]\s?(\d{1,2})\s?[\/\-\.]\s?(\d{4}|\d{2})(?!\d)/g;
  const reIso = /(?<!\d)(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(?!\d)/g;
  const reTxt = new RegExp(`(?<!\\d)(\\d{1,2})\\s*(?:de\\s+|[\\-\\/\\.\\s])\\s*(${nombresMes})\\.?\\s*(?:de\\s+|[\\-\\/\\.\\s])\\s*(\\d{4}|\\d{2})(?!\\d)`, "gi");

  lineas.forEach((linea, i) => {
    const l = linea.toLowerCase();
    let puntos = -i * 0.1; // ligera preferencia por lo que aparece antes
    if (/fecha|fec\.|date|emisi[oó]n|expedici[oó]n/.test(l)) puntos += 10;
    if (/venc|caduc|entrega|pedido|albar[aá]n|desde|hasta|per[ií]odo/.test(l)) puntos -= 6;
    const añadir = (f) => f && candidatas.push({ ...f, puntos });
    for (const m of linea.matchAll(reNum)) añadir(fechaValida(+m[1], +m[2], +m[3]));
    for (const m of linea.matchAll(reIso)) añadir(fechaValida(+m[3], +m[2], +m[1]));
    for (const m of linea.matchAll(reTxt)) añadir(fechaValida(+m[1], MESES[m[2].toLowerCase()], +m[3]));
  });

  if (!candidatas.length) return "";
  candidatas.sort((a, b) => b.puntos - a.puntos);
  const { d, m, y } = candidatas[0];
  const yy = y < 100 ? y + 2000 : y;
  return `${yy}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Formas jurídicas españolas habituales (S.L., S.A., S.L.U., S.COOP., C.B., ...)
const FORMA = String.raw`(?:S\.?\s?L\.?\s?(?:U\.?|L\.?|N\.?\s?E\.?)?|S\.?\s?A\.?\s?(?:U\.?)?|S\.?\s?COOP\.?(?:\s?AND\.?)?|C\.?\s?B\.?|SOCIEDAD\s+(?:LIMITADA|AN[OÓ]NIMA|COOPERATIVA)(?:\s+UNIPERSONAL)?)`;
const reForma = new RegExp(String.raw`(^|[\s,])${FORMA}(?=$|[\s,;:\-\)])`, "i");
const reHastaForma = new RegExp(String.raw`^(.*?(?:^|[\s,])${FORMA})(?=$|[\s,;:\-\)])`, "i");
const PREFIJOS = /^(raz[oó]n\s+social|emisor|proveedor|empresa|vendedor|datos\s+(del\s+)?emisor)\s*[:\-]?\s*/i;
const RUIDO = /factura|ticket|simplificad|n[ºo°]\s|nif|cif|tel[eé]?f|tlf|fecha|total|iva|base|importe|cliente|direcci|c\/|calle|avda|www\.|@|http|gracias|cambio|efectivo|tarjeta|hora|caja|mesa|cajer|atendid/i;

function limpiarNombre(s) {
  return s
    .replace(PREFIJOS, "")
    .replace(/[|_~=*«»"“”]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-.,:;]+|[\s\-,:;]+$/g, "")
    .trim()
    .toUpperCase();
}

/** Devuelve la razón social más probable del emisor o "". */
export function extraerRazonSocial(texto, empresasPropias = []) {
  const propias = empresasPropias.map((e) => e.trim().toUpperCase()).filter(Boolean);
  const esPropia = (s) => propias.some((p) => s.toUpperCase().includes(p));
  const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1) Líneas con forma jurídica (S.L., S.A., ...)
  const candidatas = [];
  lineas.forEach((linea, i) => {
    const sinPrefijo = linea.replace(PREFIJOS, "");
    if (!reForma.test(sinPrefijo) || esPropia(sinPrefijo)) return;
    const m = sinPrefijo.match(reHastaForma);
    const nombre = limpiarNombre(m ? m[1] : sinPrefijo);
    const letras = (nombre.match(/[A-ZÁÉÍÓÚÑÜ]/g) || []).length;
    if (letras < 3) return;
    let puntos = 20 - i; // los datos del emisor suelen ir arriba
    const cerca = lineas.slice(Math.max(0, i - 1), i + 3).join(" ");
    if (/nif|cif|n\.i\.f|c\.i\.f/i.test(cerca)) puntos += 3;
    if (/cliente|destinatario|facturar\s+a/i.test(lineas.slice(Math.max(0, i - 2), i + 1).join(" "))) puntos -= 15;
    candidatas.push({ nombre, puntos });
  });
  if (candidatas.length) {
    candidatas.sort((a, b) => b.puntos - a.puntos);
    return candidatas[0].nombre;
  }

  // 2) Sin forma jurídica (típico en tickets): primera línea "con pinta de nombre"
  for (const linea of lineas.slice(0, 8)) {
    const letras = (linea.match(/[A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g) || []).length;
    const digitos = (linea.match(/\d/g) || []).length;
    if (letras < 4 || digitos > letras / 2 || RUIDO.test(linea) || esPropia(linea)) continue;
    return limpiarNombre(linea);
  }
  return "";
}

/** "AAAA-MM-DD" -> "DD-MM-AAAA" */
export function fechaParaNombre(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

/** Quita caracteres no permitidos en OneDrive y arma "dd-mm-aaaa RAZON SOCIAL" (sin .pdf). */
export function nombreArchivo(razonSocial, fechaIso) {
  const limpio = razonSocial
    .replace(/[\\/:*?"<>|#%\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
    .trim();
  return `${fechaParaNombre(fechaIso)} ${limpio}`;
}
