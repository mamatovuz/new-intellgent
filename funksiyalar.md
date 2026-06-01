# ILM NEST CRM loyihasi funksiyalari

Bu hujjat ILM NEST web sayt, admin panellar, student kabinet, reception panel, teacher panel, director panel, backend API va Telegram bot funksiyalarini umumiy tarzda tushuntiradi.

## 1. Asosiy web sayt

Asosiy sayt o'quv markazni internetda tanitish, kurslarni ko'rsatish va yangi mijozlardan murojaat yig'ish uchun ishlaydi.

### Asosiy sahifa

- ILM NEST o'quv markazi haqida premium landing sahifa.
- Markaz nomi, logotip, asosiy slogan va ta'lim yo'nalishlari ko'rsatiladi.
- Kurslar, narxlar, afzalliklar, manzil va bog'lanish bo'limlariga tez o'tish bor.
- “Kirish”, “Admin kirish” va “Bog'lanish” tugmalari mavjud.
- Mobil va desktop ekranlarda responsive ishlaydi.
- Animatsiyalar, smooth scroll va Apple uslubidagi yumshoq harakatlar qo'shilgan.
- Kunduzgi va tungi rejim panellar uchun ishlaydi.
- Til tanlash qo'llab-quvvatlanadi: o'zbek, rus, ingliz, arab.

### Kurslar bo'limi

- Director panelda yaratilgan real kurslar saytga chiqadi.
- Kurs nomi, narxi, tavsifi va jadvali ko'rsatiladi.
- Kurs narxi director kiritgan qiymat asosida olinadi.
- Agar kurslar bazada bo'lmasa, fallback yo'nalishlar chiqadi.

### Bog'lanish formasi

- Mijoz ism-familiyasini kiritadi.
- Telefon raqamini kiritadi.
- Qiziqayotgan kursini tanlaydi.
- Tavsif yoki izoh yozadi.
- Yuborilgan murojaat reception panelga tushadi.
- Reception murojaat statusini o'zgartira oladi: yangi, bog'landik, keladi, rad etdi.

### SEO va Google uchun

- `robots.txt` mavjud.
- `sitemap.xml` mavjud.
- `sitemap.html` sahifasi mavjud.
- Asosiy sahifa, dasturchilar, student login, admin login va bog'lanish havolalari sitemapda bo'lishi mumkin.
- Sayt title, description, canonical va Open Graph meta taglar bilan Google uchun tayyorlangan.
- Google Search Console orqali indekslashga tayyor.

### Dasturchilar sahifasi

- `/dasturchilar` sahifasida loyiha dasturchilari ko'rsatiladi.
- Har bir dasturchi uchun ism, rol, qisqa tavsif va portfolio ma'lumotlari bo'lishi mumkin.
- Dasturchi detail sahifasi mavjud: `/dasturchilar/:slug`.
- Developer login sahifasi mavjud: `/dasturchilar/login`.
- Developer portal orqali developer o'z profil ma'lumotlarini tahrirlashi mumkin.

## 2. Login va rollar tizimi

Loyihada bir nechta rol mavjud. Har bir rol o'z paneliga kiradi va faqat o'ziga kerakli funksiyalarni ko'radi.

### Rollar

- Director: butun markazni boshqaradi.
- Reception: o'quvchi, to'lov, davomat va murojaatlar bilan ishlaydi.
- Teacher: o'z guruhlari, o'quvchilari va davomatlarini ko'radi.
- Student: o'z kabinetida kurs, to'lov, davomat, jadval va bildirishnomalarini ko'radi.
- Developer portfolio: dasturchi profili uchun alohida login.

### Kirish

- Admin login: director, reception va teacher uchun.
- Student login: telefon va parol orqali.
- Student uchun default parol qo'llab-quvvatlanadi.
- Telegram bot orqali student kabinet havolasi olish mumkin.
- QR/link orqali studentni Telegram yoki kabinetga bog'lash oqimi mavjud.
- JWT token orqali sessiya yuritiladi.

## 3. Director panel

Director panel markaz egasi yoki rahbar uchun boshqaruv va tahlil markazi hisoblanadi.

### Director dashboard

- Oylik tushum ko'rsatiladi.
- Boshqa xarajatlar ko'rsatiladi.
- O'qituvchi oyliklari ko'rsatiladi.
- Sof foyda hisoblanadi.
- O'quvchilar soni ko'rsatiladi.
- Qarzdorlar soni ko'rsatiladi.
- Joriy oy, oldingi oy va o'sish holati tahlil qilinadi.

