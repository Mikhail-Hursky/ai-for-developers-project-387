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

// Квота проваленных аудитов НА КАТЕГОРИЮ, а не на страницу целиком: у весов
// перфоманса (TBT 30, LCP 25, CLS 25) порядок на пару десятков больше, чем у
// SEO (почти все аудиты весом 1). Общий срез по влиянию через все категории
// заполнили бы одни только перфомансные аудиты, и вторая просевшая категория
// осталась бы в сводке ни с чем — а промпт требует назвать конкретный аудит
// и запрещает лезть за ним в сырой отчёт. Квота на категорию гарантирует, что
// у каждой рассматриваемой категории будет что показать.
const AUDITS_PER_CATEGORY = 3;

const thresholds = JSON.parse(readFileSync(THRESHOLDS_PATH, 'utf8'));

// Опечатка в ключе (например, "best_practices" вместо "best-practices") иначе
// молча даёт `score < undefined === false`, и категория перестаёт проверяться
// без единого предупреждения. Проверяем на старте, а не там, где это тихо
// сломается.
for (const [id] of CATEGORIES) {
  if (typeof thresholds[id] !== 'number') {
    throw new Error(
      `Порог для категории "${id}" отсутствует или не число в ${THRESHOLDS_PATH} ` +
        `(сейчас там ${JSON.stringify(thresholds[id])}) — проверь ключ`,
    );
  }
}
if (typeof thresholds.deltaDrop !== 'number') {
  throw new Error(`deltaDrop отсутствует или не число в ${THRESHOLDS_PATH}`);
}

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

// Категории, которые стоит разобрать. Ниже порога есть кому-то — берём только
// их: это те категории, из-за которых ночь красная, и агент должен объяснить
// именно их просадку.
//
// Если ниже порога нет никого (verdict: green, но 🟡 из-за deltaDrop — сам
// скрипт дельту к прошлой ночи не считает, это делает агент по треду issue),
// заранее не угадать, какая именно категория просела: раньше здесь бралась
// категория с худшим абсолютным баллом, и список аудитов у неё был один на
// всю страницу — при этом просесть могла совсем другая категория, и агент
// не находил её причину нигде, кроме сырого отчёта, который ему запрещено
// читать. Поэтому на 🟡 отдаём аудиты по всем категориям сразу — с той же
// квотой на категорию, что и ниже, — а агент сам сузит до просевшей,
// сравнив со прошлым комментарием. Категории без единого проваленного
// аудита ничего не добавят в список, так что раздувается сводка не
// сильнее, чем реальных проблем на странице.
function relevantCategories(scores) {
  const below = CATEGORIES.filter((_, index) => scores[index] < thresholds[CATEGORIES[index][0]]);
  return below.length > 0 ? below : CATEGORIES;
}

// Компактный список проваленных аудитов для страницы: по каждой рассматриваемой
// категории — свои до AUDITS_PER_CATEGORY аудитов с ненулевым весом и
// score < 1, отсортированные по влиянию на балл категории (weight * (1 -
// score)) — так первыми идут аудиты, которые реально тянут балл вниз, а не
// мелкие придирки с большим весом, но баллом 0.99. Квота на категорию (а не
// общий срез по всей странице) не даёт категориям с тяжёлыми аудитами
// (перфоманс) вытеснить категории с лёгкими (SEO) из списка.
function failedAudits(report, categories) {
  const seen = new Set();
  const items = [];
  for (const [id, label] of categories) {
    const auditRefs = report.categories[id]?.auditRefs ?? [];
    const candidates = [];
    for (const ref of auditRefs) {
      if (!ref.weight || seen.has(ref.id)) continue;
      const audit = report.audits[ref.id];
      if (!audit || audit.score === null || audit.score === undefined || audit.score >= 1) continue;
      candidates.push({
        id: ref.id,
        category: label,
        title: audit.title,
        score: audit.score,
        displayValue: audit.displayValue,
        influence: ref.weight * (1 - audit.score),
      });
    }
    candidates.sort((a, b) => b.influence - a.influence);
    const picked = candidates.slice(0, AUDITS_PER_CATEGORY);
    picked.forEach((item) => seen.add(item.id));
    items.push(...picked);
  }
  return items;
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
const auditLines = [];
// Число прогонов держим по каждой странице отдельно: если у одной страницы
// прогон не отработал и файла меньше, чем у другой, общая цифра выглядела бы
// правдоподобно, но врала бы про меньшую из двух — такое расхождение важно
// показать явно, а не скрыть за одним числом.
const pageRuns = [];

for (const page of PAGES) {
  const median = medianReport(page.slug);
  pageRuns.push({ path: page.path, runs: median.runs });
  const scores = CATEGORIES.map(([id]) => score(median.report, id));
  CATEGORIES.forEach(([id, label], index) => {
    if (scores[index] < thresholds[id]) {
      failures.push(`- \`${page.path}\` — ${label}: ${scores[index]} при пороге ${thresholds[id]}`);
    }
  });
  rows.push(`| \`${page.path}\` | ${scores.join(' | ')} |`);
  // displayValue может отсутствовать (аудит не прогнался, метрика не измерена)
  // — запасное «—» вместо `LCP undefined` или падения на несуществующем audits[id].
  const values = METRICS.map(([id, label]) => `${label} ${median.report.audits?.[id]?.displayValue ?? '—'}`);
  metricLines.push(`- \`${page.path}\` — ${values.join(' · ')}`);

  const audits = failedAudits(median.report, relevantCategories(scores));
  if (audits.length > 0) {
    auditLines.push(`- \`${page.path}\`:`);
    for (const audit of audits) {
      // Категория в конце строки: на 🟡, где аудиты идут сразу по всем
      // категориям, иначе не понять, к какому баллу в таблице относится аудит.
      const parts = [`\`${audit.id}\``, audit.title, `score ${Math.round(audit.score * 100)}`];
      if (audit.displayValue) parts.push(audit.displayValue);
      parts.push(`категория: ${audit.category}`);
      auditLines.push(`  - ${parts.join(' — ')}`);
    }
  }
}

const limits = CATEGORIES.map(([id, label]) => `${label} ${thresholds[id]}`).join(', ');

// Пока число прогонов у всех страниц одинаковое, короткая общая формулировка
// точна и её незачем усложнять; расхождение показываем только когда оно есть.
const runsMatch = pageRuns.every((page) => page.runs === pageRuns[0].runs);
const runsLine = runsMatch
  ? `Медиана ${pageRuns[0].runs} прогонов.`
  : `Медиана прогонов: ${pageRuns.map((page) => `\`${page.path}\` — ${page.runs}`).join(', ')}.`;

const summary = [
  `# Lighthouse — ночь на ${night}`,
  '',
  `| Страница | ${CATEGORIES.map(([, label]) => label).join(' | ')} |`,
  `|---|${CATEGORIES.map(() => '---').join('|')}|`,
  ...rows,
  '',
  ...metricLines,
  '',
  `${runsLine} Пороги: ${limits}. deltaDrop: ${thresholds.deltaDrop}.`,
  '',
  failures.length ? 'Ниже порога:' : 'Все категории выше порогов.',
  ...failures,
  '',
  // Список проваленных аудитов — единственный канал, по которому агент видит
  // причину просадки: сырые *.report.json он читать не должен (см. промпт).
  'Проваленные аудиты:',
  ...(auditLines.length > 0 ? auditLines : ['- нет данных по проблемным категориям.']),
  '',
  `verdict: ${failures.length ? 'red' : 'green'}`,
  '',
].join('\n');

writeFileSync(join(REPORT_DIR, 'summary.md'), summary);
console.log(summary);
