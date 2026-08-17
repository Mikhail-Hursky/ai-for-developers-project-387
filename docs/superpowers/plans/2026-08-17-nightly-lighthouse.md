# Ночной Lighthouse — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ночью прогонять Lighthouse CLI по проду и класть разбор комментарием в
один долгоживущий issue, чтобы утром команда решила, нужны ли правки.

**Architecture:** Один job по `cron`. Детерминированная часть — bash-цикл с
`npx lighthouse` (три прогона на страницу) и Node-скрипт, который выбирает
медианный отчёт, сверяет баллы с порогами и пишет компактный `summary.md`.
Интерпретация — шаг `claude-code-action@v1` в agent mode: он читает сводку,
берёт прошлый комментарий как базу для дельты и дописывает новый.

**Tech Stack:** GitHub Actions, `lighthouse@13.4.1` через `npx`, Node 24 (ESM,
без зависимостей), `anthropics/claude-code-action@v1`, `gh` CLI.

Спека: [docs/superpowers/specs/2026-08-17-nightly-lighthouse-design.md](../specs/2026-08-17-nightly-lighthouse-design.md).

## Global Constraints

- Коммиты по Conventional Commits: заголовок на английском, до 100 символов, в
  повелительном наклонении, с маленькой буквы, без точки; тело — маркированный
  список «что изменилось и почему», строки до 100 символов; трейлер
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- Комментарии в YAML, в скрипте и в промпте — на русском, как в остальных
  воркфлоу репозитория. Комментарий объясняет «почему», а не пересказывает код.
- Версии действий как в `ci.yml`: `actions/checkout@v7`, `actions/setup-node@v7`,
  `actions/upload-artifact@v7`, `anthropics/claude-code-action@v1`.
- Node в раннере — `node-version: '24'`.
- Версия Lighthouse зафиксирована: `lighthouse@13.4.1`, не `latest`.
- Базовый адрес: `https://ai-for-developers-project-387-production-12f5.up.railway.app`
  задаётся один раз в `env` воркфлоу.
- Тестовой обвязки в `.github/` не заводим: скрипт проверяется разово,
  фикстуры живут во временном каталоге и в репозиторий не попадают.
- Коммитить и пушить — только по явной просьбе владельца репозитория.

## File Structure

| Файл | Ответственность |
|---|---|
| `.github/lighthouse-thresholds.json` | Пороги по категориям и `deltaDrop`. Единственное место, где меняется планка |
| `.github/scripts/lighthouse-summary.mjs` | Медианный отчёт, сверка с порогами, `summary.md` |
| `.github/workflows/lighthouse.yml` | Расписание, прогон CLI, артефакты, шаг агента с промптом |
| `CONTRIBUTING.md` | Раздел про ночной прогон; правка счёта воркфлоу Claude |

Скрипт и воркфлоу разделены намеренно: логика выбора медианы и сверки с
порогами проверяется локально прогоном `node`, а внутри YAML её пришлось бы
отлаживать только через пуш.

---

### Task 1: Пороги и скрипт сводки

**Files:**
- Create: `.github/lighthouse-thresholds.json`
- Create: `.github/scripts/lighthouse-summary.mjs`

**Interfaces:**
- Consumes: JSON-отчёты Lighthouse в `lighthouse-report/<slug>-<i>.report.json`,
  где `slug` — `home` или `admin`, `i` — номер прогона.
- Produces: файл `lighthouse-report/summary.md` со строкой `verdict: red` или
  `verdict: green`, таблицей баллов по колонкам `Perf | A11y | Best practices |
  SEO` и списком метрик по страницам. На этот формат опираются Task 2 (job
  summary) и Task 3 (промпт агента).

- [ ] **Step 1: Создать файл порогов**

`.github/lighthouse-thresholds.json`:

```json
{
  "performance": 90,
  "accessibility": 95,
  "best-practices": 95,
  "seo": 90,
  "deltaDrop": 5
}
```

- [ ] **Step 2: Написать скрипт сводки**

