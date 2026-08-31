import { doGet } from './server/entry_points/do_get';
import { getQuizQuestions } from './server/entry_points/get_quiz_questions';
import { include } from './server/entry_points/include';
import { submitResult } from './server/entry_points/submit_result';

(globalThis as Record<string, unknown>).doGet = doGet;
(globalThis as Record<string, unknown>).include = include;
(globalThis as Record<string, unknown>).getQuizQuestions = getQuizQuestions;
(globalThis as Record<string, unknown>).submitResult = submitResult;