### Tushumlar dinamikasi

- Kunlik, haftalik va oylik tushum trendi bor.
- Ko'k chiziqli chart ko'rinishida tushumlar chiqadi.
- Hover qilganda diagnostika/tooltip chiqadi.
- Fullscreen rejim mavjud.
- Fullscreen ichida chartni scroll qilish mumkin.
- Fullscreen ichida chartni sichqoncha bilan ushlab chap-o'ng, tepaga-pastga siljitish mumkin.
- Filtr bor: “Dan” va “Gacha” sanalari bo'yicha.
- O'rtacha tushum, eng yuqori tushum, jami tushum va holat ko'rsatiladi.

### Director statistika

- Qabul trendi ko'rsatiladi.
- Oylik yangi o'quvchilar soni ko'rsatiladi.
- O'qituvchilar samaradorligi ko'rsatilishi mumkin.
- Kurslar bo'yicha o'quvchilar taqsimoti ko'rinadi.
- Moliyaviy dinamikani tahlil qilish imkoniyati bor.

### Kurslar boshqaruvi

- Yangi kurs qo'shish.
- Kurs nomi, narxi, jadvali, tavsifi va statusini kiritish.
- Kursni tahrirlash.
- Kursni o'chirish yoki arxivlash/tiklash.
- Kurs teacherga biriktiriladi.
- Kurs saytning asosiy sahifasida ham chiqadi.

### O'qituvchilar boshqaruvi

- Teacher qo'shish.
- Teacher login/parol yaratish.
- Teacherga kurslar biriktirish.
- Teacher ma'lumotlarini tahrirlash.
- Teacher oyligini belgilash.
- Teacher o'chirish.
- Teacher biriktirilgan kurslar bilan ishlaydi.

### O'quvchilar boshqaruvi

- Director barcha o'quvchilarni ko'ra oladi.
- O'quvchi statusi, kursi, ustoz, balans va to'lov muddati ko'rinadi.
- O'quvchi tarixi ko'riladi.
- Arxivlangan o'quvchilarni kuzatish mumkin.

### To'lovlar nazorati

- Barcha to'lovlar tarixi ko'riladi.
- Qaysi student qancha to'lagani ko'rinadi.
- To'lov usuli ko'rinadi: naqd, Payme yoki boshqa provider.
- Tushumlar director statistikaga tushadi.

### Davomat nazorati

- Director davomat statistikalarini ko'ra oladi.
- Qaysi o'quvchi kelgan/kelmaganini ko'rish mumkin.
- Teacher va kurslar kesimida davomat tahlili ishlaydi.

### Shikoyatlar paneli

- Student o'z ustozidan shikoyat yuborishi mumkin.
- Shikoyat director panelga tushadi.
- Director shikoyatni ko'radi.
- Shikoyat statusini o'zgartirish mumkin.
- Shikoyat orqali rahbar o'qituvchi sifati va muammolarni nazorat qiladi.

### Bildirishnomalar

- Director bildirishnomalarni ko'radi.
- “Hammasini o'qilgan deb belgilash” funksiyasi bor.
- Yangi to'lovlar, shikoyatlar va muhim holatlar bildirishnoma bo'lishi mumkin.
- Keraksiz import bildirishnomalari directorni bezovta qilmasligi uchun kamaytirilgan.

### Hisobotlar

- Excel export.
- PDF export.
- Print report.
- Finance report.
- Students report.
- Sana va davr bo'yicha report filter.

### Sozlamalar

- Markaz sozlamalarini ko'rish.
- Profil ma'lumotlarini tahrirlash.
- Til sozlamasi.
- Kun/tun rejimi.
- Password yoki profil ma'lumotlarini yangilash.

## 4. Reception panel

Reception panel administrator uchun kundalik ishlarni bajaradi: o'quvchi qo'shish, to'lov olish, davomat olish va murojaatlar bilan ishlash.

### Reception dashboard

- Jami studentlar soni.
- Faol studentlar soni.
- Sinovdagilar soni.
- Qarzdorlar soni.
- Bugungi to'lovlar summasi.
- Tezkor amallar: o'quvchilar, to'lov olish, davomat olish, bog'lanishlar.
- Oxirgi to'lovlar ro'yxati.

### O'quvchilar ro'yxati

