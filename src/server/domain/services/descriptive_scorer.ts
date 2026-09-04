import { generateContent } from '../../infrastructure/gemini_client';

export interface DescriptiveScoreResult {
  score: number;
  feedback: string;
}

/**
 * プロンプト本文は specification/for-AI-prompt.md の内容と同期させること。
 */
const buildPrompt = (question: string, sampleAnswer: string, studentAnswer: string): string => `プログラミングスキル判定テストにおける記述式の採点を実施してください。
以下の「問題」の「模範回答」と「受講者の提出回答」を比較評価し採点を実施してください。

【問題】
${question}

【模範回答】
${sampleAnswer}

【受講者の提出回答】
${studentAnswer}

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

【出力形式】
必ず以下のJSON形式のみで回答を出力してください。Markdownなどの余計な囲みは不要です。
{
  "score": (0〜100の数値),
  "feedback": "(簡潔な採点理由や改善点のアドバイス)"
}`;

const parseGeminiResponse = (text: string): DescriptiveScoreResult => {
  // Geminiがコードブロック（```json ... ```）で囲む場合に備え、JSON部分のみ抽出する
  const jsonText = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '');
  const parsed = JSON.parse(jsonText) as { score?: unknown; feedback?: unknown };

  if (typeof parsed.score !== 'number' || typeof parsed.feedback !== 'string') {
    throw new Error('Geminiのレスポンス形式が不正です');
  }

  return {
    score: Math.min(100, Math.max(0, Math.round(parsed.score))),
    feedback: parsed.feedback,
  };
};

/**
 * 記述式問題をGemini APIで採点する（10-2章）。
 * - 未回答の場合はAPIを呼び出さず0点とする。
 * - API呼び出し・レスポンス解析に失敗した場合も0点として扱い、例外は投げない（12章：提出処理自体は継続する）。
 */
export const scoreDescriptiveAnswer = (
  question: string,
  sampleAnswer: string,
  studentAnswer: string,
): DescriptiveScoreResult => {
  if (studentAnswer.trim() === '') {
    return { score: 0, feedback: '未回答のため0点としました。' };
  }

  try {
    const responseText = generateContent(buildPrompt(question, sampleAnswer, studentAnswer));
    return parseGeminiResponse(responseText);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Gemini採点に失敗したため0点として扱います', error);
    return { score: 0, feedback: '採点処理でエラーが発生したため0点としました。' };
  }
};
