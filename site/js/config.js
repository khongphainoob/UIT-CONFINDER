// TV1: đường live đã kiểm tra thành công GET, CORS (access-control-allow-origin: *) và schema.
export const API_ENDPOINT = 'https://ccfddl.com/conference/allconf.json';
export const SNAPSHOT_URL = new URL('../data/conferences.snapshot.json', import.meta.url);
export const PAGE_SIZE = 12;