`.github/scripts/lighthouse-summary.mjs`:

```js
// Превращает отчёты Lighthouse в одну сводку: её показывает job summary и по ней
// пишет комментарий Claude. Агенту нужен компактный markdown, а не шесть JSON по
// несколько сотен килобайт: так дешевле по токенам и не нужно разбираться в
// структуре отчёта.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPORT_DIR = 'lighthouse-report';
const THRESHOLDS_PATH = '.github/lighthouse-thresholds.json';

// Порядок колонок в таблице. Подписи короткие: таблица должна помещаться в
// комментарий issue без горизонтальной прокрутки.
const CATEGORIES = [
  ['performance', 'Perf'],
  ['accessibility', 'A11y'],
  ['best-practices', 'Best practices'],
  ['seo', 'SEO'],
];

const PAGES = [
  { slug: 'home', path: '/' },
  { slug: 'admin', path: '/admin' },
];

const METRICS = [
  ['largest-contentful-paint', 'LCP'],
  ['total-blocking-time', 'TBT'],
  ['cumulative-layout-shift', 'CLS'],
];

const thresholds = JSON.parse(readFileSync(THRESHOLDS_PATH, 'utf8'));

const score = (report, id) => Math.round(report.categories[id].score * 100);

// Берём средний по баллу производительности прогон целиком, со всеми его
// метриками: медиана по каждой метрике отдельно собрала бы строку, которой не
// было ни в одном реальном замере.
function medianReport(slug) {
  const files = readdirSync(REPORT_DIR)
    .filter((name) => name.startsWith(`${slug}-`) && name.endsWith('.report.json'))
    .sort();
  if (files.length === 0) {
    throw new Error(`Нет отчётов для страницы ${slug} в ${REPORT_DIR}`);
  }
  const reports = files.map((name) =>
    JSON.parse(readFileSync(join(REPORT_DIR, name), 'utf8')),
  );
  reports.sort((a, b) => score(a, 'performance') - score(b, 'performance'));
  return { report: reports[Math.floor(reports.length / 2)], runs: reports.length };
}

// Прогон стартует в 23:00 UTC, то есть по Минску это уже следующие сутки —
// заголовок должен совпадать с тем, что команда считает «этой ночью».
const night = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Minsk',
  day: 'numeric',
  month: 'long',
}).format(new Date());

const rows = [];
const metricLines = [];
const failures = [];
let runs = 0;

for (const page of PAGES) {
  const median = medianReport(page.slug);
  runs = median.runs;
  const scores = CATEGORIES.map(([id]) => score(median.report, id));
  CATEGORIES.forEach(([id, label], index) => {
    if (scores[index] < thresholds[id]) {
      failures.push(`- \`${page.path}\` — ${label}: ${scores[index]} при пороге ${thresholds[id]}`);
    }
  });
  rows.push(`| \`${page.path}\` | ${scores.join(' | ')} |`);
  const values = METRICS.map(
    ([id, label]) => `${label} ${median.report.audits[id].displayValue}`,
  );
  metricLines.push(`- \`${page.path}\` — ${values.join(' · ')}`);
}

const limits = CATEGORIES.map(([id, label]) => `${label} ${thresholds[id]}`).join(', ');

const summary = [
  `# Lighthouse — ночь на ${night}`,
  '',
  `| Страница | ${CATEGORIES.map(([, label]) => label).join(' | ')} |`,
  `|---|${CATEGORIES.map(() => '---').join('|')}|`,
  ...rows,
  '',
  ...metricLines,
  '',
  `Медиана ${runs} прогонов. Пороги: ${limits}. deltaDrop: ${thresholds.deltaDrop}.`,
  '',
  failures.length ? 'Ниже порога:' : 'Все категории выше порогов.',
  ...failures,
  '',
  `verdict: ${failures.length ? 'red' : 'green'}`,
  '',
].join('\n');

