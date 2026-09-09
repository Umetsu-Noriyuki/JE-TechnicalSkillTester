import { GEMINI_MAX_RETRY_COUNT, GEMINI_RETRY_DELAY_MILLISECONDS } from '../../config/constants';
import { generateContent } from '../../infrastructure/gemini_client';

export interface DescriptiveAnswerToScore {
  questionId: string;
  question: string;
  sampleAnswer: string;
  studentAnswer: string;
}

export interface DescriptiveScoreResult {
  questionId: string;
  score: number;
  feedback: string;
}

const UNANSWERED_FEEDBACK = '未回答のため0点としました。';
const ERROR_FEEDBACK = '採点処理でエラーが発生したため0点としました。';

const unansweredResult = (questionId: string): DescriptiveScoreResult => ({
  questionId,
  score: 0,
  feedback: UNANSWERED_FEEDBACK,
});

const errorResult = (questionId: string): DescriptiveScoreResult => ({
  questionId,
  score: 0,
  feedback: ERROR_FEEDBACK,
});

/**
 * プロンプト本文は specification/for-AI-prompt.md の内容と同期させること。
 * 記述式の問題は最大7問（DESCRIPTIVE_SCORE_SLOT_COUNT）を1回のリクエストにまとめて送信する（10-2章）。
 */
const buildBatchPrompt = (targets: readonly DescriptiveAnswerToScore[]): string => `プログラミングスキル判定テストにおける記述式の採点を実施してください。
以下は複数の設問です。設問ごとに「問題」の「模範回答」と「受講者の提出回答」を比較評価し採点を実施してください。

【採点基準】
問題毎に100点を満点とします。
回答無しの場合は0点です。

コードやフローを記述する回答の場合：
次の判断を行った合計点（100点満点）で採点する
1. 処理ロジックが問題文の要件を満たしているか (50点)
　※模範回答と異なる書き方（for文、reduce関数など）であっても、ロジックが正しければ満点としてください。
2. 構文エラーや致命的なバグがないか (30点)
　※仮想のプログラミング言語として、命令や書式が適正さや分岐に考慮不足がないかなど、プログラムの一般的な視点として確認してください。
3. 可読性や適切な書き方がされているか (20点)
　※変数や関数の名称のわかりやすさ、インデント位置やカッコ位置の見やすさ、全体のわかりやすさを確認してください。

コードやフローを伴わない回答の場合：
1. 模範回答と比較して、言い回しは異なっても同様の内容であれば100点
2. 模範回答と比較して、同様の内容とするにはやや不足がある場合80点
3. 模範回答と比較して、合っている内容もあるが不足がある場合、不足状況により70-10点の間で10点刻みで変動した配点とする
4. 模範回答と比較して、全く合っている内容が無い場合0点

【採点対象】
以下はJSON配列形式で、複数の設問（questionId・問題・模範回答・受講者の提出回答）を渡します。
${JSON.stringify(
  targets.map((target) => ({
    questionId: target.questionId,
    question: target.question,
    sampleAnswer: target.sampleAnswer,
    studentAnswer: target.studentAnswer,
  })),
)}

【出力形式】
必ず以下のJSON配列形式のみで回答を出力してください。Markdownなどの余計な囲みは不要です。
入力された設問すべてについて、questionIdを一致させたうえで1件ずつ結果を含めてください（順序は問いません）。
[
  { "questionId": "(採点対象のquestionIdをそのまま転記)", "score": (0〜100の数値), "feedback": "(簡潔な採点理由や改善点のアドバイス)" }
]`;

const parseBatchResponse = (
  text: string,
  targets: readonly DescriptiveAnswerToScore[],
): Map<string, DescriptiveScoreResult> => {
  const jsonText = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '');
  const parsed = JSON.parse(jsonText) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error('Geminiのレスポンス形式が不正です（配列ではありません）');
  }

  const resultByQuestionId = new Map<string, DescriptiveScoreResult>();
  for (const item of parsed as { questionId?: unknown; score?: unknown; feedback?: unknown }[]) {
    if (typeof item.questionId !== 'string' || typeof item.score !== 'number' || typeof item.feedback !== 'string') {
      throw new Error('Geminiのレスポンス形式が不正です');
    }
    resultByQuestionId.set(item.questionId, {
      questionId: item.questionId,
      score: Math.min(100, Math.max(0, Math.round(item.score))),
      feedback: item.feedback,
    });
  }

  for (const target of targets) {
    if (!resultByQuestionId.has(target.questionId)) {
      throw new Error(`Geminiのレスポンスに設問の採点結果が含まれていません: ${target.questionId}`);
    }
  }

  return resultByQuestionId;
};

/**
 * 記述式問題をまとめて1回のリクエストでGemini APIに採点させる（10-2章）。
 * - 未回答の項目はAPIの呼び出し対象から除外し0点とする。
 * - 呼び出し・レスポンス解析に失敗した場合は、GEMINI_RETRY_DELAY_MILLISECONDS待機したうえで
 *   バッチ全体を最大 GEMINI_MAX_RETRY_COUNT 回再試行する（12章：外部API依存対策）。
 *   1つのリクエストにまとめているため、失敗時は全問まとめて0点になる（バッチ化とのトレードオフ）。
 * 戻り値の配列は、引数 answers と同じ順序・同じ要素数になる。
 */
export const scoreDescriptiveAnswersBatch = (
  answers: readonly DescriptiveAnswerToScore[],
): DescriptiveScoreResult[] => {
  const targets = answers.filter((answer) => answer.studentAnswer.trim() !== '');
  if (targets.length === 0) {
    return answers.map((answer) => unansweredResult(answer.questionId));
  }

  const prompt = buildBatchPrompt(targets);

  for (let attempt = 0; attempt <= GEMINI_MAX_RETRY_COUNT; attempt += 1) {
    if (attempt > 0) {
      Utilities.sleep(GEMINI_RETRY_DELAY_MILLISECONDS);
    }
    try {
      const resultByQuestionId = parseBatchResponse(generateContent(prompt), targets);
      return answers.map(
        (answer) => resultByQuestionId.get(answer.questionId) ?? unansweredResult(answer.questionId),
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Gemini採点に失敗しました（試行 ${attempt + 1}/${GEMINI_MAX_RETRY_COUNT + 1}）`, error);
    }
  }

  const targetQuestionIds = new Set(targets.map((target) => target.questionId));
  return answers.map((answer) =>
    targetQuestionIds.has(answer.questionId) ? errorResult(answer.questionId) : unansweredResult(answer.questionId),
  );
};
