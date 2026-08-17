# Claude открывает pull request — дизайн

Дата: 2026-08-17

## Задача

Дать Claude право менять код: владелец пишет в обсуждении команду, Claude
делает правку в ветке и открывает pull request.

В [дизайне от 12.08](2026-08-12-claude-github-workflow-design.md) режим был
осознанно read-only, и «автоматические ветки и PR» стояли в списке того, что мы
не делаем. Этот документ снимает то ограничение, не ломая уже работающий разбор
`@claude` в тредах.

## Решения

| Вопрос | Решение |
|---|---|
| Триггер | Команда `@claude implement` в комментарии |
| Файл | Новый `.github/workflows/claude-implement.yml` |
| Разведение с `claude.yml` | Исключение `!contains(…, '@claude implement')` в его `if:` |
| События | Те же три, что у `claude.yml` |
| Кто может звать | Только владелец репозитория |
| Где работает | В issue — новая ветка и новый PR; в открытом PR — коммиты в его ветку |
| Режим action'а | Tag mode: `track_progress: true` вместе со своим `prompt` |
| Права | `contents: write`, `issues: write`, `pull-requests: write`, `id-token: write`, `actions: read` |
| Проверки в прогоне | Линтеры и юнит-тесты (Node + uv); e2e остаются за `ci.yml` |
| Создание PR | `gh pr create` из Bash |
| Concurrency | Своя группа, без отмены начатого прогона |

Не делаем: срабатывание по открытию issue, по метке и assign; запуск e2e в
прогоне; мерж и ребейз; работу в PR из форков.

## Workflow

```yaml
name: claude-implement

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  pull_request_review:
    types: [submitted]

concurrency:
  group: claude-implement-${{ github.event.issue.number || github.event.pull_request.number }}
  cancel-in-progress: false

jobs:
  claude-implement:
    name: claude-implement
    if: >-
      (github.event.comment.user.login || github.event.review.user.login)
        == github.repository_owner
      && contains(github.event.comment.body || github.event.review.body, '@claude implement')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write
      actions: read
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '24'
          cache: npm
          cache-dependency-path: |
            spec/package-lock.json
            frontend/package-lock.json
      - uses: astral-sh/setup-uv@v9.0.0
        with:
          enable-cache: true
          cache-dependency-glob: backend/uv.lock
      - uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          trigger_phrase: '@claude implement'
          track_progress: true
          prompt: |
            # порядок шагов, см. раздел «Промпт»
          claude_args: >-
            --allowedTools "Bash(npm:*),Bash(uv:*),Bash(gh pr create:*),Bash(git status:*),Bash(git diff:*),Bash(git log:*)"
          additional_permissions: |
            actions: read
```

Комментарии в самом файле подробнее — здесь снимок структуры.

## Почему отдельный воркфлоу, а не расширение прав существующего

`contents: write` нужен не всегда, а только когда Claude просят что-то сделать.
Если выдать это право единственному воркфлоу, каждый вопрос в треде будет
подниматься с правом на запись — без нужды и с прямым риском: инструкции для
Claude приходят из текста обсуждения.

Разделение оставляет обычному `@claude` ровно те права, что были, и делает
переход в режим записи явным действием владельца.

## Почему tag mode с track_progress, а не agent mode

У action'а два режима. Заданный `prompt` сам по себе переключает его в agent
mode, где нет ни ветки, ни служебного комментария: `src/modes/agent/index.ts`
не вызывает `setupBranch`, а `claudeCommentId` передаётся как `undefined`. Всё
это пришлось бы описывать в промпте руками.

`track_progress: true` принудительно возвращает tag mode (см. `detectMode` в
`src/modes/detector.ts`), а `prompt` подмешивается к его инструкции как
дополнение — в документации это описано как «Your `prompt` is injected as custom
instructions while maintaining context». Даром достаётся то, что нам и нужно:

- ветка. Для issue action создаёт `claude/…` от базовой ветки, для открытого PR
  переключается на его ветку и пушит туда же;
- служебный комментарий с прогрессом и финальный ответ в треде;
- разрешённые `Bash(git add|commit|rm)` и обёртка `git-push.sh`;
- инструменты чтения статуса и логов CI;
- `--permission-mode acceptEdits`.

## Почему `Edit` и `Write` не перечислены

Tag mode их не добавляет намеренно: в режиме `acceptEdits` правки внутри
`$GITHUB_WORKSPACE` разрешены автоматически, а за его пределами (например,
`~/.bashrc`) запрещены. Явное упоминание `Edit,Write` в `--allowedTools` сняло бы
границу и дало запись по всему раннеру — в исходниках action'а на этом месте
стоит предупреждающий комментарий.

Наш список в `claude_args` дописывается к списку tag mode, а не заменяет его:
action разбирает наш `--allowedTools`, чтобы поднять упомянутые в нём
MCP-серверы, и передаёт свой флаг первым.

## Почему PR открывает `gh pr create`

Сам action pull request не создаёт: он «creates commits on a branch and links
back to a prefilled PR creation page». MCP-сервер файловых операций умеет только
`commit_files` и `delete_files` — ручки для PR там нет.

