import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import { config } from "./config.js";
import {
  Attendance,
  Branch,
  ContactRequest,
  Course,
  DeveloperProfile,
  Notification,
  Payment,
  QrToken,
  ReminderDispatch,
  Student,
  StudentAuth,
  StudentHistory,
  TeacherCourseAssignment,
  TelegramLink,
  User,
  getNextSequence
} from "./mongo-models.js";

function mapCourse(course) {
  return {
    id: course.id,
    branchId: course.branchId || null,
    title: course.title,
    monthlyFee: Number(course.monthlyFee || 0),
    schedule: course.schedule || "",
    isActive: course.isActive !== false,
    createdAt: course.createdAt
  };
}

function mapTeacher(user, courseIds = []) {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    phone: user.phone,
    monthlySalary: Number(user.monthlySalary || 0),
    role: user.role,
    telegramId: user.telegramId,
    profileImage: user.profileImage,
    courseIds
  };
}

function normalizePhone(value = "") {
  return String(value).replace(/\s+/g, "");
}

function normalizeBillingStartDate(value) {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
}

function generateAccessTokenMongo() {
  return crypto.randomBytes(24).toString("hex");
}

function mapStudentRowMongo(student, user, course, teacher, trialProgress = 0) {
  return {
    id: student.id,
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    balance: Number(student.balance || 0),
    status: student.status,
    enrolledAt: student.enrolledAt ? dayjs(student.enrolledAt).format("YYYY-MM-DD") : null,
    billingStartDate: student.billingStartDate ? dayjs(student.billingStartDate).format("YYYY-MM-DD") : null,
    trialRequired: Number(student.trialRequired || 3),
    paymentDueDate: student.paymentDueDate ? dayjs(student.paymentDueDate).format("YYYY-MM-DD") : null,
    trialProgress: Number(trialProgress || 0),
    monthlyFee: Number(course?.monthlyFee || 0),
    courseId: course?.id || student.courseId || null,
    courseTitle: course?.title || "",
    schedule: student.groupSchedule || course?.schedule || "",
    teacherId: teacher?.id || student.teacherId || null,
    teacherName: teacher?.fullName || "",
    lastPaymentDate: student.lastPaymentDate ? dayjs(student.lastPaymentDate).format("YYYY-MM-DD") : null,
    telegramId: user?.telegramId || null,
    isArchived: Boolean(student.isArchived),
    profileImage: user?.profileImage || null
  };
}

async function teacherCanTeachCourseMongo(teacherId, courseId) {
  if (!teacherId || !courseId) return false;
  const assignment = await TeacherCourseAssignment.findOne({
    teacherId: Number(teacherId),
    courseId: Number(courseId)
  }).lean();
  return Boolean(assignment);
}

async function getTrialProgressMongo(studentId, enrolledAt) {
  return Attendance.countDocuments({
    studentId: Number(studentId),
    status: "present",
    lessonDate: { $gte: new Date(enrolledAt || dayjs().format("YYYY-MM-DD")) }
  });
}

async function getNthTrialLessonDateMongo(studentId, enrolledAt, trialRequired) {
  const lessons = await Attendance.find({
    studentId: Number(studentId),
    status: "present",
    lessonDate: { $gte: new Date(enrolledAt || dayjs().format("YYYY-MM-DD")) }
  })
    .sort({ lessonDate: 1 })
    .skip(Math.max(0, Number(trialRequired || 3) - 1))
    .limit(1)
    .lean();
  return lessons[0]?.lessonDate ? dayjs(lessons[0].lessonDate).format("YYYY-MM-DD") : null;
}

async function addStudentHistoryMongo(studentId, actorUserId, action, title, details) {
  const id = await getNextSequence("student_history");
  await StudentHistory.create({
    id,
    studentId: Number(studentId),
    actorUserId: actorUserId ? Number(actorUserId) : null,
    action,
    title,
    details: details || null,
    createdAt: new Date()
  });
}

async function createNotificationMongo({ targetRole = null, targetUserId = null, type, title, message, metadata = null }) {
  const id = await getNextSequence("notifications");
  await Notification.create({
    id,
    targetRole,
    targetUserId: targetUserId ? Number(targetUserId) : null,
    type,
    title,
    message,
    metadata,
    status: "unread",
    createdAt: new Date()
  });
}

async function ensureStudentAuthMongo(studentId, phone, passwordHash = null) {
  const normalizedPhone = normalizePhone(phone);
  const now = new Date();
  const existing = await StudentAuth.findOne({ studentId: Number(studentId) }).lean();
  if (existing) {
    const accessToken = existing.accessToken || generateAccessTokenMongo();
    await StudentAuth.updateOne(
      { studentId: Number(studentId) },
      {
        $set: {
          phone: normalizedPhone,
          accessToken,
          updatedAt: now,
          ...(passwordHash ? { passwordHash } : {})
        }
      }
    );
    return {
      ...existing,
      phone: normalizedPhone,
      accessToken,
      passwordHash: passwordHash || existing.passwordHash
    };
  }

  const id = await getNextSequence("student_auth");
  const accessToken = generateAccessTokenMongo();
  const auth = await StudentAuth.create({
    id,
    studentId: Number(studentId),
    phone: normalizedPhone,
    accessToken,
    passwordHash,
    createdAt: now,
    updatedAt: now
  });
  return auth.toObject();
}

async function recalcStudentStateMongo(studentId) {
  const student = await Student.findOne({ id: Number(studentId) }).lean();
  if (!student) return null;
  const course = student.courseId ? await Course.findOne({ id: Number(student.courseId) }).lean() : null;
  const enrolledAt = student.enrolledAt ? dayjs(student.enrolledAt).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD");
  const trialRequired =
    student.trialRequired === null || student.trialRequired === undefined
      ? 3
      : Math.max(Number(student.trialRequired || 0), 0);
  const trialProgress = await getTrialProgressMongo(studentId, enrolledAt);
  let paymentDueDate =
    trialProgress >= trialRequired && trialRequired > 0
      ? await getNthTrialLessonDateMongo(studentId, enrolledAt, trialRequired)
      : null;
  let status = "trial";
  if (trialRequired === 0) {
    paymentDueDate = normalizeBillingStartDate(student.billingStartDate) || enrolledAt;
    status = Number(student.balance || 0) >= Number(course?.monthlyFee || 0) ? "active" : "debtor";
  } else if (trialProgress >= trialRequired) {
    status = Number(student.balance || 0) >= Number(course?.monthlyFee || 0) ? "active" : "debtor";
  }
  await Student.updateOne(
    { id: Number(studentId) },
    {
      $set: {
        status,
        enrolledAt: new Date(enrolledAt),
        trialRequired,
        paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null
      }
    }
  );
  return { status, trialProgress, trialRequired, paymentDueDate, enrolledAt };
}

export async function listAllCoursesMongo() {
  const courses = await Course.find().sort({ createdAt: 1, id: 1 }).lean();
  return courses.map(mapCourse);
}

export async function listCoursesMongo() {
  const courses = await Course.find({ isActive: { $ne: false } }).sort({ createdAt: 1, id: 1 }).lean();
  return courses.map(mapCourse);
}

export async function listBranchesMongo() {
  const branches = await Branch.find().sort({ createdAt: 1, id: 1 }).lean();
  return branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    address: branch.address || "",
    createdAt: branch.createdAt
  }));
}

