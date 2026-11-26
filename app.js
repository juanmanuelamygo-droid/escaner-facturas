import { CONFIG } from "./config.js";
import { extraerFecha, extraerRazonSocial, nombreArchivo } from "./parse.js";
import * as od from "./onedrive.js";

const $ = (id) => document.getElementById(id);
const paginas = []; // { url (dataURL JPEG), ancho, alto }
let ocrDePagina = null; // dataURL de la página que se leyó por última vez
let worker = null;

// ---------- Delegación ----------
const DELEGACIONES = Object.keys(CONFIG.delegaciones || {});
const disponible = (d) => od.modoPrueba || !!(CONFIG.delegaciones[d]?.url ?? CONFIG.delegaciones[d]);
let delegacion = localStorage.getItem("delegacion");
if (!DELEGACIONES.includes(delegacion) || !disponible(delegacion)) delegacion = DELEGACIONES.find(disponible) || "";

function pintarDelegaciones() {
  const cont = $("delegaciones");
  cont.innerHTML = "";
  for (const d of DELEGACIONES) {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(d === delegacion));
    b.disabled = !disponible(d);
    b.textContent = d;
    if (b.disabled) b.insertAdjacentHTML("beforeend", "<small>pendiente</small>");
    b.onclick = () => {
      delegacion = d;
      localStorage.setItem("delegacion", d);
      pintarDelegaciones();
      actualizarNombre();
    };
    cont.append(b);
  }
}

// ---------- Inicio ----------
async function arrancar() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

  if (od.modoPrueba) {
    $("aviso-prueba").hidden = false;
    mostrarEscaner();
    return;
  }
  try {
    const cuenta = await od.iniciar();
    if (!cuenta) {
      $("pantalla-login").hidden = false;
      $("btn-entrar").onclick = () => od.entrar();
      return;
    }
    $("usuario").innerHTML = "";
    $("usuario").append(cuenta.name || cuenta.username);
    const btn = document.createElement("button");
    btn.textContent = "Salir";
    btn.onclick = () => od.salir();
    $("usuario").append(btn);
    mostrarEscaner();
    od.renovarSesion();
  } catch (e) {
    mostrarResultado(false, "No se pudo iniciar sesión: " + e.message);
    $("pantalla-escaner").hidden = false;
  }
}

function mostrarEscaner() {
  $("pantalla-escaner").hidden = false;
  pintarDelegaciones();
  actualizarNombre();
}

// ---------- Fotos ----------
async function prepararImagen(archivo) {
  const bmp = await createImageBitmap(archivo);
  const max = 2000;
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return { url: c.toDataURL("image/jpeg", 0.82), ancho: c.width, alto: c.height };
}

async function añadirArchivos(lista) {
  $("resultado").hidden = true;
  for (const f of lista) {
    try {
      paginas.push(await prepararImagen(f));
    } catch {
      mostrarResultado(false, `No se pudo abrir la imagen "${f.name}".`);
    }
  }
  pintarPaginas();
  leerPrimeraPagina();
}

