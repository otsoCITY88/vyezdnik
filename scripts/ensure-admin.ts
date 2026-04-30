/* eslint-disable no-console */
// Идемпотентный скрипт: если в БД нет ни одного пользователя — создаёт
// admin@rks-nr.ru. Запускается из docker-entrypoint.sh при каждом старте.
//
// Это решает кейс: БД (volume) уже существует, но пуста — например после
// упавшего seed или ручного reset. Без хотя бы одного юзера на /login
// нечего выбрать и войти невозможно.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const count = await db.user.count();
  if (count > 0) {
    console.log(`▸ ensure-admin: пользователей уже ${count}, ничего не делаю.`);
    return;
  }

  console.log("▸ ensure-admin: пользователей нет — создаю admin@rks-nr.ru");
  await db.user.create({
    data: {
      email: "admin@rks-nr.ru",
      fullName: "Администратор",
      shortName: "Администратор",
      position: "Администратор системы",
      isAdmin: true,
      isHead: true,
    },
  });
  console.log("✓ ensure-admin: создан admin@rks-nr.ru — войди этим e-mail на /login");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
