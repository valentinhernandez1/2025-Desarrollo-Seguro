import InvoiceService from '../../src/services/invoiceService';
import db from '../../src/db';
import { Invoice } from '../../src/types/invoice';

jest.mock('../../src/db');
const mockedDb = db as jest.MockedFunction<typeof db>;

describe('InvoiceService.listInvoices', () => {

  it('should handle valid operator', async () => {
    const userId = 'user123';
    const status = 'paid';
    const operator = '=';
    const mockInvoices: Invoice[] = [
      { id: 'inv1', userId, amount: 100, dueDate: new Date(), status: 'paid' },
      { id: 'inv2', userId, amount: 200, dueDate: new Date(), status: 'paid' }
    ];

    // Mock chain
    const selectChain = {
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue(mockInvoices),
    };

    mockedDb.mockReturnValue(selectChain as any);

    const invoices = await InvoiceService.list(userId, status, operator);

    expect(selectChain.where).toHaveBeenCalledWith({ userId });
    expect(selectChain.where).toHaveBeenCalledWith("status", "=", "paid");
    expect(selectChain.select).toHaveBeenCalled();
    expect(invoices).toEqual(mockInvoices);
  });

  it('should throw error for invalid operator', async () => {
    const userId = 'user123';
    const status = 'paid';
    const operator = 'invalidOperator';

    await expect(InvoiceService.list(userId, status, operator))
      .rejects
      .toThrow("Invalid operator");
  });

  it('should handle no operator', async () => {
    const userId = 'user123';
    const status = 'paid';

    const mockInvoices: Invoice[] = [
      { id: 'inv1', userId, amount: 100, dueDate: new Date(), status: 'paid' },
      { id: 'inv2', userId, amount: 200, dueDate: new Date(), status: 'unpaid' }
    ];

    const selectChain = {
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue(mockInvoices),
    };

    mockedDb.mockReturnValue(selectChain as any);

    const invoices = await InvoiceService.list(userId, status);

    expect(selectChain.where).toHaveBeenCalledWith({ userId });
    // No operator → no extra where()
    expect(selectChain.where).toHaveBeenCalledTimes(1);
    expect(selectChain.select).toHaveBeenCalled();
    expect(invoices).toEqual(mockInvoices);
  });

});