export async function listTeachersMongo() {
  const teachers = await User.find({ role: "teacher" }).sort({ createdAt: 1, id: 1 }).lean();
  const assignments = await TeacherCourseAssignment.find({
    teacherId: { $in: teachers.map((teacher) => teacher.id) }
  }).lean();
  return teachers.map((teacher) =>
    mapTeacher(
      teacher,
      assignments.filter((item) => item.teacherId === teacher.id).map((item) => item.courseId)
    )
  );
}

export async function createContactRequestMongo({ fullName, phone, message }) {
  const id = await getNextSequence("contact_requests");
  await ContactRequest.create({
    id,
    fullName,
    phone,
    message,
    status: "new",
    createdAt: new Date()
  });
  return id;
}

export async function listContactRequestsMongo({ unreadOnly = false } = {}) {
  const query = unreadOnly ? { status: "new" } : {};
  const rows = await ContactRequest.find(query).sort({ createdAt: -1, id: -1 }).lean();
  return rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    message: row.message,
    status: row.status,
    createdAt: dayjs(row.createdAt).format("YYYY-MM-DD HH:mm:ss"),
    readAt: row.readAt ? dayjs(row.readAt).format("YYYY-MM-DD HH:mm:ss") : null
  }));
}

export async function listNotificationsMongo({ userId = null, role = null, unreadOnly = false } = {}) {
  const query = {};
  if (unreadOnly) {
    query.status = "unread";
  }
  if (role) {
    query.$or = [{ targetRole: role }, { targetUserId: Number(userId) }];
  } else if (userId !== null && userId !== undefined) {
    query.targetUserId = Number(userId);
  }
  const rows = await Notification.find(query).sort({ createdAt: -1, id: -1 }).lean();
  return rows.map((row) => ({
    id: row.id,
    targetRole: row.targetRole || null,
    targetUserId: row.targetUserId || null,
    type: row.type,
    title: row.title,
    message: row.message,
    metadata: row.metadata || null,
    status: row.status,
    createdAt: dayjs(row.createdAt).format("YYYY-MM-DD HH:mm:ss"),
    readAt: row.readAt ? dayjs(row.readAt).format("YYYY-MM-DD HH:mm:ss") : null
  }));
}

export async function listDeveloperProfilesMongo() {
  const rows = await DeveloperProfile.find({ isActive: { $ne: false } }).sort({ createdAt: 1, id: 1 }).lean();
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    username: row.username,
    fullName: row.fullName,
    age: row.age,
    roleTitle: row.roleTitle,
    shortBio: row.shortBio,
    bio: row.bio,
    skills: row.skills || [],
    image: row.image || "",
    bannerImage: row.bannerImage || "",
    certificateImage: row.certificateImage || "",
    telegramUrl: row.telegramUrl || "",
    instagramUrl: row.instagramUrl || "",
    githubUrl: row.githubUrl || "",
    websiteUrl: row.websiteUrl || "",
    isActive: row.isActive !== false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }));
}

export async function getDeveloperProfileBySlugMongo(slug) {
  const row = await DeveloperProfile.findOne({ slug }).lean();
  return row ? (await listDeveloperProfilesMongo()).find((item) => item.slug === slug) || null : null;
}

export async function getDeveloperProfileByUsernameMongo(username) {
  const row = await DeveloperProfile.findOne({ username }).lean();
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    username: row.username,
    passwordHash: row.passwordHash,
    fullName: row.fullName
  };
}

export async function getDeveloperProfileByIdMongo(id) {
  const row = await DeveloperProfile.findOne({ id: Number(id) }).lean();
  return row ? (await listDeveloperProfilesMongo()).find((item) => item.id === Number(id)) || null : null;
}

export async function getAuthUserByUsernameMongo(username) {
  const row = await User.findOne({ username }).lean();
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.fullName,
    username: row.username,
    passwordHash: row.passwordHash,
    role: row.role
  };
}

export async function getStudentAuthByPhoneMongo(phone) {
  const auth = await StudentAuth.findOne({ phone }).lean();
  if (!auth) return null;
  const student = await Student.findOne({ id: auth.studentId }).lean();
  if (!student) return null;
  return {
    id: auth.id,
    studentId: auth.studentId,
    userId: student.userId,
    phone: auth.phone,
    accessToken: auth.accessToken,
    passwordHash: auth.passwordHash
  };
}

export async function loginStudentByAccessTokenMongo(accessToken) {
  const auth = await StudentAuth.findOne({ accessToken }).lean();
  if (!auth) {
    throw new Error("Kirish tokeni topilmadi");
  }
  const student = await Student.findOne({ id: auth.studentId }).lean();
  if (!student) {
    throw new Error("Student topilmadi");
  }
  const user = await User.findOne({ id: student.userId }).lean();
  if (!user) {
    throw new Error("Foydalanuvchi topilmadi");
  }
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    phone: user.phone,
    role: user.role,
    telegramId: user.telegramId,
    profileImage: user.profileImage
  };
}

export async function getStudentByPhoneMongo(phone) {
  const normalizedPhone = normalizePhone(phone);
  const user = await User.findOne({ phone: normalizedPhone, role: "student" }).lean();
  if (!user) return null;
  return getStudentByUserIdMongo(user.id);
}

export async function getStudentByTelegramIdMongo(telegramId) {
  const user = await User.findOne({ telegramId: String(telegramId), role: "student" }).lean();
  if (!user) return null;
  return getStudentByUserIdMongo(user.id);
}

export async function getStudentByIdMongo(studentId) {
  const student = await Student.findOne({ id: Number(studentId) }).lean();
  if (!student) return null;
  return getStudentByUserIdMongo(student.userId);
}

export async function createTelegramLinkCodeMongo(phone) {
  const normalizedPhone = normalizePhone(phone);
  const user = await User.findOne({ phone: normalizedPhone }).lean();
  if (!user) return null;
  const student = await Student.findOne({ userId: user.id }).lean();
  if (!student) return null;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const id = await getNextSequence("telegram_links");
  await TelegramLink.create({
    id,
    studentId: student.id,
    phone: normalizedPhone,
    code,
    used: false,
    createdAt: new Date()
  });
  return {
    studentId: student.id,
    code
  };
}

export async function verifyTelegramCodeMongo(code, telegramId = null) {
  const link = await TelegramLink.findOne({ code, used: false }).sort({ id: -1 }).lean();
  if (!link) return null;
  const student = await Student.findOne({ id: link.studentId }).lean();
  if (!student) return null;
  const user = await User.findOne({ id: student.userId }).lean();
  if (!user) return null;
  await TelegramLink.updateOne({ id: link.id }, { $set: { used: true } });
  if (telegramId) {
    await User.updateOne({ id: user.id }, { $set: { telegramId: String(telegramId) } });
  }
  return {
    userId: user.id,
    fullName: user.fullName,
    phone: user.phone,
    telegramId: telegramId ? String(telegramId) : user.telegramId || null
  };
}

export async function createStudentRegistrationTokenMongo(studentId, expiresInSeconds = 90) {
  const student = await Student.findOne({ id: Number(studentId), isArchived: false }).lean();
  if (!student) {
    throw new Error("Student topilmadi");
  }
  const user = await User.findOne({ id: student.userId }).lean();
  if (!user) {
    throw new Error("Student foydalanuvchisi topilmadi");
  }

  await QrToken.deleteMany({ studentId: Number(studentId), used: false });

  const ttl = Math.min(120, Math.max(60, Number(expiresInSeconds || 90)));
  const token = generateAccessTokenMongo();
  const now = dayjs();
  const expiresAt = now.add(ttl, "second");
  const id = await getNextSequence("qr_tokens");

  await QrToken.create({
    id,
    token,
    studentId: Number(studentId),
    expiresAt: expiresAt.toDate(),
    used: false,
    usedAt: null,
    createdAt: now.toDate()
  });

  const auth = await ensureStudentAuthMongo(studentId, user.phone || "");
  const loginUrl = `${config.webUrl}/student/login?access=${auth.accessToken}`;

  return {
    token,
    studentId: Number(studentId),
    fullName: user.fullName,
    expiresAt: expiresAt.format("YYYY-MM-DD HH:mm:ss"),
    registerUrl: loginUrl,
    loginUrl,
    defaultPassword: "12345678"
  };
}