writeFileSync(join(REPORT_DIR, 'summary.md'), summary);
console.log(summary);
```

- [ ] **Step 3: Собрать фикстуры из настоящих отчётов**

Каталог для фикстур — во временном рабочем каталоге сессии, не в репозитории.
Два реальных прогона (по одному на страницу), из них дальше делаются копии:

```bash
cd /path/to/repo
mkdir -p lighthouse-report
BASE_URL=https://ai-for-developers-project-387-production-12f5.up.railway.app
npx --yes lighthouse@13.4.1 "$BASE_URL/" \
  --output=json --output=html --output-path=lighthouse-report/home-1 \
  --chrome-flags="--headless=new" --quiet
npx --yes lighthouse@13.4.1 "$BASE_URL/admin" \
  --output=json --output=html --output-path=lighthouse-report/admin-1 \
  --chrome-flags="--headless=new" --quiet
ls lighthouse-report
```

Ожидается: `home-1.report.json`, `home-1.report.html`, `admin-1.report.json`,
`admin-1.report.html`. Если имена другие — Lighthouse изменил правило склейки
`--output-path` с двумя `--output`, и фильтр в скрипте нужно поправить под
фактические имена.

- [ ] **Step 4: Размножить фикстуры с известными баллами**

Медиану и пороги проверяем на подставленных баллах, иначе прогон нечем
отличить от случайного совпадения:

```bash
node --input-type=module -e '
import { readFileSync, writeFileSync } from "node:fs";
const plan = { home: [0.80, 0.93, 0.87], admin: [0.99, 0.97, 0.98] };
for (const [slug, scores] of Object.entries(plan)) {
  const base = JSON.parse(readFileSync(`lighthouse-report/${slug}-1.report.json`, "utf8"));
  scores.forEach((value, index) => {
    base.categories.performance.score = value;
    writeFileSync(`lighthouse-report/${slug}-${index + 1}.report.json`, JSON.stringify(base));
  });
}
'
```

- [ ] **Step 5: Прогнать скрипт и сверить результат**

Run: `node .github/scripts/lighthouse-summary.mjs`

Ожидается:
- в строке `/` балл Perf равен **87** — медиана из 80, 87, 93; не 80 и не 93;
- в строке `/admin` балл Perf равен **98**;
- есть строки с `LCP`, `TBT`, `CLS` по обеим страницам;
- есть строка `Медиана 3 прогонов. Пороги: Perf 90, A11y 95, Best practices 95, SEO 90. deltaDrop: 5.`;
- в списке «Ниже порога» есть строка ``- `/` — Perf: 87 при пороге 90``;
- последняя строка — `verdict: red`, потому что 87 < 90;
- файл `lighthouse-report/summary.md` создан и совпадает с выводом.

- [ ] **Step 6: Проверить зелёный путь**

```bash
node --input-type=module -e '
import { readFileSync, writeFileSync } from "node:fs";
for (const slug of ["home", "admin"]) {
  for (const i of [1, 2, 3]) {
    const path = `lighthouse-report/${slug}-${i}.report.json`;
    const report = JSON.parse(readFileSync(path, "utf8"));
    report.categories.performance.score = 0.96;
    writeFileSync(path, JSON.stringify(report));
  }
}
'
node .github/scripts/lighthouse-summary.mjs
```

Ожидается: `Все категории выше порогов.` и `verdict: green`. Если какая-то
категория реального отчёта (например SEO) всё-таки ниже порога — это не ошибка
скрипта, а настоящая находка; зафиксируйте её и продолжайте.

- [ ] **Step 7: Проверить понятную ошибку на пустом каталоге**

```bash
rm -rf lighthouse-report && mkdir -p lighthouse-report
node .github/scripts/lighthouse-summary.mjs; echo "код выхода: $?"
```

Ожидается: `Error: Нет отчётов для страницы home в lighthouse-report`, код
выхода не нулевой — job должен падать, а не писать пустую сводку.

- [ ] **Step 8: Убрать фикстуры и закоммитить**

```bash
rm -rf lighthouse-report
git status --short
git add .github/lighthouse-thresholds.json .github/scripts/lighthouse-summary.mjs
git commit -m "$(cat <<'EOF'
ci(lighthouse): summarize lighthouse reports into one markdown digest

