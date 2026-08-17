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
  const values = METRICS.map(
    ([id, label]) => `${label} ${median.report.audits[id].displayValue}`,
  );
  metricLines.push(`- \`${page.path}\` — ${values.join(' · ')}`);
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
  `verdict: ${failures.length ? 'red' : 'green'}`,
  '',
].join('\n');

writeFileSync(join(REPORT_DIR, 'summary.md'), summary);
console.log(summary);
