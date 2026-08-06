"""Настройки сервиса: расписание владельца, окно записи, CORS."""

from datetime import time
from pathlib import Path

WINDOW_DAYS = 14
"""Длина окна записи в днях, считая текущую дату."""

WORK_DAY_START = time(10, 0)
"""Начало рабочего дня владельца (UTC)."""

WORK_DAY_END = time(18, 0)
"""Конец рабочего дня владельца (UTC): слот должен успеть закончиться не позже."""

WORKDAYS = frozenset({0, 1, 2, 3, 4})
"""Рабочие дни недели в терминах date.weekday(): понедельник — пятница."""

LEAD_TIME_MINUTES = 5
"""Слот доступен, только если начнётся не раньше чем через это время."""

CORS_ORIGINS = ("http://localhost:5173", "http://localhost:4173")
"""Адреса Vite: dev-сервер и preview."""

CORS_ALLOW_HEADERS = ("Accept", "Content-Type", "Prefer")
"""Заголовки, которые пропускает CORS. `Prefer` шлёт фронтенд на страницу
бронирования (ориентируясь на пример Prism-мока); на проде поведение ручек
от него не зависит, но без этого браузер режет запрос preflight'ом."""

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
"""Каталог со сборкой фронтенда. В Docker-образе туда копируется frontend/dist;
в рабочей копии его нет, и SPA не монтируется — фронтенд поднимают отдельно."""
