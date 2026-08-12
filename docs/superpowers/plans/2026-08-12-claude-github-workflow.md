# Вызов Claude из issue и PR — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Владелец репозитория пишет `@claude ...` в комментарии к issue или PR
и получает ответ в том же треде.

**Architecture:** Один новый workflow `.github/workflows/claude.yml` на три
события комментариев. Job поднимается только если автор — владелец репозитория
и в тексте есть `@claude`. Действие — `anthropics/claude-code-action@v1` в tag
mode: `prompt` не задаём, инструкции Claude берёт из `CLAUDE.md`. Права дают
только чтение кода и запись комментариев.

**Tech Stack:** GitHub Actions, `anthropics/claude-code-action@v1`,
`actions/checkout@v7`, `actionlint` через Docker, `gh` CLI для живой проверки.

Спека: [docs/superpowers/specs/2026-08-12-claude-github-workflow-design.md](../specs/2026-08-12-claude-github-workflow-design.md)

## Global Constraints

- Ветка по умолчанию — `main`. Работаем в ветке `feat/claude-workflow`, в `main`
  напрямую не коммитим.
- Коммиты — Conventional Commits, заголовок на английском, до 100 символов, в
  повелительном наклонении, с маленькой буквы, без точки. Тип для файлов
  workflow — `ci`, для документации — `docs`. Тело — маркированный список,
  строки до 100 символов.
- В каждом коммите футер `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- По `CLAUDE.md` коммит и пуш — только по явной просьбе. Команды в шагах ниже
  выполняются после того, как этот план принят.
- `.github/workflows/hexlet-check.yml` не трогаем ни при каких условиях.
- `ci.yml` и `release-please.yml` не меняются.
- Секрет `CLAUDE_CODE_OAUTH_TOKEN` в репозитории уже заведён, создавать заново
  не нужно.
- Комментарии внутри workflow — на русском, как в `ci.yml`.
- Версии action'ов: `actions/checkout@v7` (как в `ci.yml`),
  `anthropics/claude-code-action@v1` (документированный стабильный тег).

## Файлы

| Файл | Ответственность |
|---|---|
| `.github/workflows/claude.yml` | Создать. Весь триггер, гейт по автору, права и вызов action'а |
| `CONTRIBUTING.md` | Изменить. Раздел «Claude в обсуждениях» после раздела «CI» (строка 142) |

Больше ничего не меняется: ни `README.md` (бейдж на этот workflow не нужен —
прогон не про здоровье кода), ни `.github/workflows/README.md` (файл Hexlet).

---

### Task 1: Workflow-файл

**Files:**
- Create: `.github/workflows/claude.yml`

**Interfaces:**
- Consumes: секрет репозитория `CLAUDE_CODE_OAUTH_TOKEN`; файл `CLAUDE.md` в
  корне репозитория — из него Claude берёт правила в прогоне.
- Produces: workflow с `name: claude` и job `claude`. Задача 3 обращается к нему
  как `--workflow=claude.yml`, задача 2 ссылается на путь файла из
  `CONTRIBUTING.md`.

- [ ] **Step 1: Создать ветку**

Тесты для YAML-файла писать негде, поэтому «красный» шаг здесь — валидация
файла, которого ещё нет: она обязана упасть.

```bash
git switch -c feat/claude-workflow
```

- [ ] **Step 2: Убедиться, что валидировать пока нечего**

Run: `docker run --rm -v "$PWD":/repo --workdir /repo rhysd/actionlint:latest -color .github/workflows/claude.yml`

Expected: FAIL — `could not read .github/workflows/claude.yml`. Это подтверждает,
что линтер действительно смотрит на нужный путь, а не молча ничего не проверяет.

- [ ] **Step 3: Написать workflow**

Создать `.github/workflows/claude.yml` с этим содержимым целиком:

```yaml
name: claude

# Claude отвечает в обсуждении, когда его позвали: @claude в комментарии.
# Три события покрывают три места, где можно написать комментарий: тред issue
# и обсуждение PR (оба — issue_comment), комментарий к строке диффа и тело
# ревью.
on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  pull_request_review:
    types: [submitted]

# Пока один комментарий обрабатывается, следующий по тому же обсуждению ждёт
# очереди — иначе два ответа перемешаются в одном треде. Отменять начатый
# прогон нельзя: он уже пишет комментарий. Номера issue и PR в репозитории
# из одной последовательности, так что группы не пересекаются.
concurrency:
  group: claude-${{ github.event.issue.number || github.event.pull_request.number }}
  cancel-in-progress: false

