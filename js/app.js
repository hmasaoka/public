'use strict';

/* ===== 質問データ ===== */
const QUESTIONS = [
  {
    id: 'purpose',
    step: 'STEP 1 / 利用目的',
    text: 'Claude Code を何に使いますか？',
    note: '最も近いものを選んでください。',
    choices: [
      { label: '個人学習',        desc: '自分のスキルアップや学習目的',                    value: 'personal', risk: 0 },
      { label: '趣味・個人開発',  desc: '趣味のプロジェクトや個人サイトの制作',            value: 'hobby',    risk: 0 },
      { label: '業務利用（社内）', desc: '会社の業務効率化や社内ツールの制作',             value: 'work',     risk: 1 },
      { label: '顧客向けシステム', desc: 'お客様に提供するシステムやサービスの開発',        value: 'client',   risk: 2 },
      { label: '社内基幹システム', desc: '会社の重要なシステムや機密データを扱う開発',      value: 'system',   risk: 2 },
    ],
  },
  {
    id: 'data',
    step: 'STEP 2 / 扱うデータ',
    text: '機密情報を扱いますか？',
    note: '個人情報・顧客情報・社外秘の情報が当てはまります。',
    choices: [
      { label: '扱わない',      desc: '公開情報や個人のメモのみを扱う',              value: 'none',     risk: 0 },
      { label: '少し扱う',      desc: '稀に機密情報が含まれることがある',            value: 'some',     risk: 1 },
      { label: '頻繁に扱う',    desc: '日常的に個人情報や機密情報を扱う',            value: 'frequent', risk: 2 },
      { label: '分からない',    desc: '自分のデータが機密かどうか判断できない',       value: 'unknown',  risk: 1 },
    ],
  },
  {
    id: 'execution',
    step: 'STEP 3 / コマンド実行',
    text: 'AIによるコマンド実行をどこまで許可しますか？',
    note: 'コマンドとは、ファイルの作成・削除・プログラムの起動などの操作のことです。',
    choices: [
      { label: '毎回確認する',              desc: 'すべてのコマンド実行前に自分で確認する（最も安全）', value: 'each',    risk: 0 },
      { label: '基本は確認する',            desc: 'ほとんど確認するが、簡単な操作は許可する',          value: 'mostly',  risk: 0 },
      { label: 'よく使うものだけ自動許可',  desc: '登録した操作は自動実行、それ以外は確認する',        value: 'partial', risk: 1 },
      { label: 'すべて自動許可',            desc: '確認なしにすべてのコマンドを実行する（危険）',       value: 'all',     risk: 2 },
    ],
  },
  {
    id: 'file',
    step: 'STEP 4 / ファイルアクセス',
    text: 'Claude Code がアクセスできる範囲はどこまで許可しますか？',
    note: 'アクセス範囲を広げると、誤った操作のリスクが増えます。',
    choices: [
      { label: '作業フォルダのみ', desc: '今作業しているフォルダの中だけ（最も安全）',       value: 'work',    risk: 0 },
      { label: 'プロジェクト全体', desc: 'プロジェクトのすべてのフォルダにアクセス可能',    value: 'project', risk: 1 },
      { label: 'PCすべて',        desc: 'パソコン全体のファイルにアクセスできる（危険）',    value: 'pc',      risk: 2 },
      { label: '分からない',       desc: 'どう設定すればいいか判断できない',                 value: 'unknown', risk: 1 },
    ],
  },
  {
    id: 'network',
    step: 'STEP 5 / インターネット通信',
    text: 'Claude Code の外部サービスへの通信を許可しますか？',
    note: '外部通信とは、インターネット上のサービスへのアクセスのことです。',
    choices: [
      { label: '許可しない',        desc: '外部への通信をすべて禁止する（最も安全）',           value: 'none',    risk: 0 },
      { label: '必要なときだけ許可', desc: '必要な場面だけ個別に判断して許可する',               value: 'needed',  risk: 0 },
      { label: 'いつでも許可',       desc: '外部通信を常に許可する（リスクあり）',               value: 'always',  risk: 2 },
      { label: '分からない',         desc: 'どう設定すればいいか判断できない',                   value: 'unknown', risk: 1 },
    ],
  },
  {
    id: 'git',
    step: 'STEP 6 / Git 操作',
    text: 'AIによる Git 操作をどこまで許可しますか？',
    note: 'Git とは、コードの変更履歴を管理する仕組みです。分からない場合は「分からない」を選んでください。',
    choices: [
      { label: '読み取りのみ',     desc: '変更の確認だけ。AIはコードを変更できない（最も安全）',              value: 'read',    risk: 0 },
      { label: 'コミットまで',      desc: '変更の記録（コミット）までは許可。外部への送信は人間が行う',        value: 'commit',  risk: 0 },
      { label: 'Push（送信）まで', desc: '外部サービスへのコード送信も自動化する（慎重に利用してください）',    value: 'push',    risk: 2 },
      { label: '分からない',        desc: 'Git の操作がよく分からない',                                        value: 'unknown', risk: 1 },
    ],
  },
];

