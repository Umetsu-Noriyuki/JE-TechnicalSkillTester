// scripts/build/inline-client-script.mjs
// クライアントスクリプトのバンドル結果(dist/client/scripts/bundle.js)を、
// dist/client/views/partials/script.html のプレースホルダーに<script>タグとして埋め込む。
// GASのHtmlServiceは静的な.jsファイルを配信できないため、この工程が必要になる。
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const SCRIPT_HTML_PATH = 'dist/client/views/partials/script.html';
const CLIENT_BUNDLE_PATH = 'dist/client/scripts/bundle.js';
const PLACEHOLDER = '<!-- CLIENT_SCRIPT -->';

const bundleContent = readFileSync(CLIENT_BUNDLE_PATH, 'utf-8');
const scriptHtml = readFileSync(SCRIPT_HTML_PATH, 'utf-8');

if (!scriptHtml.includes(PLACEHOLDER)) {
  throw new Error(`${SCRIPT_HTML_PATH} に埋め込み用プレースホルダー ${PLACEHOLDER} が見つかりません`);
}

const inlined = scriptHtml.replace(PLACEHOLDER, `<script>\n${bundleContent}\n</script>`);
writeFileSync(SCRIPT_HTML_PATH, inlined);
rmSync('dist/client/scripts', { recursive: true, force: true });
