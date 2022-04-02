import {writeFile, readFile} from 'fs/promises';

export class TokenStore {
  private storeDirectory: string;

  constructor(storeDirectory: string)  {
    this.storeDirectory = storeDirectory;
  }

  public async storeAccessToken(site: string, accessToken: string[]): Promise<void> {
    const encodedUrl = Buffer.from(site).toString('base64');
    await writeFile(`${this.storeDirectory}/${encodedUrl}`, JSON.stringify(accessToken))
  }

  public async storeDpopProof(site: string, dpopProof: string[]): Promise<void> {
    const encodedUrl = Buffer.from(site).toString('base64');
    await writeFile(`${this.storeDirectory}/${encodedUrl}`, JSON.stringify(dpopProof))
  }

  public async getTokenAndDpopProof(site: string): Promise<{accessToken: string, dpopProof: string}>  {
    return {accessToken: "abc", dpopProof: "def"}
  }
}