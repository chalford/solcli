import fetch, { Response } from "node-fetch";
import { SolidOidcOnlyAuthenticator } from "./SolidOidcOnlyAuthenticator";

export class SolidClient {
  private accessToken?: string;
  private dpopProof?: string;

  constructor();
  constructor(accessToken: string, dpopProof: string);
  constructor(accessToken?: string, dpopProof?: string) {
    if (accessToken && dpopProof) {
      this.accessToken = accessToken;
      this.dpopProof = dpopProof;
    }
  }

  public async get(url: any): Promise<{ body: string, headers: {} }> {
    // Here need to use Bearer auth on the fetch URL
    const response = await fetch(url);
    switch (response.status) {
      case 401:
        await this.reauthenticate(response);
        throw new Error("Unimplemented bearer authentication");
        return this.get(url);
    }
    return {
      body: await response.text(),
      headers: response.headers
    }
  }

  public async reauthenticate(response: Response) {
    const authenticateHeader = response.headers.get('www-authenticate')
    if (authenticateHeader != null) {
      if (authenticateHeader.includes('DPoP realm="Inrupt Enterprise Solid Server"')) {
        console.log('Found inrupt header, will authenicate with broker.pod.inrupt.com');
        const authenticator = new SolidOidcOnlyAuthenticator('https://broker.pod.inrupt.com/');
        const authenticationResp = await authenticator.authenticate();
        this.accessToken = authenticationResp.accessToken;
        this.dpopProof = authenticationResp.dpopProof;
      } else {
        throw new Error("Unsupported www-authenticate header: " + authenticateHeader);
      }
    } else {
      throw new Error("No www-authenticate header found in resource server response");
    }
  }
}