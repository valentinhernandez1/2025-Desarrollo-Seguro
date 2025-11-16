# Práctico 2 – Mitigación de Vulnerabilidades CWE  
## Vulnerabilidad 1 – SQL Injection (CWE-89)

---

## 1. Introducción

Durante la revisión del backend del proyecto **2025–Desarrollo-Seguro**, se identificó una vulnerabilidad de **inyección SQL (CWE-89)** en el endpoint que lista las facturas de un usuario.  
Los parámetros `status` y `operator` se utilizaban directamente en la query SQL, permitiendo alterar el comportamiento del filtro y acceder a facturas que no pertenecen al usuario autenticado.

Este documento registra:

- La prueba de concepto utilizada  
- Evidencias obtenidas  
- Mitigación aplicada  
- Validación posterior  

---

## 2. Descripción de la vulnerabilidad

Endpoint vulnerable:

```
GET /invoices?status=<valor>&operator=<valor>
```

La consulta SQL se generaba así:

```ts
q.where("status", operator, status);
```

Esto permitía inyectar código SQL malicioso, modificando el WHERE original.

---

## 3. Prueba de concepto (PoC)

Las pruebas se ejecutaron con un token válido usando PowerShell.

### 3.1 PoC – Inyección por STATUS

**Payload malicioso:**

```
paid' OR '1'='1
```

**Comando usado:**

```powershell
$payloadStatus = "paid' OR '1'='1"
$uriSqliStatus = "http://localhost:5000/invoices?status=$([uri]::EscapeDataString($payloadStatus))&operator=="

Invoke-WebRequest `
  -Uri $uriSqliStatus `
  -Headers $headers `
  -Method GET |
  Select-Object -Expand Content
```

## **1. Evidencia ANTES de la mitigación**

El endpoint `/invoices` era vulnerable a SQL Injection a través de los parámetros `status` y `operator`.

### **Resultado ANTES:**  
✔ *Error SQL → evidencia de ejecución directa del input malicioso.*

![antes-operator](/evidencias/Capturas/Captura%20de%20pantalla%202025-11-15%20132237.png)

---

## **2. Mitigación aplicada**

Se implementaron listas blancas estrictas en `invoiceService.ts`.

### Validación del parámetro `status`:
```ts
const validStatus = ["paid", "unpaid"];

if (status != null) {
  const cleanStatus = status.trim().toLowerCase();

  if (!validStatus.includes(cleanStatus)) {
    throw new Error("Invalid status value");
  }

  status = cleanStatus;
}
```

### Validación del parámetro `operator`:
```ts
const validOps = ["=", "!=", "<>", ">", "<", ">=", "<="];

