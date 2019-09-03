import * as basicAuth from 'basic-auth';
import * as http from 'http';
import * as logdown from 'logdown';
import * as net from 'net';
import compare = require('tsscmp');
import * as url from 'url';

export interface Options {
  /** Default is "password". */
  password?: string;
  /** Default is `8080`. */
  port?: number;
  /** If not set, the requested URL will be used. */
  target?: string;
  /** Default is "username". */
  username?: string;
}

const defaultOptions: Required<Options> = {
  password: 'password',
  port: 8080,
  target: '',
  username: 'username',
};

export class HttpsProxy {
  private readonly logger: logdown.Logger;
  private readonly options: Required<Options>;
  private readonly server: http.Server;

  constructor(options?: Options) {
    this.options = {...defaultOptions, ...options};
    this.logger = logdown('https-proxy', {
      logger: console,
      markdown: false,
    });
    this.logger.state.isEnabled = true;

    this.server = http
      .createServer((req, res) => {
        // discard all request to proxy server except HTTP/1.1 CONNECT method
        res.writeHead(405, {'Content-Type': 'text/plain'});
        res.end('Method not allowed');
      })
      .on('connect', this.onConnect)
      .on('error', error => this.logger.error(`Server error: "${error.message}"`));
  }

  start(): void {
    this.server.listen(this.options.port);
    this.logger.info(`Server is listening on port ${this.options.port}.`);
  }

  private getClosingProxyMessage(code: number, httpMessage: string): string {
    return [
      `HTTP/1.1 ${code} ${httpMessage}`,
      'Proxy-Authenticate: Basic realm="proxy"',
      'Proxy-Connection: close',
    ].join('\r\n');
  }

  private readonly onConnect = (req: http.IncomingMessage, clientSocket: net.Socket): void => {
    this.logger.log(clientSocket.remoteAddress, clientSocket.remotePort, req.method, req.url);

    const authorizationHeader = req.headers['proxy-authorization'];

    if (!authorizationHeader) {
      clientSocket.write(this.getClosingProxyMessage(407, 'Proxy Authentication Required'));
      clientSocket.end('\r\n\r\n');
      return;
    }

    if (!this.validateAuthorization(authorizationHeader)) {
      clientSocket.write(this.getClosingProxyMessage(401, 'Unauthorized'));
      clientSocket.end('\r\n\r\n');
      return;
    }

    const {port, hostname} = url.parse(this.options.target || `//${req.url}`, false, true);
    const parsedPort = parseInt(port || '443', 10);

    if (!hostname) {
      clientSocket.end('HTTP/1.1 400 Bad Request\r\n');
      clientSocket.destroy();
      return;
    }

    const serverSocket = net.connect({port: parsedPort, host: hostname});

    clientSocket
      .on('end', () => {
        if (serverSocket) {
          serverSocket.end();
        }
      })
      .on('error', (err: Error) => {
        this.logger.error(`ClientSocket error: "${err.message}"`);
        if (serverSocket) {
          serverSocket.end();
        }
      });

    serverSocket
      .on('connect', () => {
        clientSocket.write(['HTTP/1.1 200 Connection Established', 'Proxy-agent: Node-VPN'].join('\r\n'));
        clientSocket.write('\r\n\r\n');

        serverSocket.pipe(
          clientSocket,
          {end: false}
        );

        clientSocket.pipe(
          serverSocket,
          {end: false}
        );
      })
      .on('end', () => {
        if (clientSocket) {
          clientSocket.end(`HTTP/1.1 500 External Server End\r\n`);
        }
      })
      .on('error', (err: Error) => {
        this.logger.error(`ServerSocket error: "${err.message}"`);
        if (clientSocket) {
          clientSocket.end(`HTTP/1.1 500 ${err.message}\r\n`);
        }
      });
  };

  private validateAuthorization(auth: string): boolean {
    const credentials = basicAuth.parse(auth);
    return (
      !!credentials &&
      (compare(credentials.name, this.options.username) && compare(credentials.pass, this.options.password))
    );
  }
}