- pick the median run per page by performance score and keep all of its
  metrics, so a reported row comes from a single real measurement
- read category thresholds from a json file both the script and the agent
  use, keeping the verdict rule in one place
- emit a compact summary.md instead of raw reports: it feeds the job
  summary and costs the agent far fewer tokens

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

`git status --short` перед `git add` — проверка, что фикстуры и HTML-отчёты не
попали в коммит: `.gitignore` для `lighthouse-report/` мы не заводим, каталог
существует только внутри прогона.

---

### Task 2: Воркфлоу — расписание, прогон CLI, артефакты

**Files:**
- Create: `.github/workflows/lighthouse.yml`

**Interfaces:**
- Consumes: `.github/scripts/lighthouse-summary.mjs` из Task 1; переменная
  окружения `BASE_URL` уровня воркфлоу.
- Produces: job `lighthouse` с шагами до артефактов включительно; каталог
  `lighthouse-report/` внутри прогона; артефакт `lighthouse-report`. Шаг агента
  добавляется в Task 3 в конец этого же job'а.

- [ ] **Step 1: Написать воркфлоу без шага агента**

`.github/workflows/lighthouse.yml`:

```yaml
name: lighthouse

# Ночной аудит опубликованного приложения. Проверяется прод, а не сборка в
# раннере: половина того, что видит пользователь, добавляется доставкой —
# сжатие, заголовки кэширования, отдача статики из FastAPI, задержки платформы.
on:
  schedule:
    # 23:00 UTC — 02:00 по Минску. Отчёт готов задолго до начала рабочего дня,
    # а очереди на публичных раннерах в этот час короче, чем в полночь UTC.
    - cron: '0 23 * * *'
  # Прогнать руками, не дожидаясь ночи: этим же проверяются правки воркфлоу.
  workflow_dispatch:

# Прогон пишет комментарий в issue, поэтому начатый не отменяем. Группа одна на
# весь репозиторий: параллельных ночных прогонов быть не должно.
concurrency:
  group: lighthouse
  cancel-in-progress: false

permissions:
  # checkout: без кода агент не скажет, в каком файле причина просадки.
  contents: read
  # Комментарий в долгоживущий issue и заведение лейбла.
  issues: write
  # OIDC-токен: по нему action ходит в GitHub от имени claude[bot].
  id-token: write

env:
  # Адрес задан один раз: при передеплое сервиса меняется одна строка.
  BASE_URL: https://ai-for-developers-project-387-production-12f5.up.railway.app

jobs:
  lighthouse:
    name: lighthouse
    runs-on: ubuntu-latest
    # Шесть прогонов Lighthouse плюс работа агента; за 20 минут укладывается с
    # запасом, а зависший прогон не должен занимать раннер до часового дефолта.
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '24'
          # Кэш не настраиваем: lock-файла у `npx lighthouse` нет, а версия
          # пакета зафиксирована прямо в команде.
      # Railway усыпляет контейнер, и первый замер иначе показал бы холодный
      # старт вместо реальной картины.
      - name: Прогреть приложение
        run: |
          curl --fail --silent --show-error --retry 5 --retry-all-errors \
            --retry-delay 10 --output /dev/null "$BASE_URL/"
      # Версия зафиксирована намеренно: `latest` однажды приедет с новым мажором
      # и другой методикой подсчёта, и вся история дельт в issue обесценится.
      # --no-sandbox обязателен: под пользователем раннера песочница Chrome не
      # поднимается. Chrome на ubuntu-latest предустановлен.
      - name: Прогнать Lighthouse
        run: |
          mkdir -p lighthouse-report
          for page in "home:/" "admin:/admin"; do
            slug="${page%%:*}"
            path="${page#*:}"
            for i in 1 2 3; do
              npx --yes lighthouse@13.4.1 "$BASE_URL$path" \
                --output=json --output=html \
                --output-path="lighthouse-report/$slug-$i" \
                --chrome-flags="--headless=new --no-sandbox" \
                --quiet
            done
          done
      - name: Собрать сводку
        run: node .github/scripts/lighthouse-summary.mjs
      # Проверка на существование файла: когда падает скрипт сводки, job уже
      # красный, и второй красный шаг подряд только запутывает.
      - name: Показать сводку в прогоне
        if: always()
        run: |
          if [ -f lighthouse-report/summary.md ]; then
            cat lighthouse-report/summary.md >> "$GITHUB_STEP_SUMMARY"
          fi
      # Артефакт заливается всегда: если упадёт агент, ночные цифры не должны
      # пропасть вместе с ним. HTML-отчёты — то, куда из комментария идут за
      # подробностями.
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: lighthouse-report
          path: lighthouse-report
          if-no-files-found: warn
          retention-days: 30
```

- [ ] **Step 2: Проверить синтаксис**

Run: `actionlint .github/workflows/lighthouse.yml`
Ожидается: пустой вывод. Линтера нет в системе — пропустите шаг, синтаксис
проверит GitHub на первом прогоне; `command -v actionlint` покажет, есть ли он.

- [ ] **Step 3: Проверить разбор цикла локально**

Тот же цикл без запуска Lighthouse — убеждаемся, что `slug` и `path` разбираются
верно и адреса собираются без двойного слэша:

```bash
BASE_URL=https://example.test
for page in "home:/" "admin:/admin"; do
  slug="${page%%:*}"
  path="${page#*:}"
  echo "$slug -> $BASE_URL$path"
done
```

Ожидается ровно:
```
home -> https://example.test/
admin -> https://example.test/admin
```

- [ ] **Step 4: Закоммитить**

```bash
git add .github/workflows/lighthouse.yml
git commit -m "$(cat <<'EOF'
ci(lighthouse): audit the deployed app nightly with the lighthouse cli

- run at 23:00 UTC, which is 02:00 in Minsk, so the report waits before
  the working day starts
- warm the Railway container up before measuring: the first request would
  otherwise report a cold start instead of the real picture
- run every page three times and keep reports for 30 days, so a noisy
  runner cannot pass for a regression

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Шаг агента и промпт

**Files:**
- Modify: `.github/workflows/lighthouse.yml` (добавить последний шаг в job
  `lighthouse`, после `actions/upload-artifact@v7`)

**Interfaces:**
- Consumes: `lighthouse-report/summary.md` и `.github/lighthouse-thresholds.json`
  из Task 1; секрет `CLAUDE_CODE_OAUTH_TOKEN`, уже заведённый для
  `claude.yml`, `claude-implement.yml` и `claude-review.yml`.
- Produces: комментарий в issue с лейблом `lighthouse`; сам issue, если его ещё
  нет.

- [ ] **Step 1: Дописать шаг агента**

В конец списка `steps`:

```yaml
      # prompt без track_progress оставляет action в agent mode: ни ветки, ни
      # служебного комментария с прогрессом здесь не нужно — итог прогона это
      # один комментарий в issue. Шаг идёт последним и без if: always() — если
      # аудит не состоялся, комментировать нечего.
      - uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          prompt: |
            REPO: ${{ github.repository }}
            ПРОГОН: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}

            Ночной прогон Lighthouse уже отработал. Твоя работа — записать его
            итог в issue, чтобы утром команда решила, нужны ли правки.

            1. Прочитай lighthouse-report/summary.md — сводку прогона — и
               .github/lighthouse-thresholds.json — пороги.
            2. Найди issue для этих отчётов:
               gh issue list --label lighthouse --state open --limit 1
               Нет лейбла — заведи его:
               gh label create lighthouse --color 0e8a16 --description "Ночные прогоны Lighthouse"
               Нет issue — заведи «Lighthouse: ночные прогоны» через
               gh issue create --label lighthouse. В теле опиши: отчёт приходит
               комментарием каждую ночь, вердикт стоит в первой строке,
               подробности — в артефакте прогона, а чтобы заказать правку, нужно
               ответить в этом же треде «@claude implement — <что сделать>».
            3. Возьми последний комментарий claude[bot] в issue
               (gh issue view <номер> --comments): баллы из его таблицы — база
               для дельты. Комментариев нет — это первая ночь, дельту не считай.
            4. Посчитай вердикт:
               🔴 — в сводке стоит verdict: red;
               🟡 — verdict: green, но какая-то категория потеряла deltaDrop
                    баллов или больше по сравнению с прошлой ночью;
               🟢 — всё остальное.
            5. Напиши комментарий через gh issue comment <номер> --body "...".
               Формат обязателен: его разбирает агент следующей ночью.

               ## <эмодзи вердикта> ночь на <дата из заголовка сводки>

               Таблица: колонки Страница, Perf, A11y, Best practices, SEO;
               в каждой ячейке балл, а рядом в скобках дельта — (−6), (+2) или
               (=). Первой ночью скобки не пиши.

               Ниже строка с LCP, TBT и CLS по каждой странице и пометка
               «медиана трёх прогонов».

               При 🟢 — дальше ровно одна строка «Правки не нужны». Разбор не
               пиши: тридцать одинаковых простыней в месяц сделают тред
               нечитаемым, и настоящая проблема потеряется среди них.

               При 🟡 и 🔴 — раздел «Что просело»: метрика, конкретный
               проваленный аудит Lighthouse, файл в репозитории, где причина.
               Затем «Что предлагаю»: список правок, у каждой — оценка влияния.
               Последняя строка разбора — «Решение за командой».

               В конце всегда ссылка на прогон (она выше, в поле ПРОГОН) и
               напоминание, что HTML-отчёты лежат в артефакте lighthouse-report.
            6. При 🟡 и 🔴 сперва найди причину в коде: смотри проваленные
               аудиты в сводке, затем frontend/src — компоненты страницы,
               frontend/index.html и frontend/vite.config.ts. Не выдумывай
               причину: если по коду её не видно, так и напиши.

            Чего не делать: не коммить, не открывать pull request, не править
            код, не закрывать issue и не редактировать чужие комментарии.
            Правки делает человек командой «@claude implement» в этом треде.
          # Read, Glob и Grep перечислены явно: в agent mode дефолтного набора
          # инструментов нет. Ни Edit, ни Write, ни git — ночной прогон только
          # читает и пишет в трекер. max-turns ограничивает зацикливание: ночью
          # прогон никто не оборвёт руками.
          claude_args: >-
            --allowedTools "Read,Glob,Grep,Bash(gh issue:*),Bash(gh label:*)"
            --max-turns 25
```

- [ ] **Step 2: Проверить синтаксис**

Run: `actionlint .github/workflows/lighthouse.yml`
Ожидается: пустой вывод (или пропуск шага, если линтера нет).

- [ ] **Step 3: Проверить, что промпт не разъехался по отступам**

Run: `node -e "const y=require('fs').readFileSync('.github/workflows/lighthouse.yml','utf8'); const m=y.match(/prompt: \|\n([\s\S]*?)\n          claude_args/); console.log(m ? m[1].split('\n').length + ' строк промпта' : 'промпт не найден')"`

Ожидается: число строк промпта, а не «промпт не найден». Блочный скаляр в YAML
рвётся от одного неверного отступа, а увидеть это на прогоне дороже.

- [ ] **Step 4: Закоммитить**

```bash
git add .github/workflows/lighthouse.yml
git commit -m "$(cat <<'EOF'
ci(lighthouse): let claude turn the nightly report into an issue comment

- run the action in agent mode: the outcome is a single comment, so a
  branch and a progress comment would only add noise
- keep one long-lived issue and use its previous comment as the baseline
  for deltas, so no metric history has to be stored anywhere else
- allow reading tools and gh issue only: the nightly run reports, and a
  human orders fixes with @claude implement

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Документация

**Files:**
- Modify: `CONTRIBUTING.md:144-146` (счёт воркфлоу Claude)
- Modify: `CONTRIBUTING.md` (новый раздел «Ночной Lighthouse» после раздела
  «Claude в issue и pull request», перед «Релизы»)