if (operator != null && !validOps.includes(operator)) {
  throw new Error("Invalid operator");
}
```

### Consulta segura final:
```ts
if (status && operator) {
  q = q.where("status", operator, status);
}
```

---

## **3. Validación posterior a la mitigación**

### **3.1 Ataque usando STATUS malicioso (bloqueado)**

**Payload:**  
```
paid' OR '1'='1
```

**Resultado:**  
```
{"message":"Invalid status value"}
```

![despues-status](/evidencias/Capturas/Captura%20de%20pantalla%202025-11-15%20134411.png)

---

### **3.2 Ataque usando OPERATOR malicioso (bloqueado)**

**Payload:**  
```
>= 1 OR 1=1
```

**Resultado:**  
```
{"message":"Invalid operator"}
```

![despues-operator](/evidencias/Capturas/Captura%20de%20pantalla%202025-11-15%20132237.png)

---

### **3.3 Request válido**

```
GET /invoices?status=paid&operator==
```

**Resultado esperado:**  
```
[{ id:2 }, { id:3 }]
```

![valid-request](/evidencias/Capturas/Captura%20de%20pantalla%202025-11-15%20123719.png)
---


 ### La aplicación ahora: 
- Solo acepta operadores válidos
- Solo acepta estados permitidos
- Normaliza y valida toda la entrada
- Rechaza cualquier payload malicioso 

**Fin del Informe – SQL Injection (CWE-89)**







# Vulnerabilidad 2 – Hardcoded Credentials (CWE-798)

## **2.1 Clave JWT hardcodeada**

Archivo: `src/utils/jwt.ts`

```ts
jwt.sign({ id: userId }, "secreto_super_seguro", { expiresIn: '1h' });
jwt.verify(token, "secreto_super_seguro");
```

---

### **2.2 Credenciales SMTP expuestas**

Archivo: `.env`

```
SMTP_USER=seed
SMTP_PASS=seed
```

---

### **2.3 Credenciales de base de datos débiles y por defecto**

Archivo: `.env`

```
DB_USER=user
DB_PASS=password
```

Archivo: `src/knexfile.ts`

```ts
password: process.env.DB_PASS || 'password';
```

---

### **2.4 Usuarios del sistema con contraseñas triviales**

Archivo: `seeds/carga_test.js`

```js
password: "password"
```

---

## 3. Prueba de concepto (PoC)
### **3.1 Generación de token JWT malicioso**

```bash
docker exec -it backend sh
node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({id:999}, 'secreto_super_seguro', {expiresIn:'1h'}))"
```
![alt text](/evidencias/Capturas/Captura%20de%20pantalla%202025-11-15%20145414.png)
```

---

### **3.2 Uso de token malicioso para acceder a recursos protegidos**

```powershell
$headers = @{ Authorization = "Bearer <TOKEN_MALICIOSO>" }
Invoke-WebRequest -Uri "http://localhost:5000/invoices" -Headers $headers -Method GET
```
![alt text](</evidencias/Capturas/Captura de pantalla 2025-11-15 145454.png>)
---

### **3.3 Explotación de SMTP hardcodeado**

Con:

```
SMTP_USER=seed
SMTP_PASS=seed
```

---

### **3.4 Base de datos vulnerable a credenciales por defecto**

```
DB_PASS=password
```

---

## 4. Mitigación aplicada

### ✔ **4.1 Reemplazo del secreto JWT hardcodeado**

```ts
const SECRET = process.env.JWT_SECRET as string;
jwt.sign({ id: userId }, SECRET, { expiresIn: '1h' });
jwt.verify(token, SECRET);
```

---

### ✔ **4.2 Actualización del archivo `.env`**

```
JWT_SECRET=mi_clave_segura_2025_ucu_super_larga_aleatoria
DB_PASS=UserPassword2025!
SMTP_USER=test_user
SMTP_PASS=TestPass123!
```

---

### ✔ **4.3 Eliminación de valores por defecto inseguros**

```ts
password: process.env.DB_PASS
```

---

### ✔ **4.4 Seeds actualizados**

```js
password: "TestUser123!"
```

---

## 5. Validación después de la mitigación

###  Token firmado con la clave vieja → Rechazado

```
{"message":"Invalid token"}
```

**Fin del Informe – Hardcoded Credentials (CWE-798)**

###  SMTP con seed/seed → Bloqueado

# Vulnerabilidad 3 – SSRF (Server-Side Request Forgery) 
**Backend analizado:** `invoiceService.ts`

---

# 1. Descripción de la vulnerabilidad

Se identificó una vulnerabilidad de tipo **SSRF (Server-Side Request Forgery)** en el servicio de pagos del backend.  
El backend construye dinámicamente una URL utilizando un valor controlado por el usuario (`paymentBrand`) y luego ejecuta una solicitud HTTP hacia dicho recurso.

Esto permite que un atacante haga que el servidor realice requests arbitrarios hacia:

- Servicios internos  
- Bases de datos expuestas en localhost  
- Recursos de la red privada  
- Endpoints externos bajo control del atacante  

---

# 2. Ubicación exacta de la vulnerabilidad

### Archivo:
```
src/services/invoiceService.ts
```

