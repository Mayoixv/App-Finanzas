import { Transaction } from '../../domain/transaction';
import { NotFoundError } from '../errors';
import { ICategoryRepository, ITransactionRepository } from '../ports/repositories';
import { AddTransactionInput, validateTransactionInput } from './add-transaction';

export class UpdateTransaction {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly categories: ICategoryRepository,
  ) {}

  async execute(id: string, input: AddTransactionInput): Promise<Transaction> {
    if (!(await this.transactions.get(id))) throw new NotFoundError('Movimiento');
    await validateTransactionInput(input, this.categories);

    const transaction: Transaction = {
      id,
      date: input.date,
      amount: input.amount,
      categoryId: input.categoryId,
      note: input.note?.trim() ?? '',
    };
    await this.transactions.save(transaction);
    return transaction;
  }
}
