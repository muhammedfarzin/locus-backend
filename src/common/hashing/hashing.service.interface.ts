export const HASHING_SERVICE = 'IHashingService';

export interface IHashingService {
  hash(data: string): Promise<string>;
  compare(data: string, encrypted: string): Promise<boolean>;
}
