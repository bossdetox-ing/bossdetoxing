import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = '.output/chrome-mv3';
const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.deepEqual([...manifest.permissions].sort(), ['sidePanel', 'storage'].sort());
assert.deepEqual(manifest.host_permissions ?? [], []);
for (const field of [
  'content_scripts',
  'externally_connectable',
  'oauth2',
  'web_accessible_resources',
])
  assert.equal(manifest[field], undefined, field);
assert.equal(manifest.action.default_popup, undefined);
assert.equal(manifest.side_panel.default_path, 'sidepanel.html');
assert.match(await readFile(join(root, 'THIRD_PARTY_NOTICES.txt'), 'utf8'), /React|react/);
assert.match(manifest.content_security_policy.extension_pages, /connect-src 'none'/);
assert.doesNotMatch(
  manifest.content_security_policy.extension_pages,
  /unsafe-eval|unsafe-inline|https:/,
);
async function scan(path) {
  for (const item of await readdir(path, { withFileTypes: true })) {
    const target = join(path, item.name);
    if (item.isDirectory()) await scan(target);
    else if (/\.(?:js|html|css)$/.test(item.name)) {
      const code = await readFile(target, 'utf8');
      assert(
        !/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\.sendBeacon\s*\(|getUserMedia\s*\(|getDisplayMedia\s*\(/.test(
          code,
        ),
        `Forbidden runtime API in ${target}`,
      );
      assert(!/https?:\/\/[^\s"']+\.(?:woff2?|css)["']/.test(code), `Remote asset in ${target}`);
    }
  }
}
await scan(root);
console.log('PASS: production manifest, CSP, no capture/network API calls, no remote fonts/styles');
