import fetch, { Headers, Response } from "node-fetch";
import { SolidOidcOnlyAuthenticator } from "./SolidOidcOnlyAuthenticator";
import { TokenEntry, TokenStore } from "./TokenStore";

export class SolidClient {
  private tokenStore: TokenStore;

  constructor(tokenStoreDirectory: string) {
    this.tokenStore = new TokenStore(tokenStoreDirectory);
  }

  public async loginPod(podUrl: string): Promise<void> {
    await this.get(podUrl);
  }

  public async get(url: string): Promise<{ body: string, headers: {} }> {
    return this.getRecurse(0, url);
  }

  private async getRecurse(counter: number, url: string): Promise<{ body: string, headers: {} }> {
    if (counter >= 3) {
      throw new Error("Get attempt failed after 3 attempts");
    }
    // Here need to use Bearer auth on the fetch URL
    const parsedUrl = new URL(url);
    const accessToken = await this.tokenStore.getAccessToken(parsedUrl.hostname);
    const headers = new Headers();
    if (accessToken) {
      headers.set("Authorization", "Bearer " + accessToken.accessToken);
    }
    const response = await fetch(parsedUrl, { headers });
    switch (response.status) {
      case 401:
        await this.authenticate(response);
        return this.getRecurse(counter + 1, url);
    }
    return {
      body: await response.text(),
      headers: response.headers
    }
  }

  public async authenticate(response: Response, token?: TokenEntry) {
    const url = new URL(response.url);
    const authenticateHeader = response.headers.get('www-authenticate');
    if (authenticateHeader != null) {
      const bearerMatch = authenticateHeader.match(/Bearer(?: realm="(.+?)")?/);
      if (bearerMatch) {
        let oidcProvider: string;
        const realm = bearerMatch[1]
        if (realm) {
          switch (realm) {
            case "Inrupt Enterprise Solid Server":
              oidcProvider = 'https://broker.pod.inrupt.com/';
              break;
            default:
              throw new Error(`Authentication realm: ${realm} unknown`);
          }
        } else if (token && token.oidcUrl) {
          oidcProvider = token.oidcUrl;
        } else {
          throw new Error("Failed to discover authorization server");
        }
        const authenticator = new SolidOidcOnlyAuthenticator(oidcProvider);
        const authenticationResp = await authenticator.authenticate();
        await this.tokenStore.storeAccessToken(url.hostname, authenticationResp.accessToken, authenticator.getOidcSite());
      } else {
        throw new Error("Unsupported www-authenticate header: " + authenticateHeader);
      }
    } else {
      throw new Error("No www-authenticate header found in resource server response");
    }
  }
}