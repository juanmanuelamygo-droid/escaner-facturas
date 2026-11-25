// ==== CONFIGURACIÓN DE LA APP ====
// Rellena estos datos siguiendo la guía de LEEME.md.
// Mientras clientId esté vacío, la app funciona en "modo prueba":
// no pide inicio de sesión y descarga el PDF en el dispositivo en vez de subirlo.

export const CONFIG = {
  // Id. de aplicación (cliente) del registro en Microsoft Entra ID
  clientId: "",

  // Id. de directorio (inquilino) de vuestro Microsoft 365
  tenantId: "",

  // Enlace de la carpeta "FACTURAS SEVILLA" (botón "Compartir" > "Copiar vínculo").
  // Dentro, la app guarda en  <año de la factura>/<persona>/  y crea las carpetas que falten.
  carpetaComunUrl: "https://pabloehijos-my.sharepoint.com/:f:/p/sergiorubio/IgCNiE7eG3lCS41y6GnWCnmNASWZYx4fAkRSu7TDshXMMP4?e=3kirHQ",

  // Nombre de la carpeta de cada persona, según su correo de empresa.
  // Si alguien no está en la lista, se usa su nombre completo de Microsoft 365.
  // Si la carpeta no existe, la app la crea.
  usuarios: {
    // "nombre.apellido@empresa.com": "Nombre",
  },

  // Vuestras propias razones sociales: la app las ignora al leer la factura
  // (porque aparecéis como cliente y no son el proveedor). Basta con una palabra clave.
  empresasPropias: [
    "PABLO GRUPO",
  ],
};