/* ===== リスク判定 ===== */
const RISK = {
  low:    { cls: 'low',    emoji: '🟢', label: '低リスク', message: '安全性の高い設定です' },
  medium: { cls: 'medium', emoji: '🟡', label: '中リスク', message: '注意が必要な設定が含まれています' },
  high:   { cls: 'high',   emoji: '🔴', label: '高リスク', message: '設定の見直しを強く推奨します' },
};

function calcRisk(answers) {
  let total = 0;
  let maxSingle = 0;

  QUESTIONS.forEach(q => {
    const choice = q.choices.find(c => c.value === answers[q.id]);
    if (!choice) return;
    total += choice.risk;
    if (choice.risk > maxSingle) maxSingle = choice.risk;
  });

  if (total >= 5 || (maxSingle === 2 && total >= 4)) return 'high';
  if (total >= 2) return 'medium';
  return 'low';
}

/* ===== 推奨設定・アドバイス生成 ===== */
function getRecommendations(answers) {
  const get = (id) => QUESTIONS.find(q => q.id === id).choices.find(c => c.value === answers[id]);

  return [
    (() => {
      const c = get('execution');
      if (c.value === 'all')     return { label: 'コマンド実行', current: c.label, status: 'danger', recommend: '毎回確認する', reason: 'すべて自動許可は非常に危険です。意図しないファイル削除や外部通信が発生するリスクがあります。今すぐ変更してください。' };
      if (c.value === 'partial') return { label: 'コマンド実行', current: c.label, status: 'warn',   recommend: '毎回確認する（または基本は確認する）', reason: '自動許可の範囲をできる限り絞るか、毎回確認する設定を推奨します。' };
      return { label: 'コマンド実行', current: c.label, status: 'ok', recommend: null, reason: '適切な設定です。意図しないコマンド実行を防げています。' };
    })(),
    (() => {
      const c = get('file');
      if (c.value === 'pc')      return { label: 'ファイルアクセス', current: c.label, status: 'danger', recommend: '作業フォルダのみ', reason: 'PC全体へのアクセスは非常に危険です。重要なファイルが意図せず読み取られたり変更されるリスクがあります。' };
      if (c.value === 'unknown') return { label: 'ファイルアクセス', current: c.label, status: 'warn',   recommend: '作業フォルダのみ', reason: '設定が不明なため、最も安全な「作業フォルダのみ」への変更を推奨します。' };
      if (c.value === 'project') return { label: 'ファイルアクセス', current: c.label, status: 'warn',   recommend: '作業フォルダのみ', reason: '不要なフォルダへのアクセスを禁止することで、誤操作のリスクを減らせます。' };
      return { label: 'ファイルアクセス', current: c.label, status: 'ok', recommend: null, reason: '最も安全な設定です。機密情報へのアクセスを防げています。' };
    })(),
    (() => {
      const c = get('network');
      if (c.value === 'always')  return { label: '外部通信', current: c.label, status: 'danger', recommend: '必要なときだけ許可', reason: '常時許可はデータ漏洩のリスクがあります。必要な場面だけ個別に許可する設定に変更してください。' };
      if (c.value === 'unknown') return { label: '外部通信', current: c.label, status: 'warn',   recommend: '必要なときだけ許可', reason: '設定が不明なため、「必要なときだけ許可」への変更を推奨します。' };
      return { label: '外部通信', current: c.label, status: 'ok', recommend: null, reason: '適切な設定です。不必要な外部通信を制限できています。' };
    })(),
    (() => {
      const c = get('git');
      if (c.value === 'push')    return { label: 'Git 操作', current: c.label, status: 'warn',   recommend: 'コミットまで', reason: 'Push の自動化は誤ったコードが公開されるリスクがあります。Push は人間が手動で行うことを推奨します。' };
      if (c.value === 'unknown') return { label: 'Git 操作', current: c.label, status: 'warn',   recommend: 'コミットまで', reason: 'Git に不慣れな場合は「コミットまで」が安全です。Push は自分で確認してから行いましょう。' };
      return { label: 'Git 操作', current: c.label, status: 'ok', recommend: null, reason: '適切な設定です。誤った Push による情報流出を防げています。' };
    })(),
  ];
}

