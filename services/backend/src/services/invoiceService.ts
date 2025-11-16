// src/services/invoiceService.ts
import db from '../db';
import { Invoice } from '../types/invoice';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

/* ------------------ Tipos ------------------ */
interface InvoiceRow {
  id: string;
  userId: string;
  amount: number;
  dueDate: Date;
  status: string;
}

/* ------------------ Constantes ------------------ */
const allowedPaymentHosts = [
  "payments.visa.com",
  "payments.mastercard.com",
  "payments.paypal.com"
];

function isPrivate(host: string) {
  return (
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("172.")
  );
}

/* ----------- Directorio seguro de PDFs ---------- */
const INVOICE_DIR = path.join(process.cwd(), "uploads", "invoices");

/* ----------- safeJoin contra Path Traversal ---------- */
function safeJoin(base: string, target: string) {
  const resolved = path.normalize(path.join(base, target));
  if (!resolved.startsWith(base)) {
    throw new Error("Invalid file path");
  }
  return resolved;
}

/* ------------------ Clase ------------------ */
class InvoiceService {

  /* ---------- LISTAR FACTURAS ---------- */
  static async list(userId: string, status?: string, operator?: string) {
    let q = db<InvoiceRow>('invoices').where({ userId });

    const validStatus = ["paid", "unpaid"];
    const validOps = ["=", "!=", "<>", ">", "<", ">=", "<="];

    if (status != null) {
      const cleanStatus = status.trim().toLowerCase();
      if (!validStatus.includes(cleanStatus)) {
        throw new Error("Invalid status value");
      }
      status = cleanStatus;
    }

    if (operator != null && !validOps.includes(operator)) {
      throw new Error("Invalid operator");
    }

    if (status && operator) {
      q = q.where("status", operator, status);
    }

    const rows = await q.select();

    return rows.map(r => ({
      id: r.id,
      userId: r.userId,
      amount: r.amount,
      dueDate: r.dueDate,
      status: r.status
    }));
  }

  /* ---------- PAGAR FACTURA (SSRF Seguro) ---------- */
  static async setPaymentCard(
    userId: string,
    invoiceId: string,
    paymentBrand: string,
    ccNumber: string,
    ccv: string,
    expirationDate: string
  ) {

    // Whitelist
    if (!allowedPaymentHosts.includes(paymentBrand)) {
      throw new Error("Invalid payment provider");
    }

    // Evitar redes internas
    if (isPrivate(paymentBrand)) {
      throw new Error("Private network targets not allowed");
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

  /* ---------- OBTENER FACTURA (IDOR FIX) ---------- */
  static async getInvoice(invoiceId: string, userId: string): Promise<Invoice> {
    const invoice = await db<InvoiceRow>('invoices')
      .where({ id: invoiceId, userId })   // VALIDADO ✔
      .first();

    if (!invoice) {
      throw new Error("Invoice not found or access denied");
    }

    return invoice;
  }

  /* ---------- OBTENER PDF SEGURO (Traversal FIX) ---------- */
  static async getReceipt(invoiceId: string, pdfName: string, userId: string) {

    const invoice = await db('invoices')
      .where({ id: invoiceId, userId })
      .first();

    if (!invoice) {
      throw new Error("Invoice not found or access denied");
    }

    // Validar el tipo de archivo
    if (!pdfName.endsWith(".pdf")) {
      throw new Error("Invalid file type");
    }

    const safePath = safeJoin(INVOICE_DIR, pdfName);
    const content = await fs.readFile(safePath);

    return content;
  }
}

export default InvoiceService;
