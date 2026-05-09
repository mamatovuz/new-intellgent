import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const jsonOptions = {
  versionKey: false
};

const counterSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 }
  },
  jsonOptions
);

const branchSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true },
    address: String,
    createdAt: { type: Date, default: Date.now }
  },
  jsonOptions
);

const userSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    username: { type: String, unique: true, sparse: true },
    passwordHash: String,
    phone: String,
    monthlySalary: { type: Number, default: 0 },
    role: { type: String, required: true, index: true },
    telegramId: String,
    profileImage: String,
    createdAt: { type: Date, default: Date.now }
  },
  jsonOptions
);

const courseSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    branchId: Number,
    title: { type: String, required: true },
    monthlyFee: { type: Number, required: true, default: 0 },
    schedule: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  },
  jsonOptions
);

const studentSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    userId: { type: Number, required: true, unique: true, index: true },
    courseId: Number,
    teacherId: Number,
    balance: { type: Number, default: 0 },
    status: { type: String, default: "active", index: true },
    enrolledAt: Date,
    trialRequired: { type: Number, default: 3 },
    paymentDueDate: Date,
    lastPaymentDate: Date,
    billingStartDate: Date,
    groupSchedule: String,
    isRegistered: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: Date,
    createdAt: { type: Date, default: Date.now }
  },
  jsonOptions
);

const paymentSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    studentId: { type: Number, required: true, index: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    status: { type: String, required: true, index: true },
    externalId: String,
    receivedByUserId: Number,
    reason: String,
    createdAt: { type: Date, default: Date.now, index: true }
  },
  jsonOptions
);

const attendanceSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    studentId: { type: Number, required: true, index: true },
    teacherId: { type: Number, required: true, index: true },
    lessonDate: { type: Date, required: true, index: true },
    status: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  jsonOptions
);
attendanceSchema.index({ studentId: 1, lessonDate: 1 }, { unique: true });

const telegramLinkSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    studentId: { type: Number, required: true, index: true },
    phone: { type: String, required: true },
    code: { type: String, required: true, index: true },
    used: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now }
  },
  jsonOptions
);

const studentHistorySchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    studentId: { type: Number, required: true, index: true },
    actorUserId: Number,
    action: { type: String, required: true },
    title: { type: String, required: true },
    details: String,
    createdAt: { type: Date, default: Date.now }
  },
  jsonOptions
);

const notificationSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    targetRole: String,
    targetUserId: Number,
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    metadata: Schema.Types.Mixed,
    status: { type: String, default: "unread", index: true },
    createdAt: { type: Date, default: Date.now },
    readAt: Date
  },
  jsonOptions
);

const settingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now }
  },
  jsonOptions
);

const teacherCourseAssignmentSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    teacherId: { type: Number, required: true, index: true },
    courseId: { type: Number, required: true, index: true },
    createdAt: { type: Date, default: Date.now }
  },
  jsonOptions
);
teacherCourseAssignmentSchema.index({ teacherId: 1, courseId: 1 }, { unique: true });

const studentAuthSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    studentId: { type: Number, required: true, unique: true, index: true },
    phone: { type: String, required: true, index: true },
    accessToken: { type: String, unique: true, sparse: true, index: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  jsonOptions
);

const qrTokenSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    studentId: { type: Number, required: true, index: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    usedAt: Date,
    createdAt: { type: Date, default: Date.now }
  },
  jsonOptions
);

const developerProfileSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true },
    age: Number,
    roleTitle: { type: String, required: true },
    shortBio: String,
    bio: String,
    skills: [String],
    image: String,
    bannerImage: String,
    certificateImage: String,
    telegramUrl: String,
    instagramUrl: String,
    githubUrl: String,
    websiteUrl: String,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  jsonOptions
);

const contactRequestSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    message: { type: String, required: true },
    status: { type: String, default: "new", index: true },
    createdAt: { type: Date, default: Date.now },
    readAt: Date
  },
  jsonOptions
);

const reminderDispatchSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    studentId: { type: Number, required: true, index: true },
    reminderType: { type: String, required: true },
    dispatchDate: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  jsonOptions
);
reminderDispatchSchema.index({ studentId: 1, reminderType: 1, dispatchDate: 1 }, { unique: true });

export const Counter = models.Counter || model("Counter", counterSchema);
export const Branch = models.Branch || model("Branch", branchSchema);
export const User = models.User || model("User", userSchema);
export const Course = models.Course || model("Course", courseSchema);
export const Student = models.Student || model("Student", studentSchema);
export const Payment = models.Payment || model("Payment", paymentSchema);
export const Attendance = models.Attendance || model("Attendance", attendanceSchema);
export const TelegramLink = models.TelegramLink || model("TelegramLink", telegramLinkSchema);
export const StudentHistory = models.StudentHistory || model("StudentHistory", studentHistorySchema);
export const Notification = models.Notification || model("Notification", notificationSchema);
export const Setting = models.Setting || model("Setting", settingSchema);
export const TeacherCourseAssignment =
  models.TeacherCourseAssignment || model("TeacherCourseAssignment", teacherCourseAssignmentSchema);
export const StudentAuth = models.StudentAuth || model("StudentAuth", studentAuthSchema);
export const QrToken = models.QrToken || model("QrToken", qrTokenSchema);
export const DeveloperProfile = models.DeveloperProfile || model("DeveloperProfile", developerProfileSchema);
export const ContactRequest = models.ContactRequest || model("ContactRequest", contactRequestSchema);
export const ReminderDispatch = models.ReminderDispatch || model("ReminderDispatch", reminderDispatchSchema);

export async function getNextSequence(key) {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return Number(counter.seq || 1);
}
