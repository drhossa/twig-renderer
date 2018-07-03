const path = require('path');
const qs = require('querystring');
const fp = require('find-free-port');
const fetch = require('node-fetch');
const sleep = require('sleep-promise');
const fs = require('fs-extra');
const execa = require('execa');

const sharedConfigPath = path.join(__dirname, 'shared-config.json');

class TwigRenderer {
  constructor(config) {
    this.config = Object.assign({
      // Root directory for Twig Loader
      root: '', // required
      autoescape: false,
      debug: true,
      verbose: false,
    }, config);
    this.settings = {};
  }

  async init() {
    // @todo Pass config to PHP server a better way than writing JSON file, then reading in PHP
    await fs.writeFile(sharedConfigPath, JSON.stringify(this.config, null, '  '));
    const [port] = await fp(3000);
    this.settings.phpServerUrl = `127.0.0.1:${port}`;

    this.phpServer = execa('php', [
      '-S',
      this.settings.phpServerUrl,
      path.join(__dirname, 'server.php'),
    ]);

    this.phpServer.stdout.pipe(process.stdout);
    this.phpServer.stderr.pipe(process.stderr);

    if (this.config.verbose) {
      console.log('TwigRender js init');
    }

    // @todo detect when PHP server is ready to go; in meantime, we'll just pause for a moment
    await sleep(1000);
    return true;
  }

  closeServer() {
    this.phpServer.kill();
  }

  async render(templatePath, data = {}) {
    try {
      const requestUrl = `http://${this.settings.phpServerUrl}?${qs.stringify({
        templatePath,
      })}`;

      const res = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const { status, headers, ok } = res;
      console.log(`Status Code: ${status}. Ok: ${ok ? 'yes' : 'no'}`);
      const warning = headers.get('Warning');
      if (warning) {
        console.warning('Warning: ', warning);
      }
      const results = await res.json();
      if (this.config.verbose) {
        console.log(`Rendered ${templatePath}, received:`);
        console.log(results);
      }
      return results;
    } catch (e) {
      return {
        ok: false,
        message: e.message,
      };
    }
  }
}

module.exports = TwigRenderer;