export async function validateStudentRegistrationTokenMongo(token) {
  const row = await QrToken.findOne({ token }).lean();
  if (!row) {
    throw new Error("Token topilmadi");
  }
  if (row.used) {
    throw new Error("Token allaqachon ishlatilgan");
  }
  const student = await Student.findOne({ id: row.studentId }).lean();
  if (!student) {
    throw new Error("Student topilmadi");
  }
  if (student.isRegistered) {
    throw new Error("Student allaqachon ro'yxatdan o'tgan");
  }
  if (dayjs(row.expiresAt).isBefore(dayjs())) {
    throw new Error("Token muddati tugagan");
  }
  const user = await User.findOne({ id: student.userId }).lean();
  if (!user) {
    throw new Error("Foydalanuvchi topilmadi");
  }
  const [firstName = "", ...rest] = (user.fullName || "").split(" ");
  return {
    token: row.token,
    studentId: row.studentId,
    firstName,
    lastName: rest.join(" "),
    fullName: user.fullName,
    phone: user.phone,
    expiresAt: dayjs(row.expiresAt).format("YYYY-MM-DD HH:mm:ss")
  };
}

export async function registerStudentByTokenMongo({ token, phone, passwordHash }) {
  const qr = await validateStudentRegistrationTokenMongo(token);
  if (normalizePhone(qr.phone) !== normalizePhone(phone)) {
    throw new Error("Telefon raqam student ma'lumoti bilan mos emas");
  }
  const now = new Date();
  await Student.updateOne({ id: qr.studentId }, { $set: { isRegistered: true } });
  await QrToken.updateOne({ token }, { $set: { used: true, usedAt: now } });
  await ensureStudentAuthMongo(qr.studentId, phone, passwordHash);
}

export async function listStudentsMongo(filters = {}) {
  const search = String(filters.search || "").trim().toLowerCase();
  const includeArchived = Boolean(filters.includeArchived);
  const teacherFilter = filters.teacherId ? Number(filters.teacherId) : null;
  const baseQuery = {};
  if (!includeArchived) {
    baseQuery.isArchived = false;
  }
  if (teacherFilter) {
    baseQuery.teacherId = teacherFilter;
  }
  if (filters.status) {
    baseQuery.status = filters.status === "archived" ? "archived" : filters.status;
  }
  const students = await Student.find(baseQuery).sort({ createdAt: -1, id: -1 }).lean();
  const userIds = [...new Set(students.map((item) => item.userId))];
  const courseIds = [...new Set(students.map((item) => item.courseId).filter(Boolean))];
  const teacherIds = [...new Set(students.map((item) => item.teacherId).filter(Boolean))];
  const [users, courses, teachers] = await Promise.all([
    User.find({ id: { $in: userIds } }).lean(),
    Course.find({ id: { $in: courseIds } }).lean(),
    User.find({ id: { $in: teacherIds } }).lean()
  ]);
  const userMap = new Map(users.map((item) => [item.id, item]));
  const courseMap = new Map(courses.map((item) => [item.id, item]));
  const teacherMap = new Map(teachers.map((item) => [item.id, item]));

  const result = [];
  for (const student of students) {
    const user = userMap.get(student.userId);
    const course = courseMap.get(student.courseId);
    const teacher = teacherMap.get(student.teacherId);
    const trialProgress = await getTrialProgressMongo(student.id, student.enrolledAt);
    const mapped = mapStudentRowMongo(student, user, course, teacher, trialProgress);
    if (search) {
      const haystack = [mapped.fullName, mapped.phone, mapped.courseTitle, mapped.teacherName].join(" ").toLowerCase();
      if (!haystack.includes(search)) continue;
    }
    result.push(mapped);
  }
  return result;
}

