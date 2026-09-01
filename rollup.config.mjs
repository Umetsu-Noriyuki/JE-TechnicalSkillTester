// rollup.config.mjs
import { readFileSync } from 'node:fs';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import cleanup from 'rollup-plugin-cleanup';
import license from 'rollup-plugin-license';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

const licenseBanner = [
  `Name: ${packageJson.name}`,
  `Version: ${packageJson.version}`,
  `Description: ${packageJson.description}`,
  `@see ${packageJson.homepage}`,
].join('\n');

// GASの実行環境（V8ランタイム）はトップレベルの import/export を解釈できないため、
// 各エントリーポイントは 'iife' 形式で単一ファイルにバンドルする。
// サーバー側は src/index.ts が doGet 等を globalThis へ束縛することでGASから認識可能になる。
// クライアント側は client/views/partials/script.html への埋め込み用に単体のJSとして出力する。
const createPlugins = () => [
  nodeResolve(),
  commonjs(),
  typescript(),
  cleanup({ comments: 'none', extensions: ['.ts'] }),
  license({ banner: licenseBanner }),
];

const serverConfig = {
  input: 'src/index.ts',
  output: {
    // 'iife' は使わない: google.script.run はサーバー側ファイルをソース解析して呼び出し可能な
    // 関数一覧を検出するため、doGet 等がトップレベルの function 宣言として存在しないと
    // （IIFEで包まれてスコープが1段ネストすると）google.script.run から認識されない。
    // src/index.ts はexport・外部importを持たないため、'cjs' 形式でもラッパーは生成されず、
    // 結果としてトップレベルのfunction宣言がそのまま出力される。
    file: 'dist/index.js',
    format: 'cjs',
  },
  plugins: createPlugins(),
};

const clientConfig = {
  input: 'src/client/scripts/index.ts',
  output: {
    file: 'dist/client/scripts/bundle.js',
    format: 'iife',
  },
  plugins: createPlugins(),
};

export default [serverConfig, clientConfig];
