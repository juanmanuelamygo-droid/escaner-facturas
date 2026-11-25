// Inicio de sesión con Microsoft 365 y subida a la carpeta común de OneDrive (Microsoft Graph).
import { PublicClientApplication } from "https://esm.sh/@azure/msal-browser@3.27.0";
import { CONFIG } from "./config.js";

const SCOPES = ["User.Read", "Files.ReadWrite.All"];
const GRAPH = "https://graph.microsoft.com/v1.0";

let msal = null;
let cuenta = null;

export const modoPrueba = !CONFIG.clientId;

export async function iniciar() {
  if (modoPrueba) return null;
  msal = new PublicClientApplication({
    auth: {
      clientId: CONFIG.clientId,
      authority: `https://login.microsoftonline.com/${CONFIG.tenantId || "organizations"}`,
      redirectUri: location.origin + location.pathname,
    },
    cache: { cacheLocation: "localStorage" },
  });
  await msal.initialize();
  const resp = await msal.handleRedirectPromise();
  cuenta = resp?.account || msal.getAllAccounts()[0] || null;
  if (cuenta) msal.setActiveAccount(cuenta);
  return cuenta;
}

export function entrar() {
  return msal.loginRedirect({ scopes: SCOPES, prompt: "select_account" });
}

export function salir() {
  return msal.logoutRedirect({ account: cuenta });
}

export function carpetaDelUsuario() {
  if (!cuenta) return "Prueba";
  const email = (cuenta.username || "").toLowerCase();
  const mapa = Object.fromEntries(Object.entries(CONFIG.usuarios).map(([k, v]) => [k.toLowerCase(), v]));
  return (mapa[email] || cuenta.name || email.split("@")[0]).replace(/[\\/:*?"<>|#%]/g, " ").trim();
}

async function token() {
  try {
    return (await msal.acquireTokenSilent({ scopes: SCOPES, account: cuenta })).accessToken;
  } catch {
    await msal.acquireTokenRedirect({ scopes: SCOPES, account: cuenta });
    throw new Error("Redirigiendo para renovar la sesión…");
  }
}

async function graph(ruta, opciones = {}) {
  const r = await fetch(GRAPH + ruta, {
    ...opciones,
    headers: { Authorization: `Bearer ${await token()}`, ...(opciones.headers || {}) },
  });
  return r;
}

async function graphJson(ruta, opciones) {
  const r = await graph(ruta, opciones);
  if (!r.ok) throw new Error(`OneDrive respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

let raiz = null; // { driveId, id }
async function carpetaComun() {
  if (raiz) return raiz;
  if (!CONFIG.carpetaComunUrl) throw new Error("Falta carpetaComunUrl en config.js");
  const b64 = btoa(unescape(encodeURIComponent(CONFIG.carpetaComunUrl)))
    .replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
  const item = await graphJson(`/shares/u!${b64}/driveItem`);
  raiz = { driveId: item.parentReference.driveId, id: item.id };
  return raiz;
}

/** Devuelve el id de la subcarpeta `nombre` dentro de `padreId`, creándola si no existe. */
async function asegurarCarpeta(driveId, padreId, nombre) {
  const r = await graph(`/drives/${driveId}/items/${padreId}:/${encodeURIComponent(nombre)}`);
  if (r.ok) return (await r.json()).id;
  if (r.status !== 404) throw new Error(`No se pudo abrir la carpeta "${nombre}" (${r.status})`);
  const nueva = await graphJson(`/drives/${driveId}/items/${padreId}/children`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nombre, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }),
  });
  return nueva.id;
}

/** Sube el PDF a <año>/<persona>/. Si ya existe un archivo con ese nombre, añade _2, _3… */
export async function subirPdf(blob, nombreBase, año) {
  const { driveId, id: raizId } = await carpetaComun();
  const persona = carpetaDelUsuario();
  const añoId = await asegurarCarpeta(driveId, raizId, `FACTURAS APLICACION ${año}`);
  const carpetaId = await asegurarCarpeta(driveId, añoId, persona);
  const carpeta = `FACTURAS APLICACION ${año} / ${persona}`;
  for (let n = 1; n < 50; n++) {
    const nombre = `${nombreBase}${n > 1 ? "_" + n : ""}.pdf`;
    const r = await graph(
      `/drives/${driveId}/items/${carpetaId}:/${encodeURIComponent(nombre)}:/content?@microsoft.graph.conflictBehavior=fail`,
      { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: blob },
    );
    if (r.status === 409) continue;
    if (!r.ok) throw new Error(`No se pudo subir (${r.status}): ${(await r.text()).slice(0, 200)}`);
    const item = await r.json();
    return { nombre, carpeta, url: item.webUrl };
  }
  throw new Error("Demasiados archivos con el mismo nombre");
}
