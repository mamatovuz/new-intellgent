import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import ExcelJS from "exceljs";
import { HorizontalAlign, Jimp, loadFont } from "jimp";
import {
  SANS_16_BLACK,
  SANS_16_WHITE,
  SANS_32_BLACK,
  SANS_32_WHITE,
  SANS_64_BLACK,
  SANS_64_WHITE
} from "jimp/fonts";
import QRCode from "qrcode";
import { getDb } from "./db.js";
import { config } from "./config.js";
import { getSupabasePool } from "./supabase-db.js";

const db = getDb();
const runtimeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uploadsDir = path.join(runtimeRoot, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export function mapStudentRow(student) {
  if (!student) {
    return null;
  }

  return {
    id: student.id,
    fullName: student.fullName,
    phone: student.phone,
    balance: student.balance,
    status: student.status,
    enrolledAt: student.enrolledAt || null,
    billingStartDate: student.billingStartDate || null,
    trialRequired: Number(student.trialRequired || 3),
    paymentDueDate: student.paymentDueDate || null,
    trialProgress: Number(student.trialProgress || 0),
    monthlyFee: student.monthlyFee,
    courseId: student.courseId,
    courseTitle: student.courseTitle,
    schedule: student.schedule,
    teacherId: student.teacherId,
    teacherName: student.teacherName,
    lastPaymentDate: student.lastPaymentDate,
    telegramId: student.telegramId,
    isArchived: Boolean(student.isArchived),
    profileImage: student.profileImage || null
  };
}

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function persistProfileImage(profileImage) {
  if (!profileImage) {
    return null;
  }

  if (!profileImage.startsWith("data:image/")) {
    return profileImage;
  }

  const match = profileImage.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!match) {
    return profileImage;
  }

  const extension = match[1] === "jpeg" ? "jpg" : match[1].replace("+xml", "");
  const base64Data = match[2];
  const fileName = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
  return `/uploads/${fileName}`;
}

function mapDeveloperRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    username: row.username,
    fullName: row.fullName,
    age: row.age ? Number(row.age) : null,
    roleTitle: row.roleTitle,
    shortBio: row.shortBio || "",
    bio: row.bio || "",
    skills: safeJsonParse(row.skills, []),
    image: row.image || null,
    bannerImage: row.bannerImage || null,
    certificateImage: row.certificateImage || null,
    telegramUrl: row.telegramUrl || "",
    instagramUrl: row.instagramUrl || "",
    githubUrl: row.githubUrl || "",
    websiteUrl: row.websiteUrl || "",
    isActive: Boolean(row.isActive)
  };
}

function normalizePhone(value = "") {
  return String(value).replace(/\s+/g, "");
}

function normalizeComparableText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/['`’ʻ"]/g, "")
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeBillingStartDate(value) {
  if (!value) {
    return null;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
}

function generateAccessToken() {
  return crypto.randomBytes(24).toString("hex");
}

function normalizeImportedDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = dayjs("1899-12-30").add(value, "day");
    return excelEpoch.isValid() ? excelEpoch.format("YYYY-MM-DD") : null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const dotMatch = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotMatch) {
    return `${dotMatch[3]}-${dotMatch[2]}-${dotMatch[1]}`;
  }

  const slashMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[1]}-${slashMatch[2]}`;
  }

  const parsed = dayjs(raw);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
}

function normalizeImportedStatus(value) {
  const normalized = normalizeComparableText(value);
  if (!normalized) {
    return "active";
  }
  if (["faol", "active"].includes(normalized)) {
    return "active";
  }
  if (["sinov", "trial"].includes(normalized)) {
    return "trial";
  }
  if (["qarzdor", "debtor"].includes(normalized)) {
    return "debtor";
  }
  if (["arxiv", "archived", "archive"].includes(normalized)) {
    return "archived";
  }
  return null;
}

const IMPORT_HEADER_MAP = {
  fullName: [
    "full name",
    "fullname",
    "fullName",
    "full_name",
    "f i sh",
    "f.i.sh",
    "fish",
    "ism",
    "ism familiya",
    "ism familya",
    "oquvchi",
    "o quvchi"
  ],
  phone: ["phone", "telefon", "telefon raqami", "telefon raqam"],
  courseTitle: ["course", "kurs", "course title", "course_title", "courseTitle", "yonalish", "yo nalish"],
  teacherName: ["teacher", "teacherName", "oqituvchi", "o qituvchi", "ustoz"],
  status: ["status", "holat"],
  enrolledAt: ["enrolled at", "enrolled_at", "enrolledAt", "oqishni boshlagan sana", "boshlagan sana", "qoshilgan sana"],
  billingStartDate: ["billing start date", "billing_start_date", "billingStartDate", "oylik boshlanish sanasi", "oylik sanasi"],
  balance: ["balance", "balans", "joriy balans"],
  studyMonth: ["study month", "study_month", "studyMonth", "oy", "nechinchi oy", "qaysi oy"],
  note: ["note", "izoh", "comment", "sabab"]
};

function resolveImportField(headerValue) {
  const normalized = normalizeComparableText(headerValue);
  const entry = Object.entries(IMPORT_HEADER_MAP).find(([, aliases]) =>
    aliases.some(alias => normalizeComparableText(alias) === normalized)
  );
  return entry?.[0] || null;
}

function parseCsvLine(line = "") {
  const result = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function normalizeImportedNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = String(value)
    .replace(/\s+/g, "")
    .replace(/so'?m/gi, "")
    .replace(/uzs/gi, "")
    .replace(/,/g, ".");
  const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveReceiptLogoPath() {
  const candidates = [
    path.resolve(process.cwd(), "frontend", "public", "logointelligent.jpg"),
    path.resolve(process.cwd(), "..", "frontend", "public", "logointelligent.jpg")
  ];
  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

let fontsPromise = null;

function getFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      loadFont(SANS_16_BLACK),
      loadFont(SANS_16_WHITE),
      loadFont(SANS_32_BLACK),
      loadFont(SANS_32_WHITE),
      loadFont(SANS_64_WHITE),
      loadFont(SANS_64_BLACK)
    ]).then(([smallBlack, smallWhite, mediumBlack, mediumWhite, largeWhite, largeBlack]) => ({
      smallBlack,
      smallWhite,
      mediumBlack,
      mediumWhite,
      largeWhite,
      largeBlack
    }));
  }

  return fontsPromise;
}

function formatMoney(value = 0) {
  return `${Number(value || 0).toLocaleString("ru-RU")} so'm`;
}

function formatTelegramMonth(value = dayjs()) {
  const months = [
    "Yanvar",
    "Fevral",
    "Mart",
    "Aprel",
    "May",
    "Iyun",
    "Iyul",
    "Avgust",
    "Sentabr",
    "Oktabr",
    "Noyabr",
    "Dekabr"
  ];
  return months[dayjs(value).month()] || "To'lov";
}

function encodeBufferDataUri(buffer, mime = "image/png") {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildPaymentCaption(receipt) {
  const monthLabel = formatTelegramMonth(receipt.paidAt);
  return `${monthLabel} oylik to'lovi to'ladi`;
}

function buildDebtCaption(student) {
  return `Qarzingiz bor, iltimos to'lovni amalga oshiring`;
}

async function createSolidImage(width, height, color) {
  return new Jimp({ width, height, color });
}

async function createQrCodeBuffer(value, width = 280) {
  return QRCode.toBuffer(value, {
    type: "png",
    margin: 1,
    width,
    color: {
      dark: "#0f172a",
      light: "#FFFFFFFF"
    }
  });
}

export async function buildQrCodeAsset(value) {
  const buffer = await createQrCodeBuffer(value, 320);
  return {
    imageBuffer: buffer,
    imageDataUrl: encodeBufferDataUri(buffer)
  };
}

async function buildReceiptPng(receipt) {
  const { smallBlack, smallWhite, mediumBlack, mediumWhite, largeWhite } = await getFonts();
  const qrBuffer = await createQrCodeBuffer(
    `${config.webUrl}/student/login?phone=${encodeURIComponent(receipt.phone || "")}&password=12345678`,
    250
  );
  const receiptLogoPath = resolveReceiptLogoPath();
  const qrImage = await Jimp.read(qrBuffer);
  const logoImage = receiptLogoPath ? await Jimp.read(receiptLogoPath) : null;
  const paymentCaption = buildPaymentCaption(receipt);
  const paidDate = dayjs(receipt.paidAt);
  const amountText = formatMoney(receipt.amount);
  const methodText = String(receipt.method || "manual").toUpperCase();

  const canvas = await createSolidImage(1280, 853, 0xeef3fbff);
  const card = await createSolidImage(1228, 775, 0xffffffff);
  const hero = await createSolidImage(1228, 239, 0x124bcfff);
  const stripe = await createSolidImage(1228, 18, 0x25c75aff);
  const logoCard = await createSolidImage(372, 62, 0xffffffff);
  const amountCard = await createSolidImage(384, 146, 0x25c75aff);
  const qrCard = await createSolidImage(330, 388, 0xffffffff);
  const qrTop = await createSolidImage(330, 16, 0x25c75aff);
  const footer = await createSolidImage(1146, 108, 0xe5efffff);
  const okBadge = await createSolidImage(64, 64, 0x2454d5ff);
  const divider = await createSolidImage(2, 346, 0xe5edf8ff);
  const qrDivider = await createSolidImage(218, 2, 0xe3e9f4ff);

  canvas.composite(card, 26, 26);
  canvas.composite(hero, 26, 26);
  canvas.composite(stripe, 26, 243);
  canvas.composite(logoCard, 84, 144);
  canvas.composite(amountCard, 840, 79);
  canvas.composite(qrCard, 889, 294);
  canvas.composite(qrTop, 889, 294);
  canvas.composite(footer, 78, 716);
  canvas.composite(okBadge, 99, 738);
  canvas.composite(divider, 835, 308);
  canvas.composite(qrDivider, 942, 635);
  canvas.composite(qrImage, 930, 334);

  if (logoImage) {
    logoImage.contain({ w: 102, h: 36 });
    canvas.composite(logoImage, 98, 156);
  } else {
    const cubeLeft = await createSolidImage(18, 18, 0x69a9ffff);
    const cubeRight = await createSolidImage(18, 18, 0x25c75aff);
    const cubeBase = await createSolidImage(18, 18, 0x2f66f0ff);
    canvas.composite(cubeLeft, 102, 164);
    canvas.composite(cubeRight, 118, 172);
    canvas.composite(cubeBase, 102, 180);
  }

  canvas.print({ font: largeWhite, x: 84, y: 58, text: "TO'LOV QABUL QILINDI" });
  canvas.print({ font: mediumBlack, x: 182, y: 152, text: "ILM NEST", maxWidth: 220 });
  canvas.print({ font: mediumBlack, x: 340, y: 152, text: "PAY", maxWidth: 72 });
  canvas.print({ font: smallWhite, x: 84, y: 214, text: "ILM NEST Education | Oylik to'lov cheki" });

  canvas.print({ font: smallWhite, x: 886, y: 98, text: "QABUL QILINGAN SUMMA", maxWidth: 290 });
  canvas.print({ font: mediumWhite, x: 886, y: 142, text: amountText, maxWidth: 290 });

  const iconCards = [308, 389, 470, 551, 632, 713];
  for (const y of iconCards) {
    const iconCard = await createSolidImage(72, 72, 0xedf4ffff);
    canvas.composite(iconCard, 86, y);
  }

  const line = await createSolidImage(26, 6, 0x2f66f0ff);
  const stem = await createSolidImage(6, 26, 0x2f66f0ff);
  const dot = await createSolidImage(16, 16, 0x2f66f0ff);
  const drawMarker = (x, y, variant = "plus") => {
    canvas.composite(line, x + 23, y + 33);
    if (variant === "plus" || variant === "stem") {
      canvas.composite(stem, x + 33, y + 23);
    }
    if (variant === "dot") {
      canvas.composite(dot, x + 28, y + 28);
    }
  };
  drawMarker(86, 308, "plus");
  drawMarker(86, 389, "stem");
  drawMarker(86, 470, "dot");
  drawMarker(86, 551, "plus");
  drawMarker(86, 632, "stem");
  drawMarker(86, 713, "dot");

  const leftLabels = ["To'lovchi:", "Telefon:", "Kurs:", "Usul:", "Sana:", "Tranzaksiya ID:"];
  const leftValues = [
    receipt.fullName,
    receipt.phone || "-",
    receipt.courseTitle || "-",
    methodText,
    paidDate.format("DD.MM.YYYY"),
    String(receipt.id)
  ];
  const leftY = [318, 390, 462, 534, 606, 678];

  leftLabels.forEach((label, index) => {
    const valueX = index === 5 ? 458 : 344;
    const valueWidth = index === 5 ? 300 : 430;
    canvas.print({ font: mediumBlack, x: 174, y: leftY[index], text: label, maxWidth: 250 });
    canvas.print({ font: mediumBlack, x: valueX, y: leftY[index], text: leftValues[index], maxWidth: valueWidth });
  });

  canvas.print({ font: mediumBlack, x: 548, y: 606, text: "Vaqt:" });
  canvas.print({ font: mediumBlack, x: 648, y: 606, text: paidDate.format("HH:mm") });

  canvas.print({
    font: smallBlack,
    x: 958,
    y: 602,
    text: "Kabinetga tez kirish QR",
    maxWidth: 196
  });
  canvas.print({
    font: smallBlack,
    x: 947,
    y: 676,
    text: "Default parol: 12345678",
    maxWidth: 220
  });

  canvas.print({ font: mediumBlack, x: 205, y: 742, text: paymentCaption, maxWidth: 740 });
  canvas.print({
    font: smallBlack,
    x: 205,
    y: 786,
    text: "Chek avtomatik yaratildi. Telegram bot va kabinet ma'lumotlari bir-biriga bog'langan.",
    maxWidth: 820
  });

  canvas.print({
    font: mediumWhite,
    x: 108,
    y: 752,
    text: { text: "OK", alignmentX: HorizontalAlign.CENTER },
    maxWidth: 34
  });

  return canvas.getBuffer("image/png");
}

async function buildAlertPng({ title, subtitle, badge, tone = "warning", qrUrl = "" }) {
  const { smallBlack, mediumBlack, largeWhite } = await getFonts();
  const isSuccess = tone === "success";
  const image = await createSolidImage(1280, 720, 0xfaf7f2ff);
  const outer = await createSolidImage(1160, 620, isSuccess ? 0x0f766eff : 0xb45309ff);
  const panel = await createSolidImage(1100, 560, 0xffffffff);
  const stripe = await createSolidImage(1100, 190, isSuccess ? 0x14b8a6ff : 0xf97316ff);
  const info = await createSolidImage(980, 180, isSuccess ? 0xdffaf5ff : 0xffedd5ff);

  image.composite(outer, 60, 48);
  image.composite(panel, 90, 78);
  image.composite(stripe, 90, 78);
  image.composite(info, 150, 330);

  image.print({ font: largeWhite, x: 138, y: 114, text: title });
  image.print({ font: mediumBlack, x: 150, y: 358, text: subtitle, maxWidth: 900 });
  image.print({ font: mediumBlack, x: 150, y: 432, text: badge, maxWidth: 900 });
  image.print({ font: smallBlack, x: 152, y: 612, text: "ILM NEST bot ogohlantirishi" });

  if (qrUrl) {
    const qrBuffer = await createQrCodeBuffer(qrUrl, 210);
    const qrImage = await Jimp.read(qrBuffer);
    image.composite(qrImage, 904, 346);
  }

  return image.getBuffer("image/png");
}

export async function buildDebtReminderAsset(student) {
  const debtAmount = Math.max(0, Number(student.monthlyFee || 0) - Number(student.balance || 0));
  const qrUrl = getStudentAccessLinkByUserId(student.userId) || "";
  const imageBuffer = await buildAlertPng({
    title: "QARZDORLIK ESLATMASI",
    subtitle: `${student.fullName} uchun ${formatMoney(debtAmount)} to'lov kutilmoqda`,
    badge: buildDebtCaption(student),
    tone: "warning",
    qrUrl
  });

  return {
    caption: buildDebtCaption(student),
    imageBuffer,
    imageDataUrl: encodeBufferDataUri(imageBuffer)
  };
}

export async function buildUpcomingPaymentReminderAsset(student) {
  const amount = Math.max(0, Number(student.monthlyFee || 0));
  const dueDate = student.dueDate || student.lastPaymentDate || dayjs().format("YYYY-MM-DD");
  const qrUrl = student.userId ? getStudentAccessLinkByUserId(student.userId) || "" : "";
  const imageBuffer = await buildAlertPng({
    title: "TO'LOV ESLATMASI",
    subtitle: `${student.fullName} uchun ${formatMoney(amount)} oylik to'lov muddati yaqinlashdi`,
    badge: `${student.courseTitle || "Kurs"} | Muddat: ${dueDate}`,
    tone: "success",
    qrUrl
  });

  return {
    caption: `${student.fullName}, ${student.courseTitle || "kursingiz"} uchun oylik to'lov muddati ${dueDate} sanada tugaydi.`,
    imageBuffer,
    imageDataUrl: encodeBufferDataUri(imageBuffer)
  };
}

export async function buildTrialFinishedReminderAsset(student) {
  const amount = Math.max(0, Number(student.monthlyFee || 0) - Number(student.balance || 0));
  const qrUrl = student.userId ? getStudentAccessLinkByUserId(student.userId) || "" : "";
  const imageBuffer = await buildAlertPng({
    title: "SINOV MUDDATI TUGADI",
    subtitle: `${student.fullName} uchun sinov bosqichi yakunlandi`,
    badge: `${student.courseTitle || "Kurs"} | To'lov: ${formatMoney(amount)} | Muddat: ${student.paymentDueDate || dayjs().format("YYYY-MM-DD")}`,
    tone: "warning",
    qrUrl
  });

  return {
    caption: `${student.fullName}, sinov muddati tugadi. Endi ${formatMoney(amount)} oylik to'lov talab qilinadi.`,
    imageBuffer,
    imageDataUrl: encodeBufferDataUri(imageBuffer)
  };
}

export async function buildPaymentReceiptAsset(receipt) {
  const imageBuffer = await buildReceiptPng(receipt);
  return {
    caption: buildPaymentCaption(receipt),
    imageBuffer,
    imageDataUrl: encodeBufferDataUri(imageBuffer)
  };
}

function createNotification({ targetRole = null, targetUserId = null, type, title, message, metadata = null }) {
  db.prepare(`
    INSERT INTO notifications (target_role, target_user_id, type, title, message, metadata, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'unread', ?)
  `).run(
    targetRole,
    targetUserId,
    type,
    title,
    message,
    metadata ? JSON.stringify(metadata) : null,
    dayjs().format("YYYY-MM-DD HH:mm:ss")
  );
}

async function createNotificationAsync({ targetRole = null, targetUserId = null, type, title, message, metadata = null }) {
  await getSupabasePool().query(
    `
      INSERT INTO notifications (target_role, target_user_id, type, title, message, metadata, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'unread', $7)
    `,
    [
      targetRole,
      targetUserId,
      type,
      title,
      message,
      metadata ? JSON.stringify(metadata) : null,
      dayjs().format("YYYY-MM-DD HH:mm:ss")
    ]
  );
}

function addStudentHistory(studentId, actorUserId, action, title, details) {
  db.prepare(`
    INSERT INTO student_history (student_id, actor_user_id, action, title, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(studentId, actorUserId || null, action, title, details || null, dayjs().format("YYYY-MM-DD HH:mm:ss"));
}

async function addStudentHistoryAsync(studentId, actorUserId, action, title, details) {
  await getSupabasePool().query(
    `
      INSERT INTO student_history (student_id, actor_user_id, action, title, details, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [studentId, actorUserId || null, action, title, details || null, dayjs().format("YYYY-MM-DD HH:mm:ss")]
  );
}

function getTrialProgress(studentId, enrolledAt) {
  const row = db.prepare(`
    SELECT COUNT(*) as count
    FROM attendance
    WHERE student_id = ?
      AND status = 'present'
      AND date(lesson_date) >= date(?)
  `).get(studentId, enrolledAt || dayjs().format("YYYY-MM-DD"));
  return Number(row?.count || 0);
}

function getNthTrialLessonDate(studentId, enrolledAt, trialRequired) {
  const row = db.prepare(`
    SELECT lesson_date as lessonDate
    FROM attendance
    WHERE student_id = ?
      AND status = 'present'
      AND date(lesson_date) >= date(?)
    ORDER BY date(lesson_date) ASC
    LIMIT 1 OFFSET ?
  `).get(studentId, enrolledAt || dayjs().format("YYYY-MM-DD"), Math.max(0, Number(trialRequired || 3) - 1));
  return row?.lessonDate || null;
}

async function getNthTrialLessonDateAsync(studentId, enrolledAt, trialRequired) {
  const { rows } = await getSupabasePool().query(
    `
      SELECT lesson_date as "lessonDate"
      FROM attendance
      WHERE student_id = $1
        AND status = 'present'
        AND lesson_date >= $2::date
      ORDER BY lesson_date ASC
      OFFSET $3 LIMIT 1
    `,
    [studentId, enrolledAt || dayjs().format("YYYY-MM-DD"), Math.max(0, Number(trialRequired || 3) - 1)]
  );
  return rows[0]?.lessonDate || null;
}

function recalcStudentState(studentId) {
  const student = db.prepare(`
    SELECT
      s.id,
      s.balance,
      s.enrolled_at as enrolledAt,
      s.billing_start_date as billingStartDate,
      s.trial_required as trialRequired,
      c.monthly_fee as monthlyFee
    FROM students s
    LEFT JOIN courses c ON c.id = s.course_id
    WHERE s.id = ?
  `).get(studentId);

  if (!student) {
    return null;
  }

  const enrolledAt = student.enrolledAt || dayjs().format("YYYY-MM-DD");
  const trialRequired =
    student.trialRequired === null || student.trialRequired === undefined
      ? 3
      : Math.max(Number(student.trialRequired || 0), 0);
  const trialProgress = getTrialProgress(studentId, enrolledAt);
  let paymentDueDate =
    trialProgress >= trialRequired && trialRequired > 0
      ? getNthTrialLessonDate(studentId, enrolledAt, trialRequired)
      : null;

  let status = "trial";
  if (trialRequired === 0) {
    paymentDueDate = normalizeBillingStartDate(student.billingStartDate) || enrolledAt;
    status = Number(student.balance || 0) >= Number(student.monthlyFee || 0) ? "active" : "debtor";
  } else if (trialProgress >= trialRequired) {
    status = Number(student.balance || 0) >= Number(student.monthlyFee || 0) ? "active" : "debtor";
  }

  db.prepare(`
    UPDATE students
    SET status = ?, enrolled_at = ?, trial_required = ?, payment_due_date = ?
    WHERE id = ?
  `).run(status, enrolledAt, trialRequired, paymentDueDate, studentId);

  return { status, trialProgress, trialRequired, paymentDueDate, enrolledAt };
}

async function recalcStudentStateAsync(studentId) {
  const { rows } = await getSupabasePool().query(
    `
      SELECT
        s.id,
        s.balance,
        s.enrolled_at as "enrolledAt",
        s.billing_start_date as "billingStartDate",
        s.trial_required as "trialRequired",
        c.monthly_fee as "monthlyFee"
      FROM students s
      LEFT JOIN courses c ON c.id = s.course_id
      WHERE s.id = $1
      LIMIT 1
    `,
    [studentId]
  );
  const student = rows[0];

  if (!student) {
    return null;
  }

  const enrolledAt = student.enrolledAt || dayjs().format("YYYY-MM-DD");
  const trialRequired =
    student.trialRequired === null || student.trialRequired === undefined
      ? 3
      : Math.max(Number(student.trialRequired || 0), 0);
  const trialProgress = await getTrialProgressAsync(studentId, enrolledAt);
  let paymentDueDate =
    trialProgress >= trialRequired && trialRequired > 0
      ? await getNthTrialLessonDateAsync(studentId, enrolledAt, trialRequired)
      : null;

  let status = "trial";
  if (trialRequired === 0) {
    paymentDueDate = normalizeBillingStartDate(student.billingStartDate) || enrolledAt;
    status = Number(student.balance || 0) >= Number(student.monthlyFee || 0) ? "active" : "debtor";
  } else if (trialProgress >= trialRequired) {
    status = Number(student.balance || 0) >= Number(student.monthlyFee || 0) ? "active" : "debtor";
  }

  await getSupabasePool().query(
    `
      UPDATE students
      SET status = $1, enrolled_at = $2, trial_required = $3, payment_due_date = $4
      WHERE id = $5
    `,
    [status, enrolledAt, trialRequired, paymentDueDate, studentId]
  );

  return { status, trialProgress, trialRequired, paymentDueDate, enrolledAt };
}

function getStudentAuthRecordByStudentId(studentId) {
  return db.prepare(`
    SELECT id, student_id as studentId, phone, access_token as accessToken, password_hash as passwordHash
    FROM student_auth
    WHERE student_id = ?
  `).get(studentId);
}

function ensureStudentAuth(studentId, phone, passwordHash = null) {
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  const normalizedPhone = normalizePhone(phone);
  const existing = getStudentAuthRecordByStudentId(studentId);

  if (existing) {
    const nextAccessToken = existing.accessToken || generateAccessToken();
    db.prepare(`
      UPDATE student_auth
      SET phone = ?, access_token = ?, password_hash = COALESCE(?, password_hash), updated_at = ?
      WHERE student_id = ?
    `).run(
      normalizedPhone,
      nextAccessToken,
      passwordHash,
      now,
      studentId
    );

    return {
      ...existing,
      phone: normalizedPhone,
      accessToken: nextAccessToken,
      passwordHash: passwordHash || existing.passwordHash
    };
  }

  const accessToken = generateAccessToken();
  db.prepare(`
    INSERT INTO student_auth (student_id, phone, access_token, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(studentId, normalizedPhone, accessToken, passwordHash, now, now);

  return getStudentAuthRecordByStudentId(studentId);
}

export function getStudentAccessLinkByUserId(userId) {
  const row = db.prepare(`
    SELECT s.id as studentId, u.phone
    FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE s.user_id = ?
  `).get(userId);

  if (!row) {
    return null;
  }

  const auth = ensureStudentAuth(row.studentId, row.phone);
  return `${config.webUrl}/student/login?access=${auth.accessToken}`;
}

export async function getStudentAccessLinkByUserIdAsync(userId) {
  const { rows } = await getSupabasePool().query(
    `
      SELECT s.id as "studentId", u.phone
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  const auth = await ensureStudentAuthAsync(row.studentId, row.phone);
  return `${config.webUrl}/student/login?access=${auth.accessToken}`;
}

export function loginStudentByAccessToken(accessToken) {
  const auth = db.prepare(`
    SELECT sa.student_id as studentId, s.user_id as userId
    FROM student_auth sa
    JOIN students s ON s.id = sa.student_id
    WHERE sa.access_token = ?
    LIMIT 1
  `).get(accessToken);

  if (!auth) {
    throw new Error("Kirish tokeni topilmadi");
  }

  return getUserProfileLite(auth.userId);
}

export function getStudentByUserId(userId) {
  const row = db.prepare(`
    SELECT
      s.id,
      u.full_name as fullName,
      u.phone,
      u.telegram_id as telegramId,
      s.balance,
      s.status,
      s.enrolled_at as enrolledAt,
      s.billing_start_date as billingStartDate,
      s.trial_required as trialRequired,
      s.payment_due_date as paymentDueDate,
      s.last_payment_date as lastPaymentDate,
      s.is_archived as isArchived,
      c.id as courseId,
      c.title as courseTitle,
      c.monthly_fee as monthlyFee,
      COALESCE(s.group_schedule, c.schedule) as schedule,
      t.id as teacherId,
      t.full_name as teacherName,
      u.profile_image as profileImage
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN users t ON t.id = s.teacher_id
    WHERE s.user_id = ?
  `).get(userId);

  return mapStudentRow({ ...row, trialProgress: row ? getTrialProgress(row.id, row.enrolledAt) : 0 });
}

export async function getStudentByUserIdAsync(userId) {
  const { rows } = await getSupabasePool().query(
    `
      SELECT
        s.id,
        u.full_name as "fullName",
        u.phone,
        u.telegram_id as "telegramId",
        s.balance,
        s.status,
        s.enrolled_at as "enrolledAt",
        s.billing_start_date as "billingStartDate",
        s.trial_required as "trialRequired",
        s.payment_due_date as "paymentDueDate",
        s.last_payment_date as "lastPaymentDate",
        s.is_archived as "isArchived",
        c.id as "courseId",
        c.title as "courseTitle",
        c.monthly_fee as "monthlyFee",
        COALESCE(s.group_schedule, c.schedule) as schedule,
        t.id as "teacherId",
        t.full_name as "teacherName",
        u.profile_image as "profileImage"
      FROM students s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN courses c ON c.id = s.course_id
      LEFT JOIN users t ON t.id = s.teacher_id
      WHERE s.user_id = $1
      LIMIT 1
    `,
    [userId]
  );
  const row = rows[0];
  return row ? mapStudentRow({ ...row, trialProgress: await getTrialProgressAsync(row.id, row.enrolledAt) }) : null;
}

export function getStudentByPhone(phone) {
  const row = db.prepare(`
    SELECT
      s.id,
      u.full_name as fullName,
      u.phone,
      u.telegram_id as telegramId,
      s.balance,
      s.status,
      s.enrolled_at as enrolledAt,
      s.billing_start_date as billingStartDate,
      s.trial_required as trialRequired,
      s.payment_due_date as paymentDueDate,
      s.last_payment_date as lastPaymentDate,
      s.is_archived as isArchived,
      c.id as courseId,
      c.title as courseTitle,
      c.monthly_fee as monthlyFee,
      COALESCE(s.group_schedule, c.schedule) as schedule,
      t.id as teacherId,
      t.full_name as teacherName,
      s.user_id as userId,
      u.profile_image as profileImage
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN users t ON t.id = s.teacher_id
    WHERE u.phone = ?
  `).get(phone);

  return row ? { ...row, trialProgress: getTrialProgress(row.id, row.enrolledAt) } : null;
}

export function getStudentByTelegramId(telegramId) {
  const row = db.prepare(`
    SELECT
      s.id,
      u.full_name as fullName,
      u.phone,
      u.telegram_id as telegramId,
      s.balance,
      s.status,
      s.enrolled_at as enrolledAt,
      s.billing_start_date as billingStartDate,
      s.trial_required as trialRequired,
      s.payment_due_date as paymentDueDate,
      s.last_payment_date as lastPaymentDate,
      s.is_archived as isArchived,
      c.id as courseId,
      c.title as courseTitle,
      c.monthly_fee as monthlyFee,
      COALESCE(s.group_schedule, c.schedule) as schedule,
      t.id as teacherId,
      t.full_name as teacherName,
      s.user_id as userId,
      u.profile_image as profileImage
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN users t ON t.id = s.teacher_id
    WHERE u.telegram_id = ?
  `).get(String(telegramId));
  return mapStudentRow({ ...row, trialProgress: row ? getTrialProgress(row.id, row.enrolledAt) : 0 });
}

export function getStudentById(studentId) {
  const row = db.prepare(`
    SELECT
      s.id,
      u.full_name as fullName,
      u.phone,
      u.telegram_id as telegramId,
      s.balance,
      s.status,
      s.enrolled_at as enrolledAt,
      s.billing_start_date as billingStartDate,
      s.trial_required as trialRequired,
      s.payment_due_date as paymentDueDate,
      s.last_payment_date as lastPaymentDate,
      s.is_archived as isArchived,
      c.id as courseId,
      c.title as courseTitle,
      c.monthly_fee as monthlyFee,
      COALESCE(s.group_schedule, c.schedule) as schedule,
      t.id as teacherId,
      t.full_name as teacherName,
      s.user_id as userId,
      u.profile_image as profileImage
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN users t ON t.id = s.teacher_id
    WHERE s.id = ?
  `).get(studentId);

  return mapStudentRow({ ...row, trialProgress: row ? getTrialProgress(row.id, row.enrolledAt) : 0 });
}

export function listPaymentsByStudent(studentId) {
  return db.prepare(`
    SELECT id, amount, method, status, reason, created_at as createdAt
    FROM payments
    WHERE student_id = ?
    ORDER BY datetime(created_at) DESC
  `).all(studentId);
}

export function listAllPayments() {
  return db.prepare(`
    SELECT
      p.id,
      p.amount,
      p.method,
      p.status,
      p.reason,
      p.created_at as createdAt,
      staff.full_name as receivedBy,
      u.full_name as studentName,
      u.phone as studentPhone,
      c.title as courseTitle
    FROM payments p
    JOIN students s ON s.id = p.student_id
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN users staff ON staff.id = p.received_by_user_id
      ORDER BY datetime(p.created_at) DESC
  `).all();
}

export async function listAllPaymentsAsync() {
  const { rows } = await getSupabasePool().query(
    `
      SELECT
        p.id,
        p.amount,
        p.method,
        p.status,
        p.reason,
        p.created_at as "createdAt",
        staff.full_name as "receivedBy",
        u.full_name as "studentName",
        u.phone as "studentPhone",
        c.title as "courseTitle"
      FROM payments p
      JOIN students s ON s.id = p.student_id
      JOIN users u ON u.id = s.user_id
      LEFT JOIN courses c ON c.id = s.course_id
      LEFT JOIN users staff ON staff.id = p.received_by_user_id
      ORDER BY p.created_at DESC
    `
  );
  return rows.map((row) => ({ ...row, id: Number(row.id) }));
}

export function listStudents(filters = {}) {
  const values = [];
  let query = `
    SELECT
      s.id,
      u.full_name as fullName,
      u.phone,
      u.telegram_id as telegramId,
      s.balance,
      s.status,
      s.enrolled_at as enrolledAt,
      s.billing_start_date as billingStartDate,
      s.trial_required as trialRequired,
      s.payment_due_date as paymentDueDate,
      s.last_payment_date as lastPaymentDate,
      s.is_archived as isArchived,
      c.id as courseId,
      c.title as courseTitle,
      c.monthly_fee as monthlyFee,
      COALESCE(s.group_schedule, c.schedule) as schedule,
      t.id as teacherId,
      t.full_name as teacherName,
      u.profile_image as profileImage
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN users t ON t.id = s.teacher_id
    WHERE 1 = 1
  `;

  if (!filters.includeArchived) {
    query += ` AND s.is_archived = 0`;
  }

  if (filters.search) {
    query += ` AND (u.full_name LIKE ? OR u.phone LIKE ? OR c.title LIKE ?)`;
    values.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }

  if (filters.teacherId) {
    query += ` AND s.teacher_id = ?`;
    values.push(filters.teacherId);
  }

  if (filters.status === "active") {
    query += ` AND s.status = 'active'`;
  }

  if (filters.status === "debtor") {
    query += ` AND s.status = 'debtor'`;
  }

  if (filters.status === "trial") {
    query += ` AND s.status = 'trial'`;
  }

  query += ` ORDER BY u.full_name`;

  return db.prepare(query).all(...values).map((row) => mapStudentRow({ ...row, trialProgress: getTrialProgress(row.id, row.enrolledAt) }));
}

export async function listStudentsAsync(filters = {}) {
  const values = [];
  let query = `
    SELECT
      s.id,
      u.full_name as "fullName",
      u.phone,
      u.telegram_id as "telegramId",
      s.balance,
      s.status,
      s.enrolled_at as "enrolledAt",
      s.billing_start_date as "billingStartDate",
      s.trial_required as "trialRequired",
      s.payment_due_date as "paymentDueDate",
      s.last_payment_date as "lastPaymentDate",
      s.is_archived as "isArchived",
      c.id as "courseId",
      c.title as "courseTitle",
      c.monthly_fee as "monthlyFee",
      COALESCE(s.group_schedule, c.schedule) as schedule,
      t.id as "teacherId",
      t.full_name as "teacherName",
      u.profile_image as "profileImage"
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN users t ON t.id = s.teacher_id
    WHERE 1 = 1
  `;

  if (!filters.includeArchived) {
    query += ` AND s.is_archived = FALSE`;
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    values.push(`%${filters.search}%`);
    values.push(`%${filters.search}%`);
    query += ` AND (u.full_name ILIKE $${values.length - 2} OR u.phone ILIKE $${values.length - 1} OR c.title ILIKE $${values.length})`;
  }

  if (filters.teacherId) {
    values.push(filters.teacherId);
    query += ` AND s.teacher_id = $${values.length}`;
  }

  if (filters.status === "active" || filters.status === "debtor" || filters.status === "trial") {
    values.push(filters.status);
    query += ` AND s.status = $${values.length}`;
  }

  query += ` ORDER BY u.full_name`;

  const { rows } = await getSupabasePool().query(query, values);
  const mapped = [];
  for (const row of rows) {
    mapped.push(mapStudentRow({ ...row, trialProgress: await getTrialProgressAsync(row.id, row.enrolledAt) }));
  }
  return mapped;
}

export function listTeachers() {
  const teachers = db.prepare(`
    SELECT id, full_name as fullName, username, phone, monthly_salary as monthlySalary, profile_image as profileImage
    FROM users
    WHERE role = 'teacher'
    ORDER BY full_name
  `).all();

  const assignmentRows = db.prepare(`
    SELECT teacher_id as teacherId, course_id as courseId
    FROM teacher_course_assignments
  `).all();

  return teachers.map((teacher) => ({
    ...teacher,
    monthlySalary: Number(teacher.monthlySalary || 0),
    courseIds: assignmentRows
      .filter((item) => Number(item.teacherId) === Number(teacher.id))
      .map((item) => Number(item.courseId))
  }));
}

function teacherCanTeachCourse(teacherId, courseId) {
  const row = db.prepare(`
    SELECT 1
    FROM teacher_course_assignments
    WHERE teacher_id = ? AND course_id = ?
    LIMIT 1
  `).get(teacherId, courseId);
  return Boolean(row);
}

async function teacherCanTeachCourseAsync(teacherId, courseId) {
  const { rows } = await getSupabasePool().query(
    `
      SELECT 1
      FROM teacher_course_assignments
      WHERE teacher_id = $1 AND course_id = $2
      LIMIT 1
    `,
    [teacherId, courseId]
  );
  return Boolean(rows[0]);
}

function syncTeacherCourses(teacherId, courseIds = []) {
  db.prepare(`DELETE FROM teacher_course_assignments WHERE teacher_id = ?`).run(teacherId);
  const insert = db.prepare(`
    INSERT INTO teacher_course_assignments (teacher_id, course_id, created_at)
    VALUES (?, ?, ?)
  `);
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  for (const courseId of courseIds) {
    insert.run(teacherId, Number(courseId), now);
  }
}

async function syncTeacherCoursesAsync(teacherId, courseIds = []) {
  const pool = getSupabasePool();
  await pool.query(`DELETE FROM teacher_course_assignments WHERE teacher_id = $1`, [teacherId]);
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  for (const courseId of courseIds) {
    await pool.query(
      `
        INSERT INTO teacher_course_assignments (teacher_id, course_id, created_at)
        VALUES ($1, $2, $3)
      `,
      [teacherId, Number(courseId), now]
    );
  }
}

function getTeacherPayrollSummary() {
  const totals = db.prepare(`
    SELECT
      COUNT(*) as teachersCount,
      COALESCE(SUM(monthly_salary), 0) as monthlyPayroll
    FROM users
    WHERE role = 'teacher'
  `).get();

  return {
    teachersCount: Number(totals?.teachersCount || 0),
    monthlyPayroll: Number(totals?.monthlyPayroll || 0)
  };
}

async function getTeacherPayrollSummaryAsync() {
  const { rows } = await getSupabasePool().query(
    `
      SELECT
        COUNT(*)::int as "teachersCount",
        COALESCE(SUM(monthly_salary), 0) as "monthlyPayroll"
      FROM users
      WHERE role = 'teacher'
    `
  );

  const totals = rows[0] || {};
  return {
    teachersCount: Number(totals.teachersCount || 0),
    monthlyPayroll: Number(totals.monthlyPayroll || 0)
  };
}

function getOperatingExpenseSummary() {
  const rows = db.prepare(`
    SELECT key, value
    FROM settings
    WHERE key IN ('rent_expense', 'advertising_expense', 'internet_expense', 'admin_salary_expense')
  `).all();

  const values = Object.fromEntries(rows.map((item) => [item.key, Number(item.value || 0)]));
  const rent = Number(values.rent_expense || 0);
  const advertising = Number(values.advertising_expense || 0);
  const internet = Number(values.internet_expense || 0);
  const adminSalary = Number(values.admin_salary_expense || 0);

  return {
    rent,
    advertising,
    internet,
    adminSalary,
    total: rent + advertising + internet + adminSalary
  };
}

async function getOperatingExpenseSummaryAsync() {
  const { rows } = await getSupabasePool().query(
    `
      SELECT key, value
      FROM settings
      WHERE key IN ('rent_expense', 'advertising_expense', 'internet_expense', 'admin_salary_expense')
    `
  );

  const values = Object.fromEntries(rows.map((item) => [item.key, Number(item.value || 0)]));
  const rent = Number(values.rent_expense || 0);
  const advertising = Number(values.advertising_expense || 0);
  const internet = Number(values.internet_expense || 0);
  const adminSalary = Number(values.admin_salary_expense || 0);

  return {
    rent,
    advertising,
    internet,
    adminSalary,
    total: rent + advertising + internet + adminSalary
  };
}

export function listCourses() {
  return db.prepare(`
    SELECT c.id, c.branch_id as branchId, b.name as branchName, c.title, c.monthly_fee as monthlyFee, c.schedule, c.is_active as isActive
    FROM courses c
    LEFT JOIN branches b ON b.id = c.branch_id
    WHERE c.is_active = 1
    ORDER BY c.title
  `).all().map((item) => ({ ...item, isActive: Boolean(item.isActive) }));
}

export function listAllCourses() {
  return db.prepare(`
    SELECT c.id, c.branch_id as branchId, b.name as branchName, c.title, c.monthly_fee as monthlyFee, c.schedule, c.is_active as isActive, c.created_at as createdAt
    FROM courses c
    LEFT JOIN branches b ON b.id = c.branch_id
    ORDER BY c.title
  `).all().map((item) => ({ ...item, isActive: Boolean(item.isActive) }));
}

export function listBranches() {
  return db.prepare(`
    SELECT id, name, address
    FROM branches
    ORDER BY name
  `).all();
}

async function parseImportedStudentRowsFromFile({ fileName, fileDataBase64 }) {
  if (!fileName || !fileDataBase64) {
    throw new Error("Import faylini yuboring");
  }

  const extension = path.extname(fileName).toLowerCase();
  const buffer = Buffer.from(fileDataBase64, "base64");

  if (extension === ".json") {
    const payload = JSON.parse(buffer.toString("utf8"));
    return Array.isArray(payload) ? payload : payload.rows || [];
  }

  if (extension === ".csv") {
    const lines = buffer
      .toString("utf8")
      .split(/\r?\n/)
      .filter(line => line.trim());

    if (!lines.length) {
      return [];
    }

    const headers = parseCsvLine(lines[0]);
    return lines.slice(1).map(line => {
      const values = parseCsvLine(line);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ?? "";
      });
      return row;
    });
  }

  if (extension === ".xlsx" || extension === ".xlsm") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return [];
    }

    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values
      .slice(1)
      .map(value => String(value || "").trim());

    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }
      const values = row.values.slice(1);
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index] ?? "";
      });
      rows.push(record);
    });
    return rows;
  }

  throw new Error("Faqat .xlsx, .csv yoki .json fayl yuklang");
}

function normalizeImportedStudentDraft(rawRow, index) {
  const draft = {
    rowNumber: index + 2,
    fullName: "",
    phone: "",
    courseTitle: "",
    teacherName: "",
    status: "active",
    enrolledAt: null,
    billingStartDate: null,
    balance: 0,
    studyMonth: null,
    note: ""
  };

  Object.entries(rawRow || {}).forEach(([header, value]) => {
    const field = resolveImportField(header);
    if (!field) {
      return;
    }
    draft[field] = value;
  });

  draft.fullName = String(draft.fullName || "").trim();
  draft.phone = normalizePhone(draft.phone || "");
  draft.courseTitle = String(draft.courseTitle || "").trim();
  draft.teacherName = String(draft.teacherName || "").trim();
  draft.status = normalizeImportedStatus(draft.status) || "active";
  draft.enrolledAt = normalizeImportedDate(draft.enrolledAt);
  draft.billingStartDate = normalizeImportedDate(draft.billingStartDate);
  draft.balance = normalizeImportedNumber(draft.balance);
  draft.studyMonth =
    draft.studyMonth === null || draft.studyMonth === undefined || draft.studyMonth === ""
      ? null
      : Math.max(1, Number(draft.studyMonth || 1));
  draft.note = String(draft.note || "").trim();

  if (!draft.enrolledAt && draft.studyMonth) {
    draft.enrolledAt = dayjs().subtract(Math.max(0, Number(draft.studyMonth) - 1), "month").format("YYYY-MM-DD");
  }

  if (!draft.billingStartDate && draft.enrolledAt) {
    draft.billingStartDate = draft.enrolledAt;
  }

  return draft;
}

function resolveImportedStudentDraft(draft, context) {
  const errors = [];
  const warnings = [];

  if (!draft.fullName) {
    errors.push("F.I.SH kiritilmagan");
  }

  if (!draft.phone) {
    errors.push("Telefon raqami kiritilmagan");
  }

  if (!draft.courseTitle) {
    errors.push("Kurs nomi kiritilmagan");
  }

  if (!draft.teacherName) {
    errors.push("O'qituvchi kiritilmagan");
  }

  const course = context.courses.find(
    item => normalizeComparableText(item.title) === normalizeComparableText(draft.courseTitle)
  );
  if (!course && draft.courseTitle) {
    errors.push("Kurs topilmadi");
  }

  const teacher = context.teachers.find(
    item => normalizeComparableText(item.fullName) === normalizeComparableText(draft.teacherName)
  );
  if (!teacher && draft.teacherName) {
    errors.push("O'qituvchi topilmadi");
  }

  if (teacher && course && !teacherCanTeachCourse(teacher.id, course.id)) {
    errors.push("Tanlangan o'qituvchi bu kursga biriktirilmagan");
  }

  if (draft.phone && context.existingPhones.has(draft.phone)) {
    errors.push("Bu telefon bilan student allaqachon mavjud");
  }

  if (draft.phone && context.filePhones.has(draft.phone)) {
    errors.push("Import faylida telefon takrorlangan");
  } else if (draft.phone) {
    context.filePhones.add(draft.phone);
  }

  if (!draft.enrolledAt) {
    warnings.push("Boshlanish sana topilmadi, bugungi sana olinadi");
  }

  if (draft.status === "active" && Number(draft.balance || 0) <= 0) {
    warnings.push("Balans 0 bo'lsa tizim studentni qarzdor sifatida ko'rsatishi mumkin");
  }

  return {
    ...draft,
    courseId: course?.id || null,
    teacherId: teacher?.id || null,
    schedule: draft.note || course?.schedule || "",
    errors,
    warnings,
    ready: errors.length === 0
  };
}

export async function previewStudentImport({ fileName, fileDataBase64 }) {
  const rawRows = await parseImportedStudentRowsFromFile({ fileName, fileDataBase64 });
  const courses = listAllCourses();
  const teachers = listTeachers();
  const existingPhones = new Set(
    db.prepare(`
      SELECT phone FROM users
      WHERE role = 'student' AND phone IS NOT NULL AND TRIM(phone) != ''
    `).all().map(item => normalizePhone(item.phone))
  );

  const context = {
    courses,
    teachers,
    existingPhones,
    filePhones: new Set()
  };

  const rows = rawRows.map((row, index) =>
    resolveImportedStudentDraft(normalizeImportedStudentDraft(row, index), context)
  );

  return {
    summary: {
      totalRows: rows.length,
      readyRows: rows.filter(item => item.ready).length,
      errorRows: rows.filter(item => item.errors.length).length,
      warningRows: rows.filter(item => item.warnings.length).length
    },
    rows
  };
}

export function addStudent(payload, actorUserId = null) {
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  const enrolledDate = normalizeImportedDate(payload.enrolledAt) || dayjs().format("YYYY-MM-DD");
  const defaultPasswordHash = bcrypt.hashSync("12345678", 10);
  const createUser = db.prepare(`
    INSERT INTO users (full_name, username, password_hash, phone, monthly_salary, role, telegram_id, profile_image, created_at)
    VALUES (?, NULL, NULL, ?, 0, 'student', NULL, NULL, ?)
  `);
  const userId = createUser.run(payload.fullName, payload.phone, now).lastInsertRowid;

  const initialBalance = Number(payload.balance || 0);
  const requestedStatus = String(payload.status || "active").toLowerCase();
  const isActiveFlow = requestedStatus === "active" || requestedStatus === "debtor" || requestedStatus === "archived";
  const status = isActiveFlow ? "active" : "trial";
  const trialRequired = payload.trialRequired !== undefined && payload.trialRequired !== null
    ? Number(payload.trialRequired)
    : (isActiveFlow ? 0 : 3);
  const billingStartDate = normalizeBillingStartDate(payload.billingStartDate);
  const groupSchedule = payload.schedule || null;

  if (!teacherCanTeachCourse(payload.teacherId, payload.courseId)) {
    throw new Error("Tanlangan o'qituvchi bu kursga biriktirilmagan");
  }

  const studentId = db.prepare(`
    INSERT INTO students (user_id, course_id, teacher_id, balance, status, enrolled_at, billing_start_date, trial_required, payment_due_date, last_payment_date, group_schedule, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    payload.courseId,
    payload.teacherId,
    initialBalance,
    status,
    enrolledDate,
    billingStartDate,
    trialRequired,
    isActiveFlow ? billingStartDate : null,
    null,
    groupSchedule,
    now
  ).lastInsertRowid;

  const auth = ensureStudentAuth(studentId, payload.phone, defaultPasswordHash);
  db.prepare(`UPDATE students SET is_registered = 1 WHERE id = ?`).run(studentId);
  recalcStudentState(studentId);
  if (requestedStatus === "debtor") {
    db.prepare(`UPDATE students SET status = 'debtor', payment_due_date = COALESCE(payment_due_date, ?) WHERE id = ?`).run(
      billingStartDate || enrolledDate,
      studentId
    );
  }
  if (requestedStatus === "archived") {
    db.prepare(`UPDATE students SET is_archived = 1, archived_at = ?, status = 'archived' WHERE id = ?`).run(now, studentId);
  }
  addStudentHistory(
    studentId,
    actorUserId,
    payload.imported ? "imported" : "created",
    payload.imported ? "Eski student import qilindi" : "Student yaratildi",
    payload.imported
      ? `${payload.fullName} import orqali tizimga qo'shildi`
      : isActiveFlow
        ? `${payload.fullName} tizimga faol student sifatida qo'shildi`
        : `${payload.fullName} tizimga qo'shildi. Sinov muddati 3 kun.`
  );
  if (!payload.skipDirectorNotification) {
    createNotification({
      targetRole: "director",
      type: payload.imported ? "student_imported" : "student_created",
      title: payload.imported ? "Eski o'quvchi import qilindi" : "Yangi o'quvchi qo'shildi",
      message: `${payload.fullName} ro'yxatga qo'shildi`
    });
  }

  return {
    studentId,
    phone: normalizePhone(payload.phone),
    defaultPassword: "12345678",
    accessToken: auth.accessToken,
    loginUrl: `${config.webUrl}/student/login?access=${auth.accessToken}`
  };
}

export function updateStudent(studentId, payload, actorUserId = null) {
  const before = db.prepare(`
    SELECT
      s.id,
      u.full_name as fullName,
      s.course_id as courseId,
      s.teacher_id as teacherId,
      s.is_archived as isArchived
    FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
  `).get(studentId);

  const course = db.prepare(`
    SELECT monthly_fee as monthlyFee
    FROM courses
    WHERE id = ?
  `).get(payload.courseId);

  const nextBalance = Number(payload.balance || 0);
  const nextBillingStartDate = normalizeBillingStartDate(payload.billingStartDate);
  const nextTrialRequired = payload.status === "active" ? 0 : 3;
  const nextGroupSchedule = payload.schedule || null;

  if (!teacherCanTeachCourse(payload.teacherId, payload.courseId)) {
    throw new Error("Tanlangan o'qituvchi bu kursga biriktirilmagan");
  }

  db.prepare(`
    UPDATE users
    SET full_name = ?, phone = ?
    WHERE id = (SELECT user_id FROM students WHERE id = ?)
  `).run(payload.fullName, payload.phone, studentId);

  ensureStudentAuth(studentId, payload.phone);

  db.prepare(`
    UPDATE students
    SET
      course_id = ?,
      teacher_id = ?,
      balance = ?,
      trial_required = ?,
      billing_start_date = ?,
      group_schedule = ?,
      payment_due_date = CASE WHEN ? = 0 THEN ? ELSE payment_due_date END,
      last_payment_date = COALESCE(last_payment_date, ?)
    WHERE id = ?
  `).run(
    payload.courseId,
    payload.teacherId,
    nextBalance,
    nextTrialRequired,
    nextBillingStartDate,
    nextGroupSchedule,
    nextTrialRequired,
    nextBillingStartDate,
    dayjs().format("YYYY-MM-DD"),
    studentId
  );

  recalcStudentState(studentId);

  if (before) {
    if (before.courseId !== payload.courseId) {
      addStudentHistory(studentId, actorUserId, "course_changed", "Kurs almashtirildi", `${before.fullName} yangi kursga o'tkazildi`);
    }
    if (before.teacherId !== payload.teacherId) {
      addStudentHistory(studentId, actorUserId, "teacher_changed", "O'qituvchi almashtirildi", `${before.fullName} uchun o'qituvchi yangilandi`);
    }
    addStudentHistory(studentId, actorUserId, "updated", "Student yangilandi", `${before.fullName} ma'lumotlari tahrirlandi`);
  }
}

export function archiveStudent(studentId, actorUserId = null) {
  const student = db.prepare(`
    SELECT s.user_id as userId, u.full_name as fullName
    FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
  `).get(studentId);

  if (!student) {
    return false;
  }

  db.prepare(`
    UPDATE students
    SET is_archived = 1, archived_at = ?
    WHERE id = ?
  `).run(dayjs().format("YYYY-MM-DD HH:mm:ss"), studentId);

  addStudentHistory(studentId, actorUserId, "archived", "Student arxivlandi", `${student.fullName} arxivga o'tkazildi`);
  return true;
}

export function deleteStudent(studentId) {
  const student = db.prepare(`
    SELECT s.user_id as userId, u.full_name as fullName
    FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
  `).get(studentId);

  if (!student) {
    return false;
  }

  const removeStudent = db.transaction(() => {
    db.prepare(`DELETE FROM payments WHERE student_id = ?`).run(studentId);
    db.prepare(`DELETE FROM attendance WHERE student_id = ?`).run(studentId);
    db.prepare(`DELETE FROM telegram_links WHERE student_id = ?`).run(studentId);
    db.prepare(`DELETE FROM student_history WHERE student_id = ?`).run(studentId);
    db.prepare(`DELETE FROM student_auth WHERE student_id = ?`).run(studentId);
    db.prepare(`DELETE FROM qr_tokens WHERE student_id = ?`).run(studentId);
    db.prepare(`DELETE FROM reminder_dispatches WHERE student_id = ?`).run(studentId);
    db.prepare(`DELETE FROM notifications WHERE target_user_id = ?`).run(student.userId);
    db.prepare(`DELETE FROM students WHERE id = ?`).run(studentId);
    db.prepare(`DELETE FROM users WHERE id = ?`).run(student.userId);
  });

  removeStudent();
  return true;
}

export async function addStudentAsync(payload, actorUserId = null) {
  const pool = getSupabasePool();
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  const enrolledDate = normalizeImportedDate(payload.enrolledAt) || dayjs().format("YYYY-MM-DD");
  const defaultPasswordHash = bcrypt.hashSync("12345678", 10);
  const initialBalance = Number(payload.balance || 0);
  const requestedStatus = String(payload.status || "active").toLowerCase();
  const isActiveFlow = requestedStatus === "active" || requestedStatus === "debtor" || requestedStatus === "archived";
  const status = isActiveFlow ? "active" : "trial";
  const trialRequired = payload.trialRequired !== undefined && payload.trialRequired !== null
    ? Number(payload.trialRequired)
    : (isActiveFlow ? 0 : 3);
  const billingStartDate = normalizeBillingStartDate(payload.billingStartDate);
  const groupSchedule = payload.schedule || null;

  if (!(await teacherCanTeachCourseAsync(payload.teacherId, payload.courseId))) {
    throw new Error("Tanlangan o'qituvchi bu kursga biriktirilmagan");
  }

  const userResult = await pool.query(
    `
      INSERT INTO users (full_name, username, password_hash, phone, monthly_salary, role, telegram_id, profile_image, created_at)
      VALUES ($1, NULL, NULL, $2, 0, 'student', NULL, NULL, $3)
      RETURNING id
    `,
    [payload.fullName, payload.phone, now]
  );
  const userId = Number(userResult.rows[0].id);

  const studentResult = await pool.query(
    `
      INSERT INTO students (user_id, course_id, teacher_id, balance, status, enrolled_at, billing_start_date, trial_required, payment_due_date, last_payment_date, group_schedule, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, $10, $11)
      RETURNING id
    `,
    [
      userId,
      payload.courseId,
      payload.teacherId,
      initialBalance,
      status,
      enrolledDate,
      billingStartDate,
      trialRequired,
      isActiveFlow ? billingStartDate : null,
      groupSchedule,
      now
    ]
  );
  const studentId = Number(studentResult.rows[0].id);

  const auth = await ensureStudentAuthAsync(studentId, payload.phone, defaultPasswordHash);
  await pool.query(`UPDATE students SET is_registered = TRUE WHERE id = $1`, [studentId]);
  await recalcStudentStateAsync(studentId);

  if (requestedStatus === "debtor") {
    await pool.query(
      `UPDATE students SET status = 'debtor', payment_due_date = COALESCE(payment_due_date, $1) WHERE id = $2`,
      [billingStartDate || enrolledDate, studentId]
    );
  }
  if (requestedStatus === "archived") {
    await pool.query(`UPDATE students SET is_archived = TRUE, archived_at = $1, status = 'archived' WHERE id = $2`, [now, studentId]);
  }

  await addStudentHistoryAsync(
    studentId,
    actorUserId,
    payload.imported ? "imported" : "created",
    payload.imported ? "Eski student import qilindi" : "Student yaratildi",
    payload.imported
      ? `${payload.fullName} import orqali tizimga qo'shildi`
      : isActiveFlow
        ? `${payload.fullName} tizimga faol student sifatida qo'shildi`
        : `${payload.fullName} tizimga qo'shildi. Sinov muddati 3 kun.`
  );

  if (!payload.skipDirectorNotification) {
    await createNotificationAsync({
      targetRole: "director",
      type: payload.imported ? "student_imported" : "student_created",
      title: payload.imported ? "Eski o'quvchi import qilindi" : "Yangi o'quvchi qo'shildi",
      message: `${payload.fullName} ro'yxatga qo'shildi`
    });
  }

  return {
    studentId,
    phone: normalizePhone(payload.phone),
    defaultPassword: "12345678",
    accessToken: auth.accessToken,
    loginUrl: `${config.webUrl}/student/login?access=${auth.accessToken}`
  };
}

export async function updateStudentAsync(studentId, payload, actorUserId = null) {
  const pool = getSupabasePool();
  const beforeResult = await pool.query(
    `
      SELECT s.id, u.full_name as "fullName", s.course_id as "courseId", s.teacher_id as "teacherId", s.is_archived as "isArchived"
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = $1
      LIMIT 1
    `,
    [studentId]
  );
  const before = beforeResult.rows[0];

  const nextBalance = Number(payload.balance || 0);
  const nextBillingStartDate = normalizeBillingStartDate(payload.billingStartDate);
  const nextTrialRequired = payload.status === "active" ? 0 : 3;
  const nextGroupSchedule = payload.schedule || null;

  if (!(await teacherCanTeachCourseAsync(payload.teacherId, payload.courseId))) {
    throw new Error("Tanlangan o'qituvchi bu kursga biriktirilmagan");
  }

  await pool.query(
    `
      UPDATE users
      SET full_name = $1, phone = $2
      WHERE id = (SELECT user_id FROM students WHERE id = $3)
    `,
    [payload.fullName, payload.phone, studentId]
  );

  await ensureStudentAuthAsync(studentId, payload.phone);

  await pool.query(
    `
      UPDATE students
      SET
        course_id = $1,
        teacher_id = $2,
        balance = $3,
        trial_required = $4,
        billing_start_date = $5,
        group_schedule = $6,
        payment_due_date = CASE WHEN $7 = 0 THEN $8 ELSE payment_due_date END,
        last_payment_date = COALESCE(last_payment_date, $9)
      WHERE id = $10
    `,
    [
      payload.courseId,
      payload.teacherId,
      nextBalance,
      nextTrialRequired,
      nextBillingStartDate,
      nextGroupSchedule,
      nextTrialRequired,
      nextBillingStartDate,
      dayjs().format("YYYY-MM-DD"),
      studentId
    ]
  );

  await recalcStudentStateAsync(studentId);

  if (before) {
    if (Number(before.courseId) !== Number(payload.courseId)) {
      await addStudentHistoryAsync(studentId, actorUserId, "course_changed", "Kurs almashtirildi", `${before.fullName} yangi kursga o'tkazildi`);
    }
    if (Number(before.teacherId) !== Number(payload.teacherId)) {
      await addStudentHistoryAsync(studentId, actorUserId, "teacher_changed", "O'qituvchi almashtirildi", `${before.fullName} uchun o'qituvchi yangilandi`);
    }
    await addStudentHistoryAsync(studentId, actorUserId, "updated", "Student yangilandi", `${before.fullName} ma'lumotlari tahrirlandi`);
  }
}

export async function archiveStudentAsync(studentId, actorUserId = null) {
  const pool = getSupabasePool();
  const studentResult = await pool.query(
    `
      SELECT s.user_id as "userId", u.full_name as "fullName"
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = $1
      LIMIT 1
    `,
    [studentId]
  );
  const student = studentResult.rows[0];

  if (!student) {
    return false;
  }

  await pool.query(`UPDATE students SET is_archived = TRUE, archived_at = $1 WHERE id = $2`, [dayjs().format("YYYY-MM-DD HH:mm:ss"), studentId]);
  await addStudentHistoryAsync(studentId, actorUserId, "archived", "Student arxivlandi", `${student.fullName} arxivga o'tkazildi`);
  return true;
}

export async function deleteStudentAsync(studentId) {
  const pool = getSupabasePool();
  const studentResult = await pool.query(
    `
      SELECT s.user_id as "userId", u.full_name as "fullName"
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = $1
      LIMIT 1
    `,
    [studentId]
  );
  const student = studentResult.rows[0];

  if (!student) {
    return false;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM notifications WHERE target_user_id = $1`, [student.userId]);
    await client.query(`DELETE FROM students WHERE id = $1`, [studentId]);
    await client.query(`DELETE FROM users WHERE id = $1`, [student.userId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return true;
}

export function recordPayment(studentId, amount, method, status = "paid", externalId = null, actorUserId = null, reason = null) {
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");

  const student = db.prepare(`
    SELECT s.id, s.balance, c.monthly_fee as monthlyFee
    FROM students s
    LEFT JOIN courses c ON c.id = s.course_id
    WHERE s.id = ?
  `).get(studentId);

  if (!student) {
    throw new Error("Student topilmadi");
  }

  const normalizedAmount = Number(amount || 0);
  const normalizedReason = String(reason || "").trim();
  const monthlyFee = Number(student.monthlyFee || 0);

  if (normalizedAmount <= 0) {
    throw new Error("To'lov summasini kiriting");
  }

  if (monthlyFee > 0 && normalizedAmount < monthlyFee && !normalizedReason) {
    throw new Error(
      `Minimal to'lov ${monthlyFee.toLocaleString("ru-RU")} UZS. Kamroq summa uchun sabab yozing.`
    );
  }

  const paymentId = db.prepare(`
    INSERT INTO payments (student_id, amount, method, status, external_id, received_by_user_id, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    studentId,
    normalizedAmount,
    method,
    status,
    externalId,
    actorUserId || null,
    normalizedReason || null,
    now
  ).lastInsertRowid;

  const newBalance = Number(student.balance) + normalizedAmount;

  db.prepare(`
    UPDATE students
    SET balance = ?, last_payment_date = ?
    WHERE id = ?
  `).run(
    newBalance,
    dayjs().format("YYYY-MM-DD"),
    studentId
  );
  recalcStudentState(studentId);

  const summary = db.prepare(`
    SELECT u.full_name as fullName, u.phone, c.title as courseTitle
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    WHERE s.id = ?
  `).get(studentId);

  addStudentHistory(
    studentId,
    actorUserId,
    "payment_recorded",
    "To'lov qabul qilindi",
    `${normalizedAmount.toLocaleString("ru-RU")} UZS / ${method}${normalizedReason ? ` / Sabab: ${normalizedReason}` : ""}`
  );
  createNotification({
    targetRole: "director",
    type: "payment",
    title: "Yangi to'lov qabul qilindi",
    message: `${summary.fullName} - ${summary.courseTitle} uchun ${normalizedAmount.toLocaleString("ru-RU")} UZS`
  });
  const studentUser = db.prepare(`SELECT user_id as userId FROM students WHERE id = ?`).get(studentId);
  if (studentUser?.userId) {
    createNotification({
      targetUserId: studentUser.userId,
      type: "payment_received",
      title: "To'lov qabul qilindi",
      message: `${normalizedAmount.toLocaleString("ru-RU")} UZS to'lovingiz tizimga tushdi`
    });
  }

  const receipt = {
    id: paymentId,
    studentId,
    fullName: summary.fullName,
    phone: summary.phone,
    courseTitle: summary.courseTitle,
    amount: normalizedAmount,
    method,
    paidAt: now,
    reason: normalizedReason || null
  };

  return {
    ...receipt,
    receiptCaption: buildPaymentCaption(receipt)
  };
}

export async function recordPaymentAsync(studentId, amount, method, status = "paid", externalId = null, actorUserId = null, reason = null) {
  const pool = getSupabasePool();
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");

  const studentResult = await pool.query(
    `
      SELECT s.id, s.balance, c.monthly_fee as "monthlyFee"
      FROM students s
      LEFT JOIN courses c ON c.id = s.course_id
      WHERE s.id = $1
      LIMIT 1
    `,
    [studentId]
  );
  const student = studentResult.rows[0];

  if (!student) {
    throw new Error("Student topilmadi");
  }

  const normalizedAmount = Number(amount || 0);
  const normalizedReason = String(reason || "").trim();
  const monthlyFee = Number(student.monthlyFee || 0);

  if (normalizedAmount <= 0) {
    throw new Error("To'lov summasini kiriting");
  }

  if (monthlyFee > 0 && normalizedAmount < monthlyFee && !normalizedReason) {
    throw new Error(`Minimal to'lov ${monthlyFee.toLocaleString("ru-RU")} UZS. Kamroq summa uchun sabab yozing.`);
  }

  const paymentResult = await pool.query(
    `
      INSERT INTO payments (student_id, amount, method, status, external_id, received_by_user_id, reason, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `,
    [studentId, normalizedAmount, method, status, externalId, actorUserId || null, normalizedReason || null, now]
  );
  const paymentId = Number(paymentResult.rows[0].id);

  const newBalance = Number(student.balance) + normalizedAmount;
  await pool.query(
    `
      UPDATE students
      SET balance = $1, last_payment_date = $2
      WHERE id = $3
    `,
    [newBalance, dayjs().format("YYYY-MM-DD"), studentId]
  );
  await recalcStudentStateAsync(studentId);

  const summaryResult = await pool.query(
    `
      SELECT s.user_id as "userId", u.full_name as "fullName", u.phone, c.title as "courseTitle"
      FROM students s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN courses c ON c.id = s.course_id
      WHERE s.id = $1
      LIMIT 1
    `,
    [studentId]
  );
  const summary = summaryResult.rows[0];

  await addStudentHistoryAsync(
    studentId,
    actorUserId,
    "payment_recorded",
    "To'lov qabul qilindi",
    `${normalizedAmount.toLocaleString("ru-RU")} UZS / ${method}${normalizedReason ? ` / Sabab: ${normalizedReason}` : ""}`
  );
  await createNotificationAsync({
    targetRole: "director",
    type: "payment",
    title: "Yangi to'lov qabul qilindi",
    message: `${summary.fullName} - ${summary.courseTitle} uchun ${normalizedAmount.toLocaleString("ru-RU")} UZS`
  });
  if (summary?.userId) {
    await createNotificationAsync({
      targetUserId: summary.userId,
      type: "payment_received",
      title: "To'lov qabul qilindi",
      message: `${normalizedAmount.toLocaleString("ru-RU")} UZS to'lovingiz tizimga tushdi`
    });
  }

  const receipt = {
    id: paymentId,
    studentId,
    fullName: summary.fullName,
    phone: summary.phone,
    courseTitle: summary.courseTitle,
    amount: normalizedAmount,
    method,
    paidAt: now,
    reason: normalizedReason || null
  };

  return {
    ...receipt,
    receiptCaption: buildPaymentCaption(receipt)
  };
}

export function upsertAttendance({ studentId, teacherId, lessonDate, status }) {
  db.prepare(`
    INSERT INTO attendance (student_id, teacher_id, lesson_date, status, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(student_id, lesson_date)
    DO UPDATE SET status = excluded.status, teacher_id = excluded.teacher_id
  `).run(
    studentId,
    teacherId,
    lessonDate,
    status,
    dayjs().format("YYYY-MM-DD HH:mm:ss")
  );
  const next = recalcStudentState(studentId);

  if (status === "absent") {
    const student = db.prepare(`
      SELECT u.id as userId, u.full_name as fullName
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
    `).get(studentId);

    createNotification({
      targetRole: "reception",
      type: "attendance_absent",
      title: "Davomat ogohlantirishi",
      message: `${student?.fullName || "Student"} darsga kelmadi`
    });
    if (student?.userId) {
      createNotification({
        targetUserId: student.userId,
        type: "absent_alert",
        title: "Davomat ogohlantirishi",
        message: "Bugungi dars uchun kelmadi deb belgilandingiz"
      });
    }
  }

  if (next?.status === "debtor" && next.paymentDueDate === lessonDate) {
    const student = db.prepare(`
      SELECT u.id as userId, u.full_name as fullName
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
    `).get(studentId);
    createNotification({
      targetRole: "reception",
      type: "trial_finished",
      title: "Sinov muddati tugadi",
      message: `${student?.fullName || "Student"} uchun sinov tugadi va to'lov muddati boshlandi`
    });
    if (student?.userId) {
      createNotification({
        targetUserId: student.userId,
        type: "trial_ending",
        title: "Sinov muddati tugadi",
        message: "3 kunlik sinov tugadi. Endi oylik to'lov talab qilinadi"
      });
    }
  }
}

export async function upsertAttendanceAsync({ studentId, teacherId, lessonDate, status }) {
  const pool = getSupabasePool();
  await pool.query(
    `
      INSERT INTO attendance (student_id, teacher_id, lesson_date, status, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (student_id, lesson_date)
      DO UPDATE SET status = EXCLUDED.status, teacher_id = EXCLUDED.teacher_id
    `,
    [studentId, teacherId, lessonDate, status, dayjs().format("YYYY-MM-DD HH:mm:ss")]
  );
  const next = await recalcStudentStateAsync(studentId);

  const studentResult = await pool.query(
    `
      SELECT u.id as "userId", u.full_name as "fullName"
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = $1
      LIMIT 1
    `,
    [studentId]
  );
  const student = studentResult.rows[0];

  if (status === "absent") {
    await createNotificationAsync({
      targetRole: "reception",
      type: "attendance_absent",
      title: "Davomat ogohlantirishi",
      message: `${student?.fullName || "Student"} darsga kelmadi`
    });
    if (student?.userId) {
      await createNotificationAsync({
        targetUserId: student.userId,
        type: "absent_alert",
        title: "Davomat ogohlantirishi",
        message: "Bugungi dars uchun kelmadi deb belgilandingiz"
      });
    }
  }

  if (next?.status === "debtor" && next.paymentDueDate === lessonDate) {
    await createNotificationAsync({
      targetRole: "reception",
      type: "trial_finished",
      title: "Sinov muddati tugadi",
      message: `${student?.fullName || "Student"} uchun sinov tugadi va to'lov muddati boshlandi`
    });
    if (student?.userId) {
      await createNotificationAsync({
        targetUserId: student.userId,
        type: "trial_ending",
        title: "Sinov muddati tugadi",
        message: "3 kunlik sinov tugadi. Endi oylik to'lov talab qilinadi"
      });
    }
  }
}

const ALLOWED_ATTENDANCE_STATUSES = new Set(["present", "absent", "excused", "late"]);

function normalizeAttendanceStatus(status) {
  return ALLOWED_ATTENDANCE_STATUSES.has(status) ? status : "present";
}

export function upsertAttendanceBatch({ lessonDate, entries = [], actorUserId }) {
  const nextLessonDate = lessonDate || dayjs().format("YYYY-MM-DD");
  const studentLookup = db.prepare(`
    SELECT id, teacher_id as teacherId
    FROM students
    WHERE id = ?
  `);
  const results = [];

  for (const entry of entries) {
    const studentId = Number(entry.studentId);
    if (!studentId) {
      continue;
    }

    const student = studentLookup.get(studentId);
    if (!student) {
      continue;
    }

    const normalizedStatus = normalizeAttendanceStatus(entry.status);
    upsertAttendance({
      studentId,
      teacherId: Number(student.teacherId || actorUserId || 0),
      lessonDate: nextLessonDate,
      status: normalizedStatus
    });
    results.push({ studentId, status: normalizedStatus });
  }

  return results;
}

export async function upsertAttendanceBatchAsync({ lessonDate, entries = [], actorUserId }) {
  const nextLessonDate = lessonDate || dayjs().format("YYYY-MM-DD");
  const results = [];

  for (const entry of entries) {
    const studentId = Number(entry.studentId);
    if (!studentId) {
      continue;
    }

    const studentResult = await getSupabasePool().query(
      `SELECT id, teacher_id as "teacherId" FROM students WHERE id = $1 LIMIT 1`,
      [studentId]
    );
    const student = studentResult.rows[0];
    if (!student) {
      continue;
    }

    const normalizedStatus = normalizeAttendanceStatus(entry.status);
    await upsertAttendanceAsync({
      studentId,
      teacherId: Number(student.teacherId || actorUserId || 0),
      lessonDate: nextLessonDate,
      status: normalizedStatus
    });
    results.push({ studentId, status: normalizedStatus });
  }

  return results;
}

export function createStudentRegistrationToken(studentId, expiresInSeconds = 90) {
  const student = db.prepare(`
    SELECT s.id, u.full_name as fullName, u.phone
    FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.is_archived = 0
  `).get(studentId);

  if (!student) {
    throw new Error("Student topilmadi");
  }

  db.prepare(`DELETE FROM qr_tokens WHERE student_id = ? AND used = 0`).run(studentId);

  const ttl = Math.min(120, Math.max(60, Number(expiresInSeconds || 90)));
  const token = crypto.randomBytes(24).toString("hex");
  const now = dayjs();
  const expiresAt = now.add(ttl, "second").format("YYYY-MM-DD HH:mm:ss");

  db.prepare(`
    INSERT INTO qr_tokens (token, student_id, expires_at, used, used_at, created_at)
    VALUES (?, ?, ?, 0, NULL, ?)
  `).run(token, studentId, expiresAt, now.format("YYYY-MM-DD HH:mm:ss"));

  const auth = ensureStudentAuth(studentId, student.phone);
  const loginUrl = `${config.webUrl}/student/login?access=${auth.accessToken}`;

  return {
    token,
    studentId,
    fullName: student.fullName,
    expiresAt,
    registerUrl: loginUrl,
    loginUrl,
    defaultPassword: "12345678"
  };
}

export function validateStudentRegistrationToken(token) {
  const row = db.prepare(`
    SELECT
      qt.id,
      qt.token,
      qt.student_id as studentId,
      qt.expires_at as expiresAt,
      qt.used,
      s.is_registered as isRegistered,
      u.full_name as fullName,
      u.phone
    FROM qr_tokens qt
    JOIN students s ON s.id = qt.student_id
    JOIN users u ON u.id = s.user_id
    WHERE qt.token = ?
    LIMIT 1
  `).get(token);

  if (!row) {
    throw new Error("Token topilmadi");
  }
  if (Number(row.used)) {
    throw new Error("Token allaqachon ishlatilgan");
  }
  if (Number(row.isRegistered)) {
    throw new Error("Student allaqachon ro'yxatdan o'tgan");
  }
  if (dayjs(row.expiresAt).isBefore(dayjs())) {
    throw new Error("Token muddati tugagan");
  }

  const [firstName = "", ...rest] = (row.fullName || "").split(" ");
  return {
    token: row.token,
    studentId: row.studentId,
    firstName,
    lastName: rest.join(" "),
    fullName: row.fullName,
    phone: row.phone,
    expiresAt: row.expiresAt
  };
}

export function registerStudentByToken({ token, phone, passwordHash }) {
  const qr = validateStudentRegistrationToken(token);
  if (normalizePhone(qr.phone) !== normalizePhone(phone)) {
    throw new Error("Telefon raqam student ma'lumoti bilan mos emas");
  }

  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  ensureStudentAuth(qr.studentId, phone, passwordHash);

  db.prepare(`UPDATE students SET is_registered = 1 WHERE id = ?`).run(qr.studentId);
  db.prepare(`UPDATE qr_tokens SET used = 1, used_at = ? WHERE token = ?`).run(now, token);

  return qr;
}

export function getStudentAuthByPhone(phone) {
  return db.prepare(`
    SELECT sa.id, sa.student_id as studentId, sa.phone, sa.access_token as accessToken, sa.password_hash as passwordHash, s.user_id as userId
    FROM student_auth sa
    JOIN students s ON s.id = sa.student_id
    WHERE REPLACE(sa.phone, ' ', '') = ?
  `).get(normalizePhone(phone));
}

function getNextLessonDateFromSchedule(schedule) {
  if (!schedule) return null;
  const dayMap = {
    du: 1,
    se: 2,
    chor: 3,
    pay: 4,
    juma: 5,
    shan: 6,
    yak: 0
  };
  const daysPart = schedule.split(",")[0] || "";
  const dayKeys = daysPart
    .split("-")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((item) => dayMap[item])
    .filter((item) => item !== undefined);
  if (!dayKeys.length) return null;

  const today = dayjs();
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = today.add(offset, "day");
    if (dayKeys.includes(candidate.day())) {
      return candidate.format("YYYY-MM-DD");
    }
  }
  return null;
}