jobs:
  claude:
    name: claude
    # Автор должен быть владельцем репозитория: чужой @claude не поднимает job
    # вообще. Логин и текст лежат в разных полях — в comment у комментариев,
    # в review у тела ревью, поэтому оба берутся через ||. Проверка на
    # триггер-фразу здесь — чтобы не тратить раннер на каждый комментарий;
    # сам action её всё равно перепроверит.
    if: >-
      (github.event.comment.user.login || github.event.review.user.login)
        == github.repository_owner
      && contains(github.event.comment.body || github.event.review.body, '@claude')
    runs-on: ubuntu-latest
    permissions:
      # Только чтение: правок и веток на этом этапе не делаем.
      contents: read
      # Ответ в треде issue или в обсуждении PR и служебный комментарий
      # с прогрессом.
      issues: write
      # Ответы на комментарии к строкам диффа.
      pull-requests: write
      # OIDC-токен: по нему action ходит в GitHub от имени claude[bot].
      id-token: write
      # Чтение прогонов и логов CI — см. additional_permissions ниже.
      actions: read
    steps:
      # Без клона Claude не увидит ни код, ни CLAUDE.md с правилами репозитория.
      # Ветку PR action доберёт сам: для открытого PR он делает
      # `git fetch origin pull/<номер>/head` и переключается на неё.
      - uses: actions/checkout@v7
      - uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          # Без этого Claude не видит результаты прогонов, даже когда права
          # actions: read выданы job'у.
          additional_permissions: |
            actions: read
```

- [ ] **Step 4: Прогнать actionlint**

Run: `docker run --rm -v "$PWD":/repo --workdir /repo rhysd/actionlint:latest -color .github/workflows/claude.yml`

Expected: PASS — пустой вывод и код возврата 0.

Если линтер ругается на выражение в `if:` — проверить скобки вокруг `||`:
в выражениях GitHub `==` связывает сильнее `||`, и без скобок условие
разбирается как `login || (login == owner)`.

- [ ] **Step 5: Проверить, что job не запустится там, где не должен**

Это проверка чтением, а не запуском: подставить в условие значения для четырёх
случаев и убедиться, что результат такой:

| Случай | `if:` |
|---|---|
| Владелец пишет `@claude, посмотри` в issue | true |
| Владелец пишет комментарий без `@claude` | false — `contains` не находит фразу |
| Посторонний пишет `@claude` | false — логин не равен `github.repository_owner` |
| Ревью отправлено без текста | false — `review.body` пустой |

- [ ] **Step 6: Коммит**

```bash
git add .github/workflows/claude.yml
git commit -m "$(cat <<'EOF'
ci(claude): answer @claude mentions in issue and pr comments

- add claude.yml on issue_comment, pull_request_review_comment and
  pull_request_review
- gate the job on the repository owner so nobody else spends the personal quota
- grant read-only repository access: comments only, no commits or branches
- pass actions: read through additional_permissions so ci logs are readable

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Раздел в CONTRIBUTING.md

**Files:**
- Modify: `CONTRIBUTING.md:142` — вставить новый раздел после абзаца про
  `hexlet-check.yml` и перед `## Релизы`

**Interfaces:**
- Consumes: путь `.github/workflows/claude.yml` из задачи 1.
- Produces: ничего, на этот раздел никто не ссылается.

- [ ] **Step 1: Прочитать соседние разделы**

Run: `sed -n '134,150p' CONTRIBUTING.md`

Expected: раздел `## CI` заканчивается строкой про `hexlet-check.yml`, дальше
идёт `## Релизы`. Новый раздел встаёт между ними.

- [ ] **Step 2: Вставить раздел**

После строки `Отдельно живёт \`hexlet-check.yml\`: он сгенерирован Hexlet, его не трогаем.`
добавить:

```markdown
## Claude в обсуждениях

[.github/workflows/claude.yml](.github/workflows/claude.yml) отвечает на
`@claude` в комментарии к issue, в обсуждении pull request и в комментарии к
строке диффа. Claude читает код ветки, дифф и логи упавшего CI, а отвечает
комментарием в том же треде: прав на запись в репозиторий у прогона нет, коммиты
и ветки он не делает.

Правила из [CLAUDE.md](CLAUDE.md) действуют и здесь — отдельного промпта в
workflow нет.

Позвать Claude может только владелец репозитория: токен в секрете
`CLAUDE_CODE_OAUTH_TOKEN` личный, и чужой `@claude` расходовал бы его квоту.
Комментарий от любого другого аккаунта прогон не запускает. Чтобы дать доступ
соавтору, его логин нужно дописать в условие `if:` этого workflow.

Что нужно один раз: приложение [Claude](https://github.com/apps/claude) должно
быть установлено на репозиторий, иначе прогон падает на авторизации.
```

- [ ] **Step 3: Проверить ссылки и разметку**

Run: `grep -n -A2 "## Claude в обсуждениях" CONTRIBUTING.md && ls .github/workflows/claude.yml CLAUDE.md`

Expected: раздел на месте, оба файла из относительных ссылок существуют.

- [ ] **Step 4: Проверить длину строк**

Run: `awk 'length > 100 {print FILENAME":"FNR": "length}' CONTRIBUTING.md`

Expected: пустой вывод.

- [ ] **Step 5: Коммит**

```bash
git add CONTRIBUTING.md
git commit -m "$(cat <<'EOF'
docs(claude): document the @claude workflow in contributing

- describe where @claude works and what it may do
- state that only the repository owner can trigger it and why
- note the claude github app as a one-time prerequisite

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Пуш, PR и живая проверка

**Files:** нет — задача про прогон, а не про код.

**Interfaces:**
- Consumes: `.github/workflows/claude.yml` из задачи 1, ветка
  `feat/claude-workflow` с двумя коммитами.
- Produces: рабочий workflow в `main` и подтверждение, что он отвечает.

Порядок здесь неизбежен: события `issue_comment` и `pull_request_review*`
GitHub берёт только из ветки по умолчанию. Пока ветка не в `main`, `@claude` не
сработает нигде — ни в issue, ни в самом этом PR. Поэтому сначала мерж, потом
проверка.

- [ ] **Step 1: Пуш ветки**

```bash
git push -u origin feat/claude-workflow
```

- [ ] **Step 2: Открыть PR**

```bash
gh pr create --repo Mikhail-Hursky/ai-for-developers-project-387 --base main \
  --title "ci(claude): answer @claude mentions in issue and pr comments" \
  --body "$(cat <<'EOF'
Добавляет workflow, который отвечает на `@claude` в комментариях к issue и PR.

- `.github/workflows/claude.yml` — три события комментариев, tag mode
  `anthropics/claude-code-action@v1`, инструкции из `CLAUDE.md`;
- job поднимается только если автор комментария — владелец репозитория;
- права read-only: `contents: read`, запись только в комментарии;
- `actions: read` — чтобы Claude мог читать логи упавшего CI;
- раздел «Claude в обсуждениях» в `CONTRIBUTING.md`.

Дизайн: `docs/superpowers/specs/2026-08-12-claude-github-workflow-design.md`

Проверить `@claude` можно только после мержа: события `issue_comment` GitHub
берёт из ветки по умолчанию.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Дождаться CI на PR**

Run: `gh pr checks --repo Mikhail-Hursky/ai-for-developers-project-387 --watch`

Expected: зелёные `commitlint`, `spec`, `frontend`, `backend`, `e2e`. Прогона
`claude` в списке нет и быть не должно — его события не связаны с PR как таким.

Если `commitlint` красный — заголовки коммитов не прошли формат из
`.commitlintrc.yml`; починить сообщения через `git rebase -i` и запушить снова.

- [ ] **Step 4: Смержить PR**

```bash
gh pr merge --repo Mikhail-Hursky/ai-for-developers-project-387 --squash --delete-branch \
  --subject "ci(claude): answer @claude mentions in issue and pr comments" \
  --body "$(cat <<'EOF'
- add claude.yml on issue_comment, pull_request_review_comment and
  pull_request_review
- gate the job on the repository owner so nobody else spends the personal quota
- grant read-only repository access: comments only, no commits or branches
- pass actions: read through additional_permissions so ci logs are readable
- document the workflow in contributing

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

Squash — потому что release-please считает версию по коммитам в `main`, и один
понятный `ci(...)` там лучше двух промежуточных.

`--subject` и `--body` заданы явно не для красоты: по умолчанию GitHub
складывает в squash-коммит заголовок PR и список коммитов ветки, а на пуш в
`main` работает job `commitlint` с `body-max-line-length: 100` из
`.commitlintrc.yml`. Сгенерированное тело легко ловит это ограничение и красит
`ci` на `main` в красный уже после мержа.

- [ ] **Step 5: Убедиться, что GitHub увидел workflow**

```bash
git switch main && git pull
git log -1 --pretty=format:'%s%n%n%b'
gh workflow list --repo Mikhail-Hursky/ai-for-developers-project-387
```

Expected: заголовок squash-коммита — `ci(claude): ...`, строки тела короче 100
символов; в списке workflow есть `claude` со статусом `active`. Если `claude` в
списке нет — файл не в `main` или YAML не разобрался.

- [ ] **Step 6: Живая проверка в issue**

```bash
gh issue create --repo Mikhail-Hursky/ai-for-developers-project-387 \
  --title "Проверка вызова Claude из комментария" \
  --body "Служебная issue для проверки workflow claude.yml. После проверки закрыть."
