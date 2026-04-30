#!/bin/sh
set -e

# Путь к БД — лежит в /app/data (persistent volume)
DB_FILE="${DATABASE_FILE:-/app/data/prod.db}"
export DATABASE_URL="file:${DB_FILE}"
export STORAGE_DIR="${STORAGE_DIR:-/app/storage}"

mkdir -p "$(dirname "$DB_FILE")" "$STORAGE_DIR" "$STORAGE_DIR/incoming" "$STORAGE_DIR/outbox" "$STORAGE_DIR/edo" "$STORAGE_DIR/signatures" "$STORAGE_DIR/visits"

echo "▸ vyezdnik · entrypoint"
echo "  NODE_ENV       = ${NODE_ENV}"
echo "  DATABASE_URL   = ${DATABASE_URL}"
echo "  STORAGE_DIR    = ${STORAGE_DIR}"

# Прямые пути к бинарникам — не зависим от node_modules/.bin/ симлинков
PRISMA_BIN="/app/node_modules/prisma/build/index.js"
TSX_BIN="/app/node_modules/tsx/dist/cli.mjs"

# Первый запуск: применяем схему и засеиваем демо-данными
if [ ! -f "$DB_FILE" ]; then
  echo "▸ БД не найдена — создаю схему и сидую демо-данные…"
  node "$PRISMA_BIN" db push --skip-generate --accept-data-loss
  if [ "${SEED_ON_INIT:-true}" = "true" ]; then
    node "$TSX_BIN" prisma/seed.ts
  fi
  echo "▸ Готово."
else
  echo "▸ БД уже существует — применяю миграции схемы (если есть)…"
  node "$PRISMA_BIN" db push --skip-generate || true
fi

# Гарантированный admin-пользователь — если в users пусто (например БД
# существовала, но была пуста после упавшего seed), создаём admin@rks-nr.ru.
# Идемпотентно: ничего не делает если хоть один юзер уже есть.
node "$TSX_BIN" scripts/ensure-admin.ts || echo "⚠ ensure-admin упал — пропускаю"

# Кастомные .docx-шаблоны лежат в /app/templates — пересобираем если их нет
if [ ! -f "/app/templates/T3_letter_to_spo_remedy.docx" ]; then
  echo "▸ Пересборка .docx-шаблонов…"
  node "$TSX_BIN" scripts/build-templates.ts
fi

echo "▸ Запуск сервера…"
exec "$@"
