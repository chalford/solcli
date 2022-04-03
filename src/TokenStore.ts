import { writeFile, readFile } from 'fs/promises';

export interface TokenEntry { accessToken: string, oidcUrl: string }

export class TokenStore {
  private storeDirectory: string;

  constructor(storeDirectory: string) {
    this.storeDirectory = storeDirectory;
  }

  public async storeAccessToken(podUrl: string, accessToken: string, oidcUrl: string): Promise<void> {
    const encodedUrl = Buffer.from(podUrl).toString('base64');
    await writeFile(`${this.storeDirectory}/${encodedUrl}`, JSON.stringify({ accessToken, oidcUrl }))
  }

  // public async storeDpopProof(site: string, dpopProof: string): Promise<void> {
  //   const encodedUrl = Buffer.from(site).toString('base64');
  //   await writeFile(`${this.storeDirectory}/${encodedUrl}`, JSON.stringify(dpopProof))
  // }

  public async getAccessToken(site: string): Promise<TokenEntry | null> {
    const encodedUrl = Buffer.from(site).toString('base64');
    try {
      const tokenBuffer = await readFile(`${this.storeDirectory}/${encodedUrl}`);
      return JSON.parse(tokenBuffer.toString());
    } catch (err) {
      return null;
    }
  }
}