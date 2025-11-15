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

# La vulnerabilidad **SQL Injection (CWE‑89)** fue reproducida, explotada y mitigada correctamente.

  La aplicación ahora: 

- Solo acepta operadores válidos
- Solo acepta estados permitidos
- Normaliza y valida toda la entrada
- Rechaza cualquier payload malicioso