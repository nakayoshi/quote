import path from 'path';
import { promises as fs } from 'fs';

import { UserRepository } from './user-repository';
import { User } from './user';

export class UserRepositoryFsImpl implements UserRepository {
  static readonly PATH = path.join(process.cwd(), 'persistence.json');

  constructor(
    private readonly data: Map<string, User>,
  ) { }

  static async init() {
    const json = await fs.readFile(this.PATH, 'utf-8');
    const data = new Map<string, User>(Object.entries(JSON.parse(json)));
    return new UserRepositoryFsImpl(data);
  }

  private async write() {
    const data = Object.fromEntries(this.data.entries());
    return await fs.writeFile(
      UserRepositoryFsImpl.PATH,
      JSON.stringify(data, null, 2),
      'utf-8',
    );
  }

  async save(user: User) {
    this.data.set(user.id, user);
    await this.write();
    return user;
  }

  async find(id: string) {
    return this.data.get(id);
  }

  async update(user: User) {
    return this.save(user);
  }

  async delete(id: string) {
    this.delete(id);
    await this.write();
  }
}