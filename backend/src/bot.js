import cron from "node-cron";
import { Markup, Telegraf } from "telegraf";
import { config } from "./config.js";
import {
  consumeStartTokenMongo,
  createTelegramLinkCodeMongo,
  getStudentAccessLinkByUserIdMongo,
  getStudentByIdMongo,
  getStudentPaymentReceiptMongo,
  getStudentPaymentsMongo,
  getStudentByTelegramIdMongo,
  getTelegramChannelsMongo,
  queueDailyReminderJobsMongo,
  verifyTelegramCodeMongo
} from "./mongo-services.js";
import {
  buildPaymentReceiptAsset,
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

function wrapBotHandler(handler) {
  return async (ctx) => {
    try {
      await handler(ctx);
    } catch (error) {
      console.error("Telegram handler xatosi:", error?.message || error);
      await safeReply(ctx, "Xatolik yuz berdi. Qayta urinib ko'ring.");
    }
  };
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

function buildQuickInlineKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("\u{1F4D8} Kursim", "menu:course"),
      Markup.button.callback("\u{1F4B3} Balansim", "menu:balance")
    ],
    [
      Markup.button.callback("\u{1F9FE} To'lovlarim", "menu:payments"),
      Markup.button.callback("\u{1F510} Kabinet", "menu:cabinet")
    ]
  ]);
}

function buildBackInlineKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("\u{2B05}\uFE0F Orqaga", "menu:home")]
  ]);
}

async function hasRequiredSubscriptions(ctx) {
  if (config.dbProvider !== "mongodb" || !bot) {
    return { ok: true, missing: [] };
  }
  const channels = await getTelegramChannelsMongo();
  if (!channels.length) {
    return { ok: true, missing: [] };
  }

  const missing = [];
  for (const channel of channels) {
    const chatRef = channel.id || channel.url;
    if (!chatRef) continue;
    try {
      const member = await bot.telegram.getChatMember(chatRef, ctx.from.id);
      const status = member?.status || "";
      if (!["creator", "administrator", "member"].includes(status)) {
        missing.push(channel);
      }
    } catch {
      missing.push(channel);
    }
  }

  return {
    ok: missing.length === 0,
    missing
  };
}

function buildSubscriptionKeyboard(channels = []) {
  const joinButtons = channels.map((channel) => [
    Markup.button.url(
      `\u{1F517} ${channel.title || channel.id || "Kanal"}`,
      channel.url || `https://t.me/${String(channel.id || "").replace(/^@/, "")}`
    )
  ]);
  return Markup.inlineKeyboard([
    ...joinButtons,
    [Markup.button.callback("\u2705 Tekshirish", "subscription:check")]
  ]);
}

async function ensureSubscriptionOrPrompt(ctx, student) {
  const check = await hasRequiredSubscriptions(ctx);
  if (check.ok) {
    return true;
  }

  const courseLine = student?.courseTitle
    ? `\n\n\u{1F4DA} Sizning yo'nalishingiz: *${student.courseTitle.toUpperCase()}*`
    : "";
  await safeReply(
    ctx,
    `\u{1F44B} ILM NEST botidan to'liq foydalanish uchun avval quyidagi kanal yoki guruhlarga qo'shiling.${courseLine}\n\nPastdagi tugmalar orqali kirib, keyin *Tekshirish* tugmasini bosing.`,
    {
      ...buildSubscriptionKeyboard(check.missing),
      parse_mode: "Markdown"
    }
  );
  return false;
}

