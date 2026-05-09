import cron from "node-cron";
import { Markup, Telegraf } from "telegraf";
import { config } from "./config.js";
import {
  createTelegramLinkCodeMongo,
  getStudentAccessLinkByUserIdMongo,
  getStudentByIdMongo,
  getStudentByTelegramIdMongo,
  queueDailyReminderJobsMongo,
  verifyTelegramCodeMongo
} from "./mongo-services.js";
import {
  buildDebtReminderAsset,
  buildTrialFinishedReminderAsset,
  buildUpcomingPaymentReminderAsset,
  consumeTelegramCode,
  createTelegramLinkCode,
  getStudentAccessLinkByUserId,
  getStudentById,
  getStudentByTelegramId,
  queueDailyReminderJobs
} from "./services.js";
import { signToken } from "./auth.js";

let bot = null;

async function getStudentByTelegramIdUniversal(telegramId) {
  if (config.dbProvider === "mongodb") {
    return getStudentByTelegramIdMongo(telegramId);
  }
  return getStudentByTelegramId(telegramId);
}

async function getStudentByIdUniversal(studentId) {
  if (config.dbProvider === "mongodb") {
    return getStudentByIdMongo(studentId);
  }
  return getStudentById(studentId);
}

async function getStudentAccessLinkByUserIdUniversal(userId) {
  if (config.dbProvider === "mongodb") {
    return getStudentAccessLinkByUserIdMongo(userId);
  }
  return getStudentAccessLinkByUserId(userId);
}

async function createTelegramLinkCodeUniversal(phone) {
  if (config.dbProvider === "mongodb") {
    return createTelegramLinkCodeMongo(phone);
  }
  return createTelegramLinkCode(phone);
}

async function verifyTelegramCodeUniversal(code, telegramId) {
  if (config.dbProvider === "mongodb") {
    return verifyTelegramCodeMongo(code, telegramId);
  }
  return consumeTelegramCode(code, telegramId);
}

async function safeReply(ctx, message, extra = undefined) {
  try {
    await ctx.reply(message, extra);
  } catch {
    return null;
  }
}

function buildWebAppKeyboard(url) {
  return Markup.keyboard([
    [Markup.button.webApp("\u{1F310} Web App", url)],
    ["\u{1F4D8} Kursim", "\u{1F4B3} Balansim"],
    ["\u{1F9FE} To'lovim", "\u{1F510} Kabinet havolasi"]
  ]).resize();
}

function buildPhoneRequestKeyboard() {
  return Markup.keyboard([
    [Markup.button.contactRequest("\u{1F4F1} Telefon raqamni yuborish")]
  ]).resize().oneTime();
}

async function sendStudentWelcome(ctx, student) {
  const webAppUrl = await getStudentAccessLinkByUserIdUniversal(student.userId);
  await safeReply(
    ctx,
    `Salom, ${student.fullName}!\n\nPastdagi tugmadan foydalaning.`,
    webAppUrl ? buildWebAppKeyboard(webAppUrl) : undefined
  );
}

async function sendCourseInfo(ctx) {
  const student = await getStudentByTelegramIdUniversal(ctx.from.id);
  if (!student) {
    await safeReply(ctx, "\u{1F4F1} Avval telefon raqamingizni yuborib akkauntni bog'lang.");
    return;
  }

  await safeReply(
    ctx,
    `\u{1F4D8} Kurs: ${student.courseTitle}\n\u{1F468}\u200D\u{1F3EB} Ustoz: ${student.teacherName}\n\u{1F552} Dars vaqti: ${student.schedule}`
  );
}

async function sendBalanceInfo(ctx) {
  const student = await getStudentByTelegramIdUniversal(ctx.from.id);
  if (!student) {
    await safeReply(ctx, "\u{1F4F1} Akkaunt bog'lanmagan. Telefon raqamingizni yuboring.");
    return;
  }

  const statusLabel = student.status === "active" ? "Faol" : student.status === "trial" ? "Sinovda" : "Qarzdor";
  await safeReply(ctx, `\u{1F4B3} Balans: ${Number(student.balance).toLocaleString("ru-RU")} so'm\n\u{1F4CC} Status: ${statusLabel}`);
}

async function sendPaymentInfo(ctx) {
  const student = await getStudentByTelegramIdUniversal(ctx.from.id);
  if (!student) {
    await safeReply(ctx, "\u{1F4F1} Akkaunt bog'lanmagan. Telefon raqamingizni yuboring.");
    return;
  }

  await safeReply(ctx, `\u{1F9FE} Oylik to'lov: ${Number(student.monthlyFee || 0).toLocaleString("ru-RU")} so'm\n\u{1F4C5} Oxirgi to'lov: ${student.lastPaymentDate || "-"}`);
}

async function sendCabinetLink(ctx) {
  const student = await getStudentByTelegramIdUniversal(ctx.from.id);
  if (!student) {
    await safeReply(ctx, "\u{1F4F1} Akkaunt bog'lanmagan. Telefon raqamingizni yuboring.");
    return;
  }

  const accessLink = await getStudentAccessLinkByUserIdUniversal(student.userId);
  await safeReply(ctx, `\u{1F510} Kabinet uchun maxsus havola:\n${accessLink}`, buildWebAppKeyboard(accessLink));
}