export function getStudentDashboard(userId) {
  const profile = getStudentByUserId(userId);
  if (!profile) {
    return null;
  }
  return {
    fullName: profile.fullName,
    status: profile.status,
    balance: profile.balance,
    courseTitle: profile.courseTitle,
    teacherName: profile.teacherName,
    nextLessonDate: getNextLessonDateFromSchedule(profile.schedule),
    trialProgress: profile.trialProgress,
    trialRequired: profile.trialRequired,
    monthlyFee: profile.monthlyFee,
    paymentDueDate: profile.paymentDueDate
  };
}

export async function createStudentRegistrationTokenAsync(studentId, expiresInSeconds = 90) {
  const pool = getSupabasePool();
  const { rows } = await pool.query(
    `
      SELECT s.id, u.full_name as "fullName", u.phone
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = $1 AND s.is_archived = FALSE
      LIMIT 1
    `,
    [studentId]
  );
  const student = rows[0];

  if (!student) {
    throw new Error("Student topilmadi");
  }

  await pool.query(`DELETE FROM qr_tokens WHERE student_id = $1 AND used = FALSE`, [studentId]);

  const ttl = Math.min(120, Math.max(60, Number(expiresInSeconds || 90)));
  const token = crypto.randomBytes(24).toString("hex");
  const now = dayjs();
  const expiresAt = now.add(ttl, "second").format("YYYY-MM-DD HH:mm:ss");

  await pool.query(
    `
      INSERT INTO qr_tokens (token, student_id, expires_at, used, used_at, created_at)
      VALUES ($1, $2, $3, FALSE, NULL, $4)
    `,
    [token, studentId, expiresAt, now.format("YYYY-MM-DD HH:mm:ss")]
  );

  const auth = await ensureStudentAuthAsync(studentId, student.phone);
  const loginUrl = `${config.webUrl}/student/login?access=${auth.accessToken}`;

  return {
    token,
    studentId,
    fullName: student.fullName,
    expiresAt,
    registerUrl: loginUrl,
    loginUrl,
    defaultPassword: "12345678"
  };
}

export async function getStudentDashboardAsync(userId) {
  const profile = await getStudentByUserIdAsync(userId);
  if (!profile) {
    return null;
  }
  return {
    fullName: profile.fullName,
    status: profile.status,
    balance: profile.balance,
    courseTitle: profile.courseTitle,
    teacherName: profile.teacherName,
    nextLessonDate: getNextLessonDateFromSchedule(profile.schedule),
    trialProgress: profile.trialProgress,
    trialRequired: profile.trialRequired,
    monthlyFee: profile.monthlyFee,
    paymentDueDate: profile.paymentDueDate
  };
}

export function getStudentAttendance(userId) {
  const student = getStudentByUserId(userId);
  if (!student) return null;
  const items = listAttendanceHistory({ studentId: student.id, range: "month" });
  const presentCount = items.filter((item) => item.status === "present").length;
  const lateCount = items.filter((item) => item.status === "late").length;
  const excusedCount = items.filter((item) => item.status === "excused").length;
  const attendedCount = presentCount + lateCount;
  const percentage = items.length ? Math.round((attendedCount / items.length) * 100) : 0;
  return {
    percentage,
    last30Days: {
      present: presentCount,
      late: lateCount,
      excused: excusedCount,
      absent: items.filter((item) => item.status === "absent").length
    },
    items: items.map((item) => ({
      date: item.lessonDate,
      status: item.status
    }))
  };
}

export async function getStudentAttendanceAsync(userId) {
  const student = await getStudentByUserIdAsync(userId);
  if (!student) return null;
  const items = await listAttendanceHistoryAsync({ studentId: student.id, range: "month" });
  const presentCount = items.filter((item) => item.status === "present").length;
  const lateCount = items.filter((item) => item.status === "late").length;
  const excusedCount = items.filter((item) => item.status === "excused").length;
  const attendedCount = presentCount + lateCount;
  const percentage = items.length ? Math.round((attendedCount / items.length) * 100) : 0;
  return {
    percentage,
    last30Days: {
      present: presentCount,
      late: lateCount,
      excused: excusedCount,
      absent: items.filter((item) => item.status === "absent").length
    },
    items: items.map((item) => ({
      date: item.lessonDate,
      status: item.status
    }))
  };
}

export function getStudentPayments(userId) {
  const student = getStudentByUserId(userId);
  if (!student) return null;
  const items = db.prepare(`
    SELECT
      p.id,
      p.amount,
      p.method,
      p.status,
      p.created_at as createdAt,
      staff.full_name as receivedBy
    FROM payments p
    LEFT JOIN users staff ON staff.id = p.received_by_user_id
    WHERE p.student_id = ?
    ORDER BY datetime(p.created_at) DESC
  `).all(student.id);
  return {
    balance: student.balance,
    debt: Math.max(0, Number(student.monthlyFee || 0) - Number(student.balance || 0)),
    items
  };
}

export async function getStudentPaymentsAsync(userId) {
  const student = await getStudentByUserIdAsync(userId);
  if (!student) return null;
  const { rows } = await getSupabasePool().query(
    `
      SELECT
        p.id,
        p.amount,
        p.method,
        p.status,
        p.created_at as "createdAt",
        staff.full_name as "receivedBy"
      FROM payments p
      LEFT JOIN users staff ON staff.id = p.received_by_user_id
      WHERE p.student_id = $1
      ORDER BY p.created_at DESC
    `,
    [student.id]
  );
  return {
    balance: student.balance,
    debt: Math.max(0, Number(student.monthlyFee || 0) - Number(student.balance || 0)),
    items: rows.map((row) => ({ ...row, id: Number(row.id) }))
  };
}

export function getStudentSchedule(userId) {
  const student = getStudentByUserId(userId);
  if (!student) return null;
  const schedule = student.schedule || "";
  const dayMap = {
    du: "Dushanba",
    se: "Seshanba",
    chor: "Chorshanba",
    pay: "Payshanba",
    juma: "Juma",
    shan: "Shanba",
    yak: "Yakshanba"
  };
  const [daysPart = "", timePart = ""] = schedule.split(",");
  const dayKeys = daysPart.split("-").map((item) => item.trim().toLowerCase()).filter(Boolean);
  const todayIndex = dayjs().day();
  const numericMap = { du: 1, se: 2, chor: 3, pay: 4, juma: 5, shan: 6, yak: 0 };
  return {
    courseTitle: student.courseTitle,
    teacherName: student.teacherName,
    items: dayKeys.map((key) => ({
      day: dayMap[key] || key,
      time: timePart.trim(),
      isToday: numericMap[key] === todayIndex
    }))
  };
}

export async function getStudentScheduleAsync(userId) {
  const student = await getStudentByUserIdAsync(userId);
  if (!student) return null;
  const schedule = student.schedule || "";
  const dayMap = {
    du: "Dushanba",
    se: "Seshanba",
    chor: "Chorshanba",
    pay: "Payshanba",
    juma: "Juma",
    shan: "Shanba",
    yak: "Yakshanba"
  };
  const [daysPart = "", timePart = ""] = schedule.split(",");
  const dayKeys = daysPart.split("-").map((item) => item.trim().toLowerCase()).filter(Boolean);
  const todayIndex = dayjs().day();
  const numericMap = { du: 1, se: 2, chor: 3, pay: 4, juma: 5, shan: 6, yak: 0 };
  return {
    courseTitle: student.courseTitle,
    teacherName: student.teacherName,
    items: dayKeys.map((key) => ({
      day: dayMap[key] || key,
      time: timePart.trim(),
      isToday: numericMap[key] === todayIndex
    }))
  };
}

export function getStudentProfilePanel(userId) {
  const profile = getStudentByUserId(userId);
  if (!profile) return null;
  return {
    fullName: profile.fullName,
    phone: profile.phone
  };
}

export async function getStudentProfilePanelAsync(userId) {
  const profile = await getStudentByUserIdAsync(userId);
  if (!profile) return null;
  return {
    fullName: profile.fullName,
    phone: profile.phone
  };
}

export function changeStudentPassword(userId, passwordHash) {
  const student = getStudentByUserId(userId);
  if (!student) {
    throw new Error("Student topilmadi");
  }
  db.prepare(`
    UPDATE student_auth
    SET password_hash = ?, updated_at = ?
    WHERE student_id = ?
  `).run(passwordHash, dayjs().format("YYYY-MM-DD HH:mm:ss"), student.id);
}

export async function changeStudentPasswordAsync(userId, passwordHash) {
  const student = await getStudentByUserIdAsync(userId);
  if (!student) {
    throw new Error("Student topilmadi");
  }

  await getSupabasePool().query(
    `
      UPDATE student_auth
      SET password_hash = $1, updated_at = $2
      WHERE student_id = $3
    `,
    [passwordHash, dayjs().format("YYYY-MM-DD HH:mm:ss"), student.id]
  );
}

export function listAttendanceHistory({ teacherId = null, studentId = null, range = "month", lessonDate = "" } = {}) {
  const values = [];
  let query = `
    SELECT
      a.id,
      a.lesson_date as lessonDate,
      a.status,
      s.id as studentId,
      u.full_name as studentName,
      c.title as courseTitle,
      t.full_name as teacherName
    FROM attendance a
    JOIN students s ON s.id = a.student_id
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN users t ON t.id = a.teacher_id
    WHERE 1 = 1
  `;

  if (teacherId) {
    query += ` AND a.teacher_id = ?`;
    values.push(teacherId);
  }
  if (studentId) {
    query += ` AND a.student_id = ?`;
    values.push(studentId);
  }

  if (lessonDate) {
    query += ` AND date(a.lesson_date) = date(?)`;
    values.push(lessonDate);
  } else if (range === "week") {
    query += ` AND date(a.lesson_date) >= date('now', '-7 day')`;
  } else if (range === "day") {
    query += ` AND date(a.lesson_date) = date('now')`;
  } else {
    query += ` AND date(a.lesson_date) >= date('now', '-30 day')`;
  }

  query += ` ORDER BY date(a.lesson_date) DESC, u.full_name ASC`;
  return db.prepare(query).all(...values);
}

export async function listAttendanceHistoryAsync({ teacherId = null, studentId = null, range = "month", lessonDate = "" } = {}) {
  const values = [];
  let query = `
    SELECT
      a.id,
      a.lesson_date as "lessonDate",
      a.status,
      s.id as "studentId",
      u.full_name as "studentName",
      c.title as "courseTitle",
      t.full_name as "teacherName"
    FROM attendance a
    JOIN students s ON s.id = a.student_id
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN users t ON t.id = a.teacher_id
    WHERE 1 = 1
  `;

  if (teacherId) {
    values.push(teacherId);
    query += ` AND a.teacher_id = $${values.length}`;
  }
  if (studentId) {
    values.push(studentId);
    query += ` AND a.student_id = $${values.length}`;
  }

  if (lessonDate) {
    values.push(lessonDate);
    query += ` AND a.lesson_date = $${values.length}::date`;
  } else if (range === "week") {
    query += ` AND a.lesson_date >= CURRENT_DATE - INTERVAL '7 day'`;
  } else if (range === "day") {
    query += ` AND a.lesson_date = CURRENT_DATE`;
  } else {
    query += ` AND a.lesson_date >= CURRENT_DATE - INTERVAL '30 day'`;
  }

  query += ` ORDER BY a.lesson_date DESC, u.full_name ASC`;
  const { rows } = await getSupabasePool().query(query, values);
  return rows.map((row) => ({ ...row, id: Number(row.id), studentId: Number(row.studentId) }));
}

export function getTeacherStudents(teacherId) {
  const students = listStudents({ teacherId });
  return students.map((student) => {
    const stats = db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as presentCount,
        COUNT(*) as totalCount
      FROM attendance
      WHERE student_id = ?
    `).get(student.id);

    return {
      ...student,
      attendancePercent: stats.totalCount
        ? Math.round((stats.presentCount / stats.totalCount) * 100)
        : 0
    };
  });
}

export async function getTeacherStudentsAsync(teacherId) {
  const students = await listStudentsAsync({ teacherId });
  const result = [];
  for (const student of students) {
    const { rows } = await getSupabasePool().query(
      `
        SELECT
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)::int as "presentCount",
          COUNT(*)::int as "totalCount"
        FROM attendance
        WHERE student_id = $1
      `,
      [student.id]
    );

    const stats = rows[0] || {};
    result.push({
      ...student,
      attendancePercent: stats.totalCount
        ? Math.round((Number(stats.presentCount || 0) / Number(stats.totalCount || 0)) * 100)
        : 0
    });
  }
  return result;
}

export function getDirectorStats() {
  const payroll = getTeacherPayrollSummary();
  const operatingExpenses = getOperatingExpenseSummary();
  const cards = db.prepare(`
    SELECT
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')) as monthlyRevenue,
      (SELECT COUNT(*) FROM students) as totalStudents,
      (SELECT COUNT(*) FROM students WHERE status = 'debtor') as debtorsCount,
      (SELECT COUNT(*) FROM students WHERE status = 'trial' AND is_archived = 0) as trialStudentsCount
  `).get();

  const monthlyRevenue = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) as period,
      COALESCE(SUM(amount), 0) as revenue
    FROM payments
    WHERE status = 'paid'
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY strftime('%Y-%m', created_at) DESC
    LIMIT 6
  `).all().reverse().map((item) => ({
    period: item.period,
    label: dayjs(`${item.period}-01`).format("MMM"),
    revenue: Number(item.revenue || 0)
  }));

  const dailyTrend = Array.from({ length: 7 }, (_, index) => {
    const date = dayjs().subtract(6 - index, "day");
    const row = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM payments
      WHERE status = 'paid' AND date(created_at) = date(?)
    `).get(date.format("YYYY-MM-DD"));
    return {
      period: date.format("YYYY-MM-DD"),
      label: date.format("DD MMM"),
      startDate: date.format("YYYY-MM-DD"),
      endDate: date.format("YYYY-MM-DD"),
      revenue: Number(row?.revenue || 0)
    };
  });

  const weeklyTrend = Array.from({ length: 8 }, (_, index) => {
    const weekStart = dayjs().startOf("week").add(1, "day").subtract(7 * (7 - index), "day");
    const weekEnd = weekStart.add(6, "day");
    const row = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM payments
      WHERE status = 'paid'
        AND date(created_at) BETWEEN date(?) AND date(?)
    `).get(weekStart.format("YYYY-MM-DD"), weekEnd.format("YYYY-MM-DD"));
    return {
      period: `${weekStart.format("YYYY-MM-DD")}_${weekEnd.format("YYYY-MM-DD")}`,
      label: `${weekStart.format("DD MMM")} - ${weekEnd.format("DD MMM")}`,
      startDate: weekStart.format("YYYY-MM-DD"),
      endDate: weekEnd.format("YYYY-MM-DD"),
      revenue: Number(row?.revenue || 0)
    };
  });

  const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
    const monthDate = dayjs().startOf("month").subtract(5 - index, "month");
    const row = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM payments
      WHERE status = 'paid'
        AND strftime('%Y-%m', created_at) = strftime('%Y-%m', ?)
    `).get(monthDate.format("YYYY-MM-DD"));
    return {
      period: monthDate.format("YYYY-MM"),
      label: monthDate.format("MMM"),
      startDate: monthDate.startOf("month").format("YYYY-MM-DD"),
      endDate: monthDate.endOf("month").format("YYYY-MM-DD"),
      revenue: Number(row?.revenue || 0)
    };
  });

  const monthlyProfitTrend = monthlyTrend.map((item) => ({
    ...item,
    payroll: payroll.monthlyPayroll,
    expenses: payroll.monthlyPayroll + operatingExpenses.total,
    netProfit: Number(item.revenue || 0) - payroll.monthlyPayroll - operatingExpenses.total
  }));

  const courseAnalysis = listAllCourses()
    .map((course) => {
      const studentsCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM students
        WHERE course_id = ? AND is_archived = 0
      `).get(course.id).count;

      const groupsCount = db.prepare(`
        SELECT COUNT(DISTINCT teacher_id) as count
        FROM students
        WHERE course_id = ? AND is_archived = 0 AND teacher_id IS NOT NULL
      `).get(course.id).count;

      const revenue = db.prepare(`
        SELECT COALESCE(SUM(p.amount), 0) as total
        FROM payments p
        JOIN students s ON s.id = p.student_id
        WHERE s.course_id = ? AND p.status = 'paid'
      `).get(course.id).total;

      const activeCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM students
        WHERE course_id = ? AND status = 'active' AND is_archived = 0
      `).get(course.id).count;

      const trialCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM students
        WHERE course_id = ? AND status = 'trial' AND is_archived = 0
      `).get(course.id).count;

      const debtorsCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM students
        WHERE course_id = ? AND status = 'debtor' AND is_archived = 0
      `).get(course.id).count;

      return {
        id: course.id,
        title: course.title,
        studentsCount,
        groupsCount,
        revenue,
        activeCount,
        trialCount,
        debtorsCount,
        efficiency: studentsCount ? Math.min(97, 64 + studentsCount * 2 + activeCount) : 0
      };
    })
    .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0) || Number(b.studentsCount || 0) - Number(a.studentsCount || 0));

  const teacherPerformance = listTeachers()
    .map((teacher) => {
      const studentsCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM students
        WHERE teacher_id = ? AND is_archived = 0
      `).get(teacher.id).count;

      const activeStudentsCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM students
        WHERE teacher_id = ? AND status = 'active' AND is_archived = 0
      `).get(teacher.id).count;

      const trialStudentsCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM students
        WHERE teacher_id = ? AND status = 'trial' AND is_archived = 0
      `).get(teacher.id).count;

      const debtorsCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM students
        WHERE teacher_id = ? AND status = 'debtor' AND is_archived = 0
      `).get(teacher.id).count;

      const attendance = db.prepare(`
        SELECT
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as presentCount,
          COUNT(*) as totalCount
        FROM attendance
        WHERE teacher_id = ?
      `).get(teacher.id);

      const revenue = db.prepare(`
        SELECT COALESCE(SUM(p.amount), 0) as total
        FROM payments p
        JOIN students s ON s.id = p.student_id
        WHERE s.teacher_id = ? AND p.status = 'paid'
      `).get(teacher.id).total;

      return {
        id: teacher.id,
        fullName: teacher.fullName,
        monthlySalary: Number(teacher.monthlySalary || 0),
        courseIds: teacher.courseIds || [],
        studentsCount,
        activeStudentsCount,
        trialStudentsCount,
        debtorsCount,
        revenue,
        attendancePercent: attendance.totalCount
          ? Math.round((Number(attendance.presentCount || 0) / Number(attendance.totalCount || 1)) * 100)
          : 0
      };
    })
    .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0) || Number(b.studentsCount || 0) - Number(a.studentsCount || 0));

  const studentStatusBreakdown = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeCount,
      SUM(CASE WHEN status = 'trial' THEN 1 ELSE 0 END) as trialCount,
      SUM(CASE WHEN status = 'debtor' THEN 1 ELSE 0 END) as debtorCount
    FROM students
    WHERE is_archived = 0
  `).get();

  const admissionsTrend = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) as period,
      COUNT(*) as count
    FROM students
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY strftime('%Y-%m', created_at) DESC
    LIMIT 6
  `).all().reverse();

  return {
    cards: {
      ...cards,
      teachersCount: payroll.teachersCount,
      teachersPayroll: payroll.monthlyPayroll,
      operatingExpenses: operatingExpenses.total,
      totalExpenses: payroll.monthlyPayroll + operatingExpenses.total,
      netProfit: Number(cards.monthlyRevenue || 0) - payroll.monthlyPayroll - operatingExpenses.total
    },
    monthlyRevenue,
    trends: {
      daily: dailyTrend,
      weekly: weeklyTrend,
      monthly: monthlyTrend,
      monthlyProfit: monthlyProfitTrend
    },
    courseAnalysis,
    teacherPerformance,
    studentStatusBreakdown,
    admissionsTrend,
    expenses: operatingExpenses
  };
}

export function createTelegramLinkCode(phone) {
  const student = getStudentByPhone(phone);
  if (!student) {
    return null;
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  db.prepare(`
    INSERT INTO telegram_links (student_id, phone, code, used, created_at)
    VALUES (?, ?, ?, 0, ?)
  `).run(student.id, phone, code, dayjs().format("YYYY-MM-DD HH:mm:ss"));

  return {
    studentId: student.id,
    code
  };
}

export function consumeTelegramCode(code, telegramId) {
  const link = db.prepare(`
    SELECT *
    FROM telegram_links
    WHERE code = ? AND used = 0
    ORDER BY id DESC
    LIMIT 1
  `).get(code);

  if (!link) {
    return null;
  }

  const student = db.prepare(`
    SELECT s.id, s.user_id as userId, u.full_name as fullName
    FROM students s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
  `).get(link.student_id);

  db.prepare(`UPDATE telegram_links SET used = 1 WHERE id = ?`).run(link.id);
  db.prepare(`UPDATE users SET telegram_id = ? WHERE id = ?`).run(String(telegramId), student.userId);

  return student;
}

export function listDebtors() {
  return db.prepare(`
    SELECT
      s.id as studentId,
      s.user_id as userId,
      u.phone,
      u.full_name as fullName,
      u.telegram_id as telegramId,
      c.title as courseTitle,
      c.schedule,
      t.full_name as teacherName,
      s.balance,
      c.monthly_fee as monthlyFee,
      s.last_payment_date as lastPaymentDate
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN users t ON t.id = s.teacher_id
    WHERE s.status = 'debtor'
  `).all();
}

export function listUpcomingPayments(days = 3) {
  return db.prepare(`
    SELECT
      s.id as studentId,
      s.user_id as userId,
      u.full_name as fullName,
      u.telegram_id as telegramId,
      c.title as courseTitle,
      c.monthly_fee as monthlyFee,
      s.last_payment_date as lastPaymentDate,
      date(s.last_payment_date, '+30 day') as dueDate
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    WHERE s.is_archived = 0
      AND s.last_payment_date IS NOT NULL
      AND s.status IN ('active', 'debtor')
      AND date(s.last_payment_date, '+30 day') BETWEEN date('now') AND date('now', ?)
  `).all(`+${Math.max(0, Number(days || 0))} day`);
}

export function listTrialFinishedStudents(days = 0) {
  return db.prepare(`
    SELECT
      s.id as studentId,
      s.user_id as userId,
      u.full_name as fullName,
      u.telegram_id as telegramId,
      c.title as courseTitle,
      c.monthly_fee as monthlyFee,
      s.balance,
      s.payment_due_date as paymentDueDate
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN courses c ON c.id = s.course_id
    WHERE s.is_archived = 0
      AND s.payment_due_date IS NOT NULL
      AND s.status = 'debtor'
      AND date(s.payment_due_date) BETWEEN date('now') AND date('now', ?)
  `).all(`+${Math.max(0, Number(days || 0))} day`);
}

function tryRegisterReminderDispatch(studentId, reminderType, dispatchDate = dayjs().format("YYYY-MM-DD")) {
  try {
    db.prepare(`
      INSERT INTO reminder_dispatches (student_id, reminder_type, dispatch_date, created_at)
      VALUES (?, ?, ?, ?)
    `).run(studentId, reminderType, dispatchDate, dayjs().format("YYYY-MM-DD HH:mm:ss"));
    return true;
  } catch {
    return false;
  }
}

export function queueDailyReminderJobs({ upcomingDays = 3 } = {}) {
  const dispatchDate = dayjs().format("YYYY-MM-DD");
  const jobs = [];

  for (const student of listDebtors()) {
    if (!tryRegisterReminderDispatch(student.studentId, "debt_daily", dispatchDate)) continue;
    const debtAmount = Math.max(0, Number(student.monthlyFee || 0) - Number(student.balance || 0));
    createNotification({
      targetUserId: student.userId,
      type: "debt_reminder",
      title: "Qarzdorlik eslatmasi",
      message: `${formatMoney(debtAmount)} to'lovingiz kutilmoqda. Iltimos, qarzingizni to'lang.`,
      metadata: { studentId: student.studentId, debtAmount, courseTitle: student.courseTitle }
    });
    jobs.push({ type: "debt", student });
  }

  for (const student of listUpcomingPayments(upcomingDays)) {
    if (!tryRegisterReminderDispatch(student.studentId, "payment_upcoming", dispatchDate)) continue;
    createNotification({
      targetUserId: student.userId,
      type: "payment_upcoming",
      title: "To'lov eslatmasi",
      message: `${student.courseTitle || "Kurs"} uchun oylik to'lov muddati ${student.dueDate} sanada tugaydi.`,
      metadata: { studentId: student.studentId, amount: Number(student.monthlyFee || 0), dueDate: student.dueDate }
    });
    jobs.push({ type: "payment_upcoming", student });
  }

  for (const student of listTrialFinishedStudents(0)) {
    if (!tryRegisterReminderDispatch(student.studentId, "trial_finished", dispatchDate)) continue;
    createNotification({
      targetRole: "reception",
      type: "trial_finished",
      title: "Sinov muddati tugadi",
      message: `${student.fullName} uchun sinov muddati tugadi va to'lov bosqichi boshlandi.`,
      metadata: { studentId: student.studentId, paymentDueDate: student.paymentDueDate }
    });
    createNotification({
      targetUserId: student.userId,
      type: "trial_finished_student",
      title: "Sinov muddati tugadi",
      message: `${student.courseTitle || "Kurs"} bo'yicha sinov muddati tugadi. Endi oylik to'lovni amalga oshiring.`,
      metadata: { studentId: student.studentId, paymentDueDate: student.paymentDueDate }
    });
    jobs.push({ type: "trial_finished", student });
  }

  return jobs;
}