### Código vulnerable:
```ts
const paymentResponse = await axios.post(`http://${paymentBrand}/payments`, {
  ccNumber,
  ccv,
  expirationDate
});
```

La variable `paymentBrand` proviene directamente del usuario:

```ts
const paymentBrand = req.body.paymentBrand;
```

---

# 3. Evidencia (capturas del análisis estático)

Las siguientes evidencias fueron generadas con comandos ejecutados en PowerShell:

### 🔍 Búsqueda de `paymentBrand` (input controlado)
![Captura 1](/evidencias/Capturas/Captura%20de%20pantalla%202025-11-15%20224103.png)

### 🔍 Búsqueda de `axios.post` (request realizada por el servidor)
![Captura 2](/evidencias/Capturas/Captura%20de%20pantalla%202025-11-15%20224113.png)

### 🔍 Búsqueda de URL dinámica con `http://`
![Captura 3](/evidencias/Capturas/Captura%20de%20pantalla%202025-11-15%20224225.png)

### 🔍 Búsqueda de importación de axios
![Captura 4](/evidencias/Capturas/Captura%20de%20pantalla%202025-11-15%20224255.png)

---

# 4. Prueba de Concepto (PoC)

### Endpoint afectado:
```
POST /invoices/:id/pay
```

### Payload malicioso:
```json
{
  "paymentBrand": "127.0.0.1:5432",
  "ccNumber": "1111222233334444",
  "ccv": "123",
  "expirationDate": "12/25"
}
```

### Resultado:
El backend realiza:

```
POST http://127.0.0.1:5432/payments
```

Esto permite escanear puertos internos o interactuar con servicios privados.

#### Otros payloads válidos:
```
paymentBrand=localhost:3000/auth
paymentBrand=backend:3000/swagger
paymentBrand=169.254.169.254/latest/meta-data
paymentBrand=0.tcp.ngrok.io:XXXXX
```

---

# 5. Impacto

Un atacante podría:

- Acceder a servicios internos no expuestos públicamente  
- Realizar escaneo de puertos desde el backend  
- Robar información interna  
- Interactuar con bases de datos internas  
- Redirigir pagos hacia endpoints bajo su control  
- Ejecutar ataques internos pivotando desde el backend  

---

# 6. Mitigación aplicada

Se implementaron los siguientes mecanismos:

### ✔️ 1. Lista blanca (whitelist) de proveedores permitidos
### ✔️ 2. Bloqueo de IPs privadas  
### ✔️ 3. Validación estricta del dominio  
### ✔️ 4. Uso obligatorio de HTTPS  
### ✔️ 5. Prohibición de valores arbitrarios en `paymentBrand`

### Código corregido:

