/* eslint-disable no-console */
// Сидер с реальными данными, извлечёнными из 16 образцов в /files.

import { PrismaClient } from "@prisma/client";
import { fullAddress, shortAddress } from "../lib/format";

const db = new PrismaClient();

async function reset() {
  console.log("· сброс таблиц…");
  // Порядок важен из-за FK
  await db.caseEvent.deleteMany({});
  await db.document.deleteMany({});
  await db.visit.deleteMany({});
  await db.case.deleteMany({});
  await db.incomingLetter.deleteMany({});
  await db.building.deleteMany({});
  await db.contract.deleteMany({});
  await db.contact.deleteMany({});
  await db.organization.deleteMany({});
  await db.outgoingNumberCounter.deleteMany({});
  await db.user.deleteMany({});
}

async function main() {
  await reset();

  // ------------------------------------------------------------
  //  Организации
  // ------------------------------------------------------------
  console.log("· организации…");

  const ours = await db.organization.create({
    data: {
      kind: "ours",
      shortName: "ООО «РКС-НР»",
      fullName: "Общество с ограниченной ответственностью «РКС-НР»",
      inn: "6168116983",
      kpp: "771401001",
      ogrn: "1226100012115",
      legalAddress: "125167, г. Москва, пр-т Ленинградский, д. 47, стр. 3",
      defaultEmail: "mail@rks-nr.ru",
    },
  });

  const ppk = await db.organization.create({
    data: {
      kind: "customer",
      shortName: "ППК «Единый Заказчик»",
      fullName: "Публично-правовая компания «Единый заказчик в сфере строительства»",
      inn: "7707448255",
      kpp: "770701001",
      ogrn: "1217700030162",
      legalAddress: "127051, г. Москва, ул. Садовая-Самотёчная, д. 10, стр. 1",
      defaultEmail: "info@ppk-ez.ru",
    },
  });

  const rkk = await db.organization.create({
    data: {
      kind: "subcontractor",
      shortName: "АО «РКК»",
      fullName: "АО «Республиканская коммунальная компания»",
      defaultEmail: "ptogr@yandex.ru",
      extraEmails: JSON.stringify(["aorkk@mail.ru"]),
    },
  });

  const eks = await db.organization.create({
    data: {
      kind: "subcontractor",
      shortName: "АО «ГК «ЕКС»",
      fullName: "АО «Группа компаний «ЕКС»",
      defaultEmail: "k1-0001@mailsrv.tech",
    },
  });

  const auditProekt = await db.organization.create({
    data: {
      kind: "subcontractor",
      shortName: "ООО «АудитПроект при РГРТУ»",
      fullName: "ООО «АудитПроект при РГРТУ»",
      defaultEmail: "mpuks-po@mail.ru",
    },
  });

  const sst = await db.organization.create({
    data: {
      kind: "subcontractor",
      shortName: "ООО «СпецСнабТранс»",
      fullName: "ООО «СпецСнабТранс»",
      inn: "5031085772",
      legalAddress: "366309, Чеченская Республика, м. р-н Шалинский, с.п. Герменчукское, с. Герменчук, ул. Асламбека Шерипова, д. 18Б",
      defaultEmail: "sst_nr@mail.ru",
    },
  });

  const mskGarant = await db.organization.create({
    data: {
      kind: "subcontractor",
      shortName: "МСК-Гарант",
      fullName: "ООО «МСК-Гарант»",
    },
  });

  const adm = await db.organization.create({
    data: {
      kind: "administration",
      shortName: "Адм. ГО Мариуполь",
      fullName: "Администрация городского округа Мариуполь Донецкой Народной Республики",
      defaultEmail: "cc.adm@mariupol.gov-dpr.ru",
    },
  });

  const fond = await db.organization.create({
    data: {
      kind: "fund",
      shortName: "Мариупольский филиал ЕРФ МКД ДНР",
      fullName: "Мариупольский филиал Единого регионального фонда по управлению многоквартирными домами на территории Донецкой Народной Республики",
      defaultEmail: "MRPL-ERF-DNR@yandex.ru",
    },
  });

  const gbu = await db.organization.create({
    data: {
      kind: "balance_holder",
      shortName: "ГБУ МО «УТНКР»",
      fullName: "ГБУ Московской области «Управление технического надзора капитального ремонта»",
    },
  });

  const prosec = await db.organization.create({
    data: {
      kind: "prosecutor",
      shortName: "Прокуратура г. Мариуполя",
      fullName: "Прокуратура г. Мариуполя Донецкой Народной Республики",
    },
  });

  // ------------------------------------------------------------
  //  Контакты (подписанты, адресаты)
  // ------------------------------------------------------------
  console.log("· контакты…");

  // Наши
  const sherbachenya = await db.contact.create({
    data: {
      organizationId: ours.id,
      lastName: "Щербаченя", firstName: "Денис", middleName: "Николаевич",
      position: "Руководитель ОП в г. Мариуполе",
      shortName: "Д.Н. Щербаченя",
      email: "scherbachenya.dn@rks-nr.ru",
      isOurSignatory: true,
    },
  });

  const palkov = await db.contact.create({
    data: {
      organizationId: ours.id,
      lastName: "Пальков", firstName: "Михаил", middleName: "Юрьевич",
      position: "Главный специалист по претензионной работе",
      shortName: "М.Ю. Пальков",
      email: "palkov.my@rks-nr.ru",
      isOurExecutor: true,
    },
  });

  const gorchakov = await db.contact.create({
    data: {
      organizationId: ours.id,
      lastName: "Горчаков", firstName: "Алексей", middleName: "Сергеевич",
      position: "Зам. руководителя отдела эксплуатации и капитального ремонта",
      shortName: "А.С. Горчаков",
      email: "gorchakov.as@rks-nr.ru",
      isOurExecutor: true,
    },
  });

  await db.contact.create({
    data: {
      organizationId: ours.id,
      lastName: "Шарипов", firstName: "Ильдар", middleName: "Радикович",
      position: "Генеральный директор", shortName: "И.Р. Шарипов",
      isOurSignatory: true,
    },
  });

  // ППК
  const tolmachev = await db.contact.create({
    data: {
      organizationId: ppk.id,
      lastName: "Толмачев", firstName: "Максим", middleName: "Максимович",
      position: "Первый заместитель руководителя дирекции по развитию территорий",
      dativePosition: "Первому заместителю руководителя дирекции по развитию территорий",
      dativeName: "М.М. Толмачеву",
      vocativeName: "Уважаемый Максим Максимович!",
      shortName: "М.М. Толмачев",
      email: "info@ppk-ez.ru",
    },
  });

  // АО РКК
  const ziai = await db.contact.create({
    data: {
      organizationId: rkk.id,
      lastName: "Зиаи", firstName: "Данис", middleName: "Айратович",
      position: "Заместитель генерального директора",
      dativePosition: "Заместителю генерального директора",
      dativeName: "Д.А. Зиаи",
      vocativeName: "Уважаемый Данис Айратович!",
      shortName: "Д.А. Зиаи",
      email: "ptogr@yandex.ru",
    },
  });

  // АО ЕКС
  const kuc = await db.contact.create({
    data: {
      organizationId: eks.id,
      lastName: "Куц", firstName: "Вадим", middleName: "Владимирович",
      position: "Заместитель генерального директора",
      dativePosition: "Заместителю генерального директора",
      dativeName: "В.В. Куцу",
      vocativeName: "Уважаемый Вадим Владимирович!",
      shortName: "В.В. Куц",
      email: "k1-0001@mailsrv.tech",
    },
  });

  // АудитПроект
  const pushkin = await db.contact.create({
    data: {
      organizationId: auditProekt.id,
      lastName: "Пушкин", firstName: "Виктор", middleName: "Анатольевич",
      position: "Директор",
      dativePosition: "Директору",
      dativeName: "В.А. Пушкину",
      vocativeName: "Уважаемый Виктор Анатольевич!",
      shortName: "В.А. Пушкин",
      email: "mpuks-po@mail.ru",
    },
  });

  // Администрация Мариуполь
  const miroshnichenko = await db.contact.create({
    data: {
      organizationId: adm.id,
      lastName: "Мирошниченко", firstName: "Ярослав", middleName: "Сергеевич",
      position: "Начальник Департамента капитального строительства",
      dativePosition: "Начальнику Департамента капитального строительства Администрации городского округа Мариуполь Донецкой Народной Республики",
      dativeName: "Я.С. Мирошниченко",
      vocativeName: "Уважаемый Ярослав Сергеевич!",
      shortName: "Я.С. Мирошниченко",
      email: "cc.adm@mariupol.gov-dpr.ru",
    },
  });

  // Региональный фонд
  await db.contact.create({
    data: {
      organizationId: fond.id,
      lastName: "Коробко", firstName: "Александр", middleName: "Викторович",
      position: "Руководитель Мариупольского филиала",
      dativePosition: "Руководителю Мариупольского филиала",
      dativeName: "А.В. Коробко",
      vocativeName: "Уважаемый Александр Викторович!",
      shortName: "А.В. Коробко",
      email: "MRPL-ERF-DNR@yandex.ru",
    },
  });

  // СпецСнабТранс
  await db.contact.create({
    data: {
      organizationId: sst.id,
      lastName: "Иванов", firstName: "Сергей", middleName: "Петрович",
      position: "Генеральный директор",
      dativePosition: "Генеральному директору",
      dativeName: "С.П. Иванову",
      vocativeName: "Уважаемый Сергей Петрович!",
      shortName: "С.П. Иванов",
      email: "sst_nr@mail.ru",
    },
  });

  // МСК-Гарант
  await db.contact.create({
    data: {
      organizationId: mskGarant.id,
      lastName: "Лебедев", firstName: "Андрей", middleName: "Михайлович",
      position: "Директор",
      dativePosition: "Директору",
      dativeName: "А.М. Лебедеву",
      vocativeName: "Уважаемый Андрей Михайлович!",
      shortName: "А.М. Лебедев",
      email: "msk-garant@mail.ru",
    },
  });

  // Администрация — добавим dative-формы для существующего контакта Мирошниченко (уже есть выше).
  // Прокуратура (опц., может пригодиться в копиях)
  await db.contact.create({
    data: {
      organizationId: prosec.id,
      lastName: "Прокурор", firstName: "Иван", middleName: "Иванович",
      position: "Прокурор города",
      dativePosition: "Прокурору города",
      dativeName: "И.И. Прокурору",
      vocativeName: "Уважаемый Иван Иванович!",
      shortName: "И.И. Прокурор",
    },
  });

  // ------------------------------------------------------------
  //  Договоры
  // ------------------------------------------------------------
  console.log("· договоры…");

  const contractRkk = await db.contract.create({
    data: {
      number: "РР-166/1122/28",
      date: new Date("2022-11-18"),
      subcontractorId: rkk.id,
      clauses: JSON.stringify({
        warranty: ["7.20", "7.21"],
        remedy: ["8.10"],
        responsibility: ["4.1.21"],
        info_request: ["4.1.9"],
        penalty: ["8.17"],
      }),
      penaltyAmount: 15_000_000, // 150 000 ₽
    },
  });

  const contractEks = await db.contract.create({
    data: {
      number: "28-РР-2022/3383",
      date: new Date("2022-11-18"),
      subcontractorId: eks.id,
      clauses: JSON.stringify({
        warranty: ["7.20", "7.21"],
        remedy: ["8.10"],
        responsibility: ["4.1.21"],
        info_request: ["4.1.9"],
        penalty: ["8.17"],
      }),
      penaltyAmount: 15_000_000,
    },
  });

  const contractAudit = await db.contract.create({
    data: {
      number: "РР-163/1122/28",
      date: new Date("2022-11-18"),
      subcontractorId: auditProekt.id,
      clauses: JSON.stringify({
        warranty: ["7.20", "7.21"],
        remedy: ["8.10"],
        responsibility: ["4.1.21"],
        info_request: ["4.1.9"],
        penalty: ["8.17"],
      }),
      penaltyAmount: 15_000_000,
    },
  });

  const contractSst = await db.contract.create({
    data: {
      number: "РР-61/0922/53",
      date: new Date("2022-09-06"),
      subcontractorId: sst.id,
      clauses: JSON.stringify({
        warranty: ["7.20", "7.21"],
        remedy: ["8.10"],
        responsibility: ["4.1.21"],
        info_request: ["4.1.9"],
        penalty: ["8.17"],
      }),
      penaltyAmount: 15_000_000,
    },
  });

  const contractMsk = await db.contract.create({
    data: {
      number: "РР-77/0922/12",
      date: new Date("2022-09-06"),
      subcontractorId: mskGarant.id,
      clauses: JSON.stringify({
        warranty: ["7.20", "7.21"],
        remedy: ["8.10"],
        responsibility: ["4.1.21"],
        info_request: ["4.1.9"],
        penalty: ["8.17"],
      }),
      penaltyAmount: 15_000_000,
    },
  });

  // ------------------------------------------------------------
  //  Объекты МКД (из писем + из 15 листов Акта_о_недостатках.xlsx)
  // ------------------------------------------------------------
  console.log("· МКД…");

  type B = {
    street: string; house: string; apartment?: string; porch?: string;
    spo: string; contract: string;
  };
  const buildings: B[] = [
    // Из писем
    { street: "пр. Металлургов", house: "45/9", apartment: "63", spo: rkk.id, contract: contractRkk.id },
    { street: "ул. Московская", house: "44", apartment: "19", spo: auditProekt.id, contract: contractAudit.id },
    { street: "ул. 60 лет СССР", house: "12", apartment: "136", spo: eks.id, contract: contractEks.id },
    { street: "ул. 60 лет СССР", house: "12", apartment: "140", spo: eks.id, contract: contractEks.id },
    { street: "ул. 60 лет СССР", house: "12", apartment: "144", spo: eks.id, contract: contractEks.id },
    { street: "пер. Аносова", house: "13", apartment: "12", spo: auditProekt.id, contract: contractAudit.id },
    { street: "ул. Строителей", house: "32", spo: sst.id, contract: contractSst.id },
    { street: "ул. Мамина-Сибиряка", house: "39", spo: sst.id, contract: contractSst.id },
    { street: "ул. Мамина-Сибиряка", house: "40", spo: sst.id, contract: contractSst.id },
    // Из листов Акта_о_недостатках.xlsx
    { street: "ул. Азовстальская", house: "91", spo: mskGarant.id, contract: contractMsk.id },
    { street: "ул. Азовстальская", house: "129", spo: mskGarant.id, contract: contractMsk.id },
    { street: "ул. Карпинского", house: "62", spo: mskGarant.id, contract: contractMsk.id },
    { street: "ул. Карпинского", house: "64", spo: mskGarant.id, contract: contractMsk.id },
    { street: "ул. Карпинского", house: "68", spo: mskGarant.id, contract: contractMsk.id },
    { street: "ул. Карпинского", house: "72", spo: mskGarant.id, contract: contractMsk.id },
    { street: "ул. Карпинского", house: "74", spo: mskGarant.id, contract: contractMsk.id },
    { street: "ул. Громовой", house: "50", spo: mskGarant.id, contract: contractMsk.id },
    { street: "ул. Ильича", house: "137", spo: mskGarant.id, contract: contractMsk.id },
    { street: "ул. Сеченова", house: "59", spo: mskGarant.id, contract: contractMsk.id },
    { street: "ул. Сеченова", house: "63", spo: mskGarant.id, contract: contractMsk.id },
    { street: "ул. Сеченова", house: "84", spo: mskGarant.id, contract: contractMsk.id },
    { street: "ул. Металургов", house: "143", spo: mskGarant.id, contract: contractMsk.id },
    { street: "26", house: "1", spo: mskGarant.id, contract: contractMsk.id },
    { street: "26", house: "5", spo: mskGarant.id, contract: contractMsk.id },
  ];

  const buildingMap: Record<string, string> = {};
  for (const b of buildings) {
    const key = `${b.street}|${b.house}|${b.apartment || ""}`;
    const created = await db.building.create({
      data: {
        city: "Мариуполь",
        street: b.street, house: b.house, apartment: b.apartment, porch: b.porch,
        shortAddress: shortAddress(b),
        fullAddress: fullAddress(b),
        subcontractorId: b.spo,
        contractId: b.contract,
      },
    });
    buildingMap[key] = created.id;
  }

  // ------------------------------------------------------------
  //  Пользователи
  // ------------------------------------------------------------
  console.log("· пользователи…");

  await db.user.create({
    data: {
      email: "palkov.my@rks-nr.ru",
      fullName: "Пальков Михаил Юрьевич",
      shortName: "М.Ю. Пальков",
      position: "Главный специалист по претензионной работе",
    },
  });
  await db.user.create({
    data: {
      email: "gorchakov.as@rks-nr.ru",
      fullName: "Горчаков Алексей Сергеевич",
      shortName: "А.С. Горчаков",
      position: "Зам. рук. отдела эксплуатации",
    },
  });
  const userPalkov = await db.user.findFirst({ where: { email: "palkov.my@rks-nr.ru" } });
  const userGorchakov = await db.user.findFirst({ where: { email: "gorchakov.as@rks-nr.ru" } });

  // ------------------------------------------------------------
  //  Счётчик исходящих
  // ------------------------------------------------------------
  await db.outgoingNumberCounter.create({
    data: { prefix: "02", year: new Date().getFullYear(), current: 245 },
  });

  // ------------------------------------------------------------
  //  Входящие письма (реальные из PDF/чата)
  // ------------------------------------------------------------
  console.log("· входящие…");

  const inMet = await db.incomingLetter.create({
    data: {
      fromOrganizationId: ppk.id,
      number: "ППК-1-27290/2025", incomingDate: new Date("2025-10-21"),
      subject: "О недостатках ремонтно-восстановительных работ по адресу: пр. Металлургов, 45/9, кв. 63",
      applicantName: "Павличенко-Янатьева Ю.И.",
      applicantOrigin: "Прокуратура г. Мариуполя",
      applicantLetterNumber: "988нп-24/09-13-3812исх25",
      applicantLetterDate: new Date("2025-10-17"),
      pageCount: 6,
      buildingId: buildingMap["пр. Металлургов|45/9|63"],
    },
  });

  const inMosk = await db.incomingLetter.create({
    data: {
      fromOrganizationId: ppk.id,
      number: "ППК-1-32475/2025", incomingDate: new Date("2025-12-12"),
      subject: "Обращение по вопросу залития кв. 19 МКД по ул. Московская, д. 44",
      applicantName: "—",
      applicantOrigin: "Мариупольский филиал Единого регионального фонда МКД ДНР",
      applicantLetterNumber: "1133",
      applicantLetterDate: new Date("2025-11-26"),
      pageCount: 9,
      buildingId: buildingMap["ул. Московская|44|19"],
    },
  });

  await db.incomingLetter.create({
    data: {
      fromOrganizationId: ppk.id,
      number: "ППК-1-32215/2025", incomingDate: new Date("2025-12-11"),
      subject: "Обращение Зуевой Н.Н. о залитии квартир № 136, 140, 144 МКД по ул. 60 лет СССР, д. 12",
      applicantName: "Зуева Н.Н.",
      applicantOrigin: "Администрация городского округа Мариуполь",
      applicantLetterNumber: "4192",
      applicantLetterDate: new Date("2025-12-03"),
      pageCount: 8,
      buildingId: buildingMap["ул. 60 лет СССР|12|136"],
    },
  });

  const inAnos = await db.incomingLetter.create({
    data: {
      fromOrganizationId: ppk.id,
      number: "ППК-1-22945", incomingDate: new Date("2025-09-08"),
      subject: "О недостатках выполненных работ по адресу: пер. Аносова, д. 13, кв. 12",
      applicantName: "Аносова жильцы",
      applicantOrigin: "ППК «Единый Заказчик»",
      pageCount: 4,
      buildingId: buildingMap["пер. Аносова|13|12"],
    },
  });

  const inStr = await db.incomingLetter.create({
    data: {
      fromOrganizationId: ppk.id,
      number: "ППК-1-31651/2025", incomingDate: new Date("2025-12-04"),
      subject: "Обращение по проведению ремонтно-восстановительных работ по ул. Строителей, 32",
      applicantOrigin: "Администрация городского округа Мариуполь, Департамент капитального строительства",
      applicantLetterNumber: "4158",
      applicantLetterDate: new Date("2025-11-28"),
      pageCount: 5,
      buildingId: buildingMap["ул. Строителей|32|"],
    },
  });

  const inSst = await db.incomingLetter.create({
    data: {
      fromOrganizationId: ppk.id,
      number: "ППК-1-15040/2026", incomingDate: new Date("2026-01-17"),
      subject: "О непредоставлении графика устранения замечаний — Мамина-Сибиряка, 39",
      applicantOrigin: "ППК «Единый Заказчик»",
      pageCount: 4,
      buildingId: buildingMap["ул. Мамина-Сибиряка|39|"],
    },
  });

  // ------------------------------------------------------------
  //  Дела (живой набор: 8 дел в разных состояниях)
  // ------------------------------------------------------------
  console.log("· дела…");

  // 1. Д-2026-0042 · Металлургов 45/9 кв.63 — ОЖИДАНИЕ УСТРАНЕНИЯ, СПО просрочил
  const c1 = await db.case.create({
    data: {
      caseNumber: "Д-2025-0042",
      state: "awaiting_remedy_2",
      buildingId: buildingMap["пр. Металлургов|45/9|63"],
      subcontractorId: rkk.id,
      contractId: contractRkk.id,
      responsibleUserId: userPalkov!.id,
      deadlines: JSON.stringify({
        spo_response: "2025-12-20",
        next_visit: "2026-01-07",
      }),
      createdAt: new Date("2025-10-21T09:00:00Z"),
    },
  });
  await db.incomingLetter.update({ where: { id: inMet.id }, data: { linkedCaseId: c1.id } });

  // События для Д-2025-0042
  await db.caseEvent.createMany({
    data: [
      {
        caseId: c1.id, occurredAt: new Date("2025-10-21"),
        kind: "incoming",
        title: "Получено письмо ППК-1-27290/2025",
        description: "Требование Прокуратуры г. Мариуполя от 17.10.2025. Повторное обращение Павличенко-Янатьевой Ю.И.",
      },
      {
        caseId: c1.id, occurredAt: new Date("2025-10-23"),
        kind: "visit",
        title: "Первичный комиссионный выезд",
        description: "Доводы заявителя подтвердились. Составлен Акт осмотра МКД.",
      },
      {
        caseId: c1.id, occurredAt: new Date("2025-10-24"),
        kind: "letter_sent",
        title: "Письмо в СПО · 02/4694",
        description: "АО «РКК», подписант Д.Н. Щербаченя, копия — ППК ЕЗ (М.М. Толмачев). Срок устранения — 15.11.2025.",
      },
      {
        caseId: c1.id, occurredAt: new Date("2025-11-19"),
        kind: "visit",
        title: "Повторный выезд комиссии",
        description: "РКС-НР, ГБУ УТНКР МО, АО РКК. Замечания подтверждены, составлен Акт о недостатках/дефектах. Срок устранения — 20.12.2025.",
      },
      {
        caseId: c1.id, occurredAt: new Date("2025-12-17"),
        kind: "deadline_set",
        title: "⚠ Дедлайн ответа от СПО просрочен",
        description: "Письмо 02/4694 от 24.10.2025 без ответа.",
      },
    ],
  });

  // Visit для дела 1
  await db.visit.create({
    data: {
      caseId: c1.id, visitDate: new Date("2025-10-23"),
      kind: "initial",
      commissionMembers: JSON.stringify([
        { name: "А.С. Горчаков", role: "rks" },
        { name: "М.Ю. Пальков", role: "rks" },
      ]),
      findings: "Подтверждены деформации несущих конструкций в кв. 63.",
      result: "defects_found",
    },
  });
  await db.visit.create({
    data: {
      caseId: c1.id, visitDate: new Date("2025-11-19"),
      kind: "repeat",
      commissionMembers: JSON.stringify([
        { name: "А.С. Горчаков", role: "rks" },
        { name: "М.Ю. Пальков", role: "rks" },
        { name: "ГБУ МО УТНКР", role: "gbu" },
        { name: "Представитель АО РКК", role: "spo" },
      ]),
      findings: "Замечания не устранены. Составлен Акт Н/Д. Срок устранения — 20.12.2025.",
      result: "defects_found",
    },
  });

  // 2. Д-2026-0040 · Московская 44 — Запрос в СПО отправлен
  const c2 = await db.case.create({
    data: {
      caseNumber: "Д-2025-0040",
      state: "spo_request_sent",
      buildingId: buildingMap["ул. Московская|44|19"],
      subcontractorId: auditProekt.id,
      contractId: contractAudit.id,
      responsibleUserId: userPalkov!.id,
      deadlines: JSON.stringify({ spo_response: "2025-12-29", next_visit: "2025-12-30" }),
      createdAt: new Date("2025-12-12T11:00:00Z"),
    },
  });
  await db.incomingLetter.update({ where: { id: inMosk.id }, data: { linkedCaseId: c2.id } });
  await db.caseEvent.createMany({
    data: [
      {
        caseId: c2.id, occurredAt: new Date("2025-12-12"),
        kind: "incoming",
        title: "Получено письмо ППК-1-32475/2025",
        description: "Обращение жителя Мариупольского филиала ЕРФ от 26.11.2025 № 1133. Залитие кв. 19.",
      },
      {
        caseId: c2.id, occurredAt: new Date("2025-12-13"),
        kind: "letter_sent",
        title: "Письмо в СПО · 02/0244",
        description: "ООО «АудитПроект», В.А. Пушкин. Срок устранения — 29.12.2025. Копия — ППК ЕЗ.",
      },
    ],
  });

  // 3. Д-2026-0029 · Аносова 13, кв. 12 — Устранение зафиксировано (готов ответ в ППК)
  const c3 = await db.case.create({
    data: {
      caseNumber: "Д-2025-0029",
      state: "remedy_confirmed",
      buildingId: buildingMap["пер. Аносова|13|12"],
      subcontractorId: auditProekt.id,
      contractId: contractAudit.id,
      responsibleUserId: userPalkov!.id,
      createdAt: new Date("2025-09-08T10:00:00Z"),
    },
  });
  await db.incomingLetter.update({ where: { id: inAnos.id }, data: { linkedCaseId: c3.id } });
  await db.caseEvent.createMany({
    data: [
      { caseId: c3.id, occurredAt: new Date("2025-09-08"), kind: "incoming", title: "Получено письмо ППК-1-22945" },
      {
        caseId: c3.id, occurredAt: new Date("2025-10-22"), kind: "visit",
        title: "Комиссионный выезд",
        description: "Совместно с нач. участка Величко И.А. (ООО «АудитПроект»). Составлен Акт осмотра № 22.10.2025-АНОС.13-12.",
      },
      {
        caseId: c3.id, occurredAt: new Date("2025-10-24"), kind: "letter_sent",
        title: "Письмо в СПО · 02/4101",
        description: "В.А. Пушкин. Срок предоставления ответа — 5 раб. дней. Срок устранения — до 06.11.2025.",
      },
      {
        caseId: c3.id, occurredAt: new Date("2025-11-07"), kind: "visit",
        title: "Повторный выезд",
        description: "Замечания устранены, зафиксировано в АО МКД.",
      },
      {
        caseId: c3.id, occurredAt: new Date("2025-11-10"), kind: "state_changed",
        title: "Устранение зафиксировано → готов ответ в ППК",
      },
    ],
  });

  // 4. Д-2026-0033 · Строителей 32 — Готов ответ в ППК
  const c4 = await db.case.create({
    data: {
      caseNumber: "Д-2025-0033",
      state: "reply_to_ppk_drafted",
      buildingId: buildingMap["ул. Строителей|32|"],
      subcontractorId: sst.id,
      contractId: contractSst.id,
      responsibleUserId: userPalkov!.id,
      createdAt: new Date("2025-12-04T12:30:00Z"),
    },
  });
  await db.incomingLetter.update({ where: { id: inStr.id }, data: { linkedCaseId: c4.id } });
  await db.caseEvent.createMany({
    data: [
      { caseId: c4.id, occurredAt: new Date("2025-12-04"), kind: "incoming", title: "Получено письмо ППК-1-31651/2025" },
      {
        caseId: c4.id, occurredAt: new Date("2025-12-08"), kind: "letter_sent",
        title: "Письмо в СПО · 02/0210",
        description: "ООО «СпецСнабТранс». Срок устранения — 31.01.2026.",
      },
      {
        caseId: c4.id, occurredAt: new Date("2026-02-05"), kind: "state_changed",
        title: "Все замечания устранены в полном объёме",
      },
    ],
  });

  // 5. Д-2026-0028 · Мамина-Сибиряка 39 — Претензия за непредоставление информации
  const c5 = await db.case.create({
    data: {
      caseNumber: "Д-2026-0028",
      state: "claim_no_info_sent",
      buildingId: buildingMap["ул. Мамина-Сибиряка|39|"],
      subcontractorId: sst.id,
      contractId: contractSst.id,
      responsibleUserId: userPalkov!.id,
      deadlines: JSON.stringify({ payment_demand: "2026-04-22" }),
      createdAt: new Date("2026-01-17T14:00:00Z"),
    },
  });
  await db.incomingLetter.update({ where: { id: inSst.id }, data: { linkedCaseId: c5.id } });
  await db.caseEvent.createMany({
    data: [
      { caseId: c5.id, occurredAt: new Date("2026-01-17"), kind: "letter_sent", title: "Письмо в СПО · 02/0244 · Запрос графика устранения замечаний" },
      { caseId: c5.id, occurredAt: new Date("2026-01-26"), kind: "deadline_set", title: "Срок предоставления графика истёк, ответа нет" },
      {
        caseId: c5.id, occurredAt: new Date("2026-04-22"), kind: "letter_sent",
        title: "Претензия со штрафом · 02/0242",
        description: "150 000 ₽ по п. 8.17 договора. Требование оплаты в 10 календарных дней.",
      },
    ],
  });

  // 6. Д-2026-0036 · Карпинского 72 — Акт Н/Д составлен
  const c6 = await db.case.create({
    data: {
      caseNumber: "Д-2026-0036",
      state: "defects_act_drafted",
      buildingId: buildingMap["ул. Карпинского|72|"],
      subcontractorId: mskGarant.id,
      contractId: contractMsk.id,
      responsibleUserId: userGorchakov!.id,
      deadlines: JSON.stringify({ next_visit: "2026-04-30" }),
      createdAt: new Date("2025-11-20T10:00:00Z"),
    },
  });
  await db.caseEvent.createMany({
    data: [
      { caseId: c6.id, occurredAt: new Date("2025-11-20"), kind: "incoming", title: "Жалоба на состояние фасада" },
      { caseId: c6.id, occurredAt: new Date("2025-12-01"), kind: "visit", title: "Первичный выезд" },
      { caseId: c6.id, occurredAt: new Date("2025-12-03"), kind: "letter_sent", title: "Письмо в СПО · 02/0220" },
      { caseId: c6.id, occurredAt: new Date("2026-04-15"), kind: "visit", title: "Повторный выезд · составлен Акт Н/Д" },
    ],
  });

  // 7. Д-2026-0038 · Сеченова 84 — Повторный выезд
  const c7 = await db.case.create({
    data: {
      caseNumber: "Д-2026-0038",
      state: "letter_with_ao_mkd_sent",
      buildingId: buildingMap["ул. Сеченова|84|"],
      subcontractorId: mskGarant.id,
      contractId: contractMsk.id,
      responsibleUserId: userGorchakov!.id,
      deadlines: JSON.stringify({ next_visit: "2026-04-29" }),
      createdAt: new Date("2026-02-10T10:00:00Z"),
    },
  });
  await db.caseEvent.createMany({
    data: [
      { caseId: c7.id, occurredAt: new Date("2026-02-10"), kind: "incoming", title: "Обращение по подъезду 2" },
      { caseId: c7.id, occurredAt: new Date("2026-02-25"), kind: "visit", title: "Первичный выезд" },
      { caseId: c7.id, occurredAt: new Date("2026-03-01"), kind: "letter_sent", title: "Письмо в СПО · 02/0230" },
    ],
  });

  // 8. Д-2026-0024 · Карпинского 64 — Готов ответ в ППК
  const c8 = await db.case.create({
    data: {
      caseNumber: "Д-2026-0024",
      state: "remedy_confirmed",
      buildingId: buildingMap["ул. Карпинского|64|"],
      subcontractorId: mskGarant.id,
      contractId: contractMsk.id,
      responsibleUserId: userPalkov!.id,
      createdAt: new Date("2025-09-15T11:00:00Z"),
    },
  });
  await db.caseEvent.createMany({
    data: [
      { caseId: c8.id, occurredAt: new Date("2025-09-15"), kind: "incoming", title: "Жалоба на оконные блоки в МОП" },
      { caseId: c8.id, occurredAt: new Date("2025-10-20"), kind: "visit", title: "Первичный выезд" },
      { caseId: c8.id, occurredAt: new Date("2025-10-22"), kind: "letter_sent", title: "Письмо в СПО · 02/0180" },
      { caseId: c8.id, occurredAt: new Date("2026-02-15"), kind: "visit", title: "Замечания устранены" },
    ],
  });

  // 9. Д-2026-0021 · Азовстальская 91 — Запрос в СПО
  await db.case.create({
    data: {
      caseNumber: "Д-2026-0021",
      state: "spo_request_sent",
      buildingId: buildingMap["ул. Азовстальская|91|"],
      subcontractorId: mskGarant.id,
      contractId: contractMsk.id,
      responsibleUserId: userGorchakov!.id,
      deadlines: JSON.stringify({ spo_response: "2026-05-05" }),
      createdAt: new Date("2026-04-01T09:00:00Z"),
    },
  });

  // 10. Д-2026-0017 · Сеченова 59 — Письмо T6 отправлено
  await db.case.create({
    data: {
      caseNumber: "Д-2026-0017",
      state: "letter_on_defects_act_sent",
      buildingId: buildingMap["ул. Сеченова|59|"],
      subcontractorId: mskGarant.id,
      contractId: contractMsk.id,
      responsibleUserId: userGorchakov!.id,
      deadlines: JSON.stringify({ remedy: "2026-05-10" }),
      createdAt: new Date("2026-02-12T10:00:00Z"),
    },
  });

  console.log("✓ сидер выполнен");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
