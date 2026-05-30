import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
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
  Setting,
  Student,
  StudentAuth,
  StudentHistory,
  TeacherCourseAssignment,
  TelegramLink,
  User,
  getNextSequence
} from "./mongo-models.js";

async function seedDeveloperProfiles(now, passwordHash) {
  const count = await DeveloperProfile.countDocuments();
  if (count > 0) return;

  const profiles = [
    {
      slug: "ozodbek",
      username: "ozodbekmamatov",
      fullName: "Mamatov Ozodbek",
      age: 22,
      roleTitle: "Full-stack Developer",
      shortBio: "Ta'lim va CRM tizimlari uchun zamonaviy veb mahsulotlar yaratadi.",
      bio: "Mamatov Ozodbek Intelligent loyihasining asosiy arxitektori va product-oriented full-stack dasturchisi.",
      skills: ["React", "Node.js", "Express", "MongoDB", "JWT", "UI/UX"],
      image: null,
      bannerImage: null,
      certificateImage: null,
      telegramUrl: "https://t.me/OzodFlow",
      instagramUrl: "https://instagram.com/mamatov_ads",
      githubUrl: "https://github.com/mamatov_ads",
      websiteUrl: ""
    },
    {
      slug: "adiz",
      username: "mannabovadiz",
      fullName: "Mannabov Adiz",
      age: 21,
      roleTitle: "Frontend Developer",
      shortBio: "Murakkab dashboard va landing page dizaynlarini kodga aylantiradi.",
      bio: "Mannabov Adiz komponentlarga boy SaaS interfeyslar, responsive layout va premium frontend animatsiyalar bo'yicha ishlaydi.",
      skills: ["React", "Vite", "CSS", "Responsive UI", "Dashboard Design"],
      image: null,
      bannerImage: null,
      certificateImage: null,
      telegramUrl: "https://t.me/adizdev",
      instagramUrl: "https://instagram.com/adizdev",
      githubUrl: "https://github.com/adizdev",
      websiteUrl: ""
    },
    {
      slug: "javohir",
      username: "botirovjavohir",
      fullName: "Botirov Javohir",
      age: 23,
      roleTitle: "Backend Developer",
      shortBio: "Barqaror API, autentifikatsiya va biznes logikalarni ishlab chiqadi.",
      bio: "Botirov Javohir backend arxitektura, ma'lumotlar bazasi, xavfsizlik va integratsiyalar ustida ishlaydi.",
      skills: ["Node.js", "Express", "MongoDB", "Auth", "Integrations", "Automation"],
      image: null,
      bannerImage: null,
      certificateImage: null,
      telegramUrl: "https://t.me/javohirdev",
      instagramUrl: "https://instagram.com/javohirdev",
      githubUrl: "https://github.com/javohirdev",
      websiteUrl: ""
    }
  ];

  for (const profile of profiles) {
    await DeveloperProfile.create({
      id: await getNextSequence("developer_profiles"),
      passwordHash,
      isActive: true,
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
      ...profile
    });
  }
}

async function ensureDefaultUsers(passwordHash, now) {
  let director = await User.findOne({ role: "director" }).lean();
  if (!director) {
    director = await User.create({
      id: await getNextSequence("users"),
      fullName: "Azizbek Director",
      username: "director",
      passwordHash,
      phone: "+998932303410",
      monthlySalary: 0,
      role: "director",
      telegramId: null,
      profileImage: null,
      createdAt: now.toDate()
    });
  } else {
    await User.updateOne(
      { id: director.id },
      {
        $set: {
          username: "director",
          passwordHash,
          fullName: director.fullName || "Azizbek Director",
          phone: director.phone || "+998932303410"
        }
      }
    );
    director = await User.findOne({ role: "director" }).lean();
  }

  let reception = await User.findOne({ role: "reception" }).lean();
  if (!reception) {
    reception = await User.create({
      id: await getNextSequence("users"),
      fullName: "Malika Reception",
      username: "reception",
      passwordHash,
      phone: "+998907778899",
      monthlySalary: 0,
      role: "reception",
      telegramId: null,
      profileImage: null,
      createdAt: now.toDate()
    });
  } else {
    await User.updateOne(
      { id: reception.id },
      {
        $set: {
          username: "reception",
          passwordHash,
          fullName: reception.fullName || "Malika Reception",
          phone: reception.phone || "+998907778899"
        }
      }
    );
    reception = await User.findOne({ role: "reception" }).lean();
  }

  return {
    directorId: Number(director.id || director._id),
    receptionId: Number(reception.id || reception._id)
  };
}

