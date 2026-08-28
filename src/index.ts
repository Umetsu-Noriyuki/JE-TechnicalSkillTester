import { doGet } from './server/entry_points/do_get';
import { include } from './server/entry_points/include';

(globalThis as Record<string, unknown>).doGet = doGet;
(globalThis as Record<string, unknown>).include = include;
