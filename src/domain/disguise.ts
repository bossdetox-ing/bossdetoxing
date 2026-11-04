// Tab / toolbar icon choices. Look-alikes and monkeys work everywhere; real service logos are
// offered only on the web app (Chrome Web Store impersonation policy keeps them out of the extension).
export const lookAlikes = [
  'search',
  'mail',
  'message',
  'article',
  'chart',
  'calendar',
  'cloud',
  'folder',
  'notebook',
  'globe',
  'briefcase',
  'terminal',
  'blank',
] as const;
export const monkeys = Array.from(
  { length: 30 },
  (_, i) => `monkey-${String(i + 1).padStart(2, '0')}`,
);
// Simple Icons (CC0) slugs. Slack, LinkedIn, Amazon, Bing and Outlook are not in that set.
export const brands = [
  'google',
  'gmail',
  'googlecalendar',
  'googledrive',
  'googledocs',
  'googlesheets',
  'googlemeet',
  'ecosia',
  'duckduckgo',
  'facebook',
  'hubspot',
  'jira',
  'confluence',
  'notion',
  'zoom',
  'trello',
  'asana',
  'figma',
  'dropbox',
  'github',
] as const;
export const brandNames: Record<(typeof brands)[number], string> = {
  google: 'Google',
  gmail: 'Gmail',
  googlecalendar: 'Google Calendar',
  googledrive: 'Google Drive',
  googledocs: 'Google Docs',
  googlesheets: 'Google Sheets',
  googlemeet: 'Google Meet',
  ecosia: 'Ecosia',
  duckduckgo: 'DuckDuckGo',
  facebook: 'Facebook',
  hubspot: 'HubSpot',
  jira: 'Jira',
  confluence: 'Confluence',
  notion: 'Notion',
  zoom: 'Zoom',
  trello: 'Trello',
  asana: 'Asana',
  figma: 'Figma',
  dropbox: 'Dropbox',
  github: 'GitHub',
};
export const extensionIcons: readonly string[] = [...lookAlikes, ...monkeys];
export const webIcons: readonly string[] = [...brands, ...lookAlikes, ...monkeys];
// Earlier releases stored these ids.
export const legacyIcons: Record<string, string> = { notes: 'notebook', sigil: 'monkey-01' };