function getAdviceList(answers, riskLevel) {
  const list = [];

  if (answers.execution === 'all')     list.push('コマンド実行を「毎回確認する」に変更する（最優先）');
  if (answers.file === 'pc')           list.push('ファイルアクセスを「作業フォルダのみ」に制限する');
  if (answers.network === 'always')    list.push('外部通信を「必要なときだけ許可」に変更する');
  if (answers.git === 'push')          list.push('Git の Push は必ず人間が確認してから実行する');
  if (answers.data === 'frequent')     list.push('機密情報を含むフォルダはアクセス対象から明示的に除外する');
  if (answers.execution === 'partial') list.push('自動許可リストを最小限に絞り込む');
  if (answers.file === 'unknown')      list.push('ファイルアクセスの範囲を明確に「作業フォルダのみ」に設定する');

  if (list.length === 0) {
    list.push('現在の設定は安全です。定期的に設定を見直すことを推奨します。');
    if (riskLevel === 'low') list.push('引き続き安全に利用するため、Claude Code の公式ドキュメントを確認してください。');
  }

  return list;
}

/* ===== 設定手順データ ===== */
function getSetupSteps(answers) {
  const steps = [
    {
      title: 'Claude Code の設定ファイルを開く',
      body: 'プロジェクトフォルダ内にある <code>.claude/settings.json</code> を開きます。ファイルがない場合は新しく作成してください。',
    },
    {
      title: 'コマンド実行の権限を設定する',
      body: answers.execution === 'each' || answers.execution === 'mostly'
        ? '「allowedTools」に bash が含まれていないことを確認してください。含まれている場合は削除します。'
        : '「allowedTools」に登録されているコマンドを最小限に絞り込んでください。不要なコマンドは削除します。',
    },
    {
      title: 'ファイルアクセス範囲を確認する',
      body: 'Claude Code は起動したフォルダを基準にアクセスします。作業フォルダ外のファイルへのアクセスを防ぐには、機密フォルダを含む場所で Claude Code を起動しないようにしてください。',
    },
    {
      title: 'Git 操作の範囲を設定する',
      body: answers.git === 'push'
        ? '「git push」コマンドを allowedTools から外し、Push は手動で行うように変更してください。'
        : '現在の設定で問題ありません。コミットの内容は Push 前に必ず確認しましょう。',
    },
    {
      title: '設定を保存して動作確認をする',
      body: 'ファイルを保存したら Claude Code を再起動します。意図しない操作が確認なく実行されないかテストしてください。',
    },
  ];

  return steps;
}

/* ===== DOM ヘルパー ===== */
const $ = (id) => document.getElementById(id);

function showScreen(id) {
  ['screen-home', 'screen-question', 'screen-result'].forEach(s => {
    const el = $(s);
    if (el) el.hidden = (s !== id);
  });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ===== 状態 ===== */
let step = 0;
const answers = {};
let selectedValue = null;

/* ===== ホーム画面 ===== */
$('btn-start').addEventListener('click', () => {
  step = 0;
  Object.keys(answers).forEach(k => delete answers[k]);
  renderQuestion();
  showScreen('screen-question');
});

/* ===== 質問画面 ===== */
function renderQuestion() {
  const q = QUESTIONS[step];
  selectedValue = answers[q.id] ?? null;

  $('q-step-label').textContent = q.step;
  $('q-text').textContent = q.text;
  $('q-note').textContent = q.note;
  $('progress-label').textContent = `${step + 1} / ${QUESTIONS.length}`;
  $('progress-inner').style.width = `${((step + 1) / QUESTIONS.length) * 100}%`;

  $('btn-back').disabled = (step === 0);
  $('btn-back').style.visibility = step === 0 ? 'hidden' : 'visible';

  const list = $('choice-list');
  list.innerHTML = '';
  q.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn' + (selectedValue === choice.value ? ' selected' : '');
    btn.innerHTML = `
      <span class="choice-radio"></span>
      <span class="choice-label-wrap">
        <span class="choice-label">${choice.label}</span>
        <span class="choice-desc">${choice.desc}</span>
      </span>
    `;
    btn.addEventListener('click', () => selectChoice(choice.value));
    list.appendChild(btn);
  });

  updateNextBtn();
}