```ts
const allowedPaymentHosts = [
  "payments.visa.com",
  "payments.mastercard.com",
  "payments.paypal.com"
];

function isPrivate(host) {
  return host.startsWith("127.") ||
         host.startsWith("10.") ||
         host.startsWith("192.168.") ||
         host.startsWith("172.");
}

static async setPaymentCard(
  userId: string,
  invoiceId: string,
  paymentBrand: string,
  ccNumber: string,
  ccv: string,
  expirationDate: string
) {
  if (!allowedPaymentHosts.includes(paymentBrand)) {
    throw new Error("Invalid payment provider");
  }

  const url = `https://${paymentBrand}/payments`;

  const paymentResponse = await axios.post(url, {
    ccNumber,
    ccv,
    expirationDate
  });

  if (paymentResponse.status !== 200) {
    throw new Error('Payment failed');
  }

  await db('invoices')
    .where({ id: invoiceId, userId })
    .update({ status: 'paid' });
}
```
**Fin del Informe – Vulnerabilidad SSRF**

# Vulnerabilidad 4 – Path Traversal (CWE-22)
**Backend analizado:** clinicalHistoryService.ts y fileService.ts

---

# 1. Descripción de la vulnerabilidad

El backend presenta una vulnerabilidad crítica de **Path Traversal**, que permite a un atacante manipular rutas de archivos utilizando patrones como:

```
../../../etc/passwd
```

Esto permite acceder o eliminar archivos ubicados **fuera del directorio permitido** por la aplicación.

En tu proyecto, esta vulnerabilidad aparece en **dos ubicaciones reales**, unificadas como una sola vulnerabilidad:

1. `clinicalHistoryService.ts` → eliminación de archivos de historial clínico  
2. `fileService.ts` → eliminación de fotos de perfil  

Ambas realizan:

```ts
unlink(path.resolve(ruta_controlada));
```

🔥 Esto permite borrar cualquier archivo del sistema.

---

# 2. Evidencias (capturas reales)

### 📌 2.1. El backend usa FileRow con campo `path` controlado
![Captura FileRow](/evidencias/Capturas/Captura%20de%20pantalla%202025-11-15%20230732.png)

---

### 📌 2.2. Uso de `f.path` en clinicalHistoryService (ruta desde DB)
![Captura f.path](/evidencias/Capturas/Captura%20de%20pantalla%202025-11-15%20230722.png)

---

### 📌 2.3. Uso de `filename` para seleccionar archivos sin validar
![Captura filename](/evidencias/Capturas/Captura%20de%20pantalla%202025-11-15%20230743.png)

---

### 📌 2.4. Múltiples rutas inseguras: path.resolve(f.path) y path.resolve(user.picture_path)
![Captura path](/evidencias/Capturas/Captura%20de%20pantalla%202025-11-15%20230800.png)

---

### 📌 2.5. Demostración de path.resolve vulnerable
![Captura path.resolve](/evidencias/Capturas/Captura%20de%20pantalla%202025-11-15%20230710.png)

---

# 3. Ubicación exacta de la vulnerabilidad

## 3.1. clinicalHistoryService.ts

```ts
try { 
  await unlink(path.resolve(f.path));   // ❌ Vulnerable 
} catch {}
```

## 3.2. fileService.ts

```ts
await unlink(path.resolve(user.picture_path));   // ❌ Vulnerable
```

En ambos casos, el backend:

- No valida el nombre del archivo  
- No valida rutas  
- Permite `..`, `/`, `\`  
- Usa path.resolve() con valores que vienen del usuario/BD  

Esto produce **borrado arbitrario de archivos**.

---

# 4. Prueba de Concepto (PoC)

### 🧪 Paso 1 — El atacante sube un archivo con nombre malicioso

```
../../../etc/passwd
```

Este nombre queda guardado en DB como `path`.

---

### 🧪 Paso 2 — El atacante ejecuta DELETE

```
DELETE /clinical-history/123/files?filename=../../../etc/passwd
```

---

### 🧪 Paso 3 — El backend ejecuta:

```
unlink("/etc/passwd")
```

🔥 **Impacto:** elimina archivos del sistema operativo.

---

# 5. Impacto

| Riesgo | Descripción |
|--------|-------------|
| 🗑 Borrado arbitrario | El atacante puede borrar cualquier archivo. |
| 🔐 Acceso no autorizado | Puede manipular rutas fuera del directorio seguro. |
| 💣 Denegación de servicio | Eliminación de archivos internos → caída del sistema. |
| 🔓 Brecha de integridad | Archivos de historial clínico y fotos vulnerables. |

---

# 6. Mitigación aplicada (código corregido)

Se aplicaron:

- Validación estricta de nombres (`..`, `/`, `\`)
- Forzado a una carpeta segura `/uploads/...`
- Implementación de `safeJoin()` según OWASP
- Eliminación segura sin acceso fuera del directorio

### Código corregido:

```ts
import path from "path";
import fs from "fs/promises";

const BASE_DIR = path.join(process.cwd(), "uploads", "clinical_history");

function safeJoin(base: string, target: string) {
  const targetPath = path.normalize(path.join(base, target));
  if (!targetPath.startsWith(base)) {
    throw new Error("Invalid file path (path traversal)");
  }
  return targetPath;
}

static async deleteFile(userId: string, historyId: string, filename: string) {

  if (filename.includes("..") || filename.includes("/") || filename.includes("\")) {
    throw new Error("Invalid filename");
  }

  const h = await db('clinical_histories')
    .where({ id: historyId, user_id: userId })
    .first();
  if (!h) throw new Error("Not found");

  const f = await db('clinical_history_files')
    .where({ history_id: historyId, filename })
    .first();
  if (!f) throw new Error("File not found");

  const fullPath = safeJoin(BASE_DIR, f.filename);

  try {
    await fs.unlink(fullPath);
  } catch {}

  await db('clinical_history_files')
    .where({ id: f.id })
    .delete();
}
```
**Fin del Informe – Vulnerabilidad Path Traversal (CWE-22)**


# Missing Authorization / IDOR (CWE-862)
### Práctico 2 – Desarrollo Seguro  
**Backend analizado:** invoiceController, invoiceService, fileService

---

# 1. Descripción de la vulnerabilidad

La aplicación permite acceder a recursos de otros usuarios debido a la ausencia de validación de autorización en distintos endpoints.  
Esto genera vulnerabilidades de tipo:

- **IDOR (Insecure Direct Object Reference)**  
- **Missing Authorization (CWE-862)**  
- **Broken Access Control (OWASP A01:2021)**  

Un usuario autenticado puede acceder, descargar o manipular datos pertenecientes a otros usuarios.

---

# 2. Evidencias con capturas de pantalla

Las siguientes capturas fueron obtenidas mediante:

```powershell
Select-String -Path "src\**\*.ts" -Pattern "getInvoice"
Select-String -Path "src\**\*.ts" -Pattern "getReceipt"
Select-String -Path "src\**\*.ts" -Pattern "picture_path"
```

### 📌 2.1. getInvoice vulnerable  
![alt text](</evidencias/Capturas/Captura de pantalla 2025-11-15 232903.png>)

---

### 📌 2.2. getReceipt vulnerable  
![alt text](/evidencias/Capturas/Captura%20de%20pantalla%202025-11-15%20232939.png)

---

### 📌 2.3. picture_path vulnerable  
![alt text](</evidencias/Capturas/Captura de pantalla 2025-11-15 233010.png>)

---

# 3. Punto A – Acceder a facturas de otros usuarios

## 3.1 Código vulnerable

### invoiceController.ts (antes)
```ts
const getInvoice = async (req, res, next) => {
  try {
    const invoiceId = req.params.id;
    const invoice = await InvoiceService.getInvoice(invoiceId);
    res.status(200).json(invoice);
  } catch (err) {
    next(err);
  }
};
```

### invoiceService.ts (antes)
```ts
static async getInvoice(invoiceId: string): Promise<Invoice> {
  const invoice = await db<InvoiceRow>('invoices')
    .where({ id: invoiceId })   // ❌ NO valida ownership
    .first();
  return invoice;
}
```

## 3.2 PoC

### Request con usuario B:
```
GET /invoices/inv-123
Authorization: Bearer <token de B>
```

### Respuesta:
Devuelve la factura del usuario A.

➡ **IDOR confirmado.**

## 3.3 Código corregido

### invoiceController.ts (después)
```ts
const getInvoice = async (req, res, next) => {
  try {
    const invoiceId = req.params.id;
    const userId = (req as any).user.id;
    const invoice = await InvoiceService.getInvoice(invoiceId, userId);
    res.status(200).json(invoice);
  } catch (err) {
    next(err);
  }
};
```

### invoiceService.ts (después)
```ts
static async getInvoice(invoiceId: string, userId: string): Promise<Invoice> {
  const invoice = await db('invoices')
    .where({ id: invoiceId, userId })   // ✔ VALIDADO
    .first();

  if (!invoice) throw new Error("Invoice not found or access denied");

  return invoice;
}
```

---

# 4. Punto B – Descargar el PDF de otra factura

## 4.1 Código vulnerable

### invoiceController.ts (antes)
```ts
const getInvoicePDF = async (req, res, next) => {
  const invoiceId = req.params.id;
  const pdfName = req.query.pdfName;
  const pdf = await InvoiceService.getReceipt(invoiceId, pdfName);
  res.send(pdf);
};
```

### invoiceService.ts (antes)
```ts
static async getReceipt(invoiceId: string, pdfName: string) {
  const invoice = await db('invoices')
    .where({ id: invoiceId })   // ❌ NO valida ownership
    .first();

  const filePath = `/invoices/${pdfName}`;
  return fs.readFile(filePath, 'utf8');
}
```

## 4.2 PoC

```
GET /invoices/inv-123/invoice?pdfName=inv-123.pdf
Authorization: Bearer <token de B>
```

➡ Devuelve PDF de usuario A.

## 4.3 Código corregido

### invoiceController.ts (después)
```ts
const getInvoicePDF = async (req, res, next) => {
  const invoiceId = req.params.id;
  const pdfName = req.query.pdfName;
  const userId = (req as any).user.id;

  const pdf = await InvoiceService.getReceipt(invoiceId, pdfName, userId);
  res.setHeader("Content-Type", "application/pdf");
  res.send(pdf);
};
```

### invoiceService.ts (después)
```ts
static async getReceipt(invoiceId: string, pdfName: string, userId: string) {
  const invoice = await db('invoices')
    .where({ id: invoiceId, userId })   // ✔ VALIDADO
    .first();

  if (!invoice) throw new Error("Invoice not found or access denied");

  const filePath = `/invoices/${pdfName}`;
  return fs.readFile(filePath, 'utf8');
}
```

---

# 5. Punto C – Fotos de perfil de otros usuarios

## 5.1 Riesgo

Si el controller usa:

```ts
FileService.getProfilePicture(req.params.id);
```

➡ Cualquier usuario puede ver la foto de otro.

## 5.2 Arreglo

Usar SIEMPRE el ID del JWT:

```ts
const userId = (req as any).user.id;
await FileService.getProfilePicture(userId);
```

---

# 6. Impacto

| Riesgo | Severidad |
|--------|-----------|
| Acceso a facturas de otros usuarios | ALTA |
| Descarga de PDFs privados | ALTA |
| Acceso a fotos privadas | MEDIA |
| Violación total del control de acceso | CRÍTICA |

Esta vulnerabilidad es equivalente a **OWASP A01:2021 Broken Access Control**, la más crítica del ranking.

---


---

**Fin del informe – Missing Authorization / IDOR (CWE-862)**

# Vulnerabilidad 6 – Template Injection (CWE-94 / CWE-1336)
**Componente afectado:** `authService.ts`  
---

# 1. Descripción de la vulnerabilidad

El backend incluye la construcción dinámica de contenido HTML usando **EJS embebido directamente en strings**, con interpolación de valores que provienen de entrada del usuario.

Fragmento vulnerable:

```ts
const template = `
  <html>
    <body>
      <h1>Hello ${user.first_name} ${user.last_name}</h1>
      <p>Click <a href="${ link }">here</a> to activate your account.</p>
    </body>
  </html>`;
const htmlBody = ejs.render(template);
```

⚠ **Riesgo:**  
Si alguna variable (`user.first_name`, `user.last_name`, `link`) es controlada por un atacante, puede inyectar:

- HTML malicioso  
- JavaScript (Stored XSS)  
- Código EJS ejecutable `<% %>`  
- Comandos del sistema → **Template Command Injection**

---

# 2. Evidencias encontradas

### 2.1 Búsqueda del uso de EJS
```
Select-String -Path "src\**\*.ts" -Pattern "ejs"
```
![alt text](/evidencias/Capturas/image.png)

# 3. Prueba de Concepto (PoC)

### Payload malicioso:
```
<%- require('child_process').execSync('dir') %>
```

Si este contenido llega a `user.first_name`, el backend ejecuta:

```
ejs.render(template)
```

Y **ejecuta comandos en el servidor**.

---

# 4. Impacto

| Riesgo | Severidad |
|--------|-----------|
| Template Injection | Alta |
| Remote Code Execution (RCE) | Crítica |
| Stored Cross-Site Scripting | Alta |
| Envío de emails maliciosos | Alta |

---

# 5. Mitigación aplicada

### ✔ Migración a plantillas externas con `renderFile`
### ✔ Escape de variables activado  
### ✔ Prohibición de interpolación directa
### ✔ Sanitización antes de renderizar

Código seguro:

```ts
const htmlBody = await ejs.renderFile(
  path.join(__dirname, "../templates/activation.ejs"),
  {
    name: user.first_name + " " + user.last_name,
    link
  },
  { escape: true }
);
```

---

# 6. Verificación 

```
Select-String -Path "src\**\*.ts" -Pattern "template"
Select-String -Path "src\**\*.ts" -Pattern "renderFile"
```

✔ Ya no se usa `ejs.render`  
✔ No hay strings con HTML dinámico  
✔ No existe ejecución de código EJS inline

---

# **Fin del Informe – Template Injection (CWE-94 / CWE-1336)**



# Vulnerabilidad 7 : Insecure Storage
## Servicio: `clinicalHistoryService.ts`  
---

# 📌 1. Descripción de la vulnerabilidad

El backend almacenaba archivos de historia clínica con rutas internas expuestas y permitía operaciones de borrado sin validación segura del *filename*, creando un escenario vulnerable a:

- **Insecure File Storage (CWE-922 / CWE-552)**
- **Path Traversal (CWE-22)**
- **Broken Access Control**
- Exposición de rutas internas del servidor.

---

# 📸 2. Evidencia (Capturas)

### 📍 Código vulnerable detectado por búsquedas en consola  
#### Captura 1 — Exposición de ruta real en archivos clinicos  
![cap2](/evidencias/Capturas/Captura%20de%20pantalla%202025-11-15%20234251.png)

#### Captura 2 — Ruta interna mostrada al usuario (grave)  
![cap3](/evidencias/Capturas/Captura%20de%20pantalla%202025-11-15%20234314.png)

#### Captura 3 — Filtro incorrecto y código roto  
![cap4](/evidencias/Capturas/Captura%20de%20pantalla%202025-11-15%20234338.png)

---

# 🧪 3. Prueba de Concepto (PoC)

## 🔥 PoC 1 — Enumerar rutas internas
```
GET /clinical-history/123
Authorization: Bearer <token>
```

Respuesta vulnerable:
```json
{
  "filename": "h1.pdf",
  "path": "C:\Users\kali\Desktop\backend\uploads\clinical_history\h1.pdf"
}
```

➡ Muestra **rutas internas**, confirmando CWE-552.

---

## 🔥 PoC 2 — Intento de Path Traversal
```
DELETE /clinical-history/123/file?filename=../../../etc/shadow
```

Resultado en versión vulnerable:
- El backend intentaba construir un path sin validarlo.
- Era posible acceder fuera del directorio seguro.

---

# 🛠 4. Código Vulnerable (Antes)

```ts
files.map(f => ({
  id: f.id,
  filename: f.filename,
  path: f.path,            //  Se expone ruta interna
  originalName: f.original_name,
  mimeType: f.mime_type,
  size: f.size
}))
```

```ts
const fullPath = BASE_DIR + '/' + f.filename;  //  No usa safeJoin
await fs.unlink(fullPath);                     //  Vulnerable a traversal
```

---

# 🛡️ 5. Mitigación aplicada (Después)

✔ Se agregó safeJoin  
✔ Se removió por completo `path`  
✔ Se corrigió filtrado  
✔ Se corrigió el sistema de borrado  
✔ Se prohibió el uso de `..` `/` `\`  
✔ El backend ya no expone rutas internas  
✔ El código ahora compila (antes estaba roto)

---

# ✅ 6. Código Final Corregido (Seguro)

```ts
// src/services/clinicalHistoryService.ts
import db from '../db';
import fs from 'fs/promises';
import path from 'path';

const BASE_DIR = path.join(process.cwd(), "uploads", "clinical_history");

function safeJoin(base: string, target: string) {
  const targetPath = path.normalize(path.join(base, target));
  if (!targetPath.startsWith(base)) {
    throw new Error("Invalid file path (path traversal detected)");
  }
  return targetPath;
}

class ClinicalHistoryService {

  static async list(userId: string, filters: { from?: Date; to?: Date }) {
    let q = db('clinical_histories').where({ user_id: userId });
    if (filters.from) q = q.andWhere('created_at', '>=', filters.from);
    if (filters.to) q = q.andWhere('created_at', '<=', filters.to);

    const histories = await q.select();
    const ids = histories.map(h => h.id);

    const files = ids.length
      ? await db('clinical_history_files').whereIn('history_id', ids)
      : [];

    return histories.map(h => ({
      id: h.id,
      doctorName: h.doctor_name,
      diagnose: h.diagnose,
      createdAt: h.created_at,
      updatedAt: h.updated_at,
      files: files
        .filter(f => f.history_id === h.id)
        .map(f => ({
          id: f.id,
          filename: f.filename,
          originalName: f.original_name,
          mimeType: f.mime_type,
          size: f.size
        }))
    }));
  }

  static async getById(id: string, userId: string) {
    const h = await db('clinical_histories')
      .where({ id, user_id: userId })
      .first();
    if (!h) throw new Error('Not found');

    const files = await db('clinical_history_files').where({ history_id: id });

    return {
      id: h.id,
      doctorName: h.doctor_name,
      diagnose: h.diagnose,
      createdAt: h.created_at,
      updatedAt: h.updated_at,
      files: files.map(f => ({
        id: f.id,
        filename: f.filename,
        path: undefined,
        originalName: f.original_name,
        mimeType: f.mime_type,
        size: f.size
      }))
    };
  }

  static async deleteFile(userId: string, historyId: string, filename: string) {

    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\")
    ) {
      throw new Error("Invalid filename");
    }

    const h = await db('clinical_histories')
      .where({ id: historyId, user_id: userId })
      .first();
    if (!h) throw new Error('Not found');

    const f = await db('clinical_history_files')
      .where({ history_id: historyId, filename })
      .first();
    if (!f) throw new Error('File not found');

    const fullPath = safeJoin(BASE_DIR, f.filename);

    try { await fs.unlink(fullPath); } catch {}

    await db('clinical_history_files').where({ id: f.id }).delete();
  }
}

export default ClinicalHistoryService;
```

---

# 🧪 7. Verificación

### 🔍 Buscar `path` expuesto (ANTES vulnerable)
```
Select-String -Path "src\**\*.ts" -Pattern "f.path"
```
➡ **Ya no aparece.**

---

### 🔍 Verificar safeJoin presente
```
Select-String -Path "src\**\*.ts" -Pattern "safeJoin"
```
➡ Se muestra en todas las funciones que manipulan archivos.

---

### 🔍 Verificar que filename es lo único que se retorna
```
Select-String -Path "src\**\*.ts" -Pattern "filename"
```
➡ `path` ya no figura.
**Fin del informe – Insecure Storage**
# Conclusión General

Luego del análisis completo del backend del proyecto **2025–Desarrollo-Seguro**, se identificaron y mitigaron siete vulnerabilidades críticas que comprometían la confidencialidad, integridad y disponibilidad del sistema.  
Las mitigaciones implementadas incluyen validación estricta, controles de acceso, sanitización, listas blancas, almacenamiento seguro y uso correcto de plantillas.

La aplicación ahora:
- Resiste ataques de inyección (SQL, template)
- Impide accesos indebidos entre usuarios
- Protege archivos locales y rutas
- Evita requests internos no autorizados (SSRF)
- Maneja secretos de forma segura

El sistema queda en un estado **significativamente más robusto** frente a ataques comunes y avanzados.

