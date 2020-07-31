import { User } from './user';

export interface UserRepository {
  save(user: User): Promise<User>;
  find(id: string): Promise<User | undefined>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}