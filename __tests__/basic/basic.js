const path = require('path');
const fs = require('fs-extra');

const TwigRenderer = require('../../src');

describe('basic', () => {
  const twigRenderer = new TwigRenderer({
    root: path.join(__dirname, 'src'),
    autoescape: false,
    verbose: true,
  });

  beforeAll(() => twigRenderer.init());

  test('basic1', async () => {
    await fs.emptyDir(path.join(__dirname, 'dist'));
    const results = await twigRenderer.render('hello-world.twig', {
      text: 'World',
    });

    if (results.ok) {
      await fs.writeFile(path.join(__dirname, 'dist', 'hello-world.html'), results.html);
    } else {
      console.error('Error: ', results.message);
    }

    const expected = await fs.readFile(path.join(__dirname, 'expected', 'hello-world.html'), 'utf8');
    const actual = await fs.readFile(path.join(__dirname, 'dist', 'hello-world.html'), 'utf8');

    expect(expected.trim()).toEqual(actual.trim());
  });

  afterAll(() => twigRenderer.closeServer());
});
