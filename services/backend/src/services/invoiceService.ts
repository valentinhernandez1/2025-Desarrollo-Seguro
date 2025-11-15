// src/services/invoiceService.ts
import db from '../db';
import { Invoice } from '../types/invoice';
import axios from 'axios';
import { promises as fs } from 'fs';


interface InvoiceRow {
  id: string;
  userId: string;
  amount: number;
  dueDate: Date;
  status: string;
}

class InvoiceService {
  static async list(userId: string, status?: string, operator?: string) {
    // Query base
    let q = db<InvoiceRow>('invoices').where({ userId });

    // 1) Validacion de estado
    const validStatus = ["paid", "unpaid"];

    if (status != null) {
      const cleanStatus = status.trim().toLowerCase();

      if (!validStatus.includes(cleanStatus)) {
        throw new Error("Invalid status value");
      }

      status = cleanStatus;
    }

    // 2) Validamos el operador
    const validOps = ["=", "!=", "<>", ">", "<", ">=", "<="];

    if (operator != null && !validOps.includes(operator)) {
      throw new Error("Invalid operator");
    }

    // 3) Query segura
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




  static async setPaymentCard(
    userId: string,
    invoiceId: string,
    paymentBrand: string,
    ccNumber: string,
    ccv: string,
    expirationDate: string
  ) {
    // use axios to call http://paymentBrand/payments as a POST request
    // with the body containing ccNumber, ccv, expirationDate
    // and handle the response accordingly
    const paymentResponse = await axios.post(`http://${paymentBrand}/payments`, {
      ccNumber,
      ccv,
      expirationDate
    });
    if (paymentResponse.status !== 200) {
      throw new Error('Payment failed');
    }

    // Update the invoice status in the database
    await db('invoices')
      .where({ id: invoiceId, userId })
      .update({ status: 'paid' });  
    };
  static async  getInvoice( invoiceId:string): Promise<Invoice> {
    const invoice = await db<InvoiceRow>('invoices').where({ id: invoiceId }).first();
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    return invoice as Invoice;
  }


  static async getReceipt(
    invoiceId: string,
    pdfName: string
  ) {
    // check if the invoice exists
    const invoice = await db<InvoiceRow>('invoices').where({ id: invoiceId }).first();
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    try {
      const filePath = `/invoices/${pdfName}`;
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      // send the error to the standard output
      console.error('Error reading receipt file:', error);
      throw new Error('Receipt not found');

    } 

  };

};

export default InvoiceService;
