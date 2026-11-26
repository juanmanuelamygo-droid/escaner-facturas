// ==== CONFIGURACIÓN DE LA APP ====
// Rellena estos datos siguiendo la guía de LEEME.md.
// Mientras clientId esté vacío, la app funciona en "modo prueba":
// no pide inicio de sesión y descarga el PDF en el dispositivo en vez de subirlo.

export const CONFIG = {
  // Id. de aplicación (cliente) del registro en Microsoft Entra ID
  clientId: "5b88f28d-2738-4e1b-98a4-0f9970a8adb9",

  // Id. de directorio (inquilino) de vuestro Microsoft 365
  tenantId: "2c775744-906d-4c3a-a0c9-8c4f20d4d209",

  // Carpeta de cada delegación (botón "Compartir" > "Copiar vínculo" sobre la carpeta que tiene dentro los años).
  // Dentro, la app guarda en  FACTURAS APLICACION <año>/<persona>/  y crea las carpetas que falten.
  // Una delegación con el enlace vacío aparece en la app como "pendiente" y no se puede elegir.
  delegaciones: {
    SEVILLA: "https://pabloehijos-my.sharepoint.com/:f:/p/sergiorubio/IgCNiE7eG3lCS41y6GnWCnmNASWZYx4fAkRSu7TDshXMMP4?e=3kirHQ",
    // Barcelona: el enlace es de la carpeta 2026 (FACTURAS BARCELONA › 2026); en enero cambiar al de 2027.
    BARCELONA: "https://pabloehijos-my.sharepoint.com/:f:/p/sergiorubio/IgBSq8mRSvHPRZSCZaz-z3h2AVtTd9ZwpTTzca73Wa2lQxM?e=Z28kON",
    // Madrid: el enlace es de la carpeta 2026 (FACTURAS MADRID › 2026); en enero cambiar al de 2027.
    MADRID: "https://pabloehijos-my.sharepoint.com/:f:/p/sergiorubio/IgCBEMtT9vTIRLK90J6kdCC0AS_PsInbAgeQ3k1dZDFUWJk?e=jxr6Kz",
    // Bruselas: enlace de BRUSELAS › 2026, y dentro se usa la carpeta FACTURAS BRUSELAS; en enero cambiar al de 2027.
    BRUSELAS: {
      url: "https://pabloehijos-my.sharepoint.com/:f:/p/sergiorubio/IgCmcOUOcF_7SbZ1h1hmX6TpAeIh4LhMtAg1NHneHrnE2u4?e=t5wOZ9",
      ruta: "FACTURAS BRUSELAS",
    },
  },

  // Nombre de la carpeta de cada persona, según su correo de empresa.
  // Si alguien no está en la lista, se usa su nombre completo de Microsoft 365.
  // Si la carpeta no existe, la app la crea.
  usuarios: {
    "juanmanuel@pabloehijos.com": "JUAN MANUEL RUBIO",
    "sergiorubio@pabloehijos.com": "SERGIO RUBIO",
    "mario.rubio@pabloehijos.com": "MARIO RUBIO",
    "pablorubio@pabloehijos.com": "PABLO RUBIO",
    "pablorubio@amadomiguel.com": "PABLO RUBIO", // invitado externo
  },

  // Vuestras propias razones sociales: la app las ignora al leer la factura
  // (porque aparecéis como cliente y no son el proveedor). Basta con una palabra clave.
  empresasPropias: [
    "PABLO GRUPO",
    "AMYGO",
  ],
};
