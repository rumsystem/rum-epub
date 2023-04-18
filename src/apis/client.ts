import { RumFullNodeClient } from 'rum-fullnode-sdk';
import { type quorumService as Q } from '~/service';

let base = '';
let jwt = '';

let client = RumFullNodeClient({
  baseURL: 'http://127.0.0.1:8000',
  jwt: 'eyJhbGciOiJI....',
});

export const getClient = () => {
  const quorumService: typeof Q = (window as any).quorumService;
  const newBase = `http://${quorumService.state.host}:${quorumService.state.port}`;
  const newJwt = quorumService.state.jwt;

  if (newBase !== base || newJwt !== jwt) {
    client = RumFullNodeClient({
      baseURL: newBase,
      jwt: newJwt,
    });
    base = newBase;
    jwt = newJwt;
  }
  return client;
};