- O'quvchilar jadvali.
- Ism-familiya, telefon, Telegram holati.
- Kurs va teacher.
- Balans.
- Status: sinovda, faol, qarzdor.
- To'lov muddati.
- Amallar: tahrirlash, tarix, QR/link, Telegram bog'lash, o'chirish.
- Search input orqali o'quvchilar qidiriladi.
- Filter: barchasi, sinovdagilar, faol, qarzdorlar.

### O'quvchi qo'shish

- Ism-familiya.
- Telefon raqam.
- Kurs tanlash.
- Kursga biriktirilgan teacher tanlash.
- Oylik to'lov.
- Dars jadvali.
- Xona yoki qo'shimcha ma'lumot.
- Sinov muddati tanlash: 1 kun, 2 kun, 3 kun, 4 kun.
- Sinov muddati dars kunlari bo'yicha hisoblanadi, ya'ni oddiy kalendar kuni emas, o'qish kuni asosida.
- Student qo'shilgandan keyin QR/link beriladi.

### Import wizard

- Excel, CSV yoki JSON orqali eski o'quvchilarni import qilish.
- Preview qilish.
- Xato va to'g'ri qatorlarni ajratib ko'rsatish.
- Import oldidan kurs va teacher tanlash/tahrirlash imkoniyati.
- Xato qatorlarni tuzatib import qilish.
- Import qilingan studentlar bazaga tushadi.
- Import director uchun ortiqcha notification spam qilmasligi kerak.

### O'quvchi tarixi

- Studentga oid o'zgarishlar tarixi saqlanadi.
- Qo'shildi, tahrirlandi, to'lov qilindi, arxivlandi kabi loglar bo'lishi mumkin.
- Reception va director student tarixini ko'ra oladi.

### QR va Telegram ulash

- Reception student uchun QR/link yaratadi.
- QR skan qilinsa Telegram botga yoki student ro'yxatdan o'tish oqimiga yo'naltiradi.
- Student Telegram akkaunti bazadagi studentga ulanadi.
- Telegram ulangan/ulanmagan holat jadvalda ko'rinadi.

### To'lov qabul qilish

- Student tanlanadi.
- To'lov summasi kiritiladi.
- To'lov usuli tanlanadi.
- Kamroq summa bo'lsa sabab yoziladi.
- To'lov saqlanganda student balansi yangilanadi.
- To'lov tarixi yaratiladi.
- Chiroyli chek yaratiladi.
- Agar student Telegramga ulangan bo'lsa, chek bot orqali yuboriladi.
- Bir necha marta bosilganda duplicate to'lovni oldini olish uchun himoya qo'shilgan.

### Davomat olish

- Guruh/kurs tanlanadi.
- O'quvchilar ro'yxati chiqadi.
- Checkbox bosilsa “Keldi”.
- Bosilmagan bo'lsa “Kelmadi” hisoblanadi.
- “Barchasi keldi” kabi tezkor UX bo'lishi mumkin.
- Saqlanganda davomat bazaga yoziladi.
- Davomat student, teacher va director statistikalariga ta'sir qiladi.
- Duplicate attendance xatolarini oldini olish uchun id va upsert ishlatiladi.

### Bog'lanishlar CRM

- Saytdan kelgan murojaatlar receptionga tushadi.
- Statuslar: yangi, bog'landik, keladi, rad etdi.
- Telefon orqali qo'ng'iroq qilish tugmasi.
- Murojaatni ko'rildi deb belgilash.
- Murojaatlarni status bo'yicha filter qilish.

### Reception sozlamalari

- Profil ma'lumotlari.
- Til sozlamasi.
- Kun/tun rejimi.
- Account sozlamalari.

## 5. Teacher panel

Teacher panel o'qituvchi uchun o'z guruhlari, studentlari va davomat ko'rsatkichlarini ko'rsatadi.

### Teacher dashboard

- Teacherga biriktirilgan studentlar soni.
- Guruhlar soni.
- Davomat foizi.
- Bugungi darslar soni.
- Davomat trendi.
- Bugun qaysi guruh, nechada, nechta o'quvchi borligi.

### Davomat ko'rinishi

- Teacher o'z guruhini tanlaydi.
- Sana tanlaydi.
- Guruhdagi studentlar ro'yxati chiqadi.
- Har bir student statusi ko'rinadi: keldi/kelmadi.
- O'rtacha davomat hisoblanadi.
- Teacher davomatni ko'radi, lekin asosiy davomatni reception belgilaydi.

### Mening guruhlarim

