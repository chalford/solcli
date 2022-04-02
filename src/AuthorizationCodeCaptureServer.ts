import express, { Express } from 'express';

interface AddressInfo {
  address: string;
  family: string;
  port: number;
}

interface AuthorizationCodeResponse {
  code: string,
  state: string
}

export default class AuthorizationCodeCaptureServer {
  resolveAuthResponsePromise!: (response: AuthorizationCodeResponse) => void
  authCodeResponse = new Promise<AuthorizationCodeResponse>((resolve) => {
    this.resolveAuthResponsePromise = resolve;
  });

  public async start(): Promise<number> {
    const app = express();
    app.use(express.static('public'));
    const server = await app.listen();
    app.get("/callback", (req, res) => {
      server.close();
      res.send("Login is successful, you may close the browser/tab and go back to the command line.");
      this.resolveAuthResponsePromise({
        code: req.query.code as string,
        state: req.query.state as string
      });
    })
    const info = server.address();

    if (this.addressInfoIsObject(info)) {
      return info.port;
    } else {
      await server.close();
      throw new Error("The address info returned from the server was not an AddressInfo object");
    }
  }

  private addressInfoIsObject(info: any): info is AddressInfo {
    return 'port' in info;
  }

  public async getAuthorizationCodeResponse(): Promise<AuthorizationCodeResponse> {
    return this.authCodeResponse;
  }
}