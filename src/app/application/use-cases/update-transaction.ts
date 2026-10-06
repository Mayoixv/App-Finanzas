import { Transaction } from '../../domain/transaction';
import { NotFoundError } from '../errors';
import { IAccountRepository, ICategoryRepository, ITransactionRepository } from '../ports/repositories';
import { AddTransactionInput, buildTransaction, validateAccount, validateTransactionInput } from './add-transaction';

export class UpdateTransaction {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly categories: ICategoryRepository,
    private readonly accounts?: IAccountRepository,
  ) {}

  async execute(id: string, input: AddTransactionInput): Promise<Transaction> {
    const current = await this.transactions.get(id);
    if (!current) throw new NotFoundError('Movimiento');
    await validateTransactionInput(input, this.categories);
    // Se puede dejar en una cuenta archivada si ya estaba en ella; no moverlo a una archivada.
    await validateAccount(input.accountId, this.accounts, input.accountId === current.accountId);
    const transaction = buildTransaction(id, { ...input, accountId: input.accountId ?? current.accountId });
    await this.transactions.save(transaction);
    return transaction;
  }
}
