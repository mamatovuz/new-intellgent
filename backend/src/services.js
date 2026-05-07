import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import { Jimp, loadFont } from "jimp";
import { SANS_16_BLACK, SANS_32_BLACK, SANS_64_WHITE } from "jimp/fonts";
import QRCode from "qrcode";
import sharp from "sharp";
import { getDb } from "./db.js";
import { config } from "./config.js";

const db = getDb();
const uploadsDir = path.resolve("backend", "uploads");

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
  return `http://localhost:${config.port}/uploads/${fileName}`;
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

function generateAccessToken() {
  return crypto.randomBytes(24).toString("hex");
}

let fontsPromise = null;

function getFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      loadFont(SANS_16_BLACK),
      loadFont(SANS_32_BLACK),
      loadFont(SANS_64_WHITE)
    ]).then(([smallBlack, mediumBlack, largeWhite]) => ({ smallBlack, mediumBlack, largeWhite }));
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
  return `✅ ${monthLabel} oylik to'lovi to'ladi`;
}

function buildDebtCaption(student) {
  return `⚠️ Qarzingiz bor, iltimos to'lovni amalga oshiring`;
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
  const qrBuffer = await createQrCodeBuffer(
    `${config.webUrl}/student/login?phone=${encodeURIComponent(receipt.phone || "")}&password=12345678`,
    250
  );
  const qrDataUrl = encodeBufferDataUri(qrBuffer);
  const paymentCaption = buildPaymentCaption(receipt).replace(/^✅\s*/, "");
  const paidDate = dayjs(receipt.paidAt);
  const amountText = formatMoney(receipt.amount);
  const methodText = String(receipt.method || "manual").toUpperCase();

  const rowIcons = [
    {
      y: 350,
      markup: `
        <circle cx="140" cy="376" r="7" fill="#2563eb"/>
        <path d="M126 398c3-10 8-14 14-14s11 4 14 14" fill="#2563eb"/>
      `
    },
    {
      y: 431,
      markup: `
        <path d="M132 447c3 6 9 12 15 16l8-8c1-1 3-1 5 0l5 3c2 1 2 4 1 6l-3 6c-1 2-3 3-5 3-18-2-37-22-39-40 0-2 1-4 3-5l6-3c2-1 5-1 6 1l3 5c1 2 1 4 0 5l-5 6z" fill="#2563eb"/>
      `
    },
    {
      y: 512,
      markup: `
        <polygon points="140,527 123,536 140,545 157,536" fill="#2563eb"/>
        <path d="M128 540v7c7 5 17 5 24 0v-7" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
      `
    },
    {
      y: 593,
      markup: `
        <rect x="131" y="606" width="18" height="22" rx="2" fill="none" stroke="#2563eb" stroke-width="3"/>
        <line x1="135" y1="612" x2="145" y2="612" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
        <line x1="135" y1="618" x2="145" y2="618" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
      `
    },
    {
      y: 674,
      markup: `
        <rect x="129" y="687" width="22" height="18" rx="3" fill="none" stroke="#2563eb" stroke-width="3"/>
        <line x1="129" y1="694" x2="151" y2="694" stroke="#2563eb" stroke-width="3"/>
        <line x1="135" y1="684" x2="135" y2="690" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
        <line x1="145" y1="684" x2="145" y2="690" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
      `
    },
    {
      y: 755,
      markup: `
        <text x="140" y="790" text-anchor="middle" font-size="30" font-weight="700" fill="#2563eb">#</text>
      `
    }
  ].map(({ y, markup }) => `
    <rect x="114" y="${y}" width="52" height="52" rx="15" fill="#edf4ff"/>
    ${markup}
  `).join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">
      <defs>
        <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f58db"/>
          <stop offset="100%" stop-color="#0b2e86"/>
        </linearGradient>
        <linearGradient id="footer" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#edf4ff"/>
          <stop offset="100%" stop-color="#dbeafe"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="14" stdDeviation="24" flood-color="#11357f" flood-opacity="0.18"/>
        </filter>
      </defs>
      <rect width="1536" height="1024" fill="#f4f7fb"/>
      <rect x="32" y="27" width="1472" height="936" rx="28" fill="#ffffff" filter="url(#shadow)"/>
      <rect x="32" y="27" width="1472" height="292" rx="28" fill="url(#hero)"/>
      <rect x="32" y="292" width="1472" height="18" fill="#22c55e"/>

      <path d="M1150 130 C1300 80, 1450 110, 1515 160" stroke="rgba(255,255,255,0.12)" stroke-width="2" fill="none"/>
      <path d="M1110 170 C1260 120, 1420 150, 1505 205" stroke="rgba(255,255,255,0.10)" stroke-width="2" fill="none"/>
      <path d="M1070 215 C1220 165, 1380 195, 1495 255" stroke="rgba(255,255,255,0.08)" stroke-width="2" fill="none"/>

      <text x="104" y="143" font-size="78" font-weight="800" fill="#ffffff" font-family="Arial, Helvetica, sans-serif">TO'LOV QABUL QILINDI</text>

      <rect x="104" y="166" width="370" height="64" rx="16" fill="#ffffff"/>
      <g transform="translate(126 181)">
        <polygon points="0,8 18,0 36,8 36,31 18,40 0,31" fill="#1d4ed8"/>
        <polygon points="18,0 36,8 18,17 0,8" fill="#60a5fa"/>
        <polygon points="18,17 36,8 36,31 18,40" fill="#16a34a"/>
        <polygon points="18,17 0,8 0,31 18,40" fill="#3b82f6"/>
      </g>
      <text x="186" y="207" font-size="32" font-weight="800" fill="#163a8c" font-family="Arial, Helvetica, sans-serif">INTELLIGENT <tspan fill="#22c55e">PAY</tspan></text>
      <text x="104" y="269" font-size="28" font-weight="500" fill="#e9f2ff" font-family="Arial, Helvetica, sans-serif">Intelligent Education | Oylik to'lov cheki</text>

      <rect x="1038" y="79" width="414" height="149" rx="22" fill="#22c55e"/>
      <text x="1081" y="130" font-size="28" font-weight="700" fill="#ffffff" font-family="Arial, Helvetica, sans-serif">QABUL QILINGAN SUMMA</text>
      <text x="1081" y="193" font-size="58" font-weight="800" fill="#ffffff" font-family="Arial, Helvetica, sans-serif">${escapeXml(amountText)}</text>

      <rect x="96" y="350" width="910" height="448" fill="#ffffff"/>
      <line x1="1002" y1="350" x2="1002" y2="798" stroke="#e5edf8" stroke-width="2"/>
      <circle cx="1002" cy="574" r="8" fill="#e5edf8"/>
      ${rowIcons}
      <text x="208" y="391" font-size="34" font-weight="700" fill="#163a8c" font-family="Arial, Helvetica, sans-serif">To'lovchi:</text>
      <text x="378" y="391" font-size="34" font-weight="500" fill="#111827" font-family="Arial, Helvetica, sans-serif">${escapeXml(receipt.fullName)}</text>

      <text x="208" y="472" font-size="34" font-weight="700" fill="#163a8c" font-family="Arial, Helvetica, sans-serif">Telefon:</text>
      <text x="378" y="472" font-size="34" font-weight="500" fill="#111827" font-family="Arial, Helvetica, sans-serif">${escapeXml(receipt.phone || "-")}</text>

      <text x="208" y="553" font-size="34" font-weight="700" fill="#163a8c" font-family="Arial, Helvetica, sans-serif">Kurs:</text>
      <text x="378" y="553" font-size="34" font-weight="500" fill="#111827" font-family="Arial, Helvetica, sans-serif">${escapeXml(receipt.courseTitle || "-")}</text>

      <text x="208" y="634" font-size="34" font-weight="700" fill="#163a8c" font-family="Arial, Helvetica, sans-serif">Usul:</text>
      <text x="378" y="634" font-size="34" font-weight="500" fill="#111827" font-family="Arial, Helvetica, sans-serif">${escapeXml(methodText)}</text>

      <text x="208" y="715" font-size="34" font-weight="700" fill="#163a8c" font-family="Arial, Helvetica, sans-serif">Sana:</text>
      <text x="378" y="715" font-size="34" font-weight="500" fill="#111827" font-family="Arial, Helvetica, sans-serif">${escapeXml(paidDate.format("DD.MM.YYYY"))}</text>
      <text x="566" y="715" font-size="34" font-weight="500" fill="#c7d2e8" font-family="Arial, Helvetica, sans-serif">|</text>
      <circle cx="627" cy="703" r="11" fill="none" stroke="#2563eb" stroke-width="4"/>
      <line x1="627" y1="703" x2="627" y2="695" stroke="#2563eb" stroke-width="4" stroke-linecap="round"/>
      <line x1="627" y1="703" x2="634" y2="703" stroke="#2563eb" stroke-width="4" stroke-linecap="round"/>
      <text x="655" y="715" font-size="34" font-weight="700" fill="#2563eb" font-family="Arial, Helvetica, sans-serif">Vaqt:</text>
      <text x="772" y="715" font-size="34" font-weight="500" fill="#111827" font-family="Arial, Helvetica, sans-serif">${escapeXml(paidDate.format("HH:mm"))}</text>

      <text x="208" y="796" font-size="34" font-weight="700" fill="#163a8c" font-family="Arial, Helvetica, sans-serif">Tranzaksiya ID:</text>
      <text x="469" y="796" font-size="34" font-weight="500" fill="#111827" font-family="Arial, Helvetica, sans-serif">${escapeXml(String(receipt.id))}</text>

      <rect x="1072" y="336" width="390" height="462" rx="18" fill="#ffffff" stroke="#d7e3f7" stroke-width="2"/>
      <rect x="1072" y="336" width="390" height="18" rx="18" fill="#22c55e"/>
      <image href="${qrDataUrl}" x="1110" y="372" width="272" height="272"/>
      <rect x="1118" y="682" width="16" height="28" rx="3" fill="none" stroke="#22c55e" stroke-width="3"/>
      <circle cx="1126" cy="703" r="2" fill="#22c55e"/>
      <text x="1160" y="698" font-size="18" font-weight="500" fill="#111827" font-family="Arial, Helvetica, sans-serif">Kabinetga tez kirish QR</text>
      <line x1="1110" y1="720" x2="1406" y2="720" stroke="#e5edf8" stroke-width="2"/>
      <text x="1110" y="764" font-size="18" font-weight="700" fill="#163a8c" font-family="Arial, Helvetica, sans-serif">Default parol:</text>
      <text x="1280" y="764" font-size="18" font-weight="700" fill="#111827" font-family="Arial, Helvetica, sans-serif">12345678</text>

      <rect x="92" y="836" width="1376" height="130" rx="18" fill="url(#footer)"/>
      <rect x="124" y="872" width="68" height="68" rx="16" fill="#1d4ed8"/>
      <circle cx="158" cy="906" r="20" fill="#ffffff" opacity="0.95"/>
      <circle cx="158" cy="906" r="12" fill="#22c55e"/>
      <path d="M151 907l6 6 12-18" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="238" y="891" font-size="32" font-weight="800" fill="#142b6f" font-family="Arial, Helvetica, sans-serif">${escapeXml(paymentCaption)}</text>
      <text x="238" y="938" font-size="20" font-weight="500" fill="#1f2937" font-family="Arial, Helvetica, sans-serif">Chek avtomatik yaratildi. Telegram bot va kabinet ma'lumotlari bir-biriga bog'langan.</text>

      <g opacity="0.12">
        <circle cx="1330" cy="900" r="48" fill="none" stroke="#1d4ed8" stroke-width="2"/>
        <circle cx="1330" cy="900" r="70" fill="none" stroke="#1d4ed8" stroke-width="2"/>
        <rect x="1308" y="885" width="44" height="32" rx="8" fill="#1d4ed8"/>
        <rect x="1318" y="866" width="24" height="24" rx="12" fill="none" stroke="#1d4ed8" stroke-width="4"/>
      </g>
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
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
  image.print({ font: smallBlack, x: 152, y: 612, text: "Intelligent bot ogohlantirishi" });

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
    badge: `${student.courseTitle || "Kurs"} • Muddat: ${dueDate}`,
    tone: "success",
    qrUrl
  });

  return {
    caption: `⏰ ${student.fullName}, ${student.courseTitle || "kursingiz"} uchun oylik to'lov muddati ${dueDate} sanada tugaydi.`,
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
    badge: `${student.courseTitle || "Kurs"} • To'lov: ${formatMoney(amount)} • Muddat: ${student.paymentDueDate || dayjs().format("YYYY-MM-DD")}`,
    tone: "warning",
    qrUrl
  });

  return {
    caption: `🎓 ${student.fullName}, sinov muddati tugadi. Endi ${formatMoney(amount)} oylik to'lov talab qilinadi.`,
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

function addStudentHistory(studentId, actorUserId, action, title, details) {
  db.prepare(`
    INSERT INTO student_history (student_id, actor_user_id, action, title, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(studentId, actorUserId || null, action, title, details || null, dayjs().format("YYYY-MM-DD HH:mm:ss"));
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

function recalcStudentState(studentId) {
  const student = db.prepare(`
    SELECT s.id, s.balance, s.enrolled_at as enrolledAt, s.trial_required as trialRequired, c.monthly_fee as monthlyFee
    FROM students s
    LEFT JOIN courses c ON c.id = s.course_id
    WHERE s.id = ?
  `).get(studentId);

  if (!student) {
    return null;
  }

  const enrolledAt = student.enrolledAt || dayjs().format("YYYY-MM-DD");
  const trialRequired = Number(student.trialRequired || 3);
  const trialProgress = getTrialProgress(studentId, enrolledAt);
  const paymentDueDate = trialProgress >= trialRequired ? getNthTrialLessonDate(studentId, enrolledAt, trialRequired) : null;

  let status = "trial";
  if (trialProgress >= trialRequired) {
    status = Number(student.balance || 0) >= Number(student.monthlyFee || 0) ? "active" : "debtor";
  }

  db.prepare(`
    UPDATE students
    SET status = ?, enrolled_at = ?, trial_required = ?, payment_due_date = ?
    WHERE id = ?
  `).run(status, enrolledAt, trialRequired, paymentDueDate, studentId);

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
      s.trial_required as trialRequired,
      s.payment_due_date as paymentDueDate,
      s.last_payment_date as lastPaymentDate,
      s.is_archived as isArchived,
      c.id as courseId,
      c.title as courseTitle,
      c.monthly_fee as monthlyFee,
      c.schedule,
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
      s.trial_required as trialRequired,
      s.payment_due_date as paymentDueDate,
      s.last_payment_date as lastPaymentDate,
      s.is_archived as isArchived,
      c.id as courseId,
      c.title as courseTitle,
      c.monthly_fee as monthlyFee,
      c.schedule,
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
      s.trial_required as trialRequired,
      s.payment_due_date as paymentDueDate,
      s.last_payment_date as lastPaymentDate,
      s.is_archived as isArchived,
      c.id as courseId,
      c.title as courseTitle,
      c.monthly_fee as monthlyFee,
      c.schedule,
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
      s.trial_required as trialRequired,
      s.payment_due_date as paymentDueDate,
      s.last_payment_date as lastPaymentDate,
      s.is_archived as isArchived,
      c.id as courseId,
      c.title as courseTitle,
      c.monthly_fee as monthlyFee,
      c.schedule,
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
    SELECT id, amount, method, status, created_at as createdAt
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
      s.trial_required as trialRequired,
      s.payment_due_date as paymentDueDate,
      s.last_payment_date as lastPaymentDate,
      s.is_archived as isArchived,
      c.id as courseId,
      c.title as courseTitle,
      c.monthly_fee as monthlyFee,
      c.schedule,
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

export function addStudent(payload, actorUserId = null) {
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  const enrolledDate = dayjs().format("YYYY-MM-DD");
  const defaultPasswordHash = bcrypt.hashSync("12345678", 10);
  const createUser = db.prepare(`
    INSERT INTO users (full_name, username, password_hash, phone, monthly_salary, role, telegram_id, profile_image, created_at)
    VALUES (?, NULL, NULL, ?, 0, 'student', NULL, NULL, ?)
  `);
  const userId = createUser.run(payload.fullName, payload.phone, now).lastInsertRowid;

  const initialBalance = Number(payload.balance || 0);
  const status = "trial";

  if (!teacherCanTeachCourse(payload.teacherId, payload.courseId)) {
    throw new Error("Tanlangan o'qituvchi bu kursga biriktirilmagan");
  }

  const studentId = db.prepare(`
    INSERT INTO students (user_id, course_id, teacher_id, balance, status, enrolled_at, trial_required, payment_due_date, last_payment_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    payload.courseId,
    payload.teacherId,
    initialBalance,
    status,
    enrolledDate,
    3,
    null,
    null,
    now
  ).lastInsertRowid;

  const auth = ensureStudentAuth(studentId, payload.phone, defaultPasswordHash);
  db.prepare(`UPDATE students SET is_registered = 1 WHERE id = ?`).run(studentId);
  recalcStudentState(studentId);
  addStudentHistory(studentId, actorUserId, "created", "Student yaratildi", `${payload.fullName} tizimga qo'shildi. Sinov muddati 3 kun.`);
  createNotification({
    targetRole: "director",
    type: "student_created",
    title: "Yangi o'quvchi qo'shildi",
    message: `${payload.fullName} ro'yxatga qo'shildi`
  });

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
    SET course_id = ?, teacher_id = ?, balance = ?, last_payment_date = COALESCE(last_payment_date, ?)
    WHERE id = ?
  `).run(
    payload.courseId,
    payload.teacherId,
    nextBalance,
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

export function recordPayment(studentId, amount, method, status = "paid", externalId = null, actorUserId = null) {
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");

  const paymentId = db.prepare(`
    INSERT INTO payments (student_id, amount, method, status, external_id, received_by_user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(studentId, amount, method, status, externalId, actorUserId || null, now).lastInsertRowid;

  const student = db.prepare(`
    SELECT s.id, s.balance, c.monthly_fee as monthlyFee
    FROM students s
    LEFT JOIN courses c ON c.id = s.course_id
    WHERE s.id = ?
  `).get(studentId);

  const newBalance = Number(student.balance) + Number(amount);

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

  addStudentHistory(studentId, actorUserId, "payment_recorded", "To'lov qabul qilindi", `${Number(amount).toLocaleString("ru-RU")} UZS / ${method}`);
  createNotification({
    targetRole: "director",
    type: "payment",
    title: "Yangi to'lov qabul qilindi",
    message: `${summary.fullName} - ${summary.courseTitle} uchun ${Number(amount).toLocaleString("ru-RU")} UZS`
  });
  const studentUser = db.prepare(`SELECT user_id as userId FROM students WHERE id = ?`).get(studentId);
  if (studentUser?.userId) {
    createNotification({
      targetUserId: studentUser.userId,
      type: "payment_received",
      title: "To'lov qabul qilindi",
      message: `${Number(amount).toLocaleString("ru-RU")} UZS to'lovingiz tizimga tushdi`
    });
  }

  const receipt = {
    id: paymentId,
    studentId,
    fullName: summary.fullName,
    phone: summary.phone,
    courseTitle: summary.courseTitle,
    amount: Number(amount),
    method,
    paidAt: now
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

export function getStudentAttendance(userId) {
  const student = getStudentByUserId(userId);
  if (!student) return null;
  const items = listAttendanceHistory({ studentId: student.id, range: "month" });
  const presentCount = items.filter((item) => item.status === "present").length;
  const percentage = items.length ? Math.round((presentCount / items.length) * 100) : 0;
  return {
    percentage,
    last30Days: {
      present: presentCount,
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

export function getStudentProfilePanel(userId) {
  const profile = getStudentByUserId(userId);
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

export function listAttendanceHistory({ teacherId = null, studentId = null, range = "month" } = {}) {
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

  if (range === "week") {
    query += ` AND date(a.lesson_date) >= date('now', '-7 day')`;
  } else if (range === "day") {
    query += ` AND date(a.lesson_date) = date('now')`;
  } else {
    query += ` AND date(a.lesson_date) >= date('now', '-30 day')`;
  }

  query += ` ORDER BY date(a.lesson_date) DESC, u.full_name ASC`;
  return db.prepare(query).all(...values);
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

export function saveSettings(payload) {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  Object.entries(payload).forEach(([key, value]) => stmt.run(key, String(value ?? ""), now));
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

export function createCourse(payload) {
  const id = db.prepare(`
    INSERT INTO courses (branch_id, title, monthly_fee, schedule, is_active, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(payload.branchId || null, payload.title, payload.monthlyFee, payload.schedule, dayjs().format("YYYY-MM-DD HH:mm:ss")).lastInsertRowid;
  return id;
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

export function deleteTeacher(teacherId) {
  const assigned = db.prepare(`SELECT COUNT(*) as count FROM students WHERE teacher_id = ? AND is_archived = 0`).get(teacherId);
  if (assigned.count > 0) {
    return { blocked: true };
  }
  db.prepare(`DELETE FROM teacher_course_assignments WHERE teacher_id = ?`).run(teacherId);
  db.prepare(`DELETE FROM users WHERE id = ? AND role = 'teacher'`).run(teacherId);
  return { blocked: false };
}

export function updateCourse(courseId, payload) {
  db.prepare(`
    UPDATE courses
    SET branch_id = ?, title = ?, monthly_fee = ?, schedule = ?, is_active = ?
    WHERE id = ?
  `).run(payload.branchId || null, payload.title, payload.monthlyFee, payload.schedule, payload.isActive ? 1 : 0, courseId);
}

export function deleteCourse(courseId) {
  const used = db.prepare(`SELECT COUNT(*) as count FROM students WHERE course_id = ? AND is_archived = 0`).get(courseId);
  if (used.count > 0) {
    db.prepare(`UPDATE courses SET is_active = 0 WHERE id = ?`).run(courseId);
    return { softDeleted: true };
  }
  db.prepare(`DELETE FROM courses WHERE id = ?`).run(courseId);
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
