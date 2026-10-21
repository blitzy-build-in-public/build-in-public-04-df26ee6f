# Node.js Tutorial: Hello World HTTP Server

## Project purpose

A minimal Node.js HTTP server tutorial that demonstrates creating a single endpoint and
handling requests using only Node.js built-in modules, with no frameworks, no middleware and
no dependencies. The whole application is one file, `server.js`: it answers `GET /hello` with
the plain-text body `Hello world`, and it answers every other request with `404 Not Found`.

## Prerequisites

- Node.js `>=18.0.0` — the version range this project declares for itself.
- `npm`, which ships with Node.js, if you want to start the server with `npm start`.
- `curl`, for the requests shown under Testing.

Confirm the Node.js version:

```bash
node --version
```

Acceptable output looks like this:

```text
v22.23.3
```

Any version at or above `v18.0.0` works.

## Installation

Nothing is installed. There are no packages, no `npm install`, no build step and no
configuration to create — the project has no dependencies at all. Having Node.js installed is
the entire requirement, so you can run the server directly from the project folder.

## Execution

Run the server from the project root, the folder that contains `server.js`.

```bash
node server.js
```

The server prints one line and keeps running:

```text
Server listening on port 3000
```

The same program starts through npm:

```bash
npm start
```

`npm` prints a blank line, then two lines of its own, before the server's line. Those two
lines are npm's output, not the server's:

```text

> nodejs-tutorial-hello-world@1.0.0 start
> node server.js

Server listening on port 3000
```

Both forms run the same command, `node server.js`. Leave the server running in that terminal
and use a second terminal for the requests below; press CTRL+C in the first terminal when you
are finished (see Shutdown).

## Testing

With the server still running, open a second terminal and make these requests. The server
stays up after each one.

```bash
curl http://localhost:3000/hello
```

Status `200`, body:

```text
Hello world
```

```bash
curl -i http://localhost:3000/invalid
```

Status `404`, body:

```text
Not Found
```

```bash
curl -i -X POST http://localhost:3000/hello
```

Status `404`, body:

```text
Not Found
```

The method is part of the route, so only `GET /hello` matches. Any other method or path —
including `POST /hello` and `/invalid` — is answered by the same catch-all `404 Not Found`.
`curl -i` prints the response headers as well as the body; without `-i` you see the body alone.

## Expected output examples

**Request log lines.** The server writes one line to its own terminal for every request,
matched or not, in the form `[ISO-8601 timestamp] [METHOD] [path]`:

```text
Server listening on port 3000
2026-10-21T15:12:59.886Z GET /hello
2026-10-21T15:12:59.895Z GET /invalid
2026-10-21T15:12:59.902Z POST /hello
```

The first line is the startup line and the rest are the log lines for the three requests above,
including the two 404s. The query string is not logged: a request for `/hello?sample=1` is
logged as `/hello`.

**The 200 response for `GET /hello`.**

```http
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Wed, 21 Oct 2026 15:12:59 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 11

Hello world
```

**A 404 response**, for example for `/invalid` or for `POST /hello`:

```http
HTTP/1.1 404 Not Found
Content-Type: text/plain
Date: Wed, 21 Oct 2026 15:12:59 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 9

Not Found
```

The server sets the status code and `Content-Type: text/plain`. `Date`, `Connection`,
`Keep-Alive` and `Content-Length` are added by Node.js itself, and the `Date` value shown is
one observed example — it changes with every request.

**A rejected port value**, printed on stderr with exit status 1 (see Environment variable
configuration (PORT)):

```text
Invalid PORT "abc": expected an integer between 1024 and 65535. Set PORT to a value in that range, for example PORT=3000, and start the server again.
```

**A port that is already in use.** Starting a second server while one is listening on port 3000
prints this on stderr and exits with status 1:

```text
Cannot start server: port 3000 is already in use (EADDRINUSE). Stop the process using that port or start the server with a different one, for example PORT=3001.
```

The port it suggests is the one it tried plus one, so on port 4000 the same message suggests
`PORT=4001`. At the top of the accepted range there is no port above, so the message suggests
the one below instead — `PORT=65534` on `65535`. Any other bind failure, such as `EACCES` on a
port this process may not bind, is reported the same way — with the actual error code in place of
the example below — and also exits with status 1:

```text
Cannot start server: could not bind port 3000 (EACCES). Check that the port is free and that this process may bind it, then start the server again.
```

**The shutdown line** (see Shutdown):

```text
Server shutting down
```

The startup, request and shutdown lines go to stdout; the two error messages go to stderr.

## Shutdown

Press CTRL+C in the terminal running the server; sending SIGINT to the server's process, for
example `kill -INT` with its process id, is equivalent. The server prints:

```text
Server shutting down
```

and then exits with status code `0` — without that handling, an interrupted process would
report `130`. The port is released, so a request made afterwards fails to connect until you
start the server again.

The shutdown line and the port release are immediate: the server stops accepting new
connections as soon as the signal arrives, so a request made right afterwards fails to connect
even while the process is still finishing its shutdown. The process exits with status code `0`
once every open connection has closed — a connection that is idle between requests is closed
straight away, while a request that is already in flight is allowed to finish. A client that
keeps a connection open without finishing a request, whether it has sent nothing at all or left
a request half-written, keeps the process alive until it disconnects: a client that connected
and stayed silent for 10 seconds deferred the exit by about 9.3 seconds, so the wait follows the
client's own hold time rather than a fixed timeout in the server. If you need the process to
stop at once, `kill -TERM` with its process id does not wait.

Only CTRL+C (SIGINT) is intercepted. A SIGTERM is left to Node.js's default handling, so it
prints no shutdown line and does not exit with status `0`.

## Environment variable configuration (PORT)

`PORT` is the whole configuration surface. When it is unset — or set to an empty value — the
server listens on `3000`. An accepted value is a digit-only integer between `1024` and `65535`
inclusive: no sign, no decimal point, no whitespace and no radix prefix.

```bash
PORT=4000 npm start
```

```text
Server listening on port 4000
```

Requests then go to port 4000 instead of 3000. Every value outside the rule is rejected before
any socket is opened, with this message on stderr and exit status `1`:

```bash
PORT=abc node server.js
echo $?
```

```text
Invalid PORT "abc": expected an integer between 1024 and 65535. Set PORT to a value in that range, for example PORT=3000, and start the server again.
```

The `echo $?` above prints `1`. The same message is used for every rejected value, with the
value you supplied quoted, so `PORT=80`, `PORT=70000`, `PORT=3000.5` and `PORT=-1` all fail
this way — which is also why the server refuses to bind a privileged port. `PORT=` (empty)
counts as "not supplied" and falls back to 3000.