function pintarPaginas() {
  const ol = $("paginas");
  ol.innerHTML = "";
  paginas.forEach((p, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<img alt="Página ${i + 1}"><span class="num">${i + 1}</span><button class="quitar" title="Quitar">✕</button>`;
    li.querySelector("img").src = p.url;
    li.querySelector("button").onclick = () => {
      paginas.splice(i, 1);
      pintarPaginas();
      leerPrimeraPagina();
    };
    ol.append(li);
  });
  const hay = paginas.length > 0;
  $("datos").hidden = !hay;
  $("sin-paginas").hidden = hay;
  actualizarNombre();
}

// ---------- OCR ----------
async function leerPrimeraPagina() {
  const primera = paginas[0]?.url;
  if (!primera || primera === ocrDePagina) return;
  ocrDePagina = primera;
  const estado = $("estado-ocr");
  try {
    if (!worker) {
      estado.textContent = "Preparando el lector (solo tarda la primera vez)…";
      worker = await Tesseract.createWorker("spa", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") estado.textContent = `Leyendo la factura… ${Math.round(m.progress * 100)} %`;
        },
      });
    }
    estado.textContent = "Leyendo la factura…";
    const { data } = await worker.recognize(primera);
    if (primera !== paginas[0]?.url) return; // cambió mientras leía
    const razon = extraerRazonSocial(data.text, CONFIG.empresasPropias);
    const fecha = extraerFecha(data.text);
    if (razon && !$("razon").dataset.editado) $("razon").value = razon;
    if (fecha && !$("fecha").dataset.editado) $("fecha").value = fecha;
    const faltan = [!razon && "la razón social", !fecha && "la fecha"].filter(Boolean);
    estado.textContent = faltan.length
      ? `No he podido leer ${faltan.join(" ni ")}. Escríbelo a mano.`
      : "Revisa que los datos son correctos antes de guardar.";
    console.debug("Texto OCR:\n" + data.text);
  } catch (e) {
    estado.textContent = "No se pudo leer automáticamente. Escribe los datos a mano.";
    console.error(e);
  }
  actualizarNombre();
}

// ---------- Nombre y guardado ----------
function actualizarNombre() {
  const razon = $("razon").value.trim();
  const fecha = $("fecha").value;
  const ok = paginas.length && razon && fecha && delegacion;
  $("nombre-final").textContent = ok ? nombreArchivo(razon, fecha) + ".pdf" : "—";
  $("btn-guardar").disabled = !ok;
  const año = fecha ? fecha.slice(0, 4) : "(año de la factura)";
  $("carpeta").textContent = `${delegacion} › FACTURAS APLICACION ${año} › ${od.carpetaDelUsuario()}`;
}

function crearPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = 210, H = 297, M = 8;
  paginas.forEach((p, i) => {
    if (i) doc.addPage("a4");
    const k = Math.min((W - 2 * M) / p.ancho, (H - 2 * M) / p.alto);
    const w = p.ancho * k, h = p.alto * k;
    doc.addImage(p.url, "JPEG", (W - w) / 2, (H - h) / 2, w, h);
  });
  return doc.output("blob");
}

async function guardar() {
  const btn = $("btn-guardar");
  btn.disabled = true;
  btn.textContent = "Guardando…";
  try {
    const base = nombreArchivo($("razon").value.trim(), $("fecha").value);
    const pdf = crearPdf();
    if (od.modoPrueba) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(pdf);
      a.download = base + ".pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      mostrarResultado(true, `Modo prueba: se ha descargado <strong>${escapar(base)}.pdf</strong> (destino: ${escapar(delegacion)}).`);
    } else {
      const r = await od.subirPdf(pdf, base, $("fecha").value.slice(0, 4), delegacion);
      mostrarResultado(true, `Guardado en <strong>${escapar(r.carpeta)}</strong> como <strong>${escapar(r.nombre)}</strong>. <a href="${r.url}" target="_blank" rel="noopener">Abrir</a>`);
    }
    limpiar();
  } catch (e) {
    mostrarResultado(false, "No se pudo guardar: " + escapar(e.message));
  } finally {
    btn.textContent = "Guardar en OneDrive";
    actualizarNombre();
  }
}

function limpiar() {
  paginas.length = 0;
  ocrDePagina = null;
  for (const id of ["razon", "fecha"]) { $(id).value = ""; delete $(id).dataset.editado; }
  $("estado-ocr").textContent = "";
  pintarPaginas();
}

function mostrarResultado(ok, html) {
  const r = $("resultado");
  r.className = "resultado " + (ok ? "ok" : "error");
  r.innerHTML = html;
  r.hidden = false;
}

const escapar = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ---------- Eventos ----------
for (const id of ["in-camara", "in-galeria"]) {
  $(id).addEventListener("change", (e) => {
    añadirArchivos([...e.target.files]);
    e.target.value = "";
  });
}
for (const id of ["razon", "fecha"]) {
  $(id).addEventListener("input", () => { $(id).dataset.editado = "1"; actualizarNombre(); });
}
$("btn-guardar").onclick = guardar;
$("btn-descartar").onclick = () => { if (confirm("¿Descartar esta factura?")) limpiar(); };

arrancar();
