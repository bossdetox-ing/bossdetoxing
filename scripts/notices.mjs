import { readFile, writeFile, readdir } from 'node:fs/promises';
import process from 'node:process';
const out = process.argv[2] ?? '.output/chrome-mv3';
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const paths = Object.entries(lock.packages)
  .filter(
    ([path, meta]) =>
      path.startsWith('node_modules/') && (!meta.dev || path === 'node_modules/tailwindcss'),
  )
  .map(([path]) => path);
const notices = await Promise.all(
  paths.map(async (path) => {
    const metadata = JSON.parse(await readFile(`${path}/package.json`, 'utf8'));
    const files = await readdir(path);
    const name = files.find((name) => /^licen[sc]e(?:\.(?:md|txt))?$/i.test(name));
    const license = name
      ? await readFile(`${path}/${name}`, 'utf8')
      : `License: ${metadata.license ?? 'See package metadata'}`;
    return `${metadata.name} ${metadata.version}\n\n${license}`;
  }),
);
notices.push(
  `shadcn/ui (adapted components)\n\n${await readFile('src/components/ui/LICENSE', 'utf8')}`,
  'EFF Short Wordlist 1 (passphrase suggestions, src/content/eff-short-words.json)\n\n' +
    'Electronic Frontier Foundation, https://www.eff.org/dice — licensed under Creative Commons ' +
    'Attribution 3.0 United States (https://creativecommons.org/licenses/by/3.0/us/). Unmodified word list.',
);
await writeFile(`${out}/THIRD_PARTY_NOTICES.txt`, notices.join('\n\n---\n\n'));

await writeFile(`${out}/LICENSE.txt`, await readFile('LICENSE'));
