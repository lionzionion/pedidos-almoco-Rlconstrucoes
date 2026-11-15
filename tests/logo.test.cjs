// Verifica a presença da logomarca oficial RL em TODAS as páginas publicadas.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pages = ['index.html', 'app/index.html', 'demo/index.html', 'produto/index.html'];

test('logo oficial é um arquivo WEBP válido do repositório', () => {
  const logo = fs.readFileSync(path.join(root, 'assets/rl-logo.webp'));
  assert.ok(logo.length > 5_000, 'O arquivo da logo deve conter os dados da imagem');
  assert.equal(logo.toString('ascii', 0, 4), 'RIFF');
  assert.equal(logo.toString('ascii', 8, 12), 'WEBP');
});

for (const page of pages) {
  test(`logo e favicon visíveis na página ${page}`, () => {
    const file = path.join(root, page);
    const html = fs.readFileSync(file, 'utf8');
    const match = html.match(/<img[^>]*src="([^"]*rl-logo\.webp)"[^>]*>/i);
    assert.ok(match, 'A logo original deve aparecer como <img> no HTML');
    assert.match(match[0], /alt="RL Engenharia/i, 'A imagem deve ter texto alternativo acessível');
    assert.ok(fs.existsSync(path.resolve(path.dirname(file), match[1])), 'Referência de logo deve resolver para arquivo existente');
    const icon = html.match(/<link[^>]+rel="icon"[^>]*href="([^"]*rl-logo\.webp)"/i);
    assert.ok(icon, 'O favicon deve usar a logo RL');
    assert.ok(fs.existsSync(path.resolve(path.dirname(file), icon[1])), 'Referência do favicon deve resolver');
  });
}