export function listStudentHistory(studentId) {
  return db.prepare(`
    SELECT
      sh.id,
      sh.action,
      sh.title,
      sh.details,
      sh.created_at as createdAt,
      u.full_name as actorName
    FROM student_history sh
    LEFT JOIN users u ON u.id = sh.actor_user_id
    WHERE sh.student_id = ?
      ORDER BY datetime(sh.created_at) DESC
  `).all(studentId);
}

export async function listStudentHistoryAsync(studentId) {
  const { rows } = await getSupabasePool().query(
    `
      SELECT
        sh.id,
        sh.action,
        sh.title,
        sh.details,
        sh.created_at as "createdAt",
        u.full_name as "actorName"
      FROM student_history sh
      LEFT JOIN users u ON u.id = sh.actor_user_id
      WHERE sh.student_id = $1
      ORDER BY sh.created_at DESC
    `,
    [studentId]
  );
  return rows.map((row) => ({ ...row, id: Number(row.id) }));
}

export function listNotifications({ userId = null, role = null, unreadOnly = false } = {}) {
  const values = [];
  let query = `
    SELECT id, target_role as targetRole, target_user_id as targetUserId, type, title, message, metadata, status, created_at as createdAt, read_at as readAt
    FROM notifications
    WHERE 1 = 1
  `;
  if (userId) {
    query += ` AND (target_user_id = ? OR target_user_id IS NULL)`;
    values.push(userId);
  }
  if (role) {
    query += ` AND (target_role = ? OR target_role IS NULL)`;
    values.push(role);
  }
  if (unreadOnly) {
    query += ` AND status = 'unread'`;
  }
  query += ` ORDER BY datetime(created_at) DESC LIMIT 50`;
  return db.prepare(query).all(...values).map((item) => ({ ...item, metadata: safeJsonParse(item.metadata, null) }));
}

export function markNotificationRead(notificationId, userId = null) {
  const row = db.prepare(`SELECT * FROM notifications WHERE id = ?`).get(notificationId);
  if (!row) {
    return false;
  }
  if (row.target_user_id && userId && Number(row.target_user_id) !== Number(userId)) {
    return false;
  }
  db.prepare(`UPDATE notifications SET status = 'read', read_at = ? WHERE id = ?`).run(dayjs().format("YYYY-MM-DD HH:mm:ss"), notificationId);
  return true;
}

export async function markNotificationReadAsync(notificationId, userId = null) {
  const { rows } = await getSupabasePool().query(
    `
      SELECT id, target_user_id as "targetUserId"
      FROM notifications
      WHERE id = $1
      LIMIT 1
    `,
    [notificationId]
  );

  const row = rows[0];
  if (!row) {
    return false;
  }

  if (row.targetUserId && userId && Number(row.targetUserId) !== Number(userId)) {
    return false;
  }

  await getSupabasePool().query(
    `
      UPDATE notifications
      SET status = 'read', read_at = $1
      WHERE id = $2
    `,
    [dayjs().format("YYYY-MM-DD HH:mm:ss"), notificationId]
  );
  return true;
}

export function getFinanceSummary() {
  const payroll = getTeacherPayrollSummary();
  const operatingExpenses = getOperatingExpenseSummary();
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as totalRevenue,
      COALESCE(SUM(CASE WHEN status = 'paid' AND date(created_at) = date('now') THEN amount ELSE 0 END), 0) as todayRevenue,
      COALESCE(SUM(CASE WHEN status = 'paid' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') THEN amount ELSE 0 END), 0) as monthlyRevenue
    FROM payments
  `).get();

  const debtors = db.prepare(`
    SELECT COUNT(*) as debtorsCount, COALESCE(SUM(ABS(balance)), 0) as debtAmount
    FROM students
    WHERE status = 'debtor' AND is_archived = 0
  `).get();

  const byCourse = listAllCourses()
    .map((course) => ({
      title: course.title,
      revenue: db.prepare(`
        SELECT COALESCE(SUM(p.amount), 0) as total
        FROM payments p
        JOIN students s ON s.id = p.student_id
        WHERE s.course_id = ? AND p.status = 'paid'
      `).get(course.id).total
    }))
    .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0));

  const paymentMethods = db.prepare(`
    SELECT method, COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
    FROM payments
    WHERE status = 'paid'
    GROUP BY method
    ORDER BY amount DESC
  `).all();

  const monthlyTrend = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) as period,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as revenue
    FROM payments
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY strftime('%Y-%m', created_at) DESC
    LIMIT 6
  `).all().reverse();

  const payrollTrend = monthlyTrend.map((item) => ({
    ...item,
    payroll: payroll.monthlyPayroll,
    operatingExpenses: operatingExpenses.total,
    totalExpenses: payroll.monthlyPayroll + operatingExpenses.total,
    netProfit: Number(item.revenue || 0) - payroll.monthlyPayroll - operatingExpenses.total
  }));

  const topTeachers = listTeachers()
    .map((teacher) => ({
      id: teacher.id,
      fullName: teacher.fullName,
      monthlySalary: Number(teacher.monthlySalary || 0),
      revenue: db.prepare(`
        SELECT COALESCE(SUM(p.amount), 0) as total
        FROM payments p
        JOIN students s ON s.id = p.student_id
        WHERE s.teacher_id = ? AND p.status = 'paid'
      `).get(teacher.id).total
    }))
    .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0))
    .slice(0, 5);

  return {
    totals: {
      ...totals,
      teachersPayroll: payroll.monthlyPayroll,
      operatingExpenses: operatingExpenses.total,
      totalExpenses: payroll.monthlyPayroll + operatingExpenses.total,
      netProfit: Number(totals.monthlyRevenue || 0) - payroll.monthlyPayroll - operatingExpenses.total
    },
    debtors,
    byCourse,
    paymentMethods,
    monthlyTrend: payrollTrend,
    topTeachers,
    payroll,
    expenses: operatingExpenses
  };
}

export async function getDirectorStatsAsync() {
  const pool = getSupabasePool();
  const payroll = await getTeacherPayrollSummaryAsync();
  const operatingExpenses = await getOperatingExpenseSummaryAsync();

  const { rows: cardsRows } = await pool.query(
    `
      SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)) as "monthlyRevenue",
        (SELECT COUNT(*)::int FROM students) as "totalStudents",
        (SELECT COUNT(*)::int FROM students WHERE status = 'debtor') as "debtorsCount",
        (SELECT COUNT(*)::int FROM students WHERE status = 'trial' AND is_archived = FALSE) as "trialStudentsCount"
    `
  );

  const { rows: monthlyRevenueRows } = await pool.query(
    `
      SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as period,
             COALESCE(SUM(amount), 0) as revenue
      FROM payments
      WHERE status = 'paid'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) DESC
      LIMIT 6
    `
  );
  const monthlyRevenue = monthlyRevenueRows.reverse().map((item) => ({
    period: item.period,
    label: dayjs(`${item.period}-01`).format("MMM"),
    revenue: Number(item.revenue || 0)
  }));

  const dailyTrend = [];
  for (let index = 0; index < 7; index += 1) {
    const date = dayjs().subtract(6 - index, "day");
    const { rows } = await pool.query(
      `
        SELECT COALESCE(SUM(amount), 0) as revenue
        FROM payments
        WHERE status = 'paid' AND created_at::date = $1::date
      `,
      [date.format("YYYY-MM-DD")]
    );
    dailyTrend.push({
      period: date.format("YYYY-MM-DD"),
      label: date.format("DD MMM"),
      startDate: date.format("YYYY-MM-DD"),
      endDate: date.format("YYYY-MM-DD"),
      revenue: Number(rows[0]?.revenue || 0)
    });
  }

  const weeklyTrend = [];
  for (let index = 0; index < 8; index += 1) {
    const weekStart = dayjs().startOf("week").add(1, "day").subtract(7 * (7 - index), "day");
    const weekEnd = weekStart.add(6, "day");
    const { rows } = await pool.query(
      `
        SELECT COALESCE(SUM(amount), 0) as revenue
        FROM payments
        WHERE status = 'paid'
          AND created_at::date BETWEEN $1::date AND $2::date
      `,
      [weekStart.format("YYYY-MM-DD"), weekEnd.format("YYYY-MM-DD")]
    );
    weeklyTrend.push({
      period: `${weekStart.format("YYYY-MM-DD")}_${weekEnd.format("YYYY-MM-DD")}`,
      label: `${weekStart.format("DD MMM")} - ${weekEnd.format("DD MMM")}`,
      startDate: weekStart.format("YYYY-MM-DD"),
      endDate: weekEnd.format("YYYY-MM-DD"),
      revenue: Number(rows[0]?.revenue || 0)
    });
  }

  const monthlyTrend = [];
  for (let index = 0; index < 6; index += 1) {
    const monthDate = dayjs().startOf("month").subtract(5 - index, "month");
    const { rows } = await pool.query(
      `
        SELECT COALESCE(SUM(amount), 0) as revenue
        FROM payments
        WHERE status = 'paid'
          AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $1::date)
      `,
      [monthDate.format("YYYY-MM-DD")]
    );
    monthlyTrend.push({
      period: monthDate.format("YYYY-MM"),
      label: monthDate.format("MMM"),
      startDate: monthDate.startOf("month").format("YYYY-MM-DD"),
      endDate: monthDate.endOf("month").format("YYYY-MM-DD"),
      revenue: Number(rows[0]?.revenue || 0)
    });
  }

  const monthlyProfitTrend = monthlyTrend.map((item) => ({
    ...item,
    payroll: payroll.monthlyPayroll,
    expenses: payroll.monthlyPayroll + operatingExpenses.total,
    netProfit: Number(item.revenue || 0) - payroll.monthlyPayroll - operatingExpenses.total
  }));

  const courses = await listAllCoursesAsync();
  const courseAnalysis = [];
  for (const course of courses) {
    const { rows: statsRows } = await pool.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE is_archived = FALSE)::int as "studentsCount",
          COUNT(DISTINCT teacher_id) FILTER (WHERE is_archived = FALSE AND teacher_id IS NOT NULL)::int as "groupsCount",
          COUNT(*) FILTER (WHERE status = 'active' AND is_archived = FALSE)::int as "activeCount",
          COUNT(*) FILTER (WHERE status = 'trial' AND is_archived = FALSE)::int as "trialCount",
          COUNT(*) FILTER (WHERE status = 'debtor' AND is_archived = FALSE)::int as "debtorsCount"
        FROM students
        WHERE course_id = $1
      `,
      [course.id]
    );
    const { rows: revenueRows } = await pool.query(
      `
        SELECT COALESCE(SUM(p.amount), 0) as total
        FROM payments p
        JOIN students s ON s.id = p.student_id
        WHERE s.course_id = $1 AND p.status = 'paid'
      `,
      [course.id]
    );
    const stats = statsRows[0] || {};
    const studentsCount = Number(stats.studentsCount || 0);
    const activeCount = Number(stats.activeCount || 0);
    courseAnalysis.push({
      id: course.id,
      title: course.title,
      studentsCount,
      groupsCount: Number(stats.groupsCount || 0),
      revenue: Number(revenueRows[0]?.total || 0),
      activeCount,
      trialCount: Number(stats.trialCount || 0),
      debtorsCount: Number(stats.debtorsCount || 0),
      efficiency: studentsCount ? Math.min(97, 64 + studentsCount * 2 + activeCount) : 0
    });
  }
  courseAnalysis.sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0) || Number(b.studentsCount || 0) - Number(a.studentsCount || 0));

  const teachers = await listTeachersAsync();
  const teacherPerformance = [];
  for (const teacher of teachers) {
    const { rows: studentRows } = await pool.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE is_archived = FALSE)::int as "studentsCount",
          COUNT(*) FILTER (WHERE status = 'active' AND is_archived = FALSE)::int as "activeStudentsCount",
          COUNT(*) FILTER (WHERE status = 'trial' AND is_archived = FALSE)::int as "trialStudentsCount",
          COUNT(*) FILTER (WHERE status = 'debtor' AND is_archived = FALSE)::int as "debtorsCount"
        FROM students
        WHERE teacher_id = $1
      `,
      [teacher.id]
    );
    const { rows: attendanceRows } = await pool.query(
      `
        SELECT
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)::int as "presentCount",
          COUNT(*)::int as "totalCount"
        FROM attendance
        WHERE teacher_id = $1
      `,
      [teacher.id]
    );
    const { rows: revenueRows } = await pool.query(
      `
        SELECT COALESCE(SUM(p.amount), 0) as total
        FROM payments p
        JOIN students s ON s.id = p.student_id
        WHERE s.teacher_id = $1 AND p.status = 'paid'
      `,
      [teacher.id]
    );
    const studentStats = studentRows[0] || {};
    const attendance = attendanceRows[0] || {};
    teacherPerformance.push({
      id: teacher.id,
      fullName: teacher.fullName,
      monthlySalary: Number(teacher.monthlySalary || 0),
      courseIds: teacher.courseIds || [],
      studentsCount: Number(studentStats.studentsCount || 0),
      activeStudentsCount: Number(studentStats.activeStudentsCount || 0),
      trialStudentsCount: Number(studentStats.trialStudentsCount || 0),
      debtorsCount: Number(studentStats.debtorsCount || 0),
      revenue: Number(revenueRows[0]?.total || 0),
      attendancePercent: Number(attendance.totalCount || 0)
        ? Math.round((Number(attendance.presentCount || 0) / Number(attendance.totalCount || 1)) * 100)
        : 0
    });
  }
  teacherPerformance.sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0) || Number(b.studentsCount || 0) - Number(a.studentsCount || 0));

  const { rows: breakdownRows } = await pool.query(
    `
      SELECT
        COUNT(*) FILTER (WHERE status = 'active' AND is_archived = FALSE)::int as "activeCount",
        COUNT(*) FILTER (WHERE status = 'trial' AND is_archived = FALSE)::int as "trialCount",
        COUNT(*) FILTER (WHERE status = 'debtor' AND is_archived = FALSE)::int as "debtorCount"
      FROM students
    `
  );

  const { rows: admissionsRows } = await pool.query(
    `
      SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as period,
             COUNT(*)::int as count
      FROM students
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) DESC
      LIMIT 6
    `
  );

  const cards = cardsRows[0] || {};
  return {
    cards: {
      monthlyRevenue: Number(cards.monthlyRevenue || 0),
      totalStudents: Number(cards.totalStudents || 0),
      debtorsCount: Number(cards.debtorsCount || 0),
      trialStudentsCount: Number(cards.trialStudentsCount || 0),
      teachersCount: payroll.teachersCount,
      teachersPayroll: payroll.monthlyPayroll,
      operatingExpenses: operatingExpenses.total,
      totalExpenses: payroll.monthlyPayroll + operatingExpenses.total,
      netProfit: Number(cards.monthlyRevenue || 0) - payroll.monthlyPayroll - operatingExpenses.total
    },
    monthlyRevenue,
    trends: {
      daily: dailyTrend,
      weekly: weeklyTrend,
      monthly: monthlyTrend,
      monthlyProfit: monthlyProfitTrend
    },
    courseAnalysis,
    teacherPerformance,
    studentStatusBreakdown: {
      activeCount: Number(breakdownRows[0]?.activeCount || 0),
      trialCount: Number(breakdownRows[0]?.trialCount || 0),
      debtorCount: Number(breakdownRows[0]?.debtorCount || 0)
    },
    admissionsTrend: admissionsRows.reverse(),
    expenses: operatingExpenses
  };
}

