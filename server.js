const http = require('node:http');

const DEFAULT_PORT = 3000;
const MIN_PORT = 1024;
const MAX_PORT = 65535;
const HELLO_PATH = '/hello';
const HELLO_BODY = 'Hello world';
const NOT_FOUND_BODY = 'Not Found';
const CONTENT_TYPE = 'text/plain';

function parsePort(rawValue) {
  if (rawValue === undefined || rawValue === '') {
    return { valid: true, port: DEFAULT_PORT };
  }

  // Control characters are escaped rather than emitted, so a value carrying a newline
  // cannot split the one-line stderr record or forge an extra diagnostic line.
  const quotedValue = rawValue.replace(
    /[\u0000-\u001f\u007f-\u009f]/g,
    (char) => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')
  );

  const message =
    'Invalid PORT "' + quotedValue + '": expected an integer between ' + MIN_PORT +
    ' and ' + MAX_PORT + '. ' +
    'Set PORT to a value in that range, for example PORT=' + DEFAULT_PORT + ', ' +
    'and start the server again.';

  if (!/^[0-9]+$/.test(rawValue)) {
    return { valid: false, message };
  }

  const port = Number(rawValue);
  if (port < MIN_PORT || port > MAX_PORT) {
    return { valid: false, message };
  }

  return { valid: true, port };
}

function logRequest(method, path) {
  console.log(new Date().toISOString() + ' ' + method + ' ' + path);
}

function sendText(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', CONTENT_TYPE);
  res.end(body);
}

function handleHelloRequest(req, res) {
  sendText(res, 200, HELLO_BODY);
}

function handleNotFoundRequest(req, res) {
  sendText(res, 404, NOT_FOUND_BODY);
}

const ROUTES = {
  ['GET ' + HELLO_PATH]: handleHelloRequest,
};

function routeRequest(req, res, path) {
  const handler = ROUTES[req.method + ' ' + path];

  if (handler === undefined) {
    handleNotFoundRequest(req, res);
    return;
  }

  handler(req, res);
}

function handleRequest(req, res) {
  // Match and log on the path alone: the query string is not part of the route key and
  // the log line records only the path, so it is dropped once here.
  const path = req.url.split('?')[0];

  logRequest(req.method, path);
  routeRequest(req, res, path);
}

function startServer(port) {
  const server = http.createServer(handleRequest);

  server.on('listening', () => {
    console.log('Server listening on port ' + port);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        'Cannot start server: port ' + port + ' is already in use (EADDRINUSE). ' +
        'Stop the process using that port or start the server with a different one, ' +
        'for example PORT=' + (port + 1) + '.'
      );
    } else {
      console.error(
        'Cannot start server: could not bind port ' + port + ' (' + err.code + '). ' +
        'Check that the port is free and that this process may bind it, ' +
        'then start the server again.'
      );
    }

    process.exitCode = 1;
  });

  server.listen(port);
  process.on('SIGINT', () => handleSigint(server));
}

function handleSigint(server) {
  console.log('Server shutting down');
  server.close(() => {
    process.exitCode = 0;
  });

  // close() only started closing idle connections in later runtimes, so an idle keep-alive
  // socket on Node 18.0.x would hold the close callback until the 5s keep-alive timeout.
  if (typeof server.closeIdleConnections === 'function') {
    server.closeIdleConnections();
  }
}

function main() {
  const result = parsePort(process.env.PORT);

  if (!result.valid) {
    // An unacceptable port ends the process with a status instead of a throw, so the
    // operator sees one actionable line rather than a stack trace.
    console.error(result.message);
    process.exitCode = 1;
    return;
  }

  startServer(result.port);
}

main();
