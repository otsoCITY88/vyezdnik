# Vyezdnik · Деплой

## Локальный тест Docker‑сборки

```bash
# собрать и запустить — БД и сторадж лягут в named volumes
docker compose up --build

# приложение на http://localhost:3030
# логин: palkov.my@rks-nr.ru (без пароля — режим прототипа)
```

Остановка:

```bash
docker compose down            # сохранит volumes
docker compose down -v         # удалит БД и сторадж
```

---

## Деплой через Coolify

### Что нужно подготовить

1. Свой Coolify (self‑hosted) — версия `4.x+`
2. GitHub‑репозиторий проекта подключён к Coolify (через GitHub App или Personal Token)
3. Сгенерированный `AUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```
4. (Опц.) Anthropic API key, SMTP/IMAP креды, VAPID‑ключи, Telegram bot — см. `.env.example`

### Шаг 1. Создать приложение в Coolify

1. **Projects** → **New** → выберите ваш сервер.
2. **Resources** → **+ New** → **Public Repository** (или **Private**, если репо приватный).
3. **Build Pack:** выберите **Dockerfile** (сборка по нашему `Dockerfile`).
   *Альтернатива:* **Docker Compose** — Coolify подхватит `docker-compose.yml`. Это проще, но даёт меньше контроля над networking.
4. **Branch:** `main`
5. **Port:** `3030` (Coolify пробросит на 80/443 за свой Traefik)

### Шаг 2. Persistent Storage (важно!)

В **Storages** настройте 2 volume‑mount‑а:

| Source (имя volume) | Destination (в контейнере) | Зачем |
|---|---|---|
| `vyezdnik-data` | `/app/data` | SQLite‑файл `prod.db` |
| `vyezdnik-storage` | `/app/storage` | сгенерированные `.docx`, фото с выездов, ЭДО‑пакеты, входящие PDF |

Без этих volume‑ов **БД и файлы потеряются при каждом редеплое**.

### Шаг 3. Environment variables

В **Environment Variables** Coolify добавьте (минимум):

```bash
NODE_ENV=production
AUTH_SECRET=<вывод openssl rand -base64 32>
AUTH_URL=https://your-domain.example.com
AUTH_TRUST_HOST=true
SEED_ON_INIT=true        # на первом запуске — true; потом можно убрать или поставить false
```

Дополнительно (если нужны фичи) — см. `.env.example`. В Coolify можно отметить переменные как **Build‑time** (для AI‑модели и пр.) или **Runtime** (для SMTP/IMAP).

### Шаг 4. Healthcheck

В **Healthcheck** убедитесь:
- Path: `/api/health`
- Port: `3030`
- Interval: `30s`

(Это уже есть в `Dockerfile`, но Coolify даёт переопределить через UI.)

### Шаг 5. Domain + HTTPS

В **Domains** укажите ваш домен. Coolify сам выпустит Let’s Encrypt и пропишет в Traefik.

После добавления домена — обязательно **обновите** `AUTH_URL` в env на `https://your-domain.example.com` и пересоберите.

### Шаг 6. Deploy

Нажмите **Deploy**. Первая сборка займёт 3‑6 минут (npm install + Prisma generate + Next build + .docx templates).

Логи сборки видны прямо в Coolify. После запуска посмотрите runtime‑логи — должно быть:

```
▸ vyezdnik · entrypoint
  NODE_ENV       = production
  DATABASE_URL   = file:/app/data/prod.db
  STORAGE_DIR    = /app/storage
▸ БД не найдена — создаю схему и сидую демо-данные…
▸ Готово.
▸ Запуск сервера…
```

### Шаг 7. Первый вход

Откройте `https://your-domain.example.com/login` → email из seeded списка (`palkov.my@rks-nr.ru` или любой другой).

---

## Обновление (`git push` → автодеплой)

Coolify слушает push в выбранную ветку (по умолчанию `main`) и автоматически собирает новый образ. Старая БД и сторадж сохраняются благодаря volumes.

Если меняли `prisma/schema.prisma` — entrypoint сам сделает `prisma db push` при следующем старте.

---

## Если нужна Postgres вместо SQLite

1. В Coolify **+ New** → **Resource** → **PostgreSQL**.
2. Скопируйте `DATABASE_URL` из настроек БД.
3. В env приложения:
   ```bash
   DATABASE_URL=postgres://...
   ```
4. В `prisma/schema.prisma` поменяйте:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
5. Закоммитьте, запушьте — Coolify пересоберёт. `entrypoint.sh` сделает `prisma db push` к Postgres.

---

## Бэкапы

### SQLite

```bash
# на хосте Coolify
docker run --rm -v vyezdnik-data:/data -v $(pwd):/backup alpine \
  sh -c "cp /data/prod.db /backup/prod.db.$(date +%F).bak"
```

Coolify также умеет автоматические S3‑бэкапы в **Storages → Backups**.

### Storage (сгенерированные .docx, фото)

Аналогично, но `vyezdnik-storage`. Содержит подкаталоги:
- `incoming/` — загруженные PDF от ППК
- `outbox/` — dev‑outbox SMTP (если `DEV_FAKE_SEND=true`)
- `edo/` — ZIP‑пакеты для ЭДО
- `signatures/` — `.sig` файлы УКЭП
- `visits/<caseId>/` — фото с выездов

---

## Troubleshooting

| Симптом | Решение |
|---|---|
| `Auth.js: missing AUTH_SECRET` в логах | Добавь `AUTH_SECRET` через openssl |
| 500 на login | Проверь `AUTH_TRUST_HOST=true` (за Traefik/nginx) |
| `Cannot find module pdfjs-dist/...worker` | Пересобрать с чистого Dockerfile (есть `serverExternalPackages`) |
| Бэдж «не привязано» в /inbox после редеплоя пуст | volume `vyezdnik-storage` не подключился — проверь Storages |
| AI‑функции 503 | `ANTHROPIC_API_KEY` не задан в env |
| Push‑уведомления не приходят | Сгенерируй и впиши `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` |
| Старая БД, новая схема | Зайди в контейнер: `docker exec -it vyezdnik npx prisma db push` |

---

## Архитектура (для понимания, что куда мониторить)

```
┌─ Coolify (Traefik + Let's Encrypt) ──┐
│                                       │
│  https://vyezdnik.example.com         │
│              │                        │
│              ▼                        │
│  ┌─ Container "vyezdnik" ──────────┐  │
│  │  Next.js standalone (port 3030) │  │
│  │  + node-cron (утренний дайджест)│  │
│  └────────┬─────────────┬──────────┘  │
│           │             │             │
│           ▼             ▼             │
│   /app/data           /app/storage    │
│   (vyezdnik-data)     (vyezdnik-      │
│   prod.db SQLite      storage)        │
│                       outbox/edo/...  │
└───────────────────────────────────────┘
        │
        ▼
   Anthropic API · SMTP · IMAP · Telegram (опц.)
```