Остаются два пути. Официальный GitHub MCP-сервер (`mcp__github__create_pull_request`)
поднимается в Docker — образ надо тянуть ради одной ручки. `gh` на
ubuntu-раннере предустановлен, а `GITHUB_TOKEN` и `GH_TOKEN` action кладёт в
окружение процесса (`src/entrypoints/run.ts`), так что `gh pr create` работает
без настройки. Берём его.

Флаги `--base` и `--head` не задаём: `gh` берёт head из текущей ветки, base —
из дефолтной ветки репозитория.

## Проверки внутри прогона

Node и uv ставятся шагами воркфлоу, зависимости — нет: какой пакет задет,
известно только Claude. `npm ci` и `uv sync` он делает сам, кэш к этому моменту
прогрет.

e2e в прогоне не запускаются. Playwright требует браузеры с системными
библиотеками, это минуты установки, а `ci.yml` всё равно прогонит e2e на
созданном PR. По той же причине `e2e/package-lock.json` не попадает в кэш, а
`Bash(npx:*)` не разрешён.

## Промпт

Правила репозитория Claude читает из `CLAUDE.md`, поэтому промпт задаёт только
порядок шагов и то, чего в правилах нет — открытие PR:

1. если задачу можно понять двояко — не коммитить, спросить в треде;
2. сделать изменение, после правки `spec/main.tsp` пересобрать
   `spec/openapi/openapi.yaml`;
3. прогнать проверки затронутых пакетов и показать вывод, e2e не запускать; если
   не зелено — PR не открывать;
4. закоммитить по `CONTRIBUTING.md`, с трейлером `Co-Authored-By`;
5. в issue — запушить ветку и открыть PR со строкой `Closes #<номер>`; в открытом
   PR нового PR не создавать;
6. в финальном комментарии — ссылка на PR и вывод проверок.

Шаг 1 существует, потому что на расплывчатую задачу иначе приедет PR с
выдумкой, а проверять такой PR дороже, чем ответить на вопрос.

Трейлер `Co-Authored-By` остаётся как в `CONTRIBUTING.md`, хотя автор коммита и
так `claude[bot]`: переопределять правило репозитория ради косметики не стоит.

## Разведение двух воркфлоу

`@claude implement` содержит `@claude`, поэтому без исключения один комментарий
поднимал бы оба job'а: один отвечал бы текстом, другой правил код. В `claude.yml`
добавлена строка `&& !contains(…, '@claude implement')`.

Обратной проверки в `claude-implement.yml` не нужно: его условие требует полную
фразу, и обычный `@claude` его не проходит.

Побочный эффект: записей о прогонах в списке Actions теперь две на каждый
комментарий, и минимум одна из них `skipped`.

## Форки

Определить по payload'у `issue_comment`, что PR пришёл из форка, напрямую
нельзя, поэтому проверки в `if:` нет. Практически `@claude implement` в таком PR
упадёт на пуше: токен приложения выдан на наш репозиторий и в чужую ветку писать
не может.

Опаснее другое: инструкции могут приехать из чужого диффа, а право на запись
теперь есть. Договорённость простая — в PR из форков команду не запускаем; это
записано в `CONTRIBUTING.md`.

## Петли

Наше условие требует владельца, а сам action отдельно проверяет, что actor —
человек (`checkHumanActor`). Комментарии `claude[bot]` под условие не подходят,
так что ответ Claude не может позвать Claude снова.

## Проверка

1. `actionlint .github/workflows/` — если линтер есть в системе; иначе синтаксис
   проверит сам GitHub при первом прогоне.
2. Разведение режимов: комментарий с `@claude` поднимает только `claude`,
   с `@claude implement` — только `claude-implement`; парный job в обоих случаях
   `skipped`.
3. Живой прогон в issue: мелкая задача → `@claude implement` → ветка `claude/…`,
   коммит по Conventional Commits с трейлером, PR со строкой `Closes #<номер>`,
   вывод проверок в комментарии.
4. На созданном PR должен запуститься `ci.yml`. Правило «события от
   `GITHUB_TOKEN` не создают новых прогонов» к токену GitHub App'а не относится,
   а action работает именно им — но подтвердить это можно только прогоном.
5. Живой прогон в открытом PR: `@claude implement` в комментарии → новый PR не
   создан, коммит ушёл в ветку PR.
6. Базовый промпт tag mode сам по себе предлагает *ссылку* на форму создания PR.
   Шаг 5 нашего промпта должен это перебить; если в первом прогоне вместо PR
   придёт ссылка — усиливать формулировку.

## Известные ограничения

- **Только по команде.** Ни открытие issue, ни метка, ни assign ничего не
  запускают.
- **Один участник.** Условие привязано к владельцу репозитория.
- **PR из форков.** Команда там неприменима, см. выше.
- **e2e не проверяются до PR.** Красный `e2e` в `ci.yml` — штатный исход,
  лечится ещё одним `@claude implement` в том же PR.
- **Мерж и ребейз недоступны.** Это запрет в системном промпте action'а, правами
  он не обходится.
- **Прогон долгий.** Установка тулчейнов, зависимостей и проверки занимают
  минуты; в треде всё это время виден только комментарий с прогрессом.
