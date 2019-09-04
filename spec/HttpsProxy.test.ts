import * as nock from 'nock';
import * as request from 'request';

import {HttpsProxy} from '../src/HttpsProxy';
const defaultPort = 8081;

describe('HttpsProxy', () => {
  beforeAll(() => {
    nock('https://example.com')
      .get('/')
      .reply(200);

    nock('https://invalid.com', {allowUnmocked: true, badheaders: ['host']})
      .get('/')
      .reply(404);
  });

  it(`doesn't allow GET requests to the proxy`, async done => {
    const httpsProxy = new HttpsProxy({port: defaultPort});
    await httpsProxy.start();

    request.get(`http://localhost:${defaultPort}`, async (error, response) => {
      await httpsProxy.stop();
      if (error) {
        return fail(error);
      }
      expect(response.statusCode).toBe(405);
      done();
    });
  });

  fit('proxies simple get requests', async done => {
    const username = 'my-username';
    const password = 'my-password';

    const httpsProxy = new HttpsProxy({
      auth: {
        password,
        username,
      },
      port: defaultPort,
      redirectUrl: 'https://example.com',
    });
    await httpsProxy.start();

    request.get(
      'https://invalid.com',
      {proxy: `http://${username}:${password}@localhost:${defaultPort}`, strictSSL: false},
      async (error, response) => {
        console.log('done');
        await httpsProxy.stop();
        if (error) {
          return fail(error);
        }
        expect(response.statusCode).toBe(200);
        done();
      }
    );
  });
});
