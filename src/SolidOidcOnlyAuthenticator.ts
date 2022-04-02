const { encode: base64urlEncode } = require('base64url-universal');
const { IdGenerator } = require('bnid');
const RelyingParty = require("@interop-alliance/oidc-rp");
import open from 'open';
import crypto from "isomorphic-webcrypto";
import fetch, { Headers } from "node-fetch";
import AuthorizationCodeCaptureServer from './AuthorizationCodeCaptureServer';

interface CodeChallenge { challenge: string, method: "S256" }

// This class implements a CLI version of the the current practice of using an OIDC server for
// both authentication and authorization - the access token returned is from the OIDC flow
export class SolidOidcOnlyAuthenticator {
  private oidcSite: string;

  constructor(oidcSite: string) {
    this.oidcSite = oidcSite;
  }

  public async authenticate(): Promise<{ accessToken: string, dpopProof?: string }> {
    //this is where we start a local http server that will accept the authorization code sent by the server
    const server = new AuthorizationCodeCaptureServer();
    const serverPort = await server.start();
    // discover the authorization endpoint
    const rpClient = new RelyingParty({
      provider: {
        url: this.oidcSite
      },
      defaults: {
        register: {
          client_name: 'solcli - A SOLID CLI',
          logo_uri: `http://localhost:${serverPort}/logo.png`,
          redirect_uris: [`http://localhost:${serverPort}/callback`],
          response_types: ['code', 'code id_token token'],
          grant_types: ['authorization_code'],
          token_endpoint_auth_method: 'client_secret_basic',
          default_max_age: 7200
        }
      }
    });
    const discoveryMetadata = await rpClient.discover();
    const registration = await rpClient.register();
    // Do the PKCE code generation -
    // from https://github.com/interop-alliance/oidc-rp/blob/master/src/AuthenticationRequest.js
    const codeVerifier = await generateRandomBase64String(256);

    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const state = await generateRandomBase64String(256);

    var url = buildAuthCodeResquestUrl(
      discoveryMetadata.authorization_endpoint,
      registration.client_id,
      registration.redirect_uris[0],
      codeChallenge,
      state
    );
    // Open a web browser with the auth code request to start the flow
    await open(url.toString());
    const authorizationCode = await server.getAuthorizationCodeResponse();
    if (authorizationCode.state !== state) {
      throw new Error(`State from ID server (${authorizationCode.state}) didn't match the state created for the request(${state})`);
    }
    const idAndAccessToken = await retrieveTokens(discoveryMetadata.token_endpoint, registration.redirect_uris[0], codeVerifier, registration.client_id, registration.client_secret, authorizationCode.code);
    return { accessToken: idAndAccessToken.accessToken };
  }

}

async function generateRandomBase64String(bitLength: number): Promise<string> {
  // generate code_verifier random octets for PKCE
  // @see https://tools.ietf.org/html/rfc7636
  const generator = new IdGenerator({ bitLength: bitLength })
  const codeVerifier = base64urlEncode(await generator.generate());
  return codeVerifier;
}

async function generateCodeChallenge(codeVerifier: string): Promise<CodeChallenge> {
  // code_challenge = BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))
  const encoder = new TextEncoder();
  const challengeDigest = await crypto.subtle.digest(
    { name: 'SHA-256' }, encoder.encode(codeVerifier)
  );
  const codeChallenge = base64urlEncode(new Uint8Array(challengeDigest));
  return { challenge: codeChallenge, method: "S256" };
}

function buildAuthCodeResquestUrl(authEndpoint: string, clientId: string, redirectUri: string, codeChallenge: CodeChallenge, state: string) {
  let url = new URL(authEndpoint);
  url.searchParams.append('response_type', 'code');
  url.searchParams.append('scope', 'openid webid');
  url.searchParams.append('client_id', clientId);
  url.searchParams.append('redirect_uri', redirectUri);
  url.searchParams.append('code_challenge', codeChallenge.challenge);
  url.searchParams.append('code_challenge_method', codeChallenge.method);
  url.searchParams.append('state', state);
  return url;
}

async function retrieveTokens(
  tokenEndpoint: string,
  redirectUri: string,
  codeVerifier: string,
  clientId: string,
  clientSecret: string,
  authCode: string
): Promise<{ idToken: string, accessToken: string }> {
  const headers = new Headers();
  headers.set('Authorization', 'Basic ' + Buffer.from(clientId + ":" + clientSecret).toString('base64'));
  headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');

  let tokenRequestParams: { [index: string]: string } = {
    'grant_type': 'authorization_code',
    'redirect_uri': redirectUri,
    'code': authCode,
    'code_verifier': codeVerifier
  };

  let formBody: string[] = [];

  for (var property in tokenRequestParams) {
    var encodedKey = encodeURIComponent(property);
    var encodedValue = encodeURIComponent(tokenRequestParams[property]);
    formBody.push(encodedKey + "=" + encodedValue);
  }
  const response = await fetch(tokenEndpoint, { method: "POST", headers: headers, body: formBody.join("&") })
  const body = await response.json();
  return { accessToken: body.access_token, idToken: body.id_token };
}