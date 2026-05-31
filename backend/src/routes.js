import express from "express";
import dayjs from "dayjs";
import bcrypt from "bcryptjs";
import { authenticate, authorize, comparePassword, getUserProfile, getUserProfileAsync, signToken } from "./auth.js";
import { config } from "./config.js";
import { buildDirectorPdfReport, buildDirectorWorkbook } from "./reports.js";
import { sendBotBroadcast, sendStudentPaymentNotification } from "./bot.js";
import {
  addStudent,
  addStudentAsync,
  archiveStudent,
  archiveStudentAsync,
  buildPaymentReceiptAsset,
  buildQrCodeAsset,
  changeStudentPassword,
  changeStudentPasswordAsync,
  createContactRequestAsync,
  createContactRequest,
  createCourse,
  createCourseAsync,
  createStudentRegistrationToken,
  createStudentRegistrationTokenAsync,
  createTeacher,
  createTeacherAsync,
  createTelegramLinkCode,
  deleteCourse,
  deleteCourseAsync,
  deleteStudent,
  deleteTeacher,
  deleteTeacherAsync,
  getDeveloperProfileById,
  getDeveloperProfileBySlug,
  getDeveloperProfileByUsername,
  getDirectorStats,
  getDirectorStatsAsync,
  getFinanceSummary,
  getFinanceSummaryAsync,
  getSettingsBundle,
  getSettingsBundleAsync,
  getStudentAttendance,
  getStudentAttendanceAsync,
  getStudentAccessLinkByUserId,
  getStudentAccessLinkByUserIdAsync,
  getStudentDashboard,
  getStudentDashboardAsync,
  getStudentPayments,
  getStudentPaymentsAsync,
  getStudentProfilePanel,
  getStudentProfilePanelAsync,
  getStudentByPhone,
  getStudentByPhoneAsync,
  getStudentSchedule,
  getStudentScheduleAsync,
  getStudentAuthByPhone,
  getStudentAuthByPhoneAsync,
  loginStudentByAccessToken,
  loginStudentByAccessTokenAsync,
  getTeacherStudents,
  getTeacherStudentsAsync,
  listAllCourses,
  listAllCoursesAsync,
  listAllPayments,
  listAllPaymentsAsync,
  listAttendanceHistory,
  listAttendanceHistoryAsync,
  listBranches,
  listBranchesAsync,
  listContactRequests,
  listContactRequestsAsync,
  listCourses,
  listCoursesAsync,
  listDeveloperProfiles,
  listDeveloperProfilesAsync,
  listNotifications,
  listNotificationsAsync,
  listStudentHistory,
  listStudentHistoryAsync,
  listStudents,
  listStudentsAsync,
  listTeachers,
  listTeachersAsync,
  markContactRequestRead,
  markContactRequestReadAsync,
  markAllNotificationsRead,
  markAllNotificationsReadAsync,
  markNotificationReadAsync,
  markNotificationRead,
  previewStudentImport,
  recordPayment,
  recordPaymentAsync,
  registerStudentByToken,
  registerStudentByTokenAsync,
  saveSettings,
  saveSettingsAsync,
  updateCourse,
  updateCourseAsync,
  updateUserProfileAsync,
  validateStudentRegistrationTokenAsync,
  createTelegramLinkCodeAsync,
  consumeTelegramCodeAsync,
  getDeveloperProfileByIdAsync,
  getDeveloperProfileBySlugAsync,
  getDeveloperProfileByUsernameAsync,
  updateDeveloperProfile,
  updateStudent,
  updateStudentAsync,
  updateTeacher,
  updateTeacherAsync,
  updateUserProfile,
  validateStudentRegistrationToken,
  upsertAttendance,
  upsertAttendanceBatch,
  upsertAttendanceBatchAsync,
  importStudentsBatch,
  deleteStudentAsync
} from "./services.js";
import { getDb } from "./db.js";
import {
  addStudentMongo,
  archiveStudentMongo,
  broadcastNotificationMongo,
  changeStudentPasswordMongo,
  createContactRequestMongo,
  createCourseMongo,
  createStudentRegistrationTokenMongo,
  createTeacherMongo,
  createTelegramLinkCodeMongo,
  deleteCourseMongo,
  deleteStudentMongo,
  deleteTeacherMongo,
  getDirectorStatsMongo,
  getFinanceSummaryMongo,
  getStudentAccessLinkByUserIdMongo,
  getSettingsBundleMongo,
  getStudentAttendanceMongo,
  getStudentByPhoneMongo,
  getStudentDashboardMongo,
  getStudentPaymentsMongo,
  getStudentProfilePanelMongo,
  getStudentScheduleMongo,
  getAuthUserByUsernameMongo,
  getDeveloperProfileByIdMongo,
  getDeveloperProfileBySlugMongo,
  getDeveloperProfileByUsernameMongo,
  getStudentAuthByPhoneMongo,
  getStudentByUserIdMongo,
  getTeacherStudentsMongo,
  listAllCoursesMongo,
  listAllPaymentsMongo,
  listAttendanceHistoryMongo,
  listBranchesMongo,
  listContactRequestsMongo,
  listCoursesMongo,
  listDeveloperProfilesMongo,
  listNotificationsMongo,
  listStudentHistoryMongo,
  listStudentsMongo,
  listTeachersMongo,
  markContactRequestReadMongo,
  markAllNotificationsReadMongo,
  markNotificationReadMongo,
  loginStudentByAccessTokenMongo,
  previewStudentImportMongo,
  recordPaymentMongo,
  registerStudentByTokenMongo,
  saveSettingsMongo,
  updateCourseMongo,
  updateDeveloperProfileMongo,
  updateTeacherMongo,
  updateUserProfileMongo,
  updateStudentMongo,
  importStudentsBatchMongo,
  upsertAttendanceBatchMongo,
  validateStudentRegistrationTokenMongo,
  verifyTelegramCodeMongo
} from "./mongo-services.js";
import { getSupabasePool } from "./supabase-db.js";

const router = express.Router();
const db = getDb();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.get("/public/app-config", (_req, res) => {
  res.json({
    telegramBotUsername: config.telegramBotUsername || "",
    webUrl: config.webUrl
  });
});

router.get("/public/courses", (_req, res) => {
  const sendCourses = async () => {
    const courses =
      config.dbProvider === "mongodb"
        ? await listAllCoursesMongo()
        : config.dbProvider === "postgres"
          ? await listAllCoursesAsync()
          : listAllCourses();
    res.json(
      courses
        .filter((course) => course.isActive !== false)
        .map((course) => ({
          id: course.id,
          title: course.title,
          monthlyFee: Number(course.monthlyFee || 0),
          schedule: course.schedule || ""
        }))
    );
  };
  sendCourses().catch((error) => {
    res.status(500).json({ message: error.message || "Kurslarni olib bo'lmadi" });
  });
});

router.post("/public/contact-requests", (req, res) => {
  const handleContactRequest = async () => {
    const { fullName, phone, message } = req.body;
    if (!fullName || !phone || !message) {
      return res.status(400).json({ message: "Ism, telefon va xabar majburiy" });
    }
    const id =
      config.dbProvider === "mongodb"
        ? await createContactRequestMongo({ fullName, phone, message })
        : config.dbProvider === "postgres"
          ? await createContactRequestAsync({ fullName, phone, message })
          : createContactRequest({ fullName, phone, message });
    res.status(201).json({ id, message: "Murojaat qabul qilindi" });
  };
  handleContactRequest().catch((error) => {
    res.status(500).json({ message: error.message || "So'rovda xatolik yuz berdi" });
  });
});

router.get("/public/developers", (_req, res) => {
  const sendDevelopers = async () => {
    res.json(
      config.dbProvider === "mongodb"
        ? await listDeveloperProfilesMongo()
        : config.dbProvider === "postgres"
          ? await listDeveloperProfilesAsync()
          : listDeveloperProfiles()
    );
  };
  sendDevelopers().catch((error) => {
    res.status(500).json({ message: error.message || "Dasturchilarni olib bo'lmadi" });
  });
});

router.get("/public/developers/:slug", (req, res) => {
  const sendDeveloper = async () => {
    const developer =
      config.dbProvider === "mongodb"
        ? await getDeveloperProfileBySlugMongo(req.params.slug)
        : config.dbProvider === "postgres"
          ? await getDeveloperProfileBySlugAsync(req.params.slug)
          : getDeveloperProfileBySlug(req.params.slug);
    if (!developer) {
      return res.status(404).json({ message: "Dasturchi topilmadi" });
    }
    res.json(developer);
  };
  sendDeveloper().catch((error) => {
    res.status(500).json({ message: error.message || "Dasturchini olib bo'lmadi" });
  });
});

router.post("/auth/login", (req, res) => {
  const handleLogin = async () => {
    const { username, password } = req.body;
    let user;

    if (config.dbProvider === "mongodb") {
      user = await getAuthUserByUsernameMongo(username);
    } else if (config.dbProvider === "postgres") {
      const { rows } = await getSupabasePool().query(
        `
          SELECT id, full_name as "fullName", username, password_hash as "passwordHash", role
          FROM users
          WHERE username = $1
          LIMIT 1
        `,
        [username]
      );
      user = rows[0];
    } else {
      user = db.prepare(`
        SELECT id, full_name as fullName, username, password_hash as passwordHash, role
        FROM users
        WHERE username = ?
      `).get(username);
    }

    if (!user || !comparePassword(password, user.passwordHash)) {
      return res.status(401).json({ message: "Login yoki parol noto'g'ri" });
    }

    const token = signToken({ id: user.id, role: user.role, fullName: user.fullName });
    const profile =
      config.dbProvider === "mongodb" || config.dbProvider === "postgres"
        ? await getUserProfileAsync(user.id)
        : getUserProfile(user.id);
    res.json({ token, user: profile });
  };
  handleLogin().catch((error) => {
    res.status(500).json({ message: error.message || "Login xatosi" });
  });
});

router.post("/developers/auth/login", (req, res) => {
  const handleDeveloperLogin = async () => {
    const { username, password } = req.body;
    const developer =
      config.dbProvider === "mongodb"
        ? await getDeveloperProfileByUsernameMongo(username)
        : config.dbProvider === "postgres"
          ? await getDeveloperProfileByUsernameAsync(username)
          : getDeveloperProfileByUsername(username);

    if (!developer || !comparePassword(password, developer.passwordHash)) {
      return res.status(401).json({ message: "Login yoki parol noto'g'ri" });
    }

    const token = signToken({
      id: developer.id,
      role: "developer_portfolio",
      fullName: developer.fullName,
      slug: developer.slug
    });

    res.json({
      token,
      developer:
        config.dbProvider === "mongodb"
          ? await getDeveloperProfileByIdMongo(developer.id)
          : config.dbProvider === "postgres"
            ? await getDeveloperProfileByIdAsync(developer.id)
            : getDeveloperProfileById(developer.id)
    });
  };
  handleDeveloperLogin().catch((error) => {
    res.status(500).json({ message: error.message || "Developer login xatosi" });
  });
});

router.get("/student-auth/register/validate", (req, res) => {
  const handleValidate = async () => {
    const result =
      config.dbProvider === "mongodb"
        ? await validateStudentRegistrationTokenMongo(req.query.token)
        : config.dbProvider === "postgres"
          ? await validateStudentRegistrationTokenAsync(req.query.token)
          : validateStudentRegistrationToken(req.query.token);
    res.json(result);
  };
  handleValidate().catch((error) => {
    res.status(400).json({ message: error.message || "Token yaroqsiz" });
  });
});

router.post("/student-auth/register", (req, res) => {
  const handleRegister = async () => {
    const { token, phone, password } = req.body;
    if (!token || !phone || !password) {
      return res.status(400).json({ message: "Token, telefon va parol majburiy" });
    }

    const payload = {
      token,
      phone,
      passwordHash: bcrypt.hashSync(password, 10)
    };

    if (config.dbProvider === "mongodb") {
      await registerStudentByTokenMongo(payload);
    } else if (config.dbProvider === "postgres") {
      await registerStudentByTokenAsync(payload);
    } else {
      registerStudentByToken(payload);
    }

    res.json({ message: "Ro'yxatdan o'tish muvaffaqiyatli yakunlandi" });
  };
  handleRegister().catch((error) => {
    res.status(400).json({ message: error.message || "Ro'yxatdan o'tib bo'lmadi" });
  });
});

router.post("/student-auth/login", (req, res) => {
  const handleStudentLogin = async () => {
    const { phone, password } = req.body;
    const auth =
      config.dbProvider === "mongodb"
        ? await getStudentAuthByPhoneMongo(phone)
        : config.dbProvider === "postgres"
          ? await getStudentAuthByPhoneAsync(phone)
          : getStudentAuthByPhone(phone);
    if (!auth || !comparePassword(password, auth.passwordHash)) {
      return res.status(401).json({ message: "Telefon yoki parol noto'g'ri" });
    }
    const user =
      config.dbProvider === "mongodb" || config.dbProvider === "postgres"
        ? await getUserProfileAsync(auth.userId)
        : getUserProfile(auth.userId);
    const token = signToken({ id: user.id, role: "student", fullName: user.fullName });
    res.json({ token, user });
  };
  handleStudentLogin().catch((error) => {
    res.status(500).json({ message: error.message || "Student login xatosi" });
  });
});

router.post("/student-auth/access", (req, res) => {
  const handleAccessLogin = async () => {
    const user =
      config.dbProvider === "mongodb"
        ? await loginStudentByAccessTokenMongo(req.body.accessToken)
        : config.dbProvider === "postgres"
          ? await loginStudentByAccessTokenAsync(req.body.accessToken)
          : loginStudentByAccessToken(req.body.accessToken);
    const token = signToken({ id: user.id, role: "student", fullName: user.fullName });
    res.json({ token, user });
  };
  handleAccessLogin().catch((error) => {
    res.status(401).json({ message: error.message || "Token yaroqsiz" });
  });
});

router.post("/auth/telegram/request", (req, res) => {
  const handleTelegramRequest = async () => {
    const { phone } = req.body;
    const data =
      config.dbProvider === "mongodb"
        ? await createTelegramLinkCodeMongo(phone)
        : config.dbProvider === "postgres"
          ? await createTelegramLinkCodeAsync(phone)
          : createTelegramLinkCode(phone);

    if (!data) {
      return res.status(404).json({ message: "Student topilmadi" });
    }

    res.json({
      message: "Tasdiqlash kodi yaratildi. Kod bot orqali studentga yuboriladi.",
      demoCode: data.code
    });
  };
  handleTelegramRequest().catch((error) => {
    res.status(500).json({ message: error.message || "Kod yaratilmadi" });
  });
});

router.post("/auth/telegram/verify", (req, res) => {
  const handleTelegramVerify = async () => {
    const { code } = req.body;

    if (config.dbProvider === "mongodb") {
      const link = await verifyTelegramCodeMongo(code);
      if (!link) {
        return res.status(404).json({ message: "Kod noto'g'ri yoki eskirgan" });
      }
      const token = signToken({ id: link.userId, role: "student", fullName: link.fullName });
      const profile = await getUserProfileAsync(link.userId);
      return res.json({ token, user: profile });
    }

    if (config.dbProvider === "postgres") {
      const { rows } = await getSupabasePool().query(
        `
          SELECT s.user_id as "userId", u.full_name as "fullName", tl.id
          FROM telegram_links tl
          JOIN students s ON s.id = tl.student_id
          JOIN users u ON u.id = s.user_id
          WHERE tl.code = $1 AND tl.used = FALSE
          ORDER BY tl.id DESC
          LIMIT 1
        `,
        [code]
      );
      const link = rows[0];
      if (!link) {
        return res.status(404).json({ message: "Kod noto'g'ri yoki eskirgan" });
      }
      await getSupabasePool().query(`UPDATE telegram_links SET used = TRUE WHERE id = $1`, [link.id]);
      const token = signToken({ id: link.userId, role: "student", fullName: link.fullName });
      const profile = await getUserProfileAsync(link.userId);
      return res.json({ token, user: profile });
    }

    const link = db.prepare(`
      SELECT s.user_id as userId, u.full_name as fullName
      FROM telegram_links tl
      JOIN students s ON s.id = tl.student_id
      JOIN users u ON u.id = s.user_id
      WHERE tl.code = ? AND tl.used = 0
      ORDER BY tl.id DESC
      LIMIT 1
    `).get(code);

    if (!link) {
      return res.status(404).json({ message: "Kod noto'g'ri yoki eskirgan" });
    }

    db.prepare(`UPDATE telegram_links SET used = 1 WHERE code = ?`).run(code);
    const token = signToken({ id: link.userId, role: "student", fullName: link.fullName });
    res.json({ token, user: getUserProfile(link.userId) });
  };
  handleTelegramVerify().catch((error) => {
    res.status(500).json({ message: error.message || "Kod tekshirilmadi" });
  });
});

router.get("/meta", authenticate, (req, res) => {
  const handleMeta = async () => {
    const unreadNotifications =
      config.dbProvider === "mongodb"
        ? await listNotificationsMongo({ userId: req.user.id, role: req.user.role, unreadOnly: true })
        : config.dbProvider === "postgres"
          ? await listNotificationsAsync({ userId: req.user.id, role: req.user.role, unreadOnly: true })
          : listNotifications({ userId: req.user.id, role: req.user.role, unreadOnly: true });
    const contactRequests =
      req.user.role === "reception" || req.user.role === "director"
        ? (config.dbProvider === "mongodb"
            ? await listContactRequestsMongo({ unreadOnly: true })
            : config.dbProvider === "postgres"
              ? await listContactRequestsAsync({ unreadOnly: true })
              : listContactRequests({ unreadOnly: true }))
        : [];

    res.json({
      user:
        config.dbProvider === "mongodb" || config.dbProvider === "postgres"
          ? await getUserProfileAsync(req.user.id)
          : getUserProfile(req.user.id),
      teachers:
        config.dbProvider === "mongodb"
          ? await listTeachersMongo()
          : config.dbProvider === "postgres"
            ? await listTeachersAsync()
            : listTeachers(),
      courses:
        req.user.role === "director"
          ? (config.dbProvider === "mongodb"
              ? await listAllCoursesMongo()
              : config.dbProvider === "postgres"
                ? await listAllCoursesAsync()
                : listAllCourses())
          : (config.dbProvider === "mongodb"
              ? await listCoursesMongo()
              : config.dbProvider === "postgres"
                ? await listCoursesAsync()
                : listCourses()),
      branches:
        config.dbProvider === "mongodb"
          ? await listBranchesMongo()
          : config.dbProvider === "postgres"
            ? await listBranchesAsync()
            : listBranches(),
      unreadNotifications: unreadNotifications.length,
      unreadContactRequests: contactRequests.length
    });
  };
  handleMeta().catch((error) => {
    res.status(500).json({ message: error.message || "Meta ma'lumotlarni olib bo'lmadi" });
  });
});

router.get("/profile", authenticate, (req, res) => {
  const handleProfile = async () => {
    res.json(
      config.dbProvider === "mongodb" || config.dbProvider === "postgres"
        ? await getUserProfileAsync(req.user.id)
        : getUserProfile(req.user.id)
    );
  };
  handleProfile().catch((error) => {
    res.status(500).json({ message: error.message || "Profilni olib bo'lmadi" });
  });
});

router.put("/profile", authenticate, (req, res) => {
  const handleProfileUpdate = async () => {
    let current;
    let exists;

    if (config.dbProvider === "mongodb") {
      current = await getUserProfileAsync(req.user.id);
      if (req.body.username && req.body.username !== current?.username) {
        exists = await getAuthUserByUsernameMongo(req.body.username);
        if (exists && Number(exists.id) === Number(req.user.id)) {
          exists = null;
        }
      }
    } else if (config.dbProvider === "postgres") {
      const currentResult = await getSupabasePool().query(
        `SELECT username FROM users WHERE id = $1 LIMIT 1`,
        [req.user.id]
      );
      current = currentResult.rows[0];
      if (req.body.username && req.body.username !== current?.username) {
        const existsResult = await getSupabasePool().query(
          `SELECT id FROM users WHERE username = $1 AND id != $2 LIMIT 1`,
          [req.body.username, req.user.id]
        );
        exists = existsResult.rows[0];
      }
    } else {
      current = db.prepare(`SELECT username FROM users WHERE id = ?`).get(req.user.id);
      if (req.body.username && req.body.username !== current?.username) {
        exists = db.prepare(`SELECT id FROM users WHERE username = ? AND id != ?`).get(req.body.username, req.user.id);
      }
    }

    if (exists) {
      return res.status(409).json({ message: "Bu username band" });
    }

    const payload = {
      fullName: req.body.fullName,
      username: req.body.username,
      phone: req.body.phone,
      profileImage: req.body.profileImage,
      password: req.body.password ? bcrypt.hashSync(req.body.password, 10) : null
    };

    const profile =
      config.dbProvider === "mongodb"
        ? await updateUserProfileMongo(req.user.id, payload)
        : config.dbProvider === "postgres"
        ? await updateUserProfileAsync(req.user.id, payload)
        : updateUserProfile(req.user.id, payload);
    res.json(profile);
  };
  handleProfileUpdate().catch((error) => {
    res.status(500).json({ message: error.message || "Profil yangilanmadi" });
  });
});

router.get("/reception/students", authenticate, authorize("reception", "director"), (req, res) => {
  const handleReceptionStudents = async () => {
    const search = req.query.search || "";
    const status = req.query.status || "";
    const includeArchived = req.query.includeArchived === "1";
    res.json(
      config.dbProvider === "mongodb"
        ? await listStudentsMongo({ search, status, includeArchived })
        : config.dbProvider === "postgres"
          ? await listStudentsAsync({ search, status, includeArchived })
          : listStudents({ search, status, includeArchived })
    );
  };
  handleReceptionStudents().catch((error) => {
    res.status(500).json({ message: error.message || "Studentlar olinmadi" });
  });
});

router.post("/reception/students", authenticate, authorize("reception", "director"), (req, res) => {
  const handleReceptionStudentCreate = async () => {
    const body = req.body;
    const courses =
      config.dbProvider === "mongodb"
        ? await listAllCoursesMongo()
        : config.dbProvider === "postgres"
          ? await listAllCoursesAsync()
          : listAllCourses();
    const course = courses.find((item) => Number(item.id) === Number(body.courseId));
    const payload = {
      ...body,
      courseId: Number(body.courseId),
      teacherId: Number(body.teacherId),
      monthlyFee: course?.monthlyFee || 0
    };
    const createdStudent =
      config.dbProvider === "mongodb"
        ? await addStudentMongo(payload, req.user.id)
        : config.dbProvider === "postgres"
          ? await addStudentAsync(payload, req.user.id)
          : addStudent(payload, req.user.id);
    res.status(201).json(createdStudent);
  };
  handleReceptionStudentCreate().catch((error) => {
    res.status(400).json({ message: error.message || "Student qo'shilmadi" });
  });
});

router.post("/reception/students/import/preview", authenticate, authorize("reception", "director"), async (req, res) => {
  try {
    const result =
      config.dbProvider === "mongodb"
        ? await previewStudentImportMongo({
            fileName: req.body.fileName,
            fileDataBase64: req.body.fileDataBase64
          })
        : await previewStudentImport({
            fileName: req.body.fileName,
            fileDataBase64: req.body.fileDataBase64
          });
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || "Import preview yaratilmadi" });
  }
});

router.post("/reception/students/import/commit", authenticate, authorize("reception", "director"), async (req, res) => {
  try {
    const result =
      config.dbProvider === "mongodb"
        ? await importStudentsBatchMongo(req.body.rows, req.user.id)
        : await importStudentsBatch(req.body.rows, req.user.id);
    res.status(201).json({
      message: `${result.createdCount} ta o'quvchi import qilindi`,
      ...result
    });
  } catch (error) {
    res.status(400).json({ message: error.message || "Import yakunlanmadi" });
  }
});

router.put("/reception/students/:id", authenticate, authorize("reception", "director"), (req, res) => {
  const handleReceptionStudentUpdate = async () => {
    const payload = {
      ...req.body,
      courseId: Number(req.body.courseId),
      teacherId: Number(req.body.teacherId),
      balance: Number(req.body.balance || 0)
    };
    if (config.dbProvider === "mongodb") {
      await updateStudentMongo(Number(req.params.id), payload, req.user.id);
    } else if (config.dbProvider === "postgres") {
      await updateStudentAsync(Number(req.params.id), payload, req.user.id);
    } else {
      updateStudent(Number(req.params.id), payload, req.user.id);
    }
    res.json({ message: "Student yangilandi" });
  };
  handleReceptionStudentUpdate().catch((error) => {
    res.status(400).json({ message: error.message || "Student yangilanmadi" });
  });
});

router.post("/reception/students/:id/archive", authenticate, authorize("reception", "director"), (req, res) => {
  const handleReceptionStudentArchive = async () => {
    const archived =
      config.dbProvider === "mongodb"
        ? await archiveStudentMongo(Number(req.params.id), req.user.id)
        : config.dbProvider === "postgres"
          ? await archiveStudentAsync(Number(req.params.id), req.user.id)
          : archiveStudent(Number(req.params.id), req.user.id);
    if (!archived) {
      return res.status(404).json({ message: "Student topilmadi" });
    }
    res.json({ message: "Student arxivlandi" });
  };
  handleReceptionStudentArchive().catch((error) => {
    res.status(400).json({ message: error.message || "Student arxivlanmadi" });
  });
});

router.get("/reception/students/:id/history", authenticate, authorize("reception", "director"), (req, res) => {
  const handleStudentHistory = async () => {
    res.json(
      config.dbProvider === "mongodb"
        ? await listStudentHistoryMongo(Number(req.params.id))
        : config.dbProvider === "postgres"
          ? await listStudentHistoryAsync(Number(req.params.id))
          : listStudentHistory(Number(req.params.id))
    );
  };
  handleStudentHistory().catch((error) => {
    res.status(500).json({ message: error.message || "Tarix olinmadi" });
  });
});

router.post("/reception/students/:id/register-token", authenticate, authorize("reception", "director"), async (req, res) => {
  try {
    const data =
      config.dbProvider === "mongodb"
        ? await createStudentRegistrationTokenMongo(Number(req.params.id), Number(req.body.expiresInSeconds || 90))
        : config.dbProvider === "postgres"
          ? await createStudentRegistrationTokenAsync(Number(req.params.id), Number(req.body.expiresInSeconds || 90))
          : createStudentRegistrationToken(Number(req.params.id), Number(req.body.expiresInSeconds || 90));
    const qrAsset = await buildQrCodeAsset(data.botStartUrl || data.loginUrl || data.registerUrl);
    res.json({
      ...data,
      qrImageDataUrl: qrAsset.imageDataUrl
    });
  } catch (error) {
    res.status(400).json({ message: error.message || "QR token yaratilmadi" });
  }
});

router.delete("/reception/students/:id", authenticate, authorize("reception", "director"), (req, res) => {
  const handleStudentDelete = async () => {
    const deleted =
      config.dbProvider === "mongodb"
        ? await deleteStudentMongo(Number(req.params.id))
        : config.dbProvider === "postgres"
          ? await deleteStudentAsync(Number(req.params.id))
          : deleteStudent(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Student topilmadi" });
    }
    res.json({ message: "Student o'chirildi" });
  };
  handleStudentDelete().catch((error) => {
    res.status(400).json({ message: error.message || "Student o'chirilmadi" });
  });
});

