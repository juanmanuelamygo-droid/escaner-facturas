# Escáner de facturas: guía de puesta en marcha

Con esta app se hace una foto a la factura o al ticket. La app lee la razón social y la fecha, que la persona revisa, y guarda un PDF llamado `dd-mm-aaaa RAZON SOCIAL.pdf` en `FACTURAS SEVILLA/FACTURAS APLICACION <año>/<persona>/`.

- La lectura (OCR) se hace en el propio móvil. Es **gratis** y no envía la imagen a ningún servicio externo.
- Si la factura tiene varias páginas, se hacen varias fotos y todas acaban en un único PDF.
- Si ya existe un archivo con el mismo nombre, se guarda como `_2`, `_3`, etc.
- Mientras `config.js` no esté rellenado, la app funciona en **modo prueba**: en vez de subir el PDF, lo descarga en el dispositivo.

La puesta en marcha tiene 5 pasos y lleva unos 20 minutos.

---

## 1. Enlace de la carpeta FACTURAS SEVILLA

La carpeta ya existe: `Grupo PABLO > PABLO > SEVILLA > CONTABILIDAD (SILVIA) > FACTURAS PROVEEDORES > FACTURAS PABLO GRUPO EMPRESARIAL > FACTURAS SEVILLA`.

1. Abre OneDrive en el navegador (https://www.office.com, y luego OneDrive) y busca esa carpeta, `FACTURAS SEVILLA`. No es la carpeta 2026.
2. Comprueba que las 6 personas tienen permiso para **editar** en ella.
3. Pulsa **Compartir > Copiar vínculo** y guárdalo. Lo necesitarás en el paso 4.

La app crea sola las carpetas `FACTURAS APLICACION 2026`, `FACTURAS APLICACION 2027`… y la de cada persona dentro.

## 2. Publicar la app (gratis, con GitHub Pages)

1. Crea una cuenta gratuita en https://github.com.
2. Crea un repositorio nuevo, por ejemplo `escaner-facturas`, y sube **todos los archivos de esta carpeta**. Se puede hacer arrastrándolos desde "Add file > Upload files".
3. En el repositorio, entra en **Settings > Pages**. En "Branch" elige `main` y la carpeta `/ (root)`, y pulsa **Save**.
4. Al cabo de un minuto la app estará en una dirección como `https://TU-USUARIO.github.io/escaner-facturas/`. Esa es la **URL de la app**.

La app tiene que estar en una dirección `https://` para que funcionen la cámara y el inicio de sesión. GitHub Pages ya lo cumple.

## 3. Registrar la app en Microsoft 365

Este paso lo tiene que hacer alguien con permisos de **administrador** de Microsoft 365.

1. Entra en https://entra.microsoft.com y ve a **Aplicaciones > Registros de aplicaciones > Nuevo registro**.
2. Rellena el formulario:
   - Nombre: `Escáner de facturas`
   - Tipos de cuenta: **Solo las cuentas de este directorio organizativo**
   - URI de redirección: elige la plataforma **Aplicación de página única (SPA)** y pega la **URL de la app** del paso 2, con la `/` final.
3. Pulsa **Registrar**. En la página que aparece, copia:
   - **Id. de aplicación (cliente)**
   - **Id. de directorio (inquilino)**
4. Ve a **Permisos de API > Agregar un permiso > Microsoft Graph > Permisos delegados** y marca:
   - `User.Read`
   - `Files.ReadWrite.All`
5. Pulsa **Conceder consentimiento de administrador para…**. Así nadie verá avisos raros al entrar.

## 4. Rellenar `config.js`

Edita `config.js`. En GitHub se puede hacer directamente: abre el archivo y pulsa el lápiz.

```js
clientId: "el Id. de aplicación del paso 3",
tenantId: "el Id. de directorio del paso 3",
carpetaComunUrl: "el vínculo copiado en el paso 1",
usuarios: {
  "ana.lopez@empresa.com": "Ana",
  "pedro.ruiz@empresa.com": "Pedro",
  // ... las 6 personas. Si no pones a alguien, su carpeta tendrá su nombre completo.
},
empresasPropias: ["PABLO GRUPO"], // ya puesto: para que no la confunda con el proveedor
```

Guarda los cambios. En un minuto estarán publicados.

## 5. Instalarla en el móvil

- **Android (Chrome):** abre la URL de la app, pulsa el menú ⋮ y luego **Instalar aplicación** o **Añadir a pantalla de inicio**.
- **iPhone (Safari):** abre la URL de la app, pulsa **Compartir** y luego **Añadir a pantalla de inicio**.

La primera vez, cada persona entra con su cuenta de la empresa. Ya no tendrá que volver a hacerlo.

**Si sale el error AADSTS50020 ("identity provider 'live.com'")**: con ese correo también existe una cuenta personal de Microsoft, y el navegador ha entrado con ella. Hay que cerrar sesión en https://login.live.com, o usar una ventana privada, y al iniciar sesión elegir **Cuenta profesional o educativa**.

---

## Uso diario

1. Pulsa **📷 Hacer foto**. Si la factura tiene varias páginas, repite con cada una.
2. Espera unos segundos a que rellene **Razón social** y **Fecha**. La primera vez tarda algo más porque descarga el lector.
3. Revisa los datos y corrígelos si hace falta.
4. Pulsa **Guardar en OneDrive**.

Para que lea mejor: haz la foto de frente, con buena luz y con el papel ocupando casi toda la imagen.

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.html`, `styles.css` | Pantalla de la app |
| `app.js` | Fotos, lectura, creación del PDF |
| `parse.js` | Reglas para encontrar la razón social y la fecha |
| `onedrive.js` | Inicio de sesión y subida a OneDrive |
| `config.js` | Vuestros datos (paso 4) |
| `manifest.webmanifest`, `sw.js`, `icono-*.png` | Permiten instalarla en el móvil |