- Teacherga biriktirilgan guruhlar ro'yxati.
- Har bir guruhda nechta o'quvchi borligi.
- Guruh davomat foizi.
- Keldi/kelmadi yozuvlar soni.
- Mini trend chart.

### Teacher statistika

- Studentlar kesimida davomat foizi.
- Kurs nomi.
- Har bir studentning davomat natijasi.
- Teacher o'z guruh samaradorligini ko'radi.

### Teacher sozlamalari

- Profil ma'lumotlarini tahrirlash.
- Til sozlamasi.
- Kun/tun rejimi.
- Account sozlamalari.

## 6. Student kabinet

Student kabinet o'quvchi uchun shaxsiy kabinet hisoblanadi. O'quvchi o'z kursi, to'lovi, davomatlari va bildirishnomalarini ko'radi.

### Student dashboard

- Student profili.
- Kurs nomi.
- Teacher.
- Status: sinovda, faol, qarzdor.
- Balans.
- Oylik to'lov.
- Oxirgi to'lovlar.
- Davomat holati.
- Keyingi dars yoki jadval ma'lumotlari.

### Kursim / jadval

- Kurs nomi.
- Ustoz.
- Dars vaqti.
- Xona.
- Keyingi dars sanasi.
- Dars kunlari.
- Receptiondan aniqlanadigan ma'lumotlar.

### To'lovlarim

- To'lovlar tarixi.
- Har bir to'lov alohida chiroyli card ko'rinishida.
- Chekni yuklab olish yoki ko'rish.
- To'lov usuli.
- Sana va summa.

### Davomatim

- O'quvchining davomat tarixi.
- Qaysi kuni kelgan/kelmaganini ko'rish.
- Davomat kalendari.
- Oylik davomat foizi.

### Bildirishnomalar

- To'lov muddati eslatmasi.
- Qarzdorlik ogohlantirishi.
- Dars eslatmasi.
- Sinov tugashi haqida xabar.
- Notification o'qilgan/o'qilmagan holati.

### Profil

- Student shaxsiy ma'lumotlari.
- Telefon.
- Kurs va teacher.
- Parolni o'zgartirish.
- Ustoz ustidan shikoyat yuborish.

### Shikoyat yuborish

- Student teacher tanlaydi.
- Shikoyat sababini yozadi.
- Shikoyat director panelga tushadi.
- Director statusni ko'radi va boshqaradi.

### Student sozlamalari

- Til sozlamasi.
- Kun/tun rejimi.
- Parolni yangilash.

## 7. Telegram bot

Telegram bot student bilan tez aloqa qilish, kabinetga kirish, to'lov cheki yuborish va eslatmalar uchun ishlaydi.

### Botga ulanish

- Student `/start` bosadi.
- Telefon raqamini kiritadi yoki QR/start token orqali ulanadi.
- Telegram ID student profiliga bog'lanadi.
- Agar subscription talab qilinsa, kerakli kanal/guruhga a'zo bo'lish so'raladi.
- “Tekshirish” tugmasi orqali obuna tekshiriladi.

### Bot menyusi

- Kursim.
- Balansim.
- To'lovlarim.
- Kabinet havolasi.

### Kursim

- Kurs nomi.
- Teacher.
- Dars vaqti.
- Jadval.

### Balansim

- Joriy balans.
- Student statusi.
- Oylik to'lov summasi.

### To'lovlarim

- Oylik to'lov summasi.
- Oxirgi to'lov sanasi.
- To'lovlar ro'yxati inline tugmalar bilan.
- To'lov sanasini bossangiz chek chiqadi.

### Kabinet havolasi

- Student kabinet uchun web app havolasi beradi.
- Telegram ichida mini app/web app sifatida ochilishi mumkin.
- Zaxira link ham beriladi.

### Chek yuborish

- Reception to'lov qabul qilsa, Telegramga chek yuboriladi.
- Chek rasmi va caption bilan keladi.
- Agar student Telegramga ulanmagan bo'lsa, backend ogohlantirish yozadi.

### Eslatmalar

- Qarzdorlik eslatmasi.
- To'lov muddati yaqinlashgani haqida eslatma.
- Sinov muddati tugagani haqida eslatma.
- Reminder dispatch duplicate bo'lmasligi uchun nazorat qilinadi.

### Broadcast / Admin xabar

- Director barcha foydalanuvchilarga yoki tanlangan auditoriyaga xabar yuborishi mumkin.
- Xabar sayt notificationlariga va botga yuborilishi mumkin.
- Audience variantlari: o'quvchilar, o'quvchi + o'qituvchi, faqat bot, barchaga.