function getStartPayloadFromContext(ctx) {
  if (ctx.startPayload) return String(ctx.startPayload).trim();
  const text = ctx.message?.text || "";
  const match = text.match(/^\/start(?:@\S+)?\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

async function sendStudentWelcome(ctx, student) {
  const webAppUrl = await getStudentAccessLinkByUserIdUniversal(student.userId);
  const subscriptionOk = await ensureSubscriptionOrPrompt(ctx, student);
  if (!subscriptionOk) {
    return;
  }
  await safeReply(
    ctx,
    `\u{1F44B} Assalomu alaykum, ${student.fullName}!\n\nILM NEST botiga xush kelibsiz. Pastdagi menyudan kerakli bo'limni tanlang.`,
    webAppUrl ? buildQuickInlineKeyboard() : undefined
  );
  if (webAppUrl) {
    await safeReply(ctx, "\u{1F4F2} Web App va tezkor menyu tayyor.", buildWebAppKeyboard(webAppUrl));
  }
}

async function sendCourseInfo(ctx) {
  const student = await getStudentByTelegramIdUniversal(ctx.from.id);
  if (!student) {
    await safeReply(ctx, "\u{1F4F1} Avval telefon raqamingizni yuborib akkauntni bog'lang.");
    return;
  }

  await safeReply(
    ctx,
    `\u{1F4D8} Kurs ma'lumoti\n\n\u{1F393} Yo'nalish: ${student.courseTitle || "-"}\n\u{1F468}\u200D\u{1F3EB} Ustoz: ${student.teacherName || "-"}\n\u{1F552} Dars vaqti: ${student.schedule || "-"}`,
    buildQuickInlineKeyboard()
  );
}

async function sendBalanceInfo(ctx) {
  const student = await getStudentByTelegramIdUniversal(ctx.from.id);
  if (!student) {
    await safeReply(ctx, "\u{1F4F1} Akkaunt bog'lanmagan. Telefon raqamingizni yuboring.");
    return;
  }

  const statusLabel = student.status === "active" ? "Faol" : student.status === "trial" ? "Sinovda" : "Qarzdor";
  await safeReply(
    ctx,
    `\u{1F4B3} Balans holati\n\n\u{1F4B0} Joriy balans: ${Number(student.balance).toLocaleString("ru-RU")} so'm\n\u{1F4CC} Status: ${statusLabel}\n\u{1F4B8} Oylik to'lov: ${Number(student.monthlyFee || 0).toLocaleString("ru-RU")} so'm`,
    buildQuickInlineKeyboard()
  );
}

async function sendPaymentInfo(ctx) {
  const student = await getStudentByTelegramIdUniversal(ctx.from.id);
  if (!student) {
    await safeReply(ctx, "\u{1F4F1} Akkaunt bog'lanmagan. Telefon raqamingizni yuboring.");
    return;
  }

  if (config.dbProvider === "mongodb") {
    const payments = await getStudentPaymentsMongo(student.userId);
    const buttons = (payments?.items || []).slice(0, 6).map((item) => [
      Markup.button.callback(
        `\u{1F4C5} ${dayjs(item.createdAt).format("DD.MM.YYYY")} · ${Number(item.amount).toLocaleString("ru-RU")} so'm`,
        `payment:${item.id}`
      )
    ]);
    if (!buttons.length) {
      buttons.push([Markup.button.callback("\u{2B05}\uFE0F Orqaga", "menu:home")]);
    } else {
      buttons.push([Markup.button.callback("\u{2B05}\uFE0F Orqaga", "menu:home")]);
    }
    await safeReply(
      ctx,
      `\u{1F9FE} To'lovlarim\n\n\u{1F4B5} Oylik narx: ${Number(student.monthlyFee || 0).toLocaleString("ru-RU")} so'm\n\u{1F4C5} Oxirgi to'lov: ${student.lastPaymentDate || "-"}\n\nKerakli sanani bosing, chek chiqadi.`,
      {
        ...Markup.inlineKeyboard(buttons),
      }
    );
    return;
  }

  await safeReply(
    ctx,
    `\u{1F9FE} Oylik to'lov: ${Number(student.monthlyFee || 0).toLocaleString("ru-RU")} so'm\n\u{1F4C5} Oxirgi to'lov: ${student.lastPaymentDate || "-"}`,
    buildBackInlineKeyboard()
  );
}

async function sendCabinetLink(ctx) {
  const student = await getStudentByTelegramIdUniversal(ctx.from.id);
  if (!student) {
    await safeReply(ctx, "\u{1F4F1} Akkaunt bog'lanmagan. Telefon raqamingizni yuboring.");
    return;
  }

  const accessLink = await getStudentAccessLinkByUserIdUniversal(student.userId);
  await safeReply(
    ctx,
    `\u{1F510} Kabinet havolasi\n\nQuyidagi havola orqali student kabinetga kirishingiz mumkin:\n${accessLink}`,
    buildQuickInlineKeyboard()
  );
  await safeReply(ctx, "\u{1F310} Web App tugmasi ham pastda turibdi.", buildWebAppKeyboard(accessLink));
}

export function startBot() {
  if (!config.botEnabled || !config.telegramBotToken) {
    return null;
  }

  bot = new Telegraf(config.telegramBotToken);

  bot.start(wrapBotHandler(async (ctx) => {
    const startPayload = getStartPayloadFromContext(ctx);
    if (config.dbProvider === "mongodb" && startPayload) {
      const student = await consumeStartTokenMongo(startPayload, ctx.from.id);
      await safeReply(ctx, "\u{1F389} Telegram akkauntingiz muvaffaqiyatli bog'landi.");
      await sendStudentWelcome(ctx, student);
      return;
    }

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
  }));

  bot.on("contact", wrapBotHandler(async (ctx) => {
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
  }));

  bot.hears(/^\+998\d{9}$/, wrapBotHandler(async (ctx) => {
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
  }));

  bot.hears(/^\d{6}$/, wrapBotHandler(async (ctx) => {
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
  }));

  bot.command("kurs", sendCourseInfo);
  bot.command("balans", sendBalanceInfo);
  bot.command("tolov", sendPaymentInfo);
  bot.command("kabinet", sendCabinetLink);

  bot.hears("\u{1F4D8} Kursim", sendCourseInfo);
  bot.hears("\u{1F4B3} Balansim", sendBalanceInfo);
  bot.hears("\u{1F9FE} To'lovim", sendPaymentInfo);
  bot.hears("\u{1F510} Kabinet havolasi", sendCabinetLink);

  bot.action("menu:home", wrapBotHandler(async (ctx) => {
    await ctx.answerCbQuery().catch(() => null);
    const student = await getStudentByTelegramIdUniversal(ctx.from.id);
    if (!student) {
      await safeReply(ctx, "\u{1F4F1} Avval telefon raqamingizni yuborib akkauntni bog'lang.");
      return;
    }
    await sendStudentWelcome(ctx, student);
  }));

  bot.action("menu:course", wrapBotHandler(async (ctx) => {
    await ctx.answerCbQuery().catch(() => null);
    await sendCourseInfo(ctx);
  }));

  bot.action("menu:balance", wrapBotHandler(async (ctx) => {
    await ctx.answerCbQuery().catch(() => null);
    await sendBalanceInfo(ctx);
  }));

  bot.action("menu:payments", wrapBotHandler(async (ctx) => {
    await ctx.answerCbQuery().catch(() => null);
    await sendPaymentInfo(ctx);
  }));

  bot.action("menu:cabinet", wrapBotHandler(async (ctx) => {
    await ctx.answerCbQuery().catch(() => null);
    await sendCabinetLink(ctx);
  }));

  bot.action("subscription:check", wrapBotHandler(async (ctx) => {
    await ctx.answerCbQuery().catch(() => null);
    const student = await getStudentByTelegramIdUniversal(ctx.from.id);
    if (!student) {
      await safeReply(ctx, "\u{1F4F1} Avval akkauntni bog'lang.");
      return;
    }
    const ok = await ensureSubscriptionOrPrompt(ctx, student);
    if (ok) {
      await safeReply(ctx, "\u2705 Ajoyib, obuna tasdiqlandi.");
      await sendStudentWelcome(ctx, student);
    }
  }));

  bot.action(/^payment:(\d+)$/, wrapBotHandler(async (ctx) => {
    await ctx.answerCbQuery().catch(() => null);
    if (config.dbProvider !== "mongodb") {
      await safeReply(ctx, "Bu funksiya hozircha mavjud emas.");
      return;
    }
    const paymentId = Number(ctx.match?.[1]);
    const student = await getStudentByTelegramIdUniversal(ctx.from.id);
    if (!student) {
      await safeReply(ctx, "\u{1F4F1} Avval akkauntni bog'lang.");
      return;
    }
    const receipt = await getStudentPaymentReceiptMongo(student.userId, paymentId);
    if (!receipt) {
      await safeReply(ctx, "\u274C Bu to'lov topilmadi.");
      return;
    }
    const asset = await buildPaymentReceiptAsset(receipt);
    await bot.telegram.sendPhoto(
      ctx.from.id,
      {
        source: asset.imageBuffer,
        filename: "tolov-cheki.png"
      },
      {
        caption: `${asset.caption}\n\n\u{1F4C5} ${dayjs(receipt.paidAt).format("DD.MM.YYYY HH:mm")}`,
        reply_markup: buildBackInlineKeyboard().reply_markup
      }
    ).catch(() => null);
  }));

  bot.launch().catch((error) => {
    const code = error?.response?.error_code;
    const description = error?.response?.description || error?.message || "Bot launch xatosi";
    console.error(`Telegram bot ishga tushmadi (${code || "unknown"}): ${description}`);
  });

  bot.catch((error, ctx) => {
    console.error("Unhandled error while processing", {
      update_id: ctx?.update?.update_id,
      message: ctx?.update?.message,
      error: error?.message || error
    });
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

export async function sendBotBroadcast(recipients = [], title, message) {
  if (!bot || !Array.isArray(recipients) || !recipients.length) {
    return;
  }

  for (const recipient of recipients) {
    if (!recipient?.telegramId) continue;
    await bot.telegram.sendMessage(
      recipient.telegramId,
      `\u{1F4E2} ${title}\n\n${message}`
    ).catch(() => null);
  }
}
