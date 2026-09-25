// Serves the built site in the Docker image. It does what `docusaurus serve`
// does for our config (baseUrl is '/' and trailingSlash is unset), so it uses
// the same serve-handler options without needing all of Docusaurus at runtime.
// The Dockerfile bundles this file, so the image doesn't need node_modules.
import http from 'node:http';
import path from 'node:path';
import serveHandler from 'serve-handler';

const port = Number(process.env.PORT) || 3344;
const buildDir = path.resolve('build');

const server = http.createServer((req, res) =>
  serveHandler(req, res, {
    cleanUrls: true,
    public: buildDir,
    trailingSlash: undefined,
    directoryListing: false,
  }),
);

server.listen(port, '0.0.0.0', () => {
  console.log(`Serving ${buildDir} at http://0.0.0.0:${port}/`);
});

// Node doesn't exit on SIGTERM when it runs as PID 1, so without this
// Kubernetes waits out the whole grace period before killing the container.
// Closing the server lets in-flight responses finish before exiting.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
