// Inicio de sesión con Microsoft 365 y subida a la carpeta común de OneDrive (Microsoft Graph).
import { PublicClientApplication, InteractionRequiredAuthError } from "https://esm.sh/@azure/msal-browser@3.27.0";
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

// Mantener la sesión: MSAL guarda la sesión en el dispositivo (localStorage) y la renueva sola.
// Si Microsoft pide volver a confirmar, se redirige con la cuenta ya elegida; mientras la sesión
// de Microsoft siga activa ("Mantener la sesión iniciada"), no se vuelve a pedir la contraseña.
async function token() {
  try {
    return (await msal.acquireTokenSilent({ scopes: SCOPES, account: cuenta })).accessToken;
  } catch (e) {
    if (!(e instanceof InteractionRequiredAuthError)) throw e;
    await msal.acquireTokenRedirect({ scopes: SCOPES, account: cuenta, loginHint: cuenta.username });
    throw new Error("Renovando la sesión…");
  }
}

/** Se llama al abrir la app: renueva la sesión antes de hacer fotos, para no perderlas a mitad. */
export async function renovarSesion() {
  try {
    await token();
  } catch (e) {
    console.warn("No se pudo renovar la sesión ahora:", e);
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

const raices = {}; // delegación -> { driveId, id }
async function carpetaDelegacion(delegacion) {
  if (raices[delegacion]) return raices[delegacion];
  const url = CONFIG.delegaciones?.[delegacion];
  if (!url) throw new Error(`Falta el enlace de la carpeta de ${delegacion} en config.js`);
  const b64 = btoa(unescape(encodeURIComponent(url)))
    .replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
  const r = await graph(`/shares/u!${b64}/driveItem`);
  if (r.status === 403 || r.status === 404)
    throw new Error(`No tienes acceso a la carpeta de ${delegacion}. Pide al dueño que te la comparta con permiso de edición.`);
  if (!r.ok) throw new Error(`OneDrive respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const item = await r.json();
  raices[delegacion] = { driveId: item.parentReference.driveId, id: item.id };
  return raices[delegacion];
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

/** Sube el PDF a <delegación>/FACTURAS APLICACION <año>/<persona>/. Si ya existe un archivo con ese nombre, añade _2, _3… */
export async function subirPdf(blob, nombreBase, año, delegacion) {
  const { driveId, id: raizId } = await carpetaDelegacion(delegacion);
  const persona = carpetaDelUsuario();
  const añoId = await asegurarCarpeta(driveId, raizId, `FACTURAS APLICACION ${año}`);
  const carpetaId = await asegurarCarpeta(driveId, añoId, persona);
  const carpeta = `${delegacion} › FACTURAS APLICACION ${año} › ${persona}`;
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