## 8. Backend va ma'lumotlar bazasi

Backend Express.js asosida ishlaydi. API panellar, bot va public saytni bog'laydi.

### Database provider

- MongoDB qo'llab-quvvatlanadi.
- PostgreSQL/Supabase branchlar mavjud.
- MySQL ulash uchun adapter va schema tayyorlangan.
- SQLite fallback sifatida ishlashi mumkin.
- Database URLga qarab provider tanlash g'oyasi qo'shilgan.

### Auth

- JWT token.
- Role-based authorization.
- Director, reception, teacher, student, developer access.
- Password hashing.
- Student access token.
- Telegram code/access login.

### API endpointlar

- Public courses.
- Public contact requests.
- Public developers.
- Auth login.
- Student auth login/register.
- Telegram auth request/verify.
- Meta va profile.
- Reception students CRUD.
- Import preview/commit.
- Payments.
- Contact requests.
- Webhook payments.
- Teacher students/history.
- Attendance bulk.
- Director overview/finance/courses.
- Teachers CRUD.
- Courses CRUD.
- Reports export/print.
- Notifications read/read-all/broadcast.
- Complaints.
- Settings.
- Student dashboard/attendance/payments/schedule/notifications/profile.
- Developer profile.

### Report servislar

- Excel report.
- PDF report.
- CSV report.
- Finance report.
- Students report.

### Receipt servis

- To'lovdan keyin chek ma'lumoti yaratiladi.
- Chek rasmi frontendda ko'rsatiladi.
- Telegramga chek yuboriladi.
- Student kabinetda to'lov tarixi bilan bog'lanadi.

### Notification servis

- Role bo'yicha notification.
- User bo'yicha notification.
- O'qilgan/o'qilmagan status.
- Hammasini o'qilgan qilish.
- Broadcast xabarlar.

### Reminder queue

- Qarzdor studentlar uchun eslatma.
- To'lov muddati yaqin studentlar uchun eslatma.
- Sinov tugagan studentlar uchun eslatma.
- Bir xil eslatma bir kunda qayta-qayta ketmasligi uchun dispatch nazorati.

## 9. Dizayn va UX

### Umumiy dizayn

- ILM NEST logotipi ishlatiladi.
- Ko'zga yengil oq-kok rang palitrasi.
- Tungi rejim uchun alohida ranglar.
- Cardlar, chartlar, jadval va modal oynalar yagona stylega moslangan.
- Gradientlar kamaytirilgan, ko'proq premium flat/surface dizayn ishlatiladi.

### Responsive

- Desktop, laptop, tablet va mobile uchun moslashuv.
- Mobile header ixcham.
- Jadval mobil ekranda card/table ko'rinishiga moslashadi.
- Fullscreen chartda scroll va drag ishlaydi.

### Tezlik va xavfsizlik UX

- Tugmalar ikki marta bosilganda duplicate yozuv bo'lmasligi uchun submit holatlari bor.
- To'lov va davomatda duplicate nazorat.
- Qidiruv va filterlar qo'shilgan.
- Xatoliklar Swal yoki alert orqali foydalanuvchiga ko'rsatiladi.

## 10. Loyiha nima muammoni yechadi

- O'quv markazda o'quvchilar bazasini tartiblaydi.
- Reception ishini avtomatlashtiradi.
- To'lov va qarzdorlikni nazorat qiladi.
- Davomatni aniq yuritadi.
- Teacherlar o'z guruhini nazorat qiladi.
- Director real moliyaviy va o'quv statistikani ko'radi.
- Student o'z kabinetida hamma narsani ko'radi.
- Telegram bot orqali studentga tez xabar, chek va eslatma boradi.
- Sayt orqali yangi mijozlar reception CRMga tushadi.

## 11. Sotishda aytiladigan asosiy qiymatlar

- Bu oddiy landing emas, to'liq CRM tizim.
- Director, reception, teacher va student uchun alohida kabinet bor.
- Telegram bot integratsiyasi bor.
- To'lov, davomat, import, report, notification va complaint modullari bor.
- Real o'quv markaz ish jarayoniga moslangan.
- Web sayt + CRM + bot bitta ekotizimda ishlaydi.
- Keyinchalik yangi filial, yangi kurs, online payment, SMS, ota-ona kabineti kabi funksiyalarni qo'shish mumkin.