```

Затем — комментарий с вопросом, ответ на который требует чтения репозитория
(номер issue подставить из вывода предыдущей команды):

```bash
gh issue comment <номер> --repo Mikhail-Hursky/ai-for-developers-project-387 \
  --body "@claude какие job'ы есть в ci.yml и какой из них ждёт остальных?"
```

- [ ] **Step 7: Посмотреть прогон**

```bash
gh run list --repo Mikhail-Hursky/ai-for-developers-project-387 --workflow=claude.yml --limit 1
gh run watch --repo Mikhail-Hursky/ai-for-developers-project-387 <id прогона>
```

Expected: прогон завершается успешно.

Если он падает с ошибкой авторизации — не установлено приложение
[Claude](https://github.com/apps/claude); поставить его на репозиторий и
повторить шаг 6 новым комментарием.

- [ ] **Step 8: Проверить ответ**

```bash
gh issue view <номер> --repo Mikhail-Hursky/ai-for-developers-project-387 --comments
```

Expected: комментарий от `claude[bot]`, в котором перечислены `commitlint`,
`spec`, `frontend`, `backend`, `e2e` и сказано, что `e2e` ждёт `frontend` и
`backend`. Ответ из `ci.yml` — значит `checkout` отработал и Claude видит код.

- [ ] **Step 9: Проверить, что без `@claude` прогона нет**

```bash
gh issue comment <номер> --repo Mikhail-Hursky/ai-for-developers-project-387 \
  --body "Обычный комментарий без обращения."
gh run list --repo Mikhail-Hursky/ai-for-developers-project-387 --workflow=claude.yml --limit 5
```

Expected: новых прогонов не появилось — гейт в `if:` работает.

- [ ] **Step 10: Живая проверка в PR**

Нужен PR с изменением, о котором можно спросить. Подойдёт черновой PR с правкой
одной строки в `README.md`:

```bash
git switch -c chore/claude-pr-check
printf '\n' >> README.md
git commit -am "chore(readme): add trailing newline for a claude pr check

- temporary change to verify @claude answers in pull request comments

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push -u origin chore/claude-pr-check
gh pr create --repo Mikhail-Hursky/ai-for-developers-project-387 --base main --draft \
  --title "chore(readme): add trailing newline for a claude pr check" \
  --body "Черновой PR для проверки @claude в комментариях к PR. Закрыть без мержа."
```

В обсуждении этого PR написать:

```bash
gh pr comment <номер PR> --repo Mikhail-Hursky/ai-for-developers-project-387 \
  --body "@claude что меняет этот PR и зачем?"
```

Expected: `claude[bot]` отвечает про правку в `README.md`, а не про содержимое
`main` — значит action переключился на ветку PR.

- [ ] **Step 11: Убрать за собой**

```bash
gh pr close <номер PR> --repo Mikhail-Hursky/ai-for-developers-project-387 --delete-branch
gh issue close <номер issue> --repo Mikhail-Hursky/ai-for-developers-project-387
git switch main && git pull && git branch -d chore/claude-pr-check
```

Служебные issue и PR закрыты, временная ветка удалена, `main` содержит только
workflow и раздел в `CONTRIBUTING.md`.

---

## Что осталось за рамками

Эти вещи в спеке отмечены как не входящие в задачу — если понадобятся, они
станут отдельными циклами спека → план:

- вызов по открытию issue, по assign или по метке;
- разрешение Claude делать коммиты, ветки и PR (`contents: write`);
- запуск проверок проекта внутри прогона (`--allowedTools` с Bash);
- доступ для соавторов помимо владельца.