export function startBot() {
  if (!config.botEnabled || !config.telegramBotToken) {
    return null;
  }

  bot = new Telegraf(config.telegramBotToken);

  bot.start(async (ctx) => {
    const student = await getStudentByTelegramIdUniversal(ctx.from.id);
    if (student) {
      await sendStudentWelcome(ctx, student);
      return;
    }

    await safeReply(
      ctx,
      "Assalomu alaykum.\n\nTelefon raqamingizni kiriting.",
      buildPhoneRequestKeyboard()
    );
  });

  bot.on("contact", async (ctx) => {
    const phone = ctx.message?.contact?.phone_number?.replace(/\\s+/g, "") || "";
    if (!phone) {
      await safeReply(ctx, "Telefon raqamni yuborishda xatolik bo'ldi. Qayta urinib ko'ring.");
      return;
    }

    const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;
    const data = await createTelegramLinkCodeUniversal(normalizedPhone);

    if (!data) {
      await safeReply(ctx, "Bu raqam bo'yicha o'quvchi topilmadi. Iltimos, qabulxona bilan bog'laning.");
      return;
    }

    await safeReply(
      ctx,
      `Tasdiqlash kodi: ${data.code}\n\nKodni shu chatga yuboring va akkauntingizni ulang.`
    );
  });

  bot.hears(/^\+998\d{9}$/, async (ctx) => {
    const phone = ctx.message.text.trim();
    const data = await createTelegramLinkCodeUniversal(phone);

    if (!data) {
      await safeReply(ctx, "\u274C Bu raqam bo'yicha o'quvchi topilmadi.\n\nIltimos, qabulxona bilan bog'laning.");
      return;
    }

    await safeReply(
      ctx,
      `\u{1F510} Tasdiqlash kodi: *${data.code}*\n\nKodni shu chatga yuboring va akkauntingizni ulang.`,
      { parse_mode: "Markdown" }
    );
  });

  bot.hears(/^\d{6}$/, async (ctx) => {
    const code = ctx.message.text.trim();
    const student = await verifyTelegramCodeUniversal(code, ctx.from.id);

    if (!student) {
      await safeReply(ctx, "\u274C Kod topilmadi yoki avval ishlatilgan.");
      return;
    }

    const token = signToken({ id: student.userId, role: "student", fullName: student.fullName });
    const link = `${config.webUrl}/?studentToken=${token}`;
    await sendStudentWelcome(ctx, student);
    await safeReply(ctx, `\u{1F517} Zaxira havola: ${link}`);
  });

  bot.command("kurs", sendCourseInfo);
  bot.command("balans", sendBalanceInfo);
  bot.command("tolov", sendPaymentInfo);
  bot.command("kabinet", sendCabinetLink);

  bot.hears("\u{1F4D8} Kursim", sendCourseInfo);
  bot.hears("\u{1F4B3} Balansim", sendBalanceInfo);
  bot.hears("\u{1F9FE} To'lovim", sendPaymentInfo);
  bot.hears("\u{1F510} Kabinet havolasi", sendCabinetLink);

  bot.launch().catch((error) => {
    const code = error?.response?.error_code;
    const description = error?.response?.description || error?.message || "Bot launch xatosi";
    console.error(`Telegram bot ishga tushmadi (${code || "unknown"}): ${description}`);
  });

  cron.schedule("0 9 * * *", async () => {
    if (!bot) {
      return;
    }

    const jobs =
      config.dbProvider === "mongodb"
        ? await queueDailyReminderJobsMongo({ upcomingDays: 3 })
        : queueDailyReminderJobs({ upcomingDays: 3 });
    for (const job of jobs) {
      if (!job.student?.telegramId) {
        continue;
      }

      if (job.type === "debt") {
        const asset = await buildDebtReminderAsset(job.student);
        await bot.telegram.sendPhoto(
          job.student.telegramId,
          {
            source: asset.imageBuffer,
            filename: "qarzdorlik-eslatmasi.png"
          },
          {
            caption: asset.caption
          }
        ).catch(() => null);
        continue;
      }

      if (job.type === "payment_upcoming") {
        const asset = await buildUpcomingPaymentReminderAsset(job.student);
        await bot.telegram.sendPhoto(
          job.student.telegramId,
          {
            source: asset.imageBuffer,
            filename: "tolov-eslatmasi.png"
          },
          {
            caption: `${asset.caption}\n\n💰 ${Number(job.student.monthlyFee || 0).toLocaleString("ru-RU")} so'm`
          }
        ).catch(() => null);
        continue;
      }

      if (job.type === "trial_finished") {
        const asset = await buildTrialFinishedReminderAsset(job.student);
        await bot.telegram.sendPhoto(
          job.student.telegramId,
          {
            source: asset.imageBuffer,
            filename: "sinov-muddati-tugadi.png"
          },
          {
            caption: asset.caption
          }
        ).catch(() => null);
      }
    }
  });

  return bot;
}

export async function sendStudentPaymentNotification(receipt) {
  if (!bot) {
    return;
  }

  const student = await getStudentByIdUniversal(receipt.studentId);
  if (!student?.telegramId) {
    return;
  }

  await bot.telegram.sendPhoto(
    student.telegramId,
    {
      source: receipt.receiptImageBuffer,
      filename: "tolov-cheki.png"
    },
    {
      caption: `${receipt.receiptCaption}\n\n\u{1F464} ${receipt.fullName}\n\u{1F4B5} ${Number(receipt.amount).toLocaleString("ru-RU")} so'm\n\u{1F552} ${receipt.paidAt}`
    }
  ).catch(() => null);
}
