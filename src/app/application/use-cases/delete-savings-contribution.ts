import { ISavingsRepository } from '../ports/repositories';

export class DeleteSavingsContribution {
  constructor(private readonly savings: ISavingsRepository) {}

  async execute(id: string): Promise<void> {
    await this.savings.deleteContribution(id);
  }
}
