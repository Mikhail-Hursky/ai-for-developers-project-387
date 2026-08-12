/**
 * Порты и адреса окружения — единственный источник правды. Их читает и
 * `playwright.config.ts` (чтобы поднять серверы), и фикстуры (чтобы сходить
 * в API напрямую). Тестам импортировать конфиг раннера нельзя, поэтому
 * константы живут отдельным модулем.
 */
export const FRONTEND_PORT = 4173;
export const BACKEND_PORT = 3000;

/** Адрес прод-сборки фронтенда: порт 4173 уже разрешён в CORS бэкенда. */
export const baseURL = `http://localhost:${FRONTEND_PORT}`;

/** Адрес бэкенда, с которым собирается фронтенд и куда ходит тестовый клиент. */
export const apiBaseURL = `http://localhost:${BACKEND_PORT}/api`;
