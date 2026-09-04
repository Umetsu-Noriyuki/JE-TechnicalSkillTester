## コーディング規約

### 命名規則

クラス名、変数・関数・メソッド、定数、ファイル名は、見た目で何を行うもの、何のためのもの、が分かる名称とする

#### 変数と関数

- 変数と関数名は LowerCamelCase

```
var fooVar;
function barFunc() { }
```

#### クラス

- クラス名は PascalCase

```
class UserProfileScreen {}
```

- クラスメンバとメソッドは lowerCamelCase

```
class Foo {
    bar: number;
    baz() { }
}
```

#### インターフェース

- インターフェース名は PascalCase
- そのメンバは lowerCamelCase

```
interface Foo {
}
```

#### タイプ

- タイプ名は PascalCase
- そのメンバは lowerCamelCase
  
#### Enum

- enumは PascalCase

```
enum Color {
}
```

- enumメンバは PascalCase

```
enum Color {
    Red
}
```

#### 定数

- 定数は すべて大文字 + snake_case

```
const MAX_RETRY_COUNT = 3;
const double DEFAULT_PADDING = 16.0;
```

#### ファイル名・フォルダ名

- ファイル名は snake_case

```
user_profile_screen.dart
auth_service.dart
```

- フォルダ名は snake_case

```
services/
common_method/
```

#### ブール値

- ブール値は is / has / can で始める

```
isLoading
hasPermission
canEdit
```

### コーディングルール

- １つのメソッドや関数は最大でも50行ぐらいとする。これを超える場合は、長いロジックを別処理として関数化する
- 30行を超える処理は長いロジックとする
- 上位の処理は、処理順に関数を並べるような記載とし、これら関数名を見ればどのような処理を行っているのかがわかるようにする
- 特に指示が無くても、作成したファイル毎にテストコードを作成する
- ディレクトリ構成は`specification\architecture.md`に従うこと

#### null, undefined

- 一般的に `null` ではなく `undefined` を利用する

```
return undefined;
```

- APIまたは従来のAPIの一部である場合は`null`を使用する（Node.jsの慣例のため。NodeBackスタイルコールバックのerrorは`null`）

```
cb(null)
```

#### 文字列操作

- 文字列の連結には+ではなく、テンプレートリテラル（`${}`）を使用する

```
const sayHi = (name) => {
  return `How are you, ${name}?`;
}
```

#### 配列

- 配列をコピーする際は、拡張演算子`...`を使用する

```
const itemsCopy = [...items];
```

- 配列の要素を取得する際は、分割代入を使用する

```
const [first, second] = arr;
```

#### 変数

- 基本的に`const`を使用し、再代入が必要な場合のみ`let`を使用する（`var`はスコープを無視して宣言でき、予期せぬ結果を引き起こしやすいため使用しない）

#### インクリメント、デクリメント

- `++`, `--`は使わない、`+=`, `-=`を使用する

```
const array = [1, 2, 3];
let num = 1;
num += 1;
num -= 1;

const sum = array.reduce((a, b) => a + b, 0);
const truthyCount = array.filter(Boolean).length;
```

#### 関数

- アロー関数を使用する

```
const someFunc = (amount:number) => {
    const computeTax = (amount: number) => amount * 0.12;
}

//export defaultと併用する場合は、export defaultを最下部に配置する必要がある。
const Todo = () => {
....
}

export default Todo
```

#### タイプ

- 基本的には`type`を使用する。ただし、継承が必要な時は`interface`を使用する
- `any`, `unknown`は使用しない
- `Type assertion`は極力使用しない（`as`でキャストすることは、型の不整合が分からなくなるため）。ただし、`as const`は積極的に使用する（`as const`は手軽に精緻な型を推論できる）

#### 比較

- `===`を使用する。ただし、`null`/`undefined`チェックの場合のみ`!=`を使用する（`!==`だと`undefined`が除外されないため）
- `switch`文には必ず`default`, `break`を使用する

### テストコード作成ルール

- テストコードは、テスト対象ファイルがあるディレクトリ以下に`__tests__`ディレクトリを作成し、この中に作成する
- ファイル名は、基本的にはテスト対象ファイル名語尾の `.ts` を `.test.ts` に変更したものとする
- コードの修正があった場合、対象のテストコードも併せて修正すること

#### ロジックのテストコード

- 初めに、テスト対象のメソッドや関数のブラックボックステストとし、取り得るinputに対するoutputが正しいことを判定する
- 次に、メソッドや関数内に分岐がある場合、条件により正しく分岐されることを判定する
- 次に、例外処理が正しく動作することを判定する
- 正常系と異常系がわかるようなテスト表示にすること
- メソッドや関数に変更があった場合、テストコードも合わせて変更すること
- テスト内容（test()のsubject）は日本語とする
- インスタンスを作成する場合は、TearDownの処理で解放しメモリリークを回避すること

#### 目標カバレッジ

| 種類 | 目標カバレッジ | 考え方 |
|---|---|---|
| プロジェクト全体 | 80%以上 |  |
| ビジネスロジック | 90%以上 | 重要な分岐をできるだけ網羅 |
| 重要な計算・判定 | 95%以上 | 複雑な計算や条件分岐をチェック |
| ユーティリティ | 90〜100% | 単純なデータ変換などは網羅しやすい |
| API・サービス層 | 80〜90% | 正常系＋主要な異常系をテスト |
| DBアクセス・外部API連携 | 70〜80% | モックを使ったテスト中心 |
| Controller / Handler | 70〜80% | ロジックが薄ければ低めでも可 |
| UI・フレームワーク依存コード | 60〜80% | 別途E2Eや依存先で担保 |
| 設定・初期化・Glue Code | 50〜70% | テストの必要性がない場合や、無理にテストしないケースもあり |