router.post("/reception/payments", authenticate, authorize("reception", "director"), async (req, res) => {
  try {
    const { studentId, amount, method, reason, externalId } = req.body;
    const receipt =
      config.dbProvider === "mongodb"
        ? await recordPaymentMongo(Number(studentId), Number(amount), method, "paid", externalId || null, req.user.id, reason)
        : config.dbProvider === "postgres"
          ? await recordPaymentAsync(Number(studentId), Number(amount), method, "paid", externalId || null, req.user.id, reason)
          : recordPayment(Number(studentId), Number(amount), method, "paid", externalId || null, req.user.id, reason);
    const receiptAsset = await buildPaymentReceiptAsset(receipt);
    const receiptResponse = {
      ...receipt,
      receiptCaption: receiptAsset.caption,
      receiptImageDataUrl: receiptAsset.imageDataUrl,
      receiptImageMimeType: "image/png",
      receiptImageBuffer: receiptAsset.imageBuffer
    };
    if (!receipt.duplicate) {
      sendStudentPaymentNotification(receiptResponse).catch(() => null);
    }
    res.json({
      message: "To'lov saqlandi",
      receipt: {
        ...receipt,
        receiptCaption: receiptAsset.caption,
        receiptImageDataUrl: receiptAsset.imageDataUrl,
        receiptImageMimeType: "image/png"
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message || "To'lov saqlanmadi" });
  }
});

router.get("/reception/payments", authenticate, authorize("reception", "director"), (_req, res) => {
  const handleReceptionPayments = async () => {
    res.json(
      config.dbProvider === "mongodb"
        ? await listAllPaymentsMongo()
        : config.dbProvider === "postgres"
          ? await listAllPaymentsAsync()
          : listAllPayments()
    );
  };
  handleReceptionPayments().catch((error) => {
    res.status(500).json({ message: error.message || "To'lovlar olinmadi" });
  });
});

router.get("/reception/contact-requests", authenticate, authorize("reception", "director"), (_req, res) => {
  const handleReceptionContacts = async () => {
    res.json(
      config.dbProvider === "mongodb"
        ? await listContactRequestsMongo()
        : config.dbProvider === "postgres"
          ? await listContactRequestsAsync()
          : listContactRequests()
    );
  };
  handleReceptionContacts().catch((error) => {
    res.status(500).json({ message: error.message || "Murojaatlar olinmadi" });
  });
});

router.post("/reception/contact-requests/:id/read", authenticate, authorize("reception", "director"), (req, res) => {
  const handleReadContact = async () => {
    const ok =
      config.dbProvider === "mongodb"
        ? await markContactRequestReadMongo(Number(req.params.id))
        : config.dbProvider === "postgres"
          ? await markContactRequestReadAsync(Number(req.params.id))
          : markContactRequestRead(Number(req.params.id));
    if (!ok) {
      return res.status(404).json({ message: "Murojaat topilmadi" });
    }
    res.json({ ok: true });
  };
  handleReadContact().catch((error) => {
    res.status(500).json({ message: error.message || "Murojaat yangilanmadi" });
  });
});

router.post("/payments/webhook", async (req, res) => {
  try {
    const { phone, amount, provider, transactionId } = req.body;
    const student =
      config.dbProvider === "mongodb"
        ? await getStudentByPhoneMongo(phone)
        : config.dbProvider === "postgres"
          ? await getStudentByPhoneAsync(phone)
          : getStudentByPhone(phone);

    if (!student) {
      return res.status(404).json({ message: "Student topilmadi" });
    }

    const receipt =
      config.dbProvider === "mongodb"
        ? await recordPaymentMongo(student.id, Number(amount), provider, "paid", transactionId)
        : config.dbProvider === "postgres"
          ? await recordPaymentAsync(student.id, Number(amount), provider, "paid", transactionId)
          : recordPayment(student.id, Number(amount), provider, "paid", transactionId);
    const receiptAsset = await buildPaymentReceiptAsset(receipt);
    if (!receipt.duplicate) {
      sendStudentPaymentNotification({
        ...receipt,
        receiptCaption: receiptAsset.caption,
        receiptImageBuffer: receiptAsset.imageBuffer,
        receiptImageMimeType: "image/png"
      }).catch(() => null);
    }
    res.json({ message: "Webhook qabul qilindi" });
  } catch (error) {
    res.status(400).json({ message: error.message || "Webhook qabul qilinmadi" });
  }
});

router.get("/teacher/students", authenticate, authorize("teacher"), (req, res) => {
  const handleTeacherStudents = async () => {
    res.json(
      config.dbProvider === "mongodb"
        ? await getTeacherStudentsMongo(req.user.id)
        : config.dbProvider === "postgres"
          ? await getTeacherStudentsAsync(req.user.id)
          : getTeacherStudents(req.user.id)
    );
  };
  handleTeacherStudents().catch((error) => {
    res.status(500).json({ message: error.message || "Studentlar olinmadi" });
  });
});

router.get("/teacher/attendance/history", authenticate, authorize("teacher"), (req, res) => {
  const handleTeacherAttendance = async () => {
    const payload = {
      teacherId: req.user.id,
      range: req.query.range || "month",
      lessonDate: req.query.lessonDate || ""
    };
    res.json(
      config.dbProvider === "mongodb"
        ? await listAttendanceHistoryMongo(payload)
        : config.dbProvider === "postgres"
          ? await listAttendanceHistoryAsync(payload)
          : listAttendanceHistory(payload)
    );
  };
  handleTeacherAttendance().catch((error) => {
    res.status(500).json({ message: error.message || "Davomat olinmadi" });
  });
});

router.post("/teacher/attendance", authenticate, authorize("teacher"), (_req, res) => {
  res.status(403).json({ message: "Davomatni faqat reception belgilaydi" });
});

router.get("/attendance/history", authenticate, authorize("reception"), (req, res) => {
  const handleAttendanceHistory = async () => {
    const payload = {
      range: req.query.range || "day",
      lessonDate: req.query.lessonDate || ""
    };
    res.json(
      config.dbProvider === "mongodb"
        ? await listAttendanceHistoryMongo(payload)
        : config.dbProvider === "postgres"
          ? await listAttendanceHistoryAsync(payload)
          : listAttendanceHistory(payload)
    );
  };
  handleAttendanceHistory().catch((error) => {
    res.status(500).json({ message: error.message || "Davomat tarixi olinmadi" });
  });
});

router.post("/attendance/bulk", authenticate, authorize("reception"), (req, res) => {
  const handleAttendanceBulk = async () => {
    const lessonDate = req.body.lessonDate || dayjs().format("YYYY-MM-DD");
    const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
    const result =
      config.dbProvider === "mongodb"
        ? await upsertAttendanceBatchMongo({
            lessonDate,
            entries,
            actorUserId: req.user.id
          })
        : config.dbProvider === "postgres"
          ? await upsertAttendanceBatchAsync({
              lessonDate,
              entries,
              actorUserId: req.user.id
            })
          : upsertAttendanceBatch({
              lessonDate,
              entries,
              actorUserId: req.user.id
            });
    res.json({
      message: "Davomat saqlandi",
      savedCount: result.length
    });
  };
  handleAttendanceBulk().catch((error) => {
    res.status(400).json({ message: error.message || "Davomat saqlanmadi" });
  });
});

router.get("/director/overview", authenticate, authorize("director"), (_req, res) => {
  const handleDirectorOverview = async () => {
    res.json(
      config.dbProvider === "mongodb"
        ? await getDirectorStatsMongo()
        : config.dbProvider === "postgres"
          ? await getDirectorStatsAsync()
          : getDirectorStats()
    );
  };
  handleDirectorOverview().catch((error) => {
    res.status(500).json({ message: error.message || "Analitika olinmadi" });
  });
});

router.get("/director/finance", authenticate, authorize("director"), (_req, res) => {
  const handleDirectorFinance = async () => {
    res.json(
      config.dbProvider === "mongodb"
        ? await getFinanceSummaryMongo()
        : config.dbProvider === "postgres"
          ? await getFinanceSummaryAsync()
          : getFinanceSummary()
    );
  };
  handleDirectorFinance().catch((error) => {
    res.status(500).json({ message: error.message || "Moliya ma'lumotlari olinmadi" });
  });
});

router.get("/director/courses", authenticate, authorize("director"), (_req, res) => {
  const handleDirectorCourses = async () => {
    res.json(
      config.dbProvider === "mongodb"
        ? await listAllCoursesMongo()
        : config.dbProvider === "postgres"
          ? await listAllCoursesAsync()
          : listAllCourses()
    );
  };
  handleDirectorCourses().catch((error) => {
    res.status(500).json({ message: error.message || "Kurslar olinmadi" });
  });
});

router.post("/director/teachers", authenticate, authorize("director"), (req, res) => {
  const handleTeacherCreate = async () => {
    const payload = {
      fullName: req.body.fullName,
      username: req.body.username,
      phone: req.body.phone,
      monthlySalary: Number(req.body.monthlySalary || 0),
      profileImage: req.body.profileImage,
      courseIds: Array.isArray(req.body.courseIds) ? req.body.courseIds.map(Number) : [],
      passwordHash: bcrypt.hashSync(req.body.password || "12345678", 10)
    };
    const teacherId =
      config.dbProvider === "mongodb"
        ? await createTeacherMongo(payload)
        : config.dbProvider === "postgres"
          ? await createTeacherAsync(payload)
          : createTeacher(payload);
    res.status(201).json({ teacherId });
  };
  handleTeacherCreate().catch((error) => {
    res.status(400).json({ message: error.message || "O'qituvchi qo'shilmadi" });
  });
});

router.put("/director/teachers/:id", authenticate, authorize("director"), (req, res) => {
  const handleTeacherUpdate = async () => {
    const payload = {
      fullName: req.body.fullName,
      username: req.body.username,
      phone: req.body.phone,
      monthlySalary: Number(req.body.monthlySalary || 0),
      profileImage: req.body.profileImage,
      courseIds: Array.isArray(req.body.courseIds) ? req.body.courseIds.map(Number) : [],
      passwordHash: req.body.password ? bcrypt.hashSync(req.body.password, 10) : null
    };
    if (config.dbProvider === "mongodb") {
      await updateTeacherMongo(Number(req.params.id), payload);
    } else if (config.dbProvider === "postgres") {
      await updateTeacherAsync(Number(req.params.id), payload);
    } else {
      updateTeacher(Number(req.params.id), payload);
    }
    res.json({ message: "O'qituvchi yangilandi" });
  };
  handleTeacherUpdate().catch((error) => {
    res.status(400).json({ message: error.message || "O'qituvchi yangilanmadi" });
  });
});

router.delete("/director/teachers/:id", authenticate, authorize("director"), (req, res) => {
  const handleTeacherDelete = async () => {
    const result =
      config.dbProvider === "mongodb"
        ? await deleteTeacherMongo(Number(req.params.id))
        : config.dbProvider === "postgres"
          ? await deleteTeacherAsync(Number(req.params.id))
          : deleteTeacher(Number(req.params.id));
    res.json(result);
  };
  handleTeacherDelete().catch((error) => {
    res.status(400).json({ message: error.message || "O'qituvchi o'chirilmadi" });
  });
});

router.post("/director/courses", authenticate, authorize("director"), (req, res) => {
  const handleCourseCreate = async () => {
    const payload = {
      title: req.body.title,
      monthlyFee: Number(req.body.monthlyFee || 0),
      schedule: req.body.schedule
    };
    const courseId =
      config.dbProvider === "mongodb"
        ? await createCourseMongo(payload)
        : config.dbProvider === "postgres"
          ? await createCourseAsync(payload)
          : createCourse(payload);
    res.status(201).json({ courseId });
  };
  handleCourseCreate().catch((error) => {
    res.status(400).json({ message: error.message || "Kurs qo'shilmadi" });
  });
});

router.put("/director/courses/:id", authenticate, authorize("director"), (req, res) => {
  const handleCourseUpdate = async () => {
    const payload = {
      title: req.body.title,
      monthlyFee: Number(req.body.monthlyFee || 0),
      schedule: req.body.schedule,
      isActive: req.body.isActive !== false
    };
    if (config.dbProvider === "mongodb") {
      await updateCourseMongo(Number(req.params.id), payload);
    } else if (config.dbProvider === "postgres") {
      await updateCourseAsync(Number(req.params.id), payload);
    } else {
      updateCourse(Number(req.params.id), payload);
    }
    res.json({ message: "Kurs yangilandi" });
  };
  handleCourseUpdate().catch((error) => {
    res.status(400).json({ message: error.message || "Kurs yangilanmadi" });
  });
});

router.delete("/director/courses/:id", authenticate, authorize("director"), (req, res) => {
  const handleCourseDelete = async () => {
    const result =
      config.dbProvider === "mongodb"
        ? await deleteCourseMongo(Number(req.params.id))
        : config.dbProvider === "postgres"
          ? await deleteCourseAsync(Number(req.params.id))
          : deleteCourse(Number(req.params.id));
    res.json(result);
  };
  handleCourseDelete().catch((error) => {
    res.status(400).json({ message: error.message || "Kurs o'chirilmadi" });
  });
});

router.get("/director/reports/export", authenticate, authorize("director"), (req, res) => {
  const handleDirectorExport = async () => {
    const type = req.query.type || "overview";
    const format = req.query.format || "xlsx";
    const reportFilters = {
      period: req.query.period || "",
      from: req.query.from || "",
      to: req.query.to || ""
    };

    if (format === "csv") {
      if (type === "finance") {
        const finance =
          config.dbProvider === "mongodb"
            ? await getFinanceSummaryMongo()
            : config.dbProvider === "postgres"
              ? await getFinanceSummaryAsync()
              : getFinanceSummary();
        const content = [
          "Kategoriya,Qiymat",
          `Jami tushum,${finance.totals.totalRevenue}`,
          `Bugungi tushum,${finance.totals.todayRevenue}`,
          `Oylik tushum,${finance.totals.monthlyRevenue}`,
          `O'qituvchi oyligi,${finance.totals.teachersPayroll}`,
          `Boshqa xarajatlar,${finance.totals.operatingExpenses}`,
          `Jami xarajatlar,${finance.totals.totalExpenses}`,
          `Sof foyda,${finance.totals.netProfit}`
        ].join("\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=finance-report.csv");
        return res.send(content);
      }

      const students =
        config.dbProvider === "mongodb"
          ? await listStudentsMongo({ includeArchived: true })
          : config.dbProvider === "postgres"
            ? await listStudentsAsync({ includeArchived: true })
            : listStudents({ includeArchived: true });
      const content = [
        "Ism,Telefon,Kurs,O'qituvchi,Balans,Status,Arxiv",
        ...students.map((student) =>
          [
            student.fullName,
            student.phone,
            student.courseTitle || "",
            student.teacherName || "",
            student.balance,
            student.status,
            student.isArchived ? "Ha" : "Yo'q"
          ].join(",")
        )
      ].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=students-report.csv");
      return res.send(content);
    }

    if (format === "pdf") {
      const buffer = await buildDirectorPdfReport(reportFilters);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=ilm-nest-report.pdf");
      return res.send(buffer);
    }

    const buffer = await buildDirectorWorkbook(reportFilters);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=ilm-nest-report.xlsx");
    res.send(Buffer.from(buffer));
  };
  handleDirectorExport().catch((error) => {
    res.status(500).json({ message: error.message || "Report eksport qilinmadi" });
  });
});

router.get("/director/reports/print", authenticate, authorize("director"), (req, res) => {
  const handleDirectorPrint = async () => {
    const finance =
      config.dbProvider === "mongodb"
        ? await getFinanceSummaryMongo()
        : config.dbProvider === "postgres"
          ? await getFinanceSummaryAsync()
          : getFinanceSummary();
    const students =
      config.dbProvider === "mongodb"
        ? await listStudentsMongo({ includeArchived: true })
        : config.dbProvider === "postgres"
          ? await listStudentsAsync({ includeArchived: true })
          : listStudents({ includeArchived: true });
    const html = `
      <html><head><meta charset="utf-8"><title>ILM NEST Report</title></head>
      <body style="font-family: Inter, Arial; padding: 24px;">
        <h1>ILM NEST Hisobot</h1>
        <h2>Moliyaviy ko'rsatkichlar</h2>
        <p>Jami tushum: ${finance.totals.totalRevenue}</p>
        <p>Bugungi tushum: ${finance.totals.todayRevenue}</p>
        <p>Oylik tushum: ${finance.totals.monthlyRevenue}</p>
        <p>O'qituvchilar oyligi: ${finance.totals.teachersPayroll}</p>
        <p>Boshqa xarajatlar: ${finance.totals.operatingExpenses}</p>
        <p>Jami xarajatlar: ${finance.totals.totalExpenses}</p>
        <p>Sof foyda: ${finance.totals.netProfit}</p>
        <h2>O'quvchilar</h2>
        <table border="1" cellspacing="0" cellpadding="8">
          <tr><th>Ism</th><th>Telefon</th><th>Kurs</th><th>Balans</th><th>Status</th></tr>
          ${students.map((student) => `<tr><td>${student.fullName}</td><td>${student.phone}</td><td>${student.courseTitle || ""}</td><td>${student.balance}</td><td>${student.status}</td></tr>`).join("")}
        </table>
      </body></html>
    `;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  };
  handleDirectorPrint().catch((error) => {
    res.status(500).json({ message: error.message || "Print report yaratilmadi" });
  });
});

router.get("/notifications", authenticate, (req, res) => {
  const handleNotifications = async () => {
    res.json(
      config.dbProvider === "mongodb"
        ? await listNotificationsMongo({ userId: req.user.id, role: req.user.role })
        : config.dbProvider === "postgres"
          ? await listNotificationsAsync({ userId: req.user.id, role: req.user.role })
          : listNotifications({ userId: req.user.id, role: req.user.role })
    );
  };
  handleNotifications().catch((error) => {
    res.status(500).json({ message: error.message || "Bildirishnomalar olinmadi" });
  });
});

router.post("/notifications/read-all", authenticate, (req, res) => {
  const handleAllNotificationsRead = async () => {
    const changed =
      config.dbProvider === "mongodb"
        ? await markAllNotificationsReadMongo({ userId: req.user.id, role: req.user.role })
        : config.dbProvider === "postgres"
          ? await markAllNotificationsReadAsync({ userId: req.user.id, role: req.user.role })
          : markAllNotificationsRead({ userId: req.user.id, role: req.user.role });
    res.json({ message: "Bildirishnomalar o'qildi", changed });
  };
  handleAllNotificationsRead().catch((error) => {
    res.status(500).json({ message: error.message || "Bildirishnomalar yangilanmadi" });
  });
});

router.post("/notifications/:id/read", authenticate, (req, res) => {
  const handleNotificationRead = async () => {
    const ok =
      config.dbProvider === "mongodb"
        ? await markNotificationReadMongo(Number(req.params.id), req.user.id)
        : config.dbProvider === "postgres"
          ? await markNotificationReadAsync(Number(req.params.id), req.user.id)
          : markNotificationRead(Number(req.params.id), req.user.id);
    if (!ok) {
      return res.status(404).json({ message: "Notification topilmadi" });
    }
    res.json({ message: "Notification o'qildi" });
  };
  handleNotificationRead().catch((error) => {
    res.status(500).json({ message: error.message || "Bildirishnoma yangilanmadi" });
  });
});

router.post("/notifications/broadcast", authenticate, authorize("director"), (req, res) => {
  const handleBroadcast = async () => {
    const title = String(req.body.title || "").trim();
    const message = String(req.body.message || "").trim();
    const audience = String(req.body.audience || "students").trim();
    if (!title || !message) {
      return res.status(400).json({ message: "Sarlavha va xabar matni majburiy" });
    }

    if (config.dbProvider === "mongodb") {
      const result = await broadcastNotificationMongo({
        title,
        message,
        audience,
        actorUserId: req.user.id
      });
      await sendBotBroadcast(result.botRecipients, title, message).catch(() => null);
      return res.json({
        message: "Xabar yuborildi",
        siteCount: result.siteCount,
        botCount: result.botCount
      });
    }

    return res.status(501).json({ message: "Broadcast hozircha bu database uchun tayyor emas" });
  };

  handleBroadcast().catch((error) => {
    res.status(500).json({ message: error.message || "Xabar yuborilmadi" });
  });
});

router.get("/settings", authenticate, authorize("director", "reception"), (_req, res) => {
  const handleSettings = async () => {
    res.json(
      config.dbProvider === "mongodb"
        ? await getSettingsBundleMongo()
        : config.dbProvider === "postgres"
          ? await getSettingsBundleAsync()
          : getSettingsBundle()
    );
  };
  handleSettings().catch((error) => {
    res.status(500).json({ message: error.message || "Sozlamalar olinmadi" });
  });
});

router.put("/settings", authenticate, authorize("director"), (req, res) => {
  const handleSettingsSave = async () => {
    if (config.dbProvider === "mongodb") {
      await saveSettingsMongo(req.body);
    } else if (config.dbProvider === "postgres") {
      await saveSettingsAsync(req.body);
    } else {
      saveSettings(req.body);
    }
    res.json({ message: "Sozlamalar saqlandi" });
  };
  handleSettingsSave().catch((error) => {
    res.status(400).json({ message: error.message || "Sozlamalar saqlanmadi" });
  });
});

router.get("/student/me", authenticate, authorize("student"), (req, res) => {
  const handleStudentMe = async () => {
    const dashboard =
      config.dbProvider === "mongodb"
        ? await getStudentDashboardMongo(req.user.id)
        : config.dbProvider === "postgres"
          ? await getStudentDashboardAsync(req.user.id)
          : getStudentDashboard(req.user.id);
    const payments =
      config.dbProvider === "mongodb"
        ? await getStudentPaymentsMongo(req.user.id)
        : config.dbProvider === "postgres"
          ? await getStudentPaymentsAsync(req.user.id)
          : getStudentPayments(req.user.id);
    if (!dashboard || !payments) {
      return res.status(404).json({ message: "Student topilmadi" });
    }
    const schedule =
      config.dbProvider === "mongodb"
        ? await getStudentScheduleMongo(req.user.id)
        : config.dbProvider === "postgres"
          ? await getStudentScheduleAsync(req.user.id)
          : getStudentSchedule(req.user.id);
    res.json({
      profile: {
        ...dashboard,
        schedule: schedule?.items?.map((item) => `${item.day} ${item.time}`).join(", ") || ""
      },
      payments: payments.items.slice(0, 5)
    });
  };
  handleStudentMe().catch((error) => {
    res.status(500).json({ message: error.message || "Student ma'lumoti olinmadi" });
  });
});

router.get("/student/me/dashboard", authenticate, authorize("student"), (req, res) => {
  const handleStudentDashboard = async () => {
    const data =
      config.dbProvider === "mongodb"
        ? await getStudentDashboardMongo(req.user.id)
        : config.dbProvider === "postgres"
          ? await getStudentDashboardAsync(req.user.id)
          : getStudentDashboard(req.user.id);
    if (!data) {
      return res.status(404).json({ message: "Student topilmadi" });
    }
    res.json(data);
  };
  handleStudentDashboard().catch((error) => {
    res.status(500).json({ message: error.message || "Dashboard olinmadi" });
  });
});

router.get("/student/me/attendance", authenticate, authorize("student"), (req, res) => {
  const handleStudentAttendance = async () => {
    const data =
      config.dbProvider === "mongodb"
        ? await getStudentAttendanceMongo(req.user.id)
        : config.dbProvider === "postgres"
          ? await getStudentAttendanceAsync(req.user.id)
          : getStudentAttendance(req.user.id);
    if (!data) {
      return res.status(404).json({ message: "Davomat topilmadi" });
    }
    res.json(data);
  };
  handleStudentAttendance().catch((error) => {
    res.status(500).json({ message: error.message || "Davomat olinmadi" });
  });
});

router.get("/student/me/payments", authenticate, authorize("student"), (req, res) => {
  const handleStudentPayments = async () => {
    const data =
      config.dbProvider === "mongodb"
        ? await getStudentPaymentsMongo(req.user.id)
        : config.dbProvider === "postgres"
          ? await getStudentPaymentsAsync(req.user.id)
          : getStudentPayments(req.user.id);
    if (!data) {
      return res.status(404).json({ message: "To'lovlar topilmadi" });
    }
    res.json(data);
  };
  handleStudentPayments().catch((error) => {
    res.status(500).json({ message: error.message || "To'lovlar olinmadi" });
  });
});

router.get("/student/me/schedule", authenticate, authorize("student"), (req, res) => {
  const handleStudentSchedule = async () => {
    const data =
      config.dbProvider === "mongodb"
        ? await getStudentScheduleMongo(req.user.id)
        : config.dbProvider === "postgres"
          ? await getStudentScheduleAsync(req.user.id)
          : getStudentSchedule(req.user.id);
    if (!data) {
      return res.status(404).json({ message: "Jadval topilmadi" });
    }
    res.json(data);
  };
  handleStudentSchedule().catch((error) => {
    res.status(500).json({ message: error.message || "Jadval olinmadi" });
  });
});

router.get("/student/me/notifications", authenticate, authorize("student"), (req, res) => {
  const handleStudentNotifications = async () => {
    res.json(
      config.dbProvider === "mongodb"
        ? await listNotificationsMongo({ userId: req.user.id, role: "student" })
        : config.dbProvider === "postgres"
          ? await listNotificationsAsync({ userId: req.user.id, role: "student" })
          : listNotifications({ userId: req.user.id, role: "student" })
    );
  };
  handleStudentNotifications().catch((error) => {
    res.status(500).json({ message: error.message || "Bildirishnomalar olinmadi" });
  });
});

router.get("/student/me/profile", authenticate, authorize("student"), (req, res) => {
  const handleStudentProfile = async () => {
    const data =
      config.dbProvider === "mongodb"
        ? await getStudentProfilePanelMongo(req.user.id)
        : config.dbProvider === "postgres"
          ? await getStudentProfilePanelAsync(req.user.id)
          : getStudentProfilePanel(req.user.id);
    if (!data) {
      return res.status(404).json({ message: "Profil topilmadi" });
    }
    const webAppUrl =
      config.dbProvider === "mongodb"
        ? await getStudentAccessLinkByUserIdMongo(req.user.id)
        : config.dbProvider === "postgres"
          ? await getStudentAccessLinkByUserIdAsync(req.user.id)
          : getStudentAccessLinkByUserId(req.user.id);
    res.json({
      ...data,
      webAppUrl
    });
  };
  handleStudentProfile().catch((error) => {
    res.status(500).json({ message: error.message || "Profil olinmadi" });
  });
});

router.put("/student/me/profile/password", authenticate, authorize("student"), (req, res) => {
  const handleStudentPassword = async () => {
    if (!req.body.password) {
      return res.status(400).json({ message: "Yangi parol majburiy" });
    }
    const nextHash = bcrypt.hashSync(req.body.password, 10);
    if (config.dbProvider === "mongodb") {
      await changeStudentPasswordMongo(req.user.id, nextHash);
    } else if (config.dbProvider === "postgres") {
      await changeStudentPasswordAsync(req.user.id, nextHash);
    } else {
      changeStudentPassword(req.user.id, nextHash);
    }
    res.json({ message: "Parol yangilandi" });
  };
  handleStudentPassword().catch((error) => {
    res.status(400).json({ message: error.message || "Parol yangilanmadi" });
  });
});

router.get("/developers/me", authenticate, authorize("developer_portfolio"), (req, res) => {
  const handleDeveloperMe = async () => {
    const developer =
      config.dbProvider === "mongodb"
        ? await getDeveloperProfileByIdMongo(req.user.id)
        : config.dbProvider === "postgres"
          ? await getDeveloperProfileByIdAsync(req.user.id)
          : getDeveloperProfileById(req.user.id);
    if (!developer) {
      return res.status(404).json({ message: "Dasturchi topilmadi" });
    }
    res.json(developer);
  };
  handleDeveloperMe().catch((error) => {
    res.status(500).json({ message: error.message || "Dasturchi topilmadi" });
  });
});

router.put("/developers/me", authenticate, authorize("developer_portfolio"), (req, res) => {
  const handleDeveloperUpdate = async () => {
    const payload = {
      username: req.body.username,
      fullName: req.body.fullName,
      age: req.body.age,
      roleTitle: req.body.roleTitle,
      shortBio: req.body.shortBio,
      bio: req.body.bio,
      skills: req.body.skills,
      image: req.body.image,
      bannerImage: req.body.bannerImage,
      certificateImage: req.body.certificateImage,
      telegramUrl: req.body.telegramUrl,
      instagramUrl: req.body.instagramUrl,
      githubUrl: req.body.githubUrl,
      websiteUrl: req.body.websiteUrl,
      passwordHash: req.body.password ? bcrypt.hashSync(req.body.password, 10) : null
    };
    const developer =
      config.dbProvider === "mongodb"
        ? await updateDeveloperProfileMongo(req.user.id, payload)
        : updateDeveloperProfile(req.user.id, payload);
    res.json(developer);
  };
  handleDeveloperUpdate().catch((error) => {
    res.status(400).json({ message: error.message || "Dasturchi profili yangilanmadi" });
  });
});

export default router;