export async function getFinanceSummaryAsync() {
  const pool = getSupabasePool();
  const payroll = await getTeacherPayrollSummaryAsync();
  const operatingExpenses = await getOperatingExpenseSummaryAsync();

  const { rows: totalsRows } = await pool.query(
    `
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as "totalRevenue",
        COALESCE(SUM(CASE WHEN status = 'paid' AND created_at::date = CURRENT_DATE THEN amount ELSE 0 END), 0) as "todayRevenue",
        COALESCE(SUM(CASE WHEN status = 'paid' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as "monthlyRevenue"
      FROM payments
    `
  );

  const { rows: debtRows } = await pool.query(
    `
      SELECT COUNT(*)::int as "debtorsCount", COALESCE(SUM(ABS(balance)), 0) as "debtAmount"
      FROM students
      WHERE status = 'debtor' AND is_archived = FALSE
    `
  );

  const courses = await listAllCoursesAsync();
  const byCourse = [];
  for (const course of courses) {
    const { rows } = await pool.query(
      `
        SELECT COALESCE(SUM(p.amount), 0) as total
        FROM payments p
        JOIN students s ON s.id = p.student_id
        WHERE s.course_id = $1 AND p.status = 'paid'
      `,
      [course.id]
    );
    byCourse.push({ title: course.title, revenue: Number(rows[0]?.total || 0) });
  }
  byCourse.sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0));

  const { rows: paymentMethodsRows } = await pool.query(
    `
      SELECT method, COUNT(*)::int as count, COALESCE(SUM(amount), 0) as amount
      FROM payments
      WHERE status = 'paid'
      GROUP BY method
      ORDER BY amount DESC
    `
  );

  const { rows: monthlyRows } = await pool.query(
    `
      SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as period,
             COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as revenue
      FROM payments
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) DESC
      LIMIT 6
    `
  );
  const monthlyTrend = monthlyRows.reverse().map((item) => ({
    ...item,
    revenue: Number(item.revenue || 0),
    payroll: payroll.monthlyPayroll,
    operatingExpenses: operatingExpenses.total,
    totalExpenses: payroll.monthlyPayroll + operatingExpenses.total,
    netProfit: Number(item.revenue || 0) - payroll.monthlyPayroll - operatingExpenses.total
  }));

  const teachers = await listTeachersAsync();
  const topTeachers = [];
  for (const teacher of teachers) {
    const { rows } = await pool.query(
      `
        SELECT COALESCE(SUM(p.amount), 0) as total
        FROM payments p
        JOIN students s ON s.id = p.student_id
        WHERE s.teacher_id = $1 AND p.status = 'paid'
      `,
      [teacher.id]
    );
    topTeachers.push({
      id: teacher.id,
      fullName: teacher.fullName,
      monthlySalary: Number(teacher.monthlySalary || 0),
      revenue: Number(rows[0]?.total || 0)
    });
  }
  topTeachers.sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0));

  const totals = totalsRows[0] || {};
  return {
    totals: {
      ...totals,
      totalRevenue: Number(totals.totalRevenue || 0),
      todayRevenue: Number(totals.todayRevenue || 0),
      monthlyRevenue: Number(totals.monthlyRevenue || 0),
      teachersPayroll: payroll.monthlyPayroll,
      operatingExpenses: operatingExpenses.total,
      totalExpenses: payroll.monthlyPayroll + operatingExpenses.total,
      netProfit: Number(totals.monthlyRevenue || 0) - payroll.monthlyPayroll - operatingExpenses.total
    },
    debtors: {
      debtorsCount: Number(debtRows[0]?.debtorsCount || 0),
      debtAmount: Number(debtRows[0]?.debtAmount || 0)
    },
    byCourse,
    paymentMethods: paymentMethodsRows.map((item) => ({ ...item, count: Number(item.count || 0), amount: Number(item.amount || 0) })),
    monthlyTrend,
    topTeachers: topTeachers.slice(0, 5),
    payroll,
    expenses: operatingExpenses
  };
}

export function getSettingsBundle() {
  const rows = db.prepare(`SELECT key, value FROM settings`).all();
  const settings = Object.fromEntries(rows.map((item) => [item.key, item.value]));
  return {
    settings,
    teachers: listTeachers(),
    courses: listAllCourses(),
    branches: listBranches()
  };
}

export async function getSettingsBundleAsync() {
  const { rows } = await getSupabasePool().query(`SELECT key, value FROM settings`);
  const settings = Object.fromEntries(rows.map((item) => [item.key, item.value]));
  return {
    settings,
    teachers: await listTeachersAsync(),
    courses: await listAllCoursesAsync(),
    branches: await listBranchesAsync()
  };
}

export function saveSettings(payload) {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  Object.entries(payload).forEach(([key, value]) => stmt.run(key, String(value ?? ""), now));
}

export async function saveSettingsAsync(payload) {
  const pool = getSupabasePool();
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  for (const [key, value] of Object.entries(payload)) {
    await pool.query(
      `
        INSERT INTO settings (key, value, updated_at)
        VALUES ($1, $2, $3)
        ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
      `,
      [key, String(value ?? ""), now]
    );
  }
}

export function updateUserProfile(userId, payload) {
  const current = db.prepare(`SELECT username, password_hash as passwordHash FROM users WHERE id = ?`).get(userId);
  const nextPasswordHash = payload.password ? payload.password : null;
  const nextProfileImage = persistProfileImage(payload.profileImage);
  db.prepare(`
    UPDATE users
    SET full_name = ?, username = ?, phone = COALESCE(?, phone), profile_image = ?
    WHERE id = ?
  `).run(payload.fullName, payload.username, payload.phone || null, nextProfileImage, userId);

  if (nextPasswordHash) {
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(nextPasswordHash, userId);
  }

  return getUserProfileLite(userId);
}

export function getUserProfileLite(userId) {
  return db.prepare(`
    SELECT id, full_name as fullName, username, phone, role, telegram_id as telegramId, profile_image as profileImage
    FROM users
    WHERE id = ?
  `).get(userId);
}

function mapUserProfileRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    fullName: row.fullname ?? row.fullName,
    username: row.username,
    phone: row.phone,
    role: row.role,
    telegramId: row.telegramid ?? row.telegramId,
    profileImage: row.profileimage ?? row.profileImage
  };
}

async function getTrialProgressAsync(studentId, enrolledAt) {
  const pool = getSupabasePool();
  const { rows } = await pool.query(
    `
      SELECT COUNT(*)::int as count
      FROM attendance
      WHERE student_id = $1
        AND status = 'present'
        AND lesson_date >= $2::date
    `,
    [studentId, enrolledAt || dayjs().format("YYYY-MM-DD")]
  );
  return Number(rows[0]?.count || 0);
}