async function seedMinimalCrm(now, passwordHash) {
  const usersCount = await User.countDocuments();
  if (usersCount > 2) {
    return;
  }

  let branch = await Branch.findOne().lean();
  if (!branch) {
    branch = await Branch.create({
      id: await getNextSequence("branches"),
      name: "Asosiy filial",
      address: "Toshkent shahri, Chilonzor",
      createdAt: now.toDate()
    });
  }

  const existingTeacher = await User.findOne({ role: "teacher" }).lean();
  let teacherId = existingTeacher?.id;
  if (!existingTeacher) {
    const teacher = await User.create({
      id: await getNextSequence("users"),
      fullName: "Dilshod Teacher",
      username: "teacher",
      passwordHash,
      phone: "+998909998877",
      monthlySalary: 3500000,
      role: "teacher",
      telegramId: null,
      profileImage: null,
      createdAt: now.toDate()
    });
    teacherId = teacher.id;
  }

  const coursesCount = await Course.countDocuments();
  if (coursesCount === 0) {
    const englishId = await getNextSequence("courses");
    const mathId = await getNextSequence("courses");
    await Course.create([
      {
        id: englishId,
        branchId: branch.id,
        title: "IELTS Intensive",
        monthlyFee: 800000,
        schedule: "Du-Chor-Juma, 18:00",
        isActive: true,
        createdAt: now.toDate()
      },
      {
        id: mathId,
        branchId: branch.id,
        title: "Matematika Foundation",
        monthlyFee: 650000,
        schedule: "Se-Pay-Shan, 16:00",
        isActive: true,
        createdAt: now.toDate()
      }
    ]);

    await TeacherCourseAssignment.create([
      {
        id: await getNextSequence("teacher_course_assignments"),
        teacherId,
        courseId: englishId,
        createdAt: now.toDate()
      },
      {
        id: await getNextSequence("teacher_course_assignments"),
        teacherId,
        courseId: mathId,
        createdAt: now.toDate()
      }
    ]);
  }

  const settingsCount = await Setting.countDocuments();
  if (settingsCount === 0) {
    const settings = [
      ["center_name", "ILM NEST"],
      ["center_phone", "+998 90 123 45 67"],
      ["center_address", "Toshkent shahri"],
      ["payment_rekvizit", "Click / Payme / Naqd"],
      ["telegram_support", "@intelligent_support"],
      ["rent_expense", "0"],
      ["advertising_expense", "0"],
      ["internet_expense", "0"],
      ["admin_salary_expense", "0"]
    ];
    for (const [key, value] of settings) {
      await Setting.create({
        key,
        value,
        updatedAt: now.toDate()
      });
    }
  }
}

export async function ensureMongoSeed() {
  const now = dayjs();
  const passwordHash = bcrypt.hashSync("12345678", 10);

  await Attendance.deleteMany({ id: null });
  await Attendance.syncIndexes().catch(() => null);

  await Promise.all([
    seedDeveloperProfiles(now, passwordHash),
    ensureDefaultUsers(passwordHash, now)
  ]);

  await seedMinimalCrm(now, passwordHash);
}

export async function purgeMongoData() {
  await Promise.all([
    Attendance.deleteMany({}),
    Branch.deleteMany({}),
    ContactRequest.deleteMany({}),
    Course.deleteMany({}),
    DeveloperProfile.deleteMany({}),
    Notification.deleteMany({}),
    Payment.deleteMany({}),
    QrToken.deleteMany({}),
    ReminderDispatch.deleteMany({}),
    Setting.deleteMany({}),
    Student.deleteMany({}),
    StudentAuth.deleteMany({}),
    StudentHistory.deleteMany({}),
    TeacherCourseAssignment.deleteMany({}),
    TelegramLink.deleteMany({}),
    User.deleteMany({})
  ]);
  await getNextSequence("reset_marker_" + crypto.randomBytes(4).toString("hex"));
}