export async function addStudentMongo(payload, actorUserId = null) {
  if (!(await teacherCanTeachCourseMongo(payload.teacherId, payload.courseId))) {
    throw new Error("Tanlangan o'qituvchi bu kursga biriktirilmagan");
  }
  const now = new Date();
  const enrolledDate = payload.enrolledAt ? new Date(payload.enrolledAt) : new Date();
  const billingStartDate = normalizeBillingStartDate(payload.billingStartDate);
  const initialBalance = Number(payload.balance || 0);
  const requestedStatus = String(payload.status || "active").toLowerCase();
  const isActiveFlow = requestedStatus === "active" || requestedStatus === "debtor" || requestedStatus === "archived";
  const status = isActiveFlow ? "active" : "trial";
  const trialRequired = payload.trialRequired !== undefined && payload.trialRequired !== null
    ? Number(payload.trialRequired)
    : (isActiveFlow ? 0 : 3);

  const userId = await getNextSequence("users");
  await User.create({
    id: userId,
    fullName: payload.fullName,
    phone: normalizePhone(payload.phone),
    role: "student",
    monthlySalary: 0,
    createdAt: now
  });

  const studentId = await getNextSequence("students");
  await Student.create({
    id: studentId,
    userId,
    courseId: Number(payload.courseId),
    teacherId: Number(payload.teacherId),
    balance: initialBalance,
    status,
    enrolledAt: enrolledDate,
    billingStartDate: billingStartDate ? new Date(billingStartDate) : null,
    trialRequired,
    paymentDueDate: isActiveFlow && billingStartDate ? new Date(billingStartDate) : null,
    groupSchedule: payload.schedule || null,
    createdAt: now
  });

  const auth = await ensureStudentAuthMongo(studentId, payload.phone, bcrypt.hashSync("12345678", 10));
  await Student.updateOne({ id: studentId }, { $set: { isRegistered: true } });
  await recalcStudentStateMongo(studentId);
  if (requestedStatus === "debtor") {
    await Student.updateOne(
      { id: studentId },
      { $set: { status: "debtor", paymentDueDate: new Date(billingStartDate || dayjs(enrolledDate).format("YYYY-MM-DD")) } }
    );
  }
  if (requestedStatus === "archived") {
    await Student.updateOne({ id: studentId }, { $set: { isArchived: true, archivedAt: now, status: "archived" } });
  }

  await addStudentHistoryMongo(
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

  await createNotificationMongo({
    targetRole: "director",
    type: payload.imported ? "student_imported" : "student_created",
    title: payload.imported ? "Eski o'quvchi import qilindi" : "Yangi o'quvchi qo'shildi",
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

export async function updateStudentMongo(studentId, payload, actorUserId = null) {
  if (!(await teacherCanTeachCourseMongo(payload.teacherId, payload.courseId))) {
    throw new Error("Tanlangan o'qituvchi bu kursga biriktirilmagan");
  }
  const student = await Student.findOne({ id: Number(studentId) }).lean();
  if (!student) throw new Error("Student topilmadi");
  const user = await User.findOne({ id: student.userId }).lean();
  await User.updateOne(
    { id: student.userId },
    { $set: { fullName: payload.fullName, phone: normalizePhone(payload.phone) } }
  );
  await ensureStudentAuthMongo(studentId, payload.phone);
  const nextBillingStartDate = normalizeBillingStartDate(payload.billingStartDate);
  const nextTrialRequired = payload.status === "active" ? 0 : 3;
  await Student.updateOne(
    { id: Number(studentId) },
    {
      $set: {
        courseId: Number(payload.courseId),
        teacherId: Number(payload.teacherId),
        balance: Number(payload.balance || 0),
        trialRequired: nextTrialRequired,
        billingStartDate: nextBillingStartDate ? new Date(nextBillingStartDate) : null,
        groupSchedule: payload.schedule || null,
        ...(nextTrialRequired === 0 ? { paymentDueDate: nextBillingStartDate ? new Date(nextBillingStartDate) : null } : {})
      }
    }
  );
  await recalcStudentStateMongo(studentId);
  await addStudentHistoryMongo(studentId, actorUserId, "updated", "Student yangilandi", `${user?.fullName || payload.fullName} ma'lumotlari tahrirlandi`);
}

export async function archiveStudentMongo(studentId, actorUserId = null) {
  const student = await Student.findOne({ id: Number(studentId) }).lean();
  if (!student) return false;
  const user = await User.findOne({ id: student.userId }).lean();
  await Student.updateOne({ id: Number(studentId) }, { $set: { isArchived: true, archivedAt: new Date() } });
  await addStudentHistoryMongo(studentId, actorUserId, "archived", "Student arxivlandi", `${user?.fullName || "Student"} arxivga o'tkazildi`);
  return true;
}

export async function deleteStudentMongo(studentId) {
  const student = await Student.findOne({ id: Number(studentId) }).lean();
  if (!student) return false;
  await Notification.deleteMany({ targetUserId: student.userId });
  await StudentAuth.deleteMany({ studentId: Number(studentId) });
  await QrToken.deleteMany({ studentId: Number(studentId) });
  await ReminderDispatch.deleteMany({ studentId: Number(studentId) });
  await Attendance.deleteMany({ studentId: Number(studentId) });
  await Payment.deleteMany({ studentId: Number(studentId) });
  await StudentHistory.deleteMany({ studentId: Number(studentId) });
  await TelegramLink.deleteMany({ studentId: Number(studentId) });
  await Student.deleteOne({ id: Number(studentId) });
  await User.deleteOne({ id: student.userId });
  return true;
}

export async function listStudentHistoryMongo(studentId) {
  const rows = await StudentHistory.find({ studentId: Number(studentId) }).sort({ createdAt: -1, id: -1 }).lean();
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    title: row.title,
    details: row.details || "",
    createdAt: dayjs(row.createdAt).format("YYYY-MM-DD HH:mm:ss")
  }));
}

export async function recordPaymentMongo(studentId, amount, method, status = "paid", externalId = null, actorUserId = null, reason = null) {
  const student = await Student.findOne({ id: Number(studentId) }).lean();
  if (!student) throw new Error("Student topilmadi");
  const course = student.courseId ? await Course.findOne({ id: student.courseId }).lean() : null;
  const user = await User.findOne({ id: student.userId }).lean();
  const normalizedAmount = Number(amount || 0);
  const normalizedReason = String(reason || "").trim();
  const monthlyFee = Number(course?.monthlyFee || 0);
  if (normalizedAmount <= 0) throw new Error("To'lov summasini kiriting");
  if (monthlyFee > 0 && normalizedAmount < monthlyFee && !normalizedReason) {
    throw new Error(`Minimal to'lov ${monthlyFee.toLocaleString("ru-RU")} UZS. Kamroq summa uchun sabab yozing.`);
  }
  const id = await getNextSequence("payments");
  const now = new Date();
  await Payment.create({
    id,
    studentId: Number(studentId),
    amount: normalizedAmount,
    method,
    status,
    externalId,
    receivedByUserId: actorUserId ? Number(actorUserId) : null,
    reason: normalizedReason || null,
    createdAt: now
  });
  await Student.updateOne(
    { id: Number(studentId) },
    { $set: { balance: Number(student.balance || 0) + normalizedAmount, lastPaymentDate: dayjs().format("YYYY-MM-DD") } }
  );
  await recalcStudentStateMongo(studentId);
  await addStudentHistoryMongo(
    studentId,
    actorUserId,
    "payment_recorded",
    "To'lov qabul qilindi",
    `${normalizedAmount.toLocaleString("ru-RU")} UZS / ${method}${normalizedReason ? ` / Sabab: ${normalizedReason}` : ""}`
  );
  await createNotificationMongo({
    targetRole: "director",
    type: "payment",
    title: "Yangi to'lov qabul qilindi",
    message: `${user?.fullName || "Student"} - ${course?.title || "Kurs"} uchun ${normalizedAmount.toLocaleString("ru-RU")} UZS`
  });
  if (student.userId) {
    await createNotificationMongo({
      targetUserId: student.userId,
      type: "payment_received",
      title: "To'lov qabul qilindi",
      message: `${normalizedAmount.toLocaleString("ru-RU")} UZS to'lovingiz tizimga tushdi`
    });
  }
  const receipt = {
    id,
    studentId: Number(studentId),
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    courseTitle: course?.title || "",
    amount: normalizedAmount,
    method,
    paidAt: dayjs(now).format("YYYY-MM-DD HH:mm:ss"),
    reason: normalizedReason || null
  };
  return {
    ...receipt,
    receiptCaption: `${receipt.fullName} uchun ${normalizedAmount.toLocaleString("ru-RU")} UZS to'lov qabul qilindi`
  };
}

export async function listAllPaymentsMongo() {
  const rows = await Payment.find().sort({ createdAt: -1, id: -1 }).lean();
  const students = await Student.find({ id: { $in: rows.map((item) => item.studentId) } }).lean();
  const users = await User.find({
    id: {
      $in: [
        ...students.map((item) => item.userId),
        ...rows.map((item) => item.receivedByUserId).filter(Boolean)
      ]
    }
  }).lean();
  const courses = await Course.find({ id: { $in: students.map((item) => item.courseId).filter(Boolean) } }).lean();
  const studentMap = new Map(students.map((item) => [item.id, item]));
  const userMap = new Map(users.map((item) => [item.id, item]));
  const courseMap = new Map(courses.map((item) => [item.id, item]));
  return rows.map((row) => {
    const student = studentMap.get(row.studentId);
    const studentUser = userMap.get(student?.userId);
    const staff = userMap.get(row.receivedByUserId);
    const course = courseMap.get(student?.courseId);
    return {
      id: row.id,
      amount: Number(row.amount || 0),
      method: row.method,
      status: row.status,
      reason: row.reason || null,
      createdAt: dayjs(row.createdAt).format("YYYY-MM-DD HH:mm:ss"),
      receivedBy: staff?.fullName || "",
      studentName: studentUser?.fullName || "",
      studentPhone: studentUser?.phone || "",
      courseTitle: course?.title || ""
    };
  });
}

export async function markContactRequestReadMongo(id) {
  const result = await ContactRequest.updateOne(
    { id: Number(id) },
    { $set: { status: "read", readAt: new Date() } }
  );
  return result.matchedCount > 0;
}

export async function upsertAttendanceBatchMongo({ lessonDate, entries = [], actorUserId }) {
  const nextLessonDate = lessonDate || dayjs().format("YYYY-MM-DD");
  const results = [];
  for (const entry of entries) {
    const studentId = Number(entry.studentId);
    if (!studentId) continue;
    const student = await Student.findOne({ id: studentId }).lean();
    if (!student) continue;
    const normalizedStatus = ["present", "absent", "excused", "late"].includes(entry.status) ? entry.status : "present";
    await Attendance.updateOne(
      { studentId, lessonDate: new Date(nextLessonDate) },
      {
        $set: {
          teacherId: Number(student.teacherId || actorUserId || 0),
          status: normalizedStatus,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    await recalcStudentStateMongo(studentId);
    results.push({ studentId, status: normalizedStatus });
  }
  return results;
}

export async function listAttendanceHistoryMongo({ teacherId = null, studentId = null, range = "month", lessonDate = "" } = {}) {
  const query = {};
  if (teacherId) query.teacherId = Number(teacherId);
  if (studentId) query.studentId = Number(studentId);
  if (lessonDate) {
    query.lessonDate = new Date(lessonDate);
  } else {
    const start =
      range === "week"
        ? dayjs().startOf("week").add(1, "day")
        : range === "day"
          ? dayjs().startOf("day")
          : dayjs().startOf("month");
    query.lessonDate = { $gte: start.toDate() };
  }
  const rows = await Attendance.find(query).sort({ lessonDate: -1, id: -1 }).lean();
  const students = await Student.find({ id: { $in: rows.map((item) => item.studentId) } }).lean();
  const users = await User.find({
    id: {
      $in: [...students.map((item) => item.userId), ...rows.map((item) => item.teacherId)]
    }
  }).lean();
  const courses = await Course.find({ id: { $in: students.map((item) => item.courseId).filter(Boolean) } }).lean();
  const studentMap = new Map(students.map((item) => [item.id, item]));
  const userMap = new Map(users.map((item) => [item.id, item]));
  const courseMap = new Map(courses.map((item) => [item.id, item]));
  return rows.map((row) => {
    const student = studentMap.get(row.studentId);
    const studentUser = userMap.get(student?.userId);
    const teacher = userMap.get(row.teacherId);
    const course = courseMap.get(student?.courseId);
    return {
      id: row.id,
      studentId: row.studentId,
      lessonDate: dayjs(row.lessonDate).format("YYYY-MM-DD"),
      status: row.status,
      studentName: studentUser?.fullName || "",
      courseTitle: course?.title || "",
      teacherName: teacher?.fullName || ""
    };
  });
}

export async function getTeacherStudentsMongo(teacherId) {
  return listStudentsMongo({ teacherId: Number(teacherId) });
}

export async function getStudentByUserIdMongo(userId) {
  const student = await Student.findOne({ userId: Number(userId) }).lean();
  if (!student) return null;
  const [user, course, teacher, trialProgress] = await Promise.all([
    User.findOne({ id: student.userId }).lean(),
    student.courseId ? Course.findOne({ id: student.courseId }).lean() : null,
    student.teacherId ? User.findOne({ id: student.teacherId }).lean() : null,
    getTrialProgressMongo(student.id, student.enrolledAt)
  ]);
  return mapStudentRowMongo(student, user, course, teacher, trialProgress);
}

export async function getStudentDashboardMongo(userId) {
  const profile = await getStudentByUserIdMongo(userId);
  if (!profile) return null;
  const schedule = profile.schedule || "";
  const dayMap = { du: 1, se: 2, chor: 3, pay: 4, juma: 5, shan: 6, yak: 0 };
  const [daysPart = ""] = schedule.split(",");
  const dayKeys = daysPart.split("-").map((item) => item.trim().toLowerCase()).filter(Boolean);
  let nextLessonDate = null;
  for (let offset = 0; offset < 8; offset += 1) {
    const candidate = dayjs().add(offset, "day");
    if (dayKeys.some((key) => dayMap[key] === candidate.day())) {
      nextLessonDate = candidate.format("YYYY-MM-DD");
      break;
    }
  }
  return {
    fullName: profile.fullName,
    status: profile.status,
    balance: profile.balance,
    courseTitle: profile.courseTitle,
    teacherName: profile.teacherName,
    nextLessonDate,
    trialProgress: profile.trialProgress,
    trialRequired: profile.trialRequired,
    monthlyFee: profile.monthlyFee,
    paymentDueDate: profile.paymentDueDate
  };
}

export async function getStudentAttendanceMongo(userId) {
  const student = await getStudentByUserIdMongo(userId);
  if (!student) return null;
  const items = await listAttendanceHistoryMongo({ studentId: student.id, range: "month" });
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

export async function getStudentPaymentsMongo(userId) {
  const student = await getStudentByUserIdMongo(userId);
  if (!student) return null;
  const rows = await Payment.find({ studentId: student.id }).sort({ createdAt: -1, id: -1 }).lean();
  const staffIds = [...new Set(rows.map((item) => item.receivedByUserId).filter(Boolean))];
  const staff = await User.find({ id: { $in: staffIds } }).lean();
  const staffMap = new Map(staff.map((item) => [item.id, item]));
  return {
    balance: student.balance,
    debt: Math.max(0, Number(student.monthlyFee || 0) - Number(student.balance || 0)),
    items: rows.map((row) => ({
      id: row.id,
      amount: Number(row.amount || 0),
      method: row.method,
      status: row.status,
      createdAt: dayjs(row.createdAt).format("YYYY-MM-DD HH:mm:ss"),
      receivedBy: staffMap.get(row.receivedByUserId)?.fullName || ""
    }))
  };
}

export async function getStudentScheduleMongo(userId) {
  const student = await getStudentByUserIdMongo(userId);
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

export async function getStudentProfilePanelMongo(userId) {
  const profile = await getStudentByUserIdMongo(userId);
  if (!profile) return null;
  return {
    fullName: profile.fullName,
    phone: profile.phone
  };
}

export async function getStudentAccessLinkByUserIdMongo(userId) {
  const student = await getStudentByUserIdMongo(userId);
  if (!student) return null;
  const auth = await ensureStudentAuthMongo(student.id, student.phone || "");
  return `${config.webUrl}/student/login?access=${auth.accessToken}`;
}

export async function changeStudentPasswordMongo(userId, passwordHash) {
  const student = await getStudentByUserIdMongo(userId);
  if (!student) throw new Error("Student topilmadi");
  await StudentAuth.updateOne(
    { studentId: student.id },
    { $set: { passwordHash, updatedAt: new Date() } }
  );
}

export async function markNotificationReadMongo(notificationId, userId = null) {
  const row = await Notification.findOne({ id: Number(notificationId) }).lean();
  if (!row) return false;
  if (row.targetUserId && userId && Number(row.targetUserId) !== Number(userId)) return false;
  await Notification.updateOne(
    { id: Number(notificationId) },
    { $set: { status: "read", readAt: new Date() } }
  );
  return true;
}

export async function getSettingsBundleMongo() {
  const rows = await Setting.find().lean();
  const settings = Object.fromEntries(rows.map((item) => [item.key, item.value]));
  return {
    settings,
    teachers: await listTeachersMongo(),
    courses: await listAllCoursesMongo(),
    branches: await listBranchesMongo()
  };
}

export async function saveSettingsMongo(payload) {
  for (const [key, value] of Object.entries(payload)) {
    await Setting.updateOne(
      { key },
      { $set: { value: String(value ?? ""), updatedAt: new Date() } },
      { upsert: true }
    );
  }
}

export async function createCourseMongo(payload) {
  const id = await getNextSequence("courses");
  const course = await Course.create({
    id,
    branchId: payload.branchId || null,
    title: payload.title,
    monthlyFee: Number(payload.monthlyFee || 0),
    schedule: payload.schedule || "",
    isActive: true,
    createdAt: new Date()
  });
  return Number(course.id);
}

export async function updateCourseMongo(courseId, payload) {
  await Course.updateOne(
    { id: Number(courseId) },
    {
      $set: {
        branchId: payload.branchId || null,
        title: payload.title,
        monthlyFee: Number(payload.monthlyFee || 0),
        schedule: payload.schedule || "",
        isActive: payload.isActive !== false
      }
    }
  );
}

export async function deleteCourseMongo(courseId) {
  const [usedCount, assignedCount] = await Promise.all([
    Student.countDocuments({ courseId: Number(courseId), isArchived: false }),
    TeacherCourseAssignment.countDocuments({ courseId: Number(courseId) })
  ]);
  if (usedCount > 0 || assignedCount > 0) {
    await Course.updateOne({ id: Number(courseId) }, { $set: { isActive: false } });
    return { softDeleted: true };
  }
  await TeacherCourseAssignment.deleteMany({ courseId: Number(courseId) });
  await Course.deleteOne({ id: Number(courseId) });
  return { softDeleted: false };
}

export async function createTeacherMongo(payload) {
  if (!Array.isArray(payload.courseIds) || payload.courseIds.length === 0) {
    throw new Error("O'qituvchiga kamida bitta kurs biriktirilishi kerak");
  }
  const duplicate = await User.findOne({ username: payload.username }).lean();
  if (duplicate) {
    throw new Error("Bu username band");
  }
  const teacherId = await getNextSequence("users");
  await User.create({
    id: teacherId,
    fullName: payload.fullName,
    username: payload.username,
    passwordHash: payload.passwordHash,
    phone: payload.phone || null,
    monthlySalary: Number(payload.monthlySalary || 0),
    role: "teacher",
    telegramId: null,
    profileImage: payload.profileImage || null,
    createdAt: new Date()
  });

  for (const courseId of payload.courseIds.map(Number)) {
    const assignmentId = await getNextSequence("teacher_course_assignments");
    await TeacherCourseAssignment.create({
      id: assignmentId,
      teacherId: Number(teacherId),
      courseId,
      createdAt: new Date()
    });
  }
  return Number(teacherId);
}

export async function updateTeacherMongo(teacherId, payload) {
  if (!Array.isArray(payload.courseIds) || payload.courseIds.length === 0) {
    throw new Error("O'qituvchiga kamida bitta kurs biriktirilishi kerak");
  }
  const duplicate = await User.findOne({
    username: payload.username,
    id: { $ne: Number(teacherId) }
  }).lean();
  if (duplicate) {
    throw new Error("Bu username band");
  }
  await User.updateOne(
    { id: Number(teacherId), role: "teacher" },
    {
      $set: {
        fullName: payload.fullName,
        username: payload.username,
        phone: payload.phone || null,
        monthlySalary: Number(payload.monthlySalary || 0),
        profileImage: payload.profileImage || null,
        ...(payload.passwordHash ? { passwordHash: payload.passwordHash } : {})
      }
    }
  );

  await TeacherCourseAssignment.deleteMany({ teacherId: Number(teacherId) });
  for (const courseId of payload.courseIds.map(Number)) {
    const assignmentId = await getNextSequence("teacher_course_assignments");
    await TeacherCourseAssignment.create({
      id: assignmentId,
      teacherId: Number(teacherId),
      courseId,
      createdAt: new Date()
    });
  }
}

export async function deleteTeacherMongo(teacherId) {
  const assigned = await Student.countDocuments({ teacherId: Number(teacherId), isArchived: false });
  if (assigned > 0) {
    return { blocked: true };
  }
  await TeacherCourseAssignment.deleteMany({ teacherId: Number(teacherId) });
  await User.deleteOne({ id: Number(teacherId), role: "teacher" });
  return { blocked: false };
}

export async function updateDeveloperProfileMongo(id, payload) {
  const current = await DeveloperProfile.findOne({ id: Number(id), isActive: true }).lean();
  if (!current) {
    throw new Error("Dasturchi topilmadi");
  }
  if (payload.username && payload.username !== current.username) {
    const existing = await DeveloperProfile.findOne({
      username: payload.username,
      id: { $ne: Number(id) }
    }).lean();
    if (existing) {
      throw new Error("Bu login band");
    }
  }

  await DeveloperProfile.updateOne(
    { id: Number(id) },
    {
      $set: {
        fullName: payload.fullName,
        age: payload.age ? Number(payload.age) : null,
        roleTitle: payload.roleTitle,
        shortBio: payload.shortBio || "",
        bio: payload.bio || "",
        skills: Array.isArray(payload.skills) ? payload.skills : [],
        image: payload.image || current.image || null,
        bannerImage: payload.bannerImage || current.bannerImage || null,
        certificateImage: payload.certificateImage || current.certificateImage || null,
        telegramUrl: payload.telegramUrl || "",
        instagramUrl: payload.instagramUrl || "",
        githubUrl: payload.githubUrl || "",
        websiteUrl: payload.websiteUrl || "",
        updatedAt: new Date(),
        ...(payload.username && payload.username !== current.username ? { username: payload.username } : {}),
        ...(payload.passwordHash ? { passwordHash: payload.passwordHash } : {})
      }
    }
  );

  const row = await DeveloperProfile.findOne({ id: Number(id), isActive: true }).lean();
  return {
    id: row.id,
    slug: row.slug,
    username: row.username,
    fullName: row.fullName,
    age: row.age ?? null,
    roleTitle: row.roleTitle,
    shortBio: row.shortBio || "",
    bio: row.bio || "",
    skills: Array.isArray(row.skills) ? row.skills : [],
    image: row.image || null,
    bannerImage: row.bannerImage || null,
    certificateImage: row.certificateImage || null,
    telegramUrl: row.telegramUrl || "",
    instagramUrl: row.instagramUrl || "",
    githubUrl: row.githubUrl || "",
    websiteUrl: row.websiteUrl || "",
    isActive: row.isActive !== false
  };
}

function formatMoneyMongo(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} so'm`;
}

async function tryRegisterReminderDispatchMongo(studentId, reminderType, dispatchDate) {
  const exists = await ReminderDispatch.findOne({
    studentId: Number(studentId),
    reminderType,
    dispatchDate: new Date(dispatchDate)
  }).lean();
  if (exists) {
    return false;
  }
  const id = await getNextSequence("reminder_dispatches");
  await ReminderDispatch.create({
    id,
    studentId: Number(studentId),
    reminderType,
    dispatchDate: new Date(dispatchDate),
    createdAt: new Date()
  });
  return true;
}

export async function listDebtorsMongo() {
  const students = await Student.find({ status: "debtor", isArchived: false }).lean();
  const userIds = [...new Set(students.map((item) => item.userId))];
  const courseIds = [...new Set(students.map((item) => item.courseId).filter(Boolean))];
  const [users, courses] = await Promise.all([
    User.find({ id: { $in: userIds } }).lean(),
    Course.find({ id: { $in: courseIds } }).lean()
  ]);
  const userMap = new Map(users.map((item) => [item.id, item]));
  const courseMap = new Map(courses.map((item) => [item.id, item]));
  return students.map((student) => {
    const user = userMap.get(student.userId);
    const course = courseMap.get(student.courseId);
    return {
      studentId: student.id,
      userId: student.userId,
      fullName: user?.fullName || "",
      telegramId: user?.telegramId || null,
      balance: Number(student.balance || 0),
      monthlyFee: Number(course?.monthlyFee || 0),
      courseTitle: course?.title || ""
    };
  });
}

export async function listUpcomingPaymentsMongo(days = 3) {
  const today = dayjs().startOf("day");
  const endDate = today.add(Number(days || 3), "day");
  const students = await Student.find({
    isArchived: false,
    paymentDueDate: { $ne: null }
  }).lean();
  const userIds = [...new Set(students.map((item) => item.userId))];
  const courseIds = [...new Set(students.map((item) => item.courseId).filter(Boolean))];
  const [users, courses] = await Promise.all([
    User.find({ id: { $in: userIds } }).lean(),
    Course.find({ id: { $in: courseIds } }).lean()
  ]);
  const userMap = new Map(users.map((item) => [item.id, item]));
  const courseMap = new Map(courses.map((item) => [item.id, item]));
  return students
    .filter((student) => {
      const due = student.paymentDueDate ? dayjs(student.paymentDueDate) : null;
      return due && !due.isBefore(today) && !due.isAfter(endDate);
    })
    .map((student) => {
      const user = userMap.get(student.userId);
      const course = courseMap.get(student.courseId);
      return {
        studentId: student.id,
        userId: student.userId,
        fullName: user?.fullName || "",
        telegramId: user?.telegramId || null,
        monthlyFee: Number(course?.monthlyFee || 0),
        courseTitle: course?.title || "",
        dueDate: dayjs(student.paymentDueDate).format("YYYY-MM-DD")
      };
    });
}

export async function listTrialFinishedStudentsMongo(days = 0) {
  const students = await Student.find({
    isArchived: false,
    status: { $in: ["active", "debtor"] },
    trialRequired: { $gt: 0 },
    paymentDueDate: { $ne: null }
  }).lean();
  const userIds = [...new Set(students.map((item) => item.userId))];
  const courseIds = [...new Set(students.map((item) => item.courseId).filter(Boolean))];
  const [users, courses] = await Promise.all([
    User.find({ id: { $in: userIds } }).lean(),
    Course.find({ id: { $in: courseIds } }).lean()
  ]);
  const userMap = new Map(users.map((item) => [item.id, item]));
  const courseMap = new Map(courses.map((item) => [item.id, item]));
  const targetDate = dayjs().add(Number(days || 0), "day").format("YYYY-MM-DD");
  return students
    .filter((student) => student.paymentDueDate && dayjs(student.paymentDueDate).format("YYYY-MM-DD") === targetDate)
    .map((student) => {
      const user = userMap.get(student.userId);
      const course = courseMap.get(student.courseId);
      return {
        studentId: student.id,
        userId: student.userId,
        fullName: user?.fullName || "",
        telegramId: user?.telegramId || null,
        courseTitle: course?.title || "",
        paymentDueDate: dayjs(student.paymentDueDate).format("YYYY-MM-DD")
      };
    });
}

export async function queueDailyReminderJobsMongo({ upcomingDays = 3 } = {}) {
  const dispatchDate = dayjs().format("YYYY-MM-DD");
  const jobs = [];

  for (const student of await listDebtorsMongo()) {
    if (!(await tryRegisterReminderDispatchMongo(student.studentId, "debt_daily", dispatchDate))) continue;
    const debtAmount = Math.max(0, Number(student.monthlyFee || 0) - Number(student.balance || 0));
    await createNotificationMongo({
      targetUserId: student.userId,
      type: "debt_reminder",
      title: "Qarzdorlik eslatmasi",
      message: `${formatMoneyMongo(debtAmount)} to'lovingiz kutilmoqda. Iltimos, qarzingizni to'lang.`,
      metadata: { studentId: student.studentId, debtAmount, courseTitle: student.courseTitle }
    });
    jobs.push({ type: "debt", student });
  }

  for (const student of await listUpcomingPaymentsMongo(upcomingDays)) {
    if (!(await tryRegisterReminderDispatchMongo(student.studentId, "payment_upcoming", dispatchDate))) continue;
    await createNotificationMongo({
      targetUserId: student.userId,
      type: "payment_upcoming",
      title: "To'lov eslatmasi",
      message: `${student.courseTitle || "Kurs"} uchun oylik to'lov muddati ${student.dueDate} sanada tugaydi.`,
      metadata: { studentId: student.studentId, amount: Number(student.monthlyFee || 0), dueDate: student.dueDate }
    });
    jobs.push({ type: "payment_upcoming", student });
  }

  for (const student of await listTrialFinishedStudentsMongo(0)) {
    if (!(await tryRegisterReminderDispatchMongo(student.studentId, "trial_finished", dispatchDate))) continue;
    await createNotificationMongo({
      targetRole: "reception",
      type: "trial_finished",
      title: "Sinov muddati tugadi",
      message: `${student.fullName} uchun sinov muddati tugadi va to'lov bosqichi boshlandi.`,
      metadata: { studentId: student.studentId, paymentDueDate: student.paymentDueDate }
    });
    await createNotificationMongo({
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

export async function updateUserProfileMongo(userId, payload) {
  const current = await User.findOne({ id: Number(userId) }).lean();
  if (!current) throw new Error("Foydalanuvchi topilmadi");
  const exists = payload.username
    ? await User.findOne({ username: payload.username, id: { $ne: Number(userId) } }).lean()
    : null;
  if (exists) throw new Error("Bu username band");
  await User.updateOne(
    { id: Number(userId) },
    {
      $set: {
        fullName: payload.fullName,
        username: payload.username,
        phone: payload.phone,
        profileImage: payload.profileImage || current.profileImage || null,
        ...(payload.password ? { passwordHash: payload.password } : {})
      }
    }
  );
  const user = await User.findOne({ id: Number(userId) }).lean();
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    phone: user.phone,
    role: user.role,
    telegramId: user.telegramId,
    profileImage: user.profileImage
  };
}

export async function getFinanceSummaryMongo() {
  const teachers = await listTeachersMongo();
  const students = await Student.find().lean();
  const courses = await Course.find().lean();
  const payments = await Payment.find({ status: "paid" }).lean();
  const settingsRows = await Setting.find().lean();
  const settings = Object.fromEntries(settingsRows.map((item) => [item.key, Number(item.value || 0)]));
  const monthlyRevenue = payments
    .filter((item) => dayjs(item.createdAt).format("YYYY-MM") === dayjs().format("YYYY-MM"))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const todayRevenue = payments
    .filter((item) => dayjs(item.createdAt).format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD"))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalRevenue = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const teachersPayroll = teachers.reduce((sum, item) => sum + Number(item.monthlySalary || 0), 0);
  const operatingExpenses =
    Number(settings.rent_expense || 0) +
    Number(settings.advertising_expense || 0) +
    Number(settings.internet_expense || 0) +
    Number(settings.admin_salary_expense || 0);
  const debtors = students.filter((item) => item.status === "debtor" && !item.isArchived);
  const courseMap = new Map(courses.map((item) => [item.id, item]));
  const studentMap = new Map(students.map((item) => [item.id, item]));
  const byCourse = courses.map((course) => ({
    title: course.title,
    revenue: payments
      .filter((payment) => studentMap.get(payment.studentId)?.courseId === course.id)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  })).sort((a, b) => b.revenue - a.revenue);
  const methodMap = new Map();
  for (const payment of payments) {
    const current = methodMap.get(payment.method) || { method: payment.method, count: 0, amount: 0 };
    current.count += 1;
    current.amount += Number(payment.amount || 0);
    methodMap.set(payment.method, current);
  }
  const paymentMethods = Array.from(methodMap.values()).sort((a, b) => b.amount - a.amount);
  const monthlyTrendMap = new Map();
  for (const payment of payments) {
    const period = dayjs(payment.createdAt).format("YYYY-MM");
    monthlyTrendMap.set(period, (monthlyTrendMap.get(period) || 0) + Number(payment.amount || 0));
  }
  const monthlyTrend = Array.from(monthlyTrendMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([period, revenue]) => ({
      period,
      revenue,
      payroll: teachersPayroll,
      operatingExpenses,
      totalExpenses: teachersPayroll + operatingExpenses,
      netProfit: revenue - teachersPayroll - operatingExpenses
    }));
  const topTeachers = teachers.map((teacher) => ({
    id: teacher.id,
    fullName: teacher.fullName,
    monthlySalary: Number(teacher.monthlySalary || 0),
    revenue: payments
      .filter((payment) => studentMap.get(payment.studentId)?.teacherId === teacher.id)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  return {
    totals: {
      totalRevenue,
      todayRevenue,
      monthlyRevenue,
      teachersPayroll,
      operatingExpenses,
      totalExpenses: teachersPayroll + operatingExpenses,
      netProfit: monthlyRevenue - teachersPayroll - operatingExpenses
    },
    debtors: {
      debtorsCount: debtors.length,
      debtAmount: debtors.reduce((sum, item) => sum + Math.abs(Number(item.balance || 0)), 0)
    },
    byCourse,
    paymentMethods,
    monthlyTrend,
    topTeachers,
    payroll: {
      monthlyPayroll: teachersPayroll,
      teachersCount: teachers.length
    },
    expenses: {
      rent: Number(settings.rent_expense || 0),
      advertising: Number(settings.advertising_expense || 0),
      internet: Number(settings.internet_expense || 0),
      adminSalary: Number(settings.admin_salary_expense || 0),
      total: operatingExpenses
    }
  };
}

export async function getDirectorStatsMongo() {
  const students = await Student.find().lean();
  const courses = await Course.find().lean();
  const attendance = await Attendance.find().lean();
  const finance = await getFinanceSummaryMongo();
  const teachers = await listTeachersMongo();
  const studentMap = new Map(students.map((item) => [item.id, item]));
  const courseAnalysis = courses.map((course) => {
    const courseStudents = students.filter((item) => item.courseId === course.id && !item.isArchived);
    const groupsCount = new Set(courseStudents.map((item) => item.teacherId).filter(Boolean)).size;
    const activeCount = courseStudents.filter((item) => item.status === "active").length;
    const trialCount = courseStudents.filter((item) => item.status === "trial").length;
    const debtorsCount = courseStudents.filter((item) => item.status === "debtor").length;
    const revenue = finance.byCourse.find((item) => item.title === course.title)?.revenue || 0;
    return {
      id: course.id,
      title: course.title,
      studentsCount: courseStudents.length,
      groupsCount,
      revenue,
      activeCount,
      trialCount,
      debtorsCount,
      efficiency: courseStudents.length ? Math.min(97, 64 + courseStudents.length * 2 + activeCount) : 0
    };
  }).sort((a, b) => b.revenue - a.revenue || b.studentsCount - a.studentsCount);
  const teacherPerformance = teachers.map((teacher) => {
    const teacherStudents = students.filter((item) => item.teacherId === teacher.id && !item.isArchived);
    const teacherAttendance = attendance.filter((item) => item.teacherId === teacher.id);
    const presentCount = teacherAttendance.filter((item) => item.status === "present").length;
    const revenue = finance.topTeachers.find((item) => item.id === teacher.id)?.revenue || 0;
    return {
      id: teacher.id,
      fullName: teacher.fullName,
      monthlySalary: Number(teacher.monthlySalary || 0),
      courseIds: teacher.courseIds || [],
      studentsCount: teacherStudents.length,
      activeStudentsCount: teacherStudents.filter((item) => item.status === "active").length,
      trialStudentsCount: teacherStudents.filter((item) => item.status === "trial").length,
      debtorsCount: teacherStudents.filter((item) => item.status === "debtor").length,
      revenue,
      attendancePercent: teacherAttendance.length ? Math.round((presentCount / teacherAttendance.length) * 100) : 0
    };
  }).sort((a, b) => b.revenue - a.revenue || b.studentsCount - a.studentsCount);
  const admissionsTrendMap = new Map();
  for (const student of students) {
    const period = dayjs(student.createdAt).format("YYYY-MM");
    admissionsTrendMap.set(period, (admissionsTrendMap.get(period) || 0) + 1);
  }
  const admissionsTrend = Array.from(admissionsTrendMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([period, count]) => ({ period, count }));
  const now = dayjs();
  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = now.subtract(6 - index, "day");
    const revenue = (finance.paymentMethods ? [] : [])
    return {
      period: date.format("YYYY-MM-DD"),
      label: date.format("DD MMM"),
      startDate: date.format("YYYY-MM-DD"),
      endDate: date.format("YYYY-MM-DD"),
      revenue: (finance && (students, 0), 0)
    };
  });
  const payments = await Payment.find({ status: "paid" }).lean();
  daily.forEach((item) => {
    item.revenue = payments
      .filter((payment) => dayjs(payment.createdAt).format("YYYY-MM-DD") === item.period)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  });
  const weekly = Array.from({ length: 8 }, (_, index) => {
    const weekStart = now.startOf("week").add(1, "day").subtract(7 * (7 - index), "day");
    const weekEnd = weekStart.add(6, "day");
    return {
      period: `${weekStart.format("YYYY-MM-DD")}_${weekEnd.format("YYYY-MM-DD")}`,
      label: `${weekStart.format("DD MMM")} - ${weekEnd.format("DD MMM")}`,
      startDate: weekStart.format("YYYY-MM-DD"),
      endDate: weekEnd.format("YYYY-MM-DD"),
      revenue: payments
        .filter((payment) => {
          const d = dayjs(payment.createdAt).format("YYYY-MM-DD");
          return d >= weekStart.format("YYYY-MM-DD") && d <= weekEnd.format("YYYY-MM-DD");
        })
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    };
  });
  const monthly = finance.monthlyTrend.map((item) => ({
    period: item.period,
    label: dayjs(`${item.period}-01`).format("MMM"),
    startDate: dayjs(`${item.period}-01`).startOf("month").format("YYYY-MM-DD"),
    endDate: dayjs(`${item.period}-01`).endOf("month").format("YYYY-MM-DD"),
    revenue: Number(item.revenue || 0)
  }));
  return {
    cards: {
      monthlyRevenue: finance.totals.monthlyRevenue,
      totalStudents: students.length,
      debtorsCount: students.filter((item) => item.status === "debtor").length,
      trialStudentsCount: students.filter((item) => item.status === "trial" && !item.isArchived).length,
      teachersCount: finance.payroll.teachersCount,
      teachersPayroll: finance.totals.teachersPayroll,
      operatingExpenses: finance.totals.operatingExpenses,
      totalExpenses: finance.totals.totalExpenses,
      netProfit: finance.totals.netProfit
    },
    monthlyRevenue: monthly,
    trends: {
      daily,
      weekly,
      monthly,
      monthlyProfit: finance.monthlyTrend
    },
    courseAnalysis,
    teacherPerformance,
    studentStatusBreakdown: {
      activeCount: students.filter((item) => item.status === "active" && !item.isArchived).length,
      trialCount: students.filter((item) => item.status === "trial" && !item.isArchived).length,
      debtorCount: students.filter((item) => item.status === "debtor" && !item.isArchived).length
    },
    admissionsTrend,
    expenses: finance.expenses
  };
}
