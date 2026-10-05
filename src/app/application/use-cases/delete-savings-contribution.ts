import { SavingsContribution } from '../../domain/savings';
import { ISavingsRepository } from '../ports/repositories';

export class DeleteSavingsContribution {
  constructor(private readonly savings: ISavingsRepository) {}

  /** Devuelve el aporte borrado para poder deshacerlo. */
  async execute(id: string): Promise<SavingsContribution | undefined> {
    const contribution = (await this.savings.listContributions()).find((c) => c.id === id);
    await this.savings.deleteContribution(id);
    return contribution;
  }
}

export class RestoreSavingsContribution {
  constructor(private readonly savings: ISavingsRepository) {}

  execute(contribution: SavingsContribution): Promise<void> {
    return this.savings.saveContribution(contribution);
  }
}