function selectChoice(value) {
  selectedValue = value;
  answers[QUESTIONS[step].id] = value;

  document.querySelectorAll('.choice-btn').forEach(btn => btn.classList.remove('selected'));
  const idx = QUESTIONS[step].choices.findIndex(c => c.value === value);
  if (idx >= 0) document.querySelectorAll('.choice-btn')[idx].classList.add('selected');

  updateNextBtn();
}

function updateNextBtn() {
  const btn = $('btn-next');
  btn.disabled = !selectedValue;
  btn.textContent = step === QUESTIONS.length - 1 ? '結果を見る' : '次へ';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  poly.setAttribute('points', '9 18 15 12 9 6');
  svg.appendChild(poly);
  btn.appendChild(svg);
}

$('btn-next').addEventListener('click', () => {
  if (!selectedValue) return;
  if (step < QUESTIONS.length - 1) {
    step++;
    selectedValue = answers[QUESTIONS[step].id] ?? null;
    renderQuestion();
  } else {
    renderResult();
    showScreen('screen-result');
  }
});

$('btn-back').addEventListener('click', () => {
  if (step > 0) {
    step--;
    selectedValue = answers[QUESTIONS[step].id] ?? null;
    renderQuestion();
  }
});

/* ===== 結果画面 ===== */
function renderResult() {
  const riskLevel = calcRisk(answers);
  const risk = RISK[riskLevel];
  const recs = getRecommendations(answers);
  const advices = getAdviceList(answers, riskLevel);
  const steps = getSetupSteps(answers);

  const dangerCount = recs.filter(r => r.status === 'danger').length;
  const warnCount   = recs.filter(r => r.status === 'warn').length;

  const html = `
    <!-- リスクレベル -->
    <div class="result-summary">
      <div class="result-summary-header">
        <div>
          <div class="risk-badge ${risk.cls}">${risk.emoji} ${risk.label}</div>
          <p class="risk-message">${risk.message}${dangerCount > 0 ? `（要変更の設定が ${dangerCount} 件あります）` : ''}</p>
        </div>
      </div>
    </div>

    <!-- 推奨設定一覧 -->
    <div class="result-answers">
      <div class="result-section-title">推奨設定と現在の状態</div>
      ${recs.map(r => `
        <div class="result-row">
          <div class="result-row-label">${r.label}</div>
          <div class="result-row-content">
            <span class="result-row-current">${r.current}${r.recommend ? ` → <strong style="color:var(--product-main)">${r.recommend}</strong>` : ''}</span>
            <span class="result-row-reason">${r.reason}</span>
          </div>
          <div class="result-row-status">
            ${r.status === 'ok'     ? '<span class="status-ok">✓ 良好</span>'   : ''}
            ${r.status === 'warn'   ? '<span class="status-warn">⚠ 要注意</span>' : ''}
            ${r.status === 'danger' ? '<span class="status-danger">✕ 要変更</span>' : ''}
          </div>
        </div>
      `).join('')}
    </div>

    ${advices.length > 0 && riskLevel !== 'low' ? `
    <!-- 改善アドバイス -->
    <div class="advice-card">
      <div class="advice-card-title">⚠ 改善アドバイス</div>
      <ul>
        ${advices.map(a => `<li>${a}</li>`).join('')}
      </ul>
    </div>
    ` : riskLevel === 'low' ? `
    <div class="advice-card" style="background:rgba(75,180,125,0.06); border-color:rgba(75,180,125,0.3);">
      <div class="advice-card-title" style="color:#1a6b40;">✓ 安全性チェック完了</div>
      <ul>
        ${advices.map(a => `<li>${a}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <!-- 設定手順 -->
    <div class="setup-card">
      <div class="result-section-title">設定の変更手順</div>
      <div class="setup-steps">
        ${steps.map((s, i) => `
          <div class="setup-step">
            <div class="setup-step-num">${i + 1}</div>
            <div class="setup-step-body">
              <h4>${s.title}</h4>
              <p>${s.body}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  $('result-content').innerHTML = html;
}

$('btn-print').addEventListener('click', () => {
  window.print();
});

$('btn-restart').addEventListener('click', () => {
  step = 0;
  Object.keys(answers).forEach(k => delete answers[k]);
  showScreen('screen-home');
});
