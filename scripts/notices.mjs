import { readFile, writeFile } from 'node:fs/promises';
const packages = ['react', 'react-dom', 'scheduler', 'zod'];
const notices = await Promise.all(
  packages.map(async (name) => {
    const metadata = JSON.parse(await readFile(`node_modules/${name}/package.json`, 'utf8'));
    const license = await readFile(`node_modules/${name}/LICENSE`, 'utf8');
    return `${name} ${metadata.version}\n\n${license}`;
  }),
);
await writeFile('.output/chrome-mv3/THIRD_PARTY_NOTICES.txt', notices.join('\n\n---\n\n'));
