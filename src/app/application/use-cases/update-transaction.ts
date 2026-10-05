import { Transaction } from '../../domain/transaction';
import { NotFoundError } from '../errors';
import { ICategoryRepository, ITransactionRepository } from '../ports/repositories';
import { AddTransactionInput, buildTransaction, validateTransactionInput } from './add-transaction';

export class UpdateTransaction {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly categories: ICategoryRepository,
  ) {}

  async execute(id: string, input: AddTransactionInput): Promise<Transaction> {
    if (!(await this.transactions.get(id))) throw new NotFoundError('Movimiento');
    await validateTransactionInput(input, this.categories);
    const transaction = buildTransaction(id, input);
    await this.transactions.save(transaction);
    return transaction;
  }
}