async function getUserProfileLiteAsync(userId) {
  const pool = getSupabasePool();
  const { rows } = await pool.query(
    `
      SELECT id, full_name as "fullName", username, phone, role, telegram_id as "telegramId", profile_image as "profileImage"
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );
  return rows[0] ? mapUserProfileRow(rows[0]) : null;
}

export async function getStudentAuthByPhoneAsync(phone) {
  const pool = getSupabasePool();
  const { rows } = await pool.query(
    `
      SELECT
        sa.id,
        sa.student_id as "studentId",
        sa.phone,
        sa.access_token as "accessToken",
        sa.password_hash as "passwordHash",
        s.user_id as "userId"
      FROM student_auth sa
      JOIN students s ON s.id = sa.student_id
      WHERE REPLACE(sa.phone, ' ', '') = $1
      LIMIT 1
    `,
    [normalizePhone(phone)]
  );
  return rows[0] || null;
}

export async function loginStudentByAccessTokenAsync(accessToken) {
  const pool = getSupabasePool();
  const { rows } = await pool.query(
    `
      SELECT sa.student_id as "studentId", s.user_id as "userId"
      FROM student_auth sa
      JOIN students s ON s.id = sa.student_id
      WHERE sa.access_token = $1
      LIMIT 1
    `,
    [accessToken]
  );
  const auth = rows[0];

  if (!auth) {
    throw new Error("Kirish tokeni topilmadi");
  }

  return getUserProfileLiteAsync(auth.userId);
}

export async function getStudentByPhoneAsync(phone) {
  const pool = getSupabasePool();
  const { rows } = await pool.query(
    `
      SELECT
        s.id,
        u.full_name as "fullName",
        u.phone,
        u.telegram_id as "telegramId",
        s.balance,
        s.status,
        s.enrolled_at as "enrolledAt",
        s.billing_start_date as "billingStartDate",
        s.trial_required as "trialRequired",
        s.payment_due_date as "paymentDueDate",
        s.last_payment_date as "lastPaymentDate",
        s.is_archived as "isArchived",
        c.id as "courseId",
        c.title as "courseTitle",
        c.monthly_fee as "monthlyFee",
        COALESCE(s.group_schedule, c.schedule) as schedule,
        t.id as "teacherId",
        t.full_name as "teacherName",
        s.user_id as "userId",
        u.profile_image as "profileImage"
      FROM students s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN courses c ON c.id = s.course_id
      LEFT JOIN users t ON t.id = s.teacher_id
      WHERE u.phone = $1
      LIMIT 1
    `,
    [phone]
  );
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    ...row,
    trialRequired: Number(row.trialRequired || 3),
    trialProgress: await getTrialProgressAsync(row.id, row.enrolledAt)
  };
}

async function getStudentAuthRecordByStudentIdAsync(studentId) {
  const pool = getSupabasePool();
  const { rows } = await pool.query(
    `
      SELECT id, student_id as "studentId", phone, access_token as "accessToken", password_hash as "passwordHash"
      FROM student_auth
      WHERE student_id = $1
      LIMIT 1
    `,
    [studentId]
  );
  return rows[0] || null;
}

async function ensureStudentAuthAsync(studentId, phone, passwordHash = null) {
  const pool = getSupabasePool();
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  const normalizedPhone = normalizePhone(phone);
  const existing = await getStudentAuthRecordByStudentIdAsync(studentId);

  if (existing) {
    const nextAccessToken = existing.accessToken || generateAccessToken();
    await pool.query(
      `
        UPDATE student_auth
        SET phone = $1, access_token = $2, password_hash = COALESCE($3, password_hash), updated_at = $4
        WHERE student_id = $5
      `,
      [normalizedPhone, nextAccessToken, passwordHash, now, studentId]
    );

    return {
      ...existing,
      phone: normalizedPhone,
      accessToken: nextAccessToken,
      passwordHash: passwordHash || existing.passwordHash
    };
  }

  const accessToken = generateAccessToken();
  await pool.query(
    `
      INSERT INTO student_auth (student_id, phone, access_token, password_hash, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [studentId, normalizedPhone, accessToken, passwordHash, now, now]
  );

  return getStudentAuthRecordByStudentIdAsync(studentId);
}

export async function validateStudentRegistrationTokenAsync(token) {
  const pool = getSupabasePool();
  const { rows } = await pool.query(
    `
      SELECT
        qt.id,
        qt.token,
        qt.student_id as "studentId",
        qt.expires_at as "expiresAt",
        qt.used,
        s.is_registered as "isRegistered",
        u.full_name as "fullName",
        u.phone
      FROM qr_tokens qt
      JOIN students s ON s.id = qt.student_id
      JOIN users u ON u.id = s.user_id
      WHERE qt.token = $1
      LIMIT 1
    `,
    [token]
  );
  const row = rows[0];

  if (!row) {
    throw new Error("Token topilmadi");
  }
  if (row.used) {
    throw new Error("Token allaqachon ishlatilgan");
  }
  if (row.isRegistered) {
    throw new Error("Student allaqachon ro'yxatdan o'tgan");
  }
  if (dayjs(row.expiresAt).isBefore(dayjs())) {
    throw new Error("Token muddati tugagan");
  }

  const [firstName = "", ...rest] = (row.fullName || "").split(" ");
  return {
    token: row.token,
    studentId: Number(row.studentId),
    firstName,
    lastName: rest.join(" "),
    fullName: row.fullName,
    phone: row.phone,
    expiresAt: row.expiresAt
  };
}

export async function registerStudentByTokenAsync({ token, phone, passwordHash }) {
  const qr = await validateStudentRegistrationTokenAsync(token);
  if (normalizePhone(qr.phone) !== normalizePhone(phone)) {
    throw new Error("Telefon raqam student ma'lumoti bilan mos emas");
  }

  const pool = getSupabasePool();
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  await ensureStudentAuthAsync(qr.studentId, phone, passwordHash);

  await pool.query(`UPDATE students SET is_registered = TRUE WHERE id = $1`, [qr.studentId]);
  await pool.query(`UPDATE qr_tokens SET used = TRUE, used_at = $1 WHERE token = $2`, [now, token]);

  return qr;
}

export async function createTelegramLinkCodeAsync(phone) {
  const student = await getStudentByPhoneAsync(phone);
  if (!student) {
    return null;
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await getSupabasePool().query(
    `
      INSERT INTO telegram_links (student_id, phone, code, used, created_at)
      VALUES ($1, $2, $3, FALSE, $4)
    `,
    [student.id, phone, code, dayjs().format("YYYY-MM-DD HH:mm:ss")]
  );

  return {
    studentId: student.id,
    code
  };
}

export async function consumeTelegramCodeAsync(code, telegramId) {
  const pool = getSupabasePool();
  const { rows } = await pool.query(
    `
      SELECT id, student_id as "studentId"
      FROM telegram_links
      WHERE code = $1 AND used = FALSE
      ORDER BY id DESC
      LIMIT 1
    `,
    [code]
  );
  const link = rows[0];

  if (!link) {
    return null;
  }

  const studentResult = await pool.query(
    `
      SELECT s.id, s.user_id as "userId", u.full_name as "fullName"
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = $1
      LIMIT 1
    `,
    [link.studentId]
  );
  const student = studentResult.rows[0];

  await pool.query(`UPDATE telegram_links SET used = TRUE WHERE id = $1`, [link.id]);
  await pool.query(`UPDATE users SET telegram_id = $1 WHERE id = $2`, [String(telegramId), student.userId]);

  return student;
}

export async function listBranchesAsync() {
  const { rows } = await getSupabasePool().query(
    `SELECT id, name, address FROM branches ORDER BY name`
  );
  return rows.map((row) => ({ ...row, id: Number(row.id) }));
}

export async function listCoursesAsync() {
  const { rows } = await getSupabasePool().query(
    `
      SELECT c.id, c.branch_id as "branchId", b.name as "branchName", c.title, c.monthly_fee as "monthlyFee", c.schedule, c.is_active as "isActive"
      FROM courses c
      LEFT JOIN branches b ON b.id = c.branch_id
      WHERE c.is_active = TRUE
      ORDER BY c.title
    `
  );
  return rows.map((item) => ({ ...item, id: Number(item.id), branchId: item.branchId ? Number(item.branchId) : null, isActive: Boolean(item.isActive) }));
}

export async function listAllCoursesAsync() {
  const { rows } = await getSupabasePool().query(
    `
      SELECT c.id, c.branch_id as "branchId", b.name as "branchName", c.title, c.monthly_fee as "monthlyFee", c.schedule, c.is_active as "isActive", c.created_at as "createdAt"
      FROM courses c
      LEFT JOIN branches b ON b.id = c.branch_id
      ORDER BY c.title
    `
  );
  return rows.map((item) => ({ ...item, id: Number(item.id), branchId: item.branchId ? Number(item.branchId) : null, isActive: Boolean(item.isActive) }));
}

export async function listTeachersAsync() {
  const pool = getSupabasePool();
  const teacherResult = await pool.query(
    `
      SELECT id, full_name as "fullName", username, phone, monthly_salary as "monthlySalary", profile_image as "profileImage"
      FROM users
      WHERE role = 'teacher'
      ORDER BY full_name
    `
  );
  const assignmentResult = await pool.query(
    `SELECT teacher_id as "teacherId", course_id as "courseId" FROM teacher_course_assignments`
  );

  return teacherResult.rows.map((teacher) => ({
    ...teacher,
    id: Number(teacher.id),
    monthlySalary: Number(teacher.monthlySalary || 0),
    courseIds: assignmentResult.rows
      .filter((item) => Number(item.teacherId) === Number(teacher.id))
      .map((item) => Number(item.courseId))
  }));
}

export async function listNotificationsAsync({ userId = null, role = null, unreadOnly = false } = {}) {
  const values = [];
  const clauses = [];

  if (userId) {
    values.push(userId);
    clauses.push(`(target_user_id = $${values.length} OR target_user_id IS NULL)`);
  }
  if (role) {
    values.push(role);
    clauses.push(`(target_role = $${values.length} OR target_role IS NULL)`);
  }
  if (unreadOnly) {
    clauses.push(`status = 'unread'`);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await getSupabasePool().query(
    `
      SELECT id, target_role as "targetRole", target_user_id as "targetUserId", type, title, message, metadata, status, created_at as "createdAt", read_at as "readAt"
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 50
    `,
    values
  );
  return rows.map((item) => ({ ...item, id: Number(item.id), targetUserId: item.targetUserId ? Number(item.targetUserId) : null }));
}

export async function listContactRequestsAsync({ unreadOnly = false } = {}) {
  const { rows } = await getSupabasePool().query(
    `
      SELECT id, full_name as "fullName", phone, message, status, created_at as "createdAt", read_at as "readAt"
      FROM contact_requests
      ${unreadOnly ? `WHERE status = 'new'` : ""}
      ORDER BY created_at DESC, id DESC
    `
  );
  return rows.map((row) => ({ ...row, id: Number(row.id) }));
}

export async function updateUserProfileAsync(userId, payload) {
  const pool = getSupabasePool();
  const currentResult = await pool.query(
    `SELECT username, password_hash as "passwordHash", profile_image as "profileImage" FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  const current = currentResult.rows[0];
  const nextPasswordHash = payload.password ? payload.password : null;
  const nextProfileImage = payload.profileImage ? persistProfileImage(payload.profileImage) : current?.profileImage || null;

  await pool.query(
    `
      UPDATE users
      SET full_name = $1, username = $2, phone = COALESCE($3, phone), profile_image = $4
      WHERE id = $5
    `,
    [payload.fullName, payload.username, payload.phone || null, nextProfileImage, userId]
  );

  if (nextPasswordHash) {
    await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [nextPasswordHash, userId]);
  }

  return getUserProfileLiteAsync(userId);
}

export async function listDeveloperProfilesAsync() {
  const { rows } = await getSupabasePool().query(
    `
      SELECT
        id, slug, username, full_name as "fullName", age, role_title as "roleTitle",
        short_bio as "shortBio", bio, skills, image, banner_image as "bannerImage",
        certificate_image as "certificateImage", telegram_url as "telegramUrl",
        instagram_url as "instagramUrl", github_url as "githubUrl",
        website_url as "websiteUrl", is_active as "isActive"
      FROM developer_profiles
      WHERE is_active = TRUE
      ORDER BY id ASC
    `
  );
  return rows.map(mapDeveloperRow);
}

export async function getDeveloperProfileBySlugAsync(slug) {
  const { rows } = await getSupabasePool().query(
    `
      SELECT
        id, slug, username, full_name as "fullName", age, role_title as "roleTitle",
        short_bio as "shortBio", bio, skills, image, banner_image as "bannerImage",
        certificate_image as "certificateImage", telegram_url as "telegramUrl",
        instagram_url as "instagramUrl", github_url as "githubUrl",
        website_url as "websiteUrl", is_active as "isActive"
      FROM developer_profiles
      WHERE slug = $1 AND is_active = TRUE
      LIMIT 1
    `,
    [slug]
  );
  return mapDeveloperRow(rows[0]);
}

export async function getDeveloperProfileByUsernameAsync(username) {
  const { rows } = await getSupabasePool().query(
    `
      SELECT
        id, slug, username, password_hash as "passwordHash", full_name as "fullName", age, role_title as "roleTitle",
        short_bio as "shortBio", bio, skills, image, banner_image as "bannerImage",
        certificate_image as "certificateImage", telegram_url as "telegramUrl",
        instagram_url as "instagramUrl", github_url as "githubUrl",
        website_url as "websiteUrl", is_active as "isActive"
      FROM developer_profiles
      WHERE username = $1 AND is_active = TRUE
      LIMIT 1
    `,
    [username]
  );
  const row = rows[0];
  return row ? { ...mapDeveloperRow(row), passwordHash: row.passwordHash } : null;
}

export async function getDeveloperProfileByIdAsync(id) {
  const { rows } = await getSupabasePool().query(
    `
      SELECT
        id, slug, username, full_name as "fullName", age, role_title as "roleTitle",
        short_bio as "shortBio", bio, skills, image, banner_image as "bannerImage",
        certificate_image as "certificateImage", telegram_url as "telegramUrl",
        instagram_url as "instagramUrl", github_url as "githubUrl",
        website_url as "websiteUrl", is_active as "isActive"
      FROM developer_profiles
      WHERE id = $1 AND is_active = TRUE
      LIMIT 1
    `,
    [id]
  );
  return mapDeveloperRow(rows[0]);
}

export function createCourse(payload) {
  const id = db.prepare(`
    INSERT INTO courses (branch_id, title, monthly_fee, schedule, is_active, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(payload.branchId || null, payload.title, payload.monthlyFee, payload.schedule, dayjs().format("YYYY-MM-DD HH:mm:ss")).lastInsertRowid;
  return id;
}

export async function createCourseAsync(payload) {
  const result = await getSupabasePool().query(
    `
      INSERT INTO courses (branch_id, title, monthly_fee, schedule, is_active, created_at)
      VALUES ($1, $2, $3, $4, TRUE, $5)
      RETURNING id
    `,
    [payload.branchId || null, payload.title, payload.monthlyFee, payload.schedule, dayjs().format("YYYY-MM-DD HH:mm:ss")]
  );
  return Number(result.rows[0].id);
}

export function createTeacher(payload) {
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  const passwordHash = payload.passwordHash;
  if (!Array.isArray(payload.courseIds) || payload.courseIds.length === 0) {
    throw new Error("O'qituvchiga kamida bitta kurs biriktirilishi kerak");
  }
  const nextProfileImage = persistProfileImage(payload.profileImage);
  const teacherId = db.prepare(`
    INSERT INTO users (full_name, username, password_hash, phone, monthly_salary, role, telegram_id, profile_image, created_at)
    VALUES (?, ?, ?, ?, ?, 'teacher', NULL, ?, ?)
  `).run(
    payload.fullName,
    payload.username,
    passwordHash,
    payload.phone || null,
    Number(payload.monthlySalary || 0),
    nextProfileImage,
    now
  ).lastInsertRowid;
  syncTeacherCourses(teacherId, payload.courseIds || []);
  return teacherId;
}

export async function createTeacherAsync(payload) {
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  const passwordHash = payload.passwordHash;
  if (!Array.isArray(payload.courseIds) || payload.courseIds.length === 0) {
    throw new Error("O'qituvchiga kamida bitta kurs biriktirilishi kerak");
  }
  const nextProfileImage = persistProfileImage(payload.profileImage);
  const result = await getSupabasePool().query(
    `
      INSERT INTO users (full_name, username, password_hash, phone, monthly_salary, role, telegram_id, profile_image, created_at)
      VALUES ($1, $2, $3, $4, $5, 'teacher', NULL, $6, $7)
      RETURNING id
    `,
    [
      payload.fullName,
      payload.username,
      passwordHash,
      payload.phone || null,
      Number(payload.monthlySalary || 0),
      nextProfileImage,
      now
    ]
  );
  const teacherId = Number(result.rows[0].id);
  await syncTeacherCoursesAsync(teacherId, payload.courseIds || []);
  return teacherId;
}

export function updateTeacher(teacherId, payload) {
  if (!Array.isArray(payload.courseIds) || payload.courseIds.length === 0) {
    throw new Error("O'qituvchiga kamida bitta kurs biriktirilishi kerak");
  }
  const nextProfileImage = persistProfileImage(payload.profileImage);
  db.prepare(`
    UPDATE users
    SET full_name = ?, username = ?, phone = ?, monthly_salary = ?, profile_image = ?
    WHERE id = ? AND role = 'teacher'
  `).run(
    payload.fullName,
    payload.username,
    payload.phone || null,
    Number(payload.monthlySalary || 0),
    nextProfileImage,
    teacherId
  );

  if (payload.passwordHash) {
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ? AND role = 'teacher'`).run(payload.passwordHash, teacherId);
  }

  syncTeacherCourses(teacherId, payload.courseIds || []);
}

export async function updateTeacherAsync(teacherId, payload) {
  if (!Array.isArray(payload.courseIds) || payload.courseIds.length === 0) {
    throw new Error("O'qituvchiga kamida bitta kurs biriktirilishi kerak");
  }
  const nextProfileImage = persistProfileImage(payload.profileImage);
  await getSupabasePool().query(
    `
      UPDATE users
      SET full_name = $1, username = $2, phone = $3, monthly_salary = $4, profile_image = $5
      WHERE id = $6 AND role = 'teacher'
    `,
    [
      payload.fullName,
      payload.username,
      payload.phone || null,
      Number(payload.monthlySalary || 0),
      nextProfileImage,
      teacherId
    ]
  );

  if (payload.passwordHash) {
    await getSupabasePool().query(`UPDATE users SET password_hash = $1 WHERE id = $2 AND role = 'teacher'`, [payload.passwordHash, teacherId]);
  }

  await syncTeacherCoursesAsync(teacherId, payload.courseIds || []);
}

export function deleteTeacher(teacherId) {
  const assigned = db.prepare(`SELECT COUNT(*) as count FROM students WHERE teacher_id = ? AND is_archived = 0`).get(teacherId);
  if (assigned.count > 0) {
    return { blocked: true };
  }
  db.prepare(`DELETE FROM teacher_course_assignments WHERE teacher_id = ?`).run(teacherId);
  db.prepare(`DELETE FROM users WHERE id = ? AND role = 'teacher'`).run(teacherId);
  return { blocked: false };
}

export async function deleteTeacherAsync(teacherId) {
  const { rows } = await getSupabasePool().query(
    `SELECT COUNT(*)::int as count FROM students WHERE teacher_id = $1 AND is_archived = FALSE`,
    [teacherId]
  );
  if (Number(rows[0]?.count || 0) > 0) {
    return { blocked: true };
  }
  await getSupabasePool().query(`DELETE FROM teacher_course_assignments WHERE teacher_id = $1`, [teacherId]);
  await getSupabasePool().query(`DELETE FROM users WHERE id = $1 AND role = 'teacher'`, [teacherId]);
  return { blocked: false };
}

export function updateCourse(courseId, payload) {
  db.prepare(`
    UPDATE courses
    SET branch_id = ?, title = ?, monthly_fee = ?, schedule = ?, is_active = ?
    WHERE id = ?
  `).run(payload.branchId || null, payload.title, payload.monthlyFee, payload.schedule, payload.isActive ? 1 : 0, courseId);
}

export async function updateCourseAsync(courseId, payload) {
  await getSupabasePool().query(
    `
      UPDATE courses
      SET branch_id = $1, title = $2, monthly_fee = $3, schedule = $4, is_active = $5
      WHERE id = $6
    `,
    [payload.branchId || null, payload.title, payload.monthlyFee, payload.schedule, payload.isActive !== false, courseId]
  );
}

export function deleteCourse(courseId) {
  const used = db.prepare(`SELECT COUNT(*) as count FROM students WHERE course_id = ? AND is_archived = 0`).get(courseId);
  const assignedTeachers = db.prepare(`SELECT COUNT(*) as count FROM teacher_course_assignments WHERE course_id = ?`).get(courseId);
  if (used.count > 0 || assignedTeachers.count > 0) {
    db.prepare(`UPDATE courses SET is_active = 0 WHERE id = ?`).run(courseId);
    return { softDeleted: true };
  }
  db.prepare(`DELETE FROM teacher_course_assignments WHERE course_id = ?`).run(courseId);
  db.prepare(`DELETE FROM courses WHERE id = ?`).run(courseId);
  return { softDeleted: false };
}

export async function deleteCourseAsync(courseId) {
  const usedResult = await getSupabasePool().query(
    `SELECT COUNT(*)::int as count FROM students WHERE course_id = $1 AND is_archived = FALSE`,
    [courseId]
  );
  const teacherResult = await getSupabasePool().query(
    `SELECT COUNT(*)::int as count FROM teacher_course_assignments WHERE course_id = $1`,
    [courseId]
  );
  const used = Number(usedResult.rows[0]?.count || 0);
  const assignedTeachers = Number(teacherResult.rows[0]?.count || 0);
  if (used > 0 || assignedTeachers > 0) {
    await getSupabasePool().query(`UPDATE courses SET is_active = FALSE WHERE id = $1`, [courseId]);
    return { softDeleted: true };
  }
  await getSupabasePool().query(`DELETE FROM teacher_course_assignments WHERE course_id = $1`, [courseId]);
  await getSupabasePool().query(`DELETE FROM courses WHERE id = $1`, [courseId]);
  return { softDeleted: false };
}

export function buildStudentsCsv() {
  const students = listStudents({ includeArchived: true });
  return [
    "Ism,Telefon,Kurs,O'qituvchi,Balans,Status,Arxiv",
    ...students.map((student) =>
      [student.fullName, student.phone, student.courseTitle || "", student.teacherName || "", student.balance, student.status, student.isArchived ? "Ha" : "Yo'q"].join(",")
    )
  ].join("\n");
}

export function buildFinanceCsv() {
  const summary = getFinanceSummary();
  return [
    "Kategoriya,Qiymat",
    `Jami tushum,${summary.totals.totalRevenue}`,
    `Bugungi tushum,${summary.totals.todayRevenue}`,
    `Oylik tushum,${summary.totals.monthlyRevenue}`,
    `O'qituvchi oyligi,${summary.totals.teachersPayroll}`,
    `Boshqa xarajatlar,${summary.totals.operatingExpenses}`,
    `Jami xarajatlar,${summary.totals.totalExpenses}`,
    `Sof foyda,${summary.totals.netProfit}`,
    `Qarzdorlar soni,${summary.debtors.debtorsCount}`,
    `Qarz summasi,${summary.debtors.debtAmount}`,
    "",
    "Kurs,Tushum",
    ...summary.byCourse.map((item) => `${item.title},${item.revenue}`)
  ].join("\n");
}

export function listDeveloperProfiles() {
  const rows = db.prepare(`
    SELECT
      id,
      slug,
      username,
      full_name as fullName,
      age,
      role_title as roleTitle,
      short_bio as shortBio,
      bio,
      skills,
      image,
      banner_image as bannerImage,
      certificate_image as certificateImage,
      telegram_url as telegramUrl,
      instagram_url as instagramUrl,
      github_url as githubUrl,
      website_url as websiteUrl,
      is_active as isActive
    FROM developer_profiles
    WHERE is_active = 1
    ORDER BY id ASC
  `).all();
  return rows.map(mapDeveloperRow);
}

export function getDeveloperProfileBySlug(slug) {
  const row = db.prepare(`
    SELECT
      id,
      slug,
      username,
      full_name as fullName,
      age,
      role_title as roleTitle,
      short_bio as shortBio,
      bio,
      skills,
      image,
      banner_image as bannerImage,
      certificate_image as certificateImage,
      telegram_url as telegramUrl,
      instagram_url as instagramUrl,
      github_url as githubUrl,
      website_url as websiteUrl,
      is_active as isActive
    FROM developer_profiles
    WHERE slug = ? AND is_active = 1
  `).get(slug);
  return mapDeveloperRow(row);
}

export function getDeveloperProfileByUsername(username) {
  const row = db.prepare(`
    SELECT
      id,
      slug,
      username,
      password_hash as passwordHash,
      full_name as fullName,
      age,
      role_title as roleTitle,
      short_bio as shortBio,
      bio,
      skills,
      image,
      banner_image as bannerImage,
      certificate_image as certificateImage,
      telegram_url as telegramUrl,
      instagram_url as instagramUrl,
      github_url as githubUrl,
      website_url as websiteUrl,
      is_active as isActive
    FROM developer_profiles
    WHERE username = ? AND is_active = 1
  `).get(username);
  return row ? { ...mapDeveloperRow(row), passwordHash: row.passwordHash } : null;
}

export function getDeveloperProfileById(id) {
  const row = db.prepare(`
    SELECT
      id,
      slug,
      username,
      full_name as fullName,
      age,
      role_title as roleTitle,
      short_bio as shortBio,
      bio,
      skills,
      image,
      banner_image as bannerImage,
      certificate_image as certificateImage,
      telegram_url as telegramUrl,
      instagram_url as instagramUrl,
      github_url as githubUrl,
      website_url as websiteUrl,
      is_active as isActive
    FROM developer_profiles
    WHERE id = ? AND is_active = 1
  `).get(id);
  return mapDeveloperRow(row);
}

export function updateDeveloperProfile(id, payload) {
  const current = getDeveloperProfileById(id);
  if (!current) {
    throw new Error("Dasturchi topilmadi");
  }

  if (payload.username && payload.username !== current.username) {
    const existing = db.prepare(`SELECT id FROM developer_profiles WHERE username = ? AND id != ?`).get(payload.username, id);
    if (existing) {
      throw new Error("Bu login band");
    }
  }

  const nextImage = payload.image ? persistProfileImage(payload.image) : current.image;
  const nextBannerImage = payload.bannerImage ? persistProfileImage(payload.bannerImage) : current.bannerImage;
  const nextCertificateImage = payload.certificateImage ? persistProfileImage(payload.certificateImage) : current.certificateImage;
  const nextPasswordHash = payload.passwordHash || null;

  db.prepare(`
    UPDATE developer_profiles
    SET
      full_name = ?,
      age = ?,
      role_title = ?,
      short_bio = ?,
      bio = ?,
      skills = ?,
      image = ?,
      banner_image = ?,
      certificate_image = ?,
      telegram_url = ?,
      instagram_url = ?,
      github_url = ?,
      website_url = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    payload.fullName,
    payload.age ? Number(payload.age) : null,
    payload.roleTitle,
    payload.shortBio || "",
    payload.bio || "",
    JSON.stringify(payload.skills || []),
    nextImage,
    nextBannerImage,
    nextCertificateImage,
    payload.telegramUrl || "",
    payload.instagramUrl || "",
    payload.githubUrl || "",
    payload.websiteUrl || "",
    dayjs().format("YYYY-MM-DD HH:mm:ss"),
    id
  );

  if (payload.username && payload.username !== current.username) {
    db.prepare(`UPDATE developer_profiles SET username = ? WHERE id = ?`).run(payload.username, id);
  }

  if (nextPasswordHash) {
    db.prepare(`UPDATE developer_profiles SET password_hash = ? WHERE id = ?`).run(nextPasswordHash, id);
  }

  return getDeveloperProfileById(id);
}

export function createContactRequest(payload) {
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  const id = db.prepare(`
    INSERT INTO contact_requests (full_name, phone, message, status, created_at)
    VALUES (?, ?, ?, 'new', ?)
  `).run(payload.fullName, payload.phone, payload.message, now).lastInsertRowid;

  createNotification({
    targetRole: "reception",
    type: "contact_request",
    title: "Yangi murojaat",
    message: `${payload.fullName} tomonidan yangi bog'lanish so'rovi yuborildi`,
    metadata: { contactRequestId: id, phone: payload.phone }
  });

  return id;
}

export async function createContactRequestAsync(payload) {
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  const result = await getSupabasePool().query(
    `
      INSERT INTO contact_requests (full_name, phone, message, status, created_at)
      VALUES ($1, $2, $3, 'new', $4)
      RETURNING id
    `,
    [payload.fullName, payload.phone, payload.message, now]
  );
  const id = Number(result.rows[0].id);

  await createNotificationAsync({
    targetRole: "reception",
    type: "contact_request",
    title: "Yangi murojaat",
    message: `${payload.fullName} tomonidan yangi bog'lanish so'rovi yuborildi`,
    metadata: { contactRequestId: id, phone: payload.phone }
  });

  return id;
}

export async function importStudentsBatch(rows, actorUserId = null) {
  const payloadRows = Array.isArray(rows) ? rows : [];
  if (!payloadRows.length) {
    throw new Error("Import uchun qator topilmadi");
  }

  const preview = await previewStudentImport({
    fileName: "reimport.json",
    fileDataBase64: Buffer.from(JSON.stringify(payloadRows), "utf8").toString("base64")
  });

  const invalid = preview.rows.filter(item => !item.ready);
  if (invalid.length) {
    throw new Error("Importda xatolar bor. Avval preview natijasini tekshiring.");
  }

  const created = [];
  preview.rows.forEach(item => {
    const result = addStudent(
      {
        fullName: item.fullName,
        phone: item.phone,
        courseId: Number(item.courseId),
        teacherId: Number(item.teacherId),
        balance: Number(item.balance || 0),
        status: item.status,
        enrolledAt: item.enrolledAt,
        billingStartDate: item.billingStartDate,
        schedule: item.schedule,
        imported: true,
        skipDirectorNotification: true
      },
      actorUserId
    );
    created.push({
      studentId: result.studentId,
      fullName: item.fullName
    });
  });

  createNotification({
    targetRole: "director",
    type: "students_imported",
    title: "Eski o'quvchilar import qilindi",
    message: `${created.length} ta o'quvchi import qilindi`
  });

  return {
    createdCount: created.length,
    created
  };
}

export function listContactRequests({ unreadOnly = false } = {}) {
  let query = `
    SELECT
      id,
      full_name as fullName,
      phone,
      message,
      status,
      created_at as createdAt,
      read_at as readAt
    FROM contact_requests
  `;

  const values = [];
  if (unreadOnly) {
    query += ` WHERE status = 'new'`;
  }

  query += ` ORDER BY datetime(created_at) DESC, id DESC`;
  return db.prepare(query).all(...values);
}

export function markContactRequestRead(id) {
  const result = db.prepare(`
    UPDATE contact_requests
    SET status = 'read', read_at = ?
    WHERE id = ?
  `).run(dayjs().format("YYYY-MM-DD HH:mm:ss"), id);
  return result.changes > 0;
}

export async function markContactRequestReadAsync(id) {
  const result = await getSupabasePool().query(
    `
      UPDATE contact_requests
      SET status = 'read', read_at = $1
      WHERE id = $2
      RETURNING id
    `,
    [dayjs().format("YYYY-MM-DD HH:mm:ss"), id]
  );
  return result.rowCount > 0;
}