**Interfaces:**
- Consumes: поведение, описанное в Task 2 и Task 3.
- Produces: раздел, по которому команда утром понимает, что читать и как
  заказать правку.

- [ ] **Step 1: Поправить счёт воркфлоу**

Строка 146 сейчас: «Claude живёт в трёх воркфлоу: два отвечают на обращение,
третий срабатывает сам». Воркфлоу стало четыре — `claude.yml`,
`claude-implement.yml`, `claude-review.yml` и новый `lighthouse.yml`. Новая
формулировка:

```markdown
Claude живёт в четырёх воркфлоу: два отвечают на обращение, два срабатывают
сами — ревью pull request и ночной Lighthouse, о нём отдельный раздел ниже.
```

Дальше по разделу правок нет: описание `claude.yml`, `claude-implement.yml` и
`claude-review.yml` остаётся как есть.

- [ ] **Step 2: Написать раздел про ночной прогон**

После раздела «Claude в issue и pull request»:

```markdown
## Ночной Lighthouse

[.github/workflows/lighthouse.yml](.github/workflows/lighthouse.yml) каждую ночь
в 02:00 по Минску гоняет Lighthouse по опубликованному приложению — по главной
и по админке. Каждая страница проверяется трижды, в отчёт идёт медианный по
производительности прогон целиком: одиночный замер на публичном раннере гуляет
в пределах ±10 баллов.

Итог приходит комментарием в issue с лейблом `lighthouse` — он один на все
прогоны, история лежит в треде. В первой строке комментария вердикт:

- 🔴 — категория ушла ниже порога из
  [.github/lighthouse-thresholds.json](.github/lighthouse-thresholds.json);
- 🟡 — пороги целы, но категория потеряла `deltaDrop` баллов и больше по
  сравнению с прошлой ночью;
- 🟢 — всё в порядке, комментарий занимает пять строк.

При 🟡 и 🔴 Claude дописывает разбор: что просело, какой аудит Lighthouse это
показал, в каком файле причина и что он предлагает сделать. Решение остаётся за
командой. Чтобы заказать правку, ответьте в том же треде
`@claude implement — <что сделать>`: дальше работает обычный
`claude-implement.yml` — ветка, проверки, pull request.

HTML-отчёты лежат в артефакте `lighthouse-report` прогона, 30 дней.

Низкие баллы прогон не роняют: красный чек в Actions означает, что аудит не
состоялся — приложение не ответило или упал CLI. Прогнать вручную можно кнопкой
Run workflow, порог правится одной строкой в файле порогов.
```

- [ ] **Step 3: Проверить длину строк**

Run: `awk 'length > 100 {print FILENAME":"FNR": "length}' CONTRIBUTING.md`
Ожидается: пустой вывод — в репозитории строки документации не длиннее 100
символов.

- [ ] **Step 4: Закоммитить**

```bash
git add CONTRIBUTING.md
git commit -m "$(cat <<'EOF'
docs(lighthouse): describe the nightly lighthouse run

- explain the verdict colours and where the thresholds live, so the
  morning reader knows what the comment claims
- point at @claude implement in the same thread as the way to order a
  fix, since the issue is the task
- correct the workflow count: claude now lives in four workflows

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Живая проверка

**Files:** правок нет — прогоны и наблюдение.

**Interfaces:**
- Consumes: воркфлоу из Task 2 и Task 3 в ветке `main`.
- Produces: подтверждение, что ночной прогон работает; issue с лейблом
  `lighthouse` и двумя комментариями.

Задача требует пуша в `main`: `workflow_dispatch` доступен только для
воркфлоу, который лежит в дефолтной ветке. **Спросите владельца репозитория
перед пушем** — по правилам репозитория пушим только по явной просьбе.

- [ ] **Step 1: Запушить и запустить руками**

```bash
git push origin main
gh workflow run lighthouse.yml
gh run watch "$(gh run list --workflow=lighthouse.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
```

- [ ] **Step 2: Проверить первый прогон**

Ожидается:
- job зелёный;
- в job summary — таблица со страницами `/` и `/admin`;
- в артефактах `lighthouse-report`: шесть `*.report.json`, шесть
  `*.report.html` и `summary.md`;
- заведён лейбл `lighthouse` (`gh label list | grep lighthouse`);
- заведён issue «Lighthouse: ночные прогоны»
  (`gh issue list --label lighthouse`), в нём один комментарий без дельт, с
  ссылкой на прогон.

- [ ] **Step 3: Проверить дельту вторым прогоном**

```bash
gh workflow run lighthouse.yml
```

Ожидается: во втором комментарии у баллов появились скобки — `(=)` или
небольшие `(−1)`, `(+1)`. При зелёном вердикте разбора нет, комментарий
короткий.

- [ ] **Step 4: Проверить красный путь**

Временно поднять порог заведомо выше текущего балла:

```bash
node --input-type=module -e '
import { readFileSync, writeFileSync } from "node:fs";
const path = ".github/lighthouse-thresholds.json";
const t = JSON.parse(readFileSync(path, "utf8"));
t.performance = 100;
writeFileSync(path, JSON.stringify(t, null, 2) + "\n");
'
git commit -am "chore(lighthouse): raise the performance threshold to check the red path" \
  -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push origin main
gh workflow run lighthouse.yml
```

Ожидается: комментарий с 🔴, разделами «Что просело» и «Что предлагаю», где
названы файлы из `frontend/src`, и строкой «Решение за командой».

- [ ] **Step 5: Вернуть порог**

```bash
git revert --no-edit HEAD
git push origin main
```

Ожидается: `.github/lighthouse-thresholds.json` снова с `"performance": 90`.

- [ ] **Step 6: Проверить связку с утренним сценарием**

Ответьте в треде issue: `@claude implement — добавь в README ссылку на этот
issue`. Ожидается: поднялся `claude-implement`, `lighthouse` при этом не
запускался, пришёл pull request со строкой `Closes #<номер>`. Pull request
можно закрыть — проверялась связка, а не правка.

- [ ] **Step 7: Дождаться ночного прогона**

На следующее утро в треде должен появиться комментарий, которого никто не
запускал руками. Если его нет — смотрите список прогонов: GitHub запускает
расписание с задержкой до получаса и отключает `schedule` после 60 дней без
активности в репозитории.

---

## Проверка плана против спеки

| Требование спеки | Где закрыто |
|---|---|
| Прод на Railway, `/` и `/admin` | Task 2, шаг 1 |
| `cron: '0 23 * * *'` + `workflow_dispatch` | Task 2, шаг 1 |
| `lighthouse@13.4.1`, 3 прогона, медиана | Task 2 шаг 1, Task 1 шаг 2 |
| Прогрев `curl --retry` | Task 2, шаг 1 |
| `summary.md` и job summary | Task 1 шаг 2, Task 2 шаг 1 |
| Пороги в отдельном JSON | Task 1, шаг 1 |
| Вердикт 🔴 / 🟡 / 🟢 | Task 1 шаг 2 (red/green), Task 3 шаг 1 (дельта) |
| Один issue с лейблом, комментарий за ночь | Task 3, шаг 1 |
| Формат комментария | Task 3, шаг 1 |
| Agent mode, права, `--allowedTools`, `--max-turns` | Task 3 шаг 1, Task 2 шаг 1 |
| Артефакты 30 дней, `if: always()` | Task 2, шаг 1 |
| Красный job только на технической ошибке | Task 2 шаг 1 (порядок шагов), Task 1 шаг 7 |
| Связка `@claude implement` | Task 3 шаг 1, Task 4 шаг 2, Task 5 шаг 6 |
| Разовая проверка вместо тестовой обвязки | Task 1 шаги 3–7, Task 5 |
