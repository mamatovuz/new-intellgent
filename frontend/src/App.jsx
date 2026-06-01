import { useEffect, useMemo, useRef, useState } from 'react'
import {
	BrowserRouter,
	Link,
	NavLink,
	Navigate,
	Route,
	Routes,
	useNavigate,
	useLocation,
	useSearchParams,
	useParams,
} from 'react-router-dom'
import Swal from 'sweetalert2'
import { api, resolveAssetUrl } from './api'

const LANGUAGE_STORAGE_KEY = 'ilmnest-language'
const THEME_STORAGE_KEY = 'ilmnest-theme'
const APP_BUILD_ID = 'panel-features-2026-05-31-v7'

function useBuildRefreshGuard() {
	useEffect(() => {
		if (typeof window === 'undefined') return

		window.__ILMNEST_BUILD_ID__ = APP_BUILD_ID
		const key = 'ilmnest-active-build'
		const currentBuild = window.localStorage.getItem(key)
		const url = new URL(window.location.href)

		if (currentBuild !== APP_BUILD_ID) {
			window.localStorage.setItem(key, APP_BUILD_ID)
			url.searchParams.set('_build', APP_BUILD_ID)
			window.location.replace(url.toString())
			return
		}

		if (url.searchParams.get('_build')) {
			url.searchParams.delete('_build')
			window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
		}
	}, [])
}

const LANGUAGE_OPTIONS = [
	{ value: 'uz', label: "O'zbek", short: 'UZ' },
	{ value: 'ru', label: 'Русский', short: 'RU' },
	{ value: 'en', label: 'English', short: 'EN' },
	{ value: 'ar', label: 'العربية', short: 'AR' },
]

const THEME_OPTIONS = [
	{
		value: 'light',
		label: 'Kun rejimi',
		description: "Yorug' va sokin interfeys",
		icon: 'light_mode',
	},
	{
		value: 'dark',
		label: 'Tun rejimi',
		description: "Ko'zni charchatmaydigan to'q ranglar",
		icon: 'dark_mode',
	},
]

const TRANSLATIONS = {
	ru: {
		"Ta'lim markazi": 'Учебный центр',
		'Biz haqimizda': 'О нас',
		Kurslar: 'Курсы',
		Narxlar: 'Цены',
		Manzil: 'Адрес',
		Afzalliklar: 'Преимущества',
		Kirish: 'Войти',
		'Admin kirish': 'Вход администратора',
		"Bog'lanish": 'Связаться',
		"Bog'laning": 'Свяжитесь',
		"Kurslarni ko'rish": 'Посмотреть курсы',
		"Batafsil ma'lumot": 'Подробнее',
		"O'zbekistondagi etalon ta'lim darajasi": 'Эталонный уровень образования в Узбекистане',
		'Bilim va natija': 'Знания и результат',
		'birlashgan markaz': 'единый центр',
		"ILM NEST - bu shunchaki o'quv markazi emas. Bu o'quvchining yo'nalishi, davomat, to'lov va natijasini tartibli nazorat qiladigan zamonaviy ta'lim muhiti.": 'ILM NEST — это не просто учебный центр. Это современная образовательная среда, где направление, посещаемость, оплата и результат ученика находятся под понятным контролем.',
		"mamnun o'quvchilar va ota-onalar": 'довольные ученики и родители',
		"o'quvchilar birinchi oydayoq o'sishni sezadi": 'ученики замечают рост уже в первый месяц',
		'Nega aynan bizni tanlashingiz kerak?': 'Почему выбирают нас?',
		"ILM NEST kuchli ustozlar, tartibli reception nazorati va tushunarli o'quv jarayonini birlashtiradi. Har bir o'quvchi qaysi bosqichda ekani aniq ko'rinadi.": 'ILM NEST объединяет сильных преподавателей, порядок в приемной и понятный учебный процесс. Всегда видно, на каком этапе находится ученик.',
		'Eksklyuziv metodologiya': 'Эксклюзивная методология',
		"Har bir yo'nalish uchun bosqichma-bosqich reja va aniq nazorat.": 'Пошаговый план и четкий контроль для каждого направления.',
		"Natijaga yo'naltirilgan dars jarayoni": 'Учебный процесс, ориентированный на результат',
		'Reception orqali tezkor aloqa': 'Быстрая связь через приемную',
		'Nima uchun ILM NEST?': 'Почему ILM NEST?',
		"Tartibli ta'lim": 'Системное обучение',
		"Dars jarayoni, davomat va to'lovlar bitta tizim orqali nazorat qilinadi.": 'Уроки, посещаемость и оплаты контролируются в одной системе.',
		'Kuchli ustozlar': 'Сильные преподаватели',
		"Har bir yo'nalishda o'quvchiga tushunarli, bosqichma-bosqich yondashuv beriladi.": 'В каждом направлении ученик получает понятный пошаговый подход.',
		"Natija ko'rinadi": 'Результат виден',
		"Oylik holat, qarzdorlik, jadval va bildirishnomalar ochiq ko'rinadi.": 'Месячный статус, задолженность, расписание и уведомления видны открыто.',
		"Yo'nalishlar": 'Направления',
		"Sizga mos yo'nalishni tanlang": 'Выберите подходящее направление',
		'Chet tillari': 'Иностранные языки',
		'Ingliz, nemis, rus va arab tili': 'Английский, немецкий, русский и арабский',
		'Aniq fanlar': 'Точные науки',
		'Matematika, kimyo va biologiya': 'Математика, химия и биология',
		Dasturlash: 'Программирование',
		"Frontend va backend yo'nalishlari": 'Frontend и backend направления',
		'Ona tili va adabiyot': 'Родной язык и литература',
		'Nazariya va test strategiyasi': 'Теория и стратегия тестов',
		'Oylik toʻlov': 'Ежемесячная оплата',
		'Oylik to‘lov': 'Ежемесячная оплата',
		'Reception orqali': 'Через приемную',
		Jarayon: 'Процесс',
		"O'qishga kirish sodda": 'Поступить просто',
		"Yo'nalishni tanlang": 'Выберите направление',
		"Qaysi kurs kerakligini belgilang va qisqa ma'lumot qoldiring.": 'Выберите нужный курс и оставьте короткую информацию.',
		"Reception bog'lanadi": 'Приемная свяжется',
		"Administrator vaqt, guruh va ustoz bo'yicha aniqlashtiradi.": 'Администратор уточнит время, группу и преподавателя.',
		'Dars boshlanadi': 'Уроки начинаются',
		"O'quvchi tizimga qo'shiladi, davomat va to'lov nazorati yuradi.": 'Ученик добавляется в систему, посещаемость и оплаты контролируются.',
		"Bog'lanish uchun ma'lumot qoldiring": 'Оставьте данные для связи',
		'Ism familiya': 'Имя и фамилия',
		"Qiziqayotgan yo'nalish": 'Интересующее направление',
		Tavsif: 'Описание',
		Yuborish: 'Отправить',
		'Dasturchilar': 'Разработчики',
		'Dasturchilar jamoasi': 'Команда разработчиков',
		'Asosiy mutaxassis': 'Основные специалисты',
		Dashboard: 'Панель',
		Davomat: 'Посещаемость',
		"To'lovlar": 'Оплаты',
		Jadval: 'Расписание',
		Bildirishnomalar: 'Уведомления',
		Profil: 'Профиль',
		Sozlamalar: 'Настройки',
		"Bosh sahifa": 'Главная',
		"O'quvchilar": 'Ученики',
		Guruhlarim: 'Мои группы',
		Statistika: 'Статистика',
		'Student Panel': 'Панель ученика',
		'Reception Panel': 'Панель приемной',
		'Education CRM': 'Образовательная CRM',
		"Yangi bildirishnoma yo'q": 'Новых уведомлений нет',
		Chiqish: 'Выйти',
		'Tilni tanlash': 'Выбор языка',
		'Til sozlamasi': 'Настройка языка',
		'Sayt tili': 'Язык сайта',
		"Tanlangan til brauzerda saqlanadi va barcha panel sahifalarida qo'llanadi.": 'Выбранный язык сохраняется в браузере и применяется на всех панелях.',
	},
	en: {
		"Ta'lim markazi": 'Education center',
		'Biz haqimizda': 'About us',
		Kurslar: 'Courses',
		Narxlar: 'Pricing',
		Manzil: 'Location',
		Afzalliklar: 'Advantages',
		Kirish: 'Sign in',
		'Admin kirish': 'Admin login',
		"Bog'lanish": 'Contact',
		"Bog'laning": 'Contact us',
		"Kurslarni ko'rish": 'View courses',
		"Batafsil ma'lumot": 'Learn more',
		"O'zbekistondagi etalon ta'lim darajasi": 'A benchmark education level in Uzbekistan',
		'Bilim va natija': 'Knowledge and results',
		'birlashgan markaz': 'in one center',
		"ILM NEST - bu shunchaki o'quv markazi emas. Bu o'quvchining yo'nalishi, davomat, to'lov va natijasini tartibli nazorat qiladigan zamonaviy ta'lim muhiti.": 'ILM NEST is not just an education center. It is a modern learning environment where direction, attendance, payments and results are clearly managed.',
		"mamnun o'quvchilar va ota-onalar": 'happy students and parents',
		"o'quvchilar birinchi oydayoq o'sishni sezadi": 'students feel progress in the first month',
		'Nega aynan bizni tanlashingiz kerak?': 'Why choose us?',
		"ILM NEST kuchli ustozlar, tartibli reception nazorati va tushunarli o'quv jarayonini birlashtiradi. Har bir o'quvchi qaysi bosqichda ekani aniq ko'rinadi.": 'ILM NEST combines strong teachers, organized reception control and a clear learning process. Every student stage is visible.',
		'Eksklyuziv metodologiya': 'Exclusive methodology',
		"Har bir yo'nalish uchun bosqichma-bosqich reja va aniq nazorat.": 'A step-by-step plan and clear control for every direction.',
		"Natijaga yo'naltirilgan dars jarayoni": 'Result-focused learning process',
		'Reception orqali tezkor aloqa': 'Fast communication through reception',
		'Nima uchun ILM NEST?': 'Why ILM NEST?',
		"Tartibli ta'lim": 'Organized education',
		"Dars jarayoni, davomat va to'lovlar bitta tizim orqali nazorat qilinadi.": 'Lessons, attendance and payments are managed in one system.',
		'Kuchli ustozlar': 'Strong teachers',
		"Har bir yo'nalishda o'quvchiga tushunarli, bosqichma-bosqich yondashuv beriladi.": 'Every direction gives students a clear step-by-step approach.',
		"Natija ko'rinadi": 'Results are visible',
		"Oylik holat, qarzdorlik, jadval va bildirishnomalar ochiq ko'rinadi.": 'Monthly status, debts, schedule and notifications are visible.',
		"Yo'nalishlar": 'Directions',
		"Sizga mos yo'nalishni tanlang": 'Choose the right direction',
		'Chet tillari': 'Foreign languages',
		'Ingliz, nemis, rus va arab tili': 'English, German, Russian and Arabic',
		'Aniq fanlar': 'Exact sciences',
		'Matematika, kimyo va biologiya': 'Math, chemistry and biology',
		Dasturlash: 'Programming',
		"Frontend va backend yo'nalishlari": 'Frontend and backend directions',
		'Ona tili va adabiyot': 'Native language and literature',
		'Nazariya va test strategiyasi': 'Theory and test strategy',
		'Oylik toʻlov': 'Monthly fee',
		'Oylik to‘lov': 'Monthly fee',
		'Reception orqali': 'Through reception',
		Jarayon: 'Process',
		"O'qishga kirish sodda": 'Starting is simple',
		"Yo'nalishni tanlang": 'Choose a direction',
		"Qaysi kurs kerakligini belgilang va qisqa ma'lumot qoldiring.": 'Select the course you need and leave a short message.',
		"Reception bog'lanadi": 'Reception contacts you',
		"Administrator vaqt, guruh va ustoz bo'yicha aniqlashtiradi.": 'The administrator clarifies time, group and teacher.',
		'Dars boshlanadi': 'Lessons begin',
		"O'quvchi tizimga qo'shiladi, davomat va to'lov nazorati yuradi.": 'The student is added to the system, attendance and payments are tracked.',
		"Bog'lanish uchun ma'lumot qoldiring": 'Leave your contact details',
		'Ism familiya': 'Full name',
		"Qiziqayotgan yo'nalish": 'Interested direction',
		Tavsif: 'Description',
		Yuborish: 'Send',
		'Dasturchilar': 'Developers',
		'Dasturchilar jamoasi': 'Developer team',
		'Asosiy mutaxassis': 'Core specialists',
		Dashboard: 'Dashboard',
		Davomat: 'Attendance',
		"To'lovlar": 'Payments',
		Jadval: 'Schedule',
		Bildirishnomalar: 'Notifications',
		Profil: 'Profile',
		Sozlamalar: 'Settings',
		"Bosh sahifa": 'Home',
		"O'quvchilar": 'Students',
		Guruhlarim: 'My groups',
		Statistika: 'Statistics',
		'Student Panel': 'Student Panel',
		'Reception Panel': 'Reception Panel',
		'Education CRM': 'Education CRM',
		"Yangi bildirishnoma yo'q": 'No new notifications',
		Chiqish: 'Logout',
		'Tilni tanlash': 'Choose language',
		'Til sozlamasi': 'Language setting',
		'Sayt tili': 'Site language',
		"Tanlangan til brauzerda saqlanadi va barcha panel sahifalarida qo'llanadi.": 'The selected language is saved in the browser and used across all panels.',
	},
	ar: {
		"Ta'lim markazi": 'مركز تعليمي',
		'Biz haqimizda': 'من نحن',
		Kurslar: 'الدورات',
		Narxlar: 'الأسعار',
		Manzil: 'العنوان',
		Afzalliklar: 'المزايا',
		Kirish: 'الدخول',
		'Admin kirish': 'دخول المدير',
		"Bog'lanish": 'تواصل',
		"Bog'laning": 'تواصل معنا',
		"Kurslarni ko'rish": 'عرض الدورات',
		"Batafsil ma'lumot": 'المزيد',
		"O'zbekistondagi etalon ta'lim darajasi": 'مستوى تعليمي نموذجي في أوزبكستان',
		'Bilim va natija': 'المعرفة والنتيجة',
		'birlashgan markaz': 'في مركز واحد',
		"ILM NEST - bu shunchaki o'quv markazi emas. Bu o'quvchining yo'nalishi, davomat, to'lov va natijasini tartibli nazorat qiladigan zamonaviy ta'lim muhiti.": 'ILM NEST ليس مجرد مركز تعليمي، بل بيئة حديثة تتابع المسار والحضور والدفع والنتائج بوضوح.',
		"mamnun o'quvchilar va ota-onalar": 'طلاب وأولياء أمور راضون',
		"o'quvchilar birinchi oydayoq o'sishni sezadi": 'يشعر الطلاب بالتطور من الشهر الأول',
		'Nega aynan bizni tanlashingiz kerak?': 'لماذا تختاروننا؟',
		"ILM NEST kuchli ustozlar, tartibli reception nazorati va tushunarli o'quv jarayonini birlashtiradi. Har bir o'quvchi qaysi bosqichda ekani aniq ko'rinadi.": 'يجمع ILM NEST بين معلمين أقوياء وتنظيم واضح وعملية تعليم مفهومة، مع متابعة مرحلة كل طالب.',
		'Eksklyuziv metodologiya': 'منهجية خاصة',
		"Har bir yo'nalish uchun bosqichma-bosqich reja va aniq nazorat.": 'خطة خطوة بخطوة ورقابة واضحة لكل مسار.',
		"Natijaga yo'naltirilgan dars jarayoni": 'دروس موجهة نحو النتيجة',
		'Reception orqali tezkor aloqa': 'تواصل سريع عبر الاستقبال',
		'Nima uchun ILM NEST?': 'لماذا ILM NEST؟',
		"Tartibli ta'lim": 'تعليم منظم',
		"Dars jarayoni, davomat va to'lovlar bitta tizim orqali nazorat qilinadi.": 'تتم متابعة الدروس والحضور والمدفوعات في نظام واحد.',
		'Kuchli ustozlar': 'معلمون أقوياء',
		"Har bir yo'nalishda o'quvchiga tushunarli, bosqichma-bosqich yondashuv beriladi.": 'في كل مسار يحصل الطالب على نهج واضح خطوة بخطوة.',
		"Natija ko'rinadi": 'النتيجة واضحة',
		"Oylik holat, qarzdorlik, jadval va bildirishnomalar ochiq ko'rinadi.": 'الحالة الشهرية والديون والجدول والتنبيهات ظاهرة بوضوح.',
		"Yo'nalishlar": 'المسارات',
		"Sizga mos yo'nalishni tanlang": 'اختر المسار المناسب',
		'Chet tillari': 'اللغات الأجنبية',
		'Ingliz, nemis, rus va arab tili': 'الإنجليزية والألمانية والروسية والعربية',
		'Aniq fanlar': 'العلوم الدقيقة',
		'Matematika, kimyo va biologiya': 'الرياضيات والكيمياء والأحياء',
		Dasturlash: 'البرمجة',
		"Frontend va backend yo'nalishlari": 'مسارات الواجهة الأمامية والخلفية',
		'Ona tili va adabiyot': 'اللغة الأم والأدب',
		'Nazariya va test strategiyasi': 'النظرية واستراتيجية الاختبار',
		'Oylik toʻlov': 'الرسوم الشهرية',
		'Oylik to‘lov': 'الرسوم الشهرية',
		'Reception orqali': 'عبر الاستقبال',
		Jarayon: 'العملية',
		"O'qishga kirish sodda": 'البدء بسيط',
		"Yo'nalishni tanlang": 'اختر المسار',
		"Qaysi kurs kerakligini belgilang va qisqa ma'lumot qoldiring.": 'حدد الدورة المطلوبة واترك رسالة قصيرة.',
		"Reception bog'lanadi": 'سيتواصل الاستقبال',
		"Administrator vaqt, guruh va ustoz bo'yicha aniqlashtiradi.": 'يوضح المسؤول الوقت والمجموعة والمعلم.',
		'Dars boshlanadi': 'تبدأ الدروس',
		"O'quvchi tizimga qo'shiladi, davomat va to'lov nazorati yuradi.": 'يضاف الطالب إلى النظام وتتم متابعة الحضور والمدفوعات.',
		"Bog'lanish uchun ma'lumot qoldiring": 'اترك بيانات التواصل',
		'Ism familiya': 'الاسم الكامل',
		"Qiziqayotgan yo'nalish": 'المسار المهتم به',
		Tavsif: 'الوصف',
		Yuborish: 'إرسال',
		'Dasturchilar': 'المطورون',
		'Dasturchilar jamoasi': 'فريق المطورين',
		'Asosiy mutaxassis': 'المختصون الأساسيون',
		Dashboard: 'لوحة التحكم',
		Davomat: 'الحضور',
		"To'lovlar": 'المدفوعات',
		Jadval: 'الجدول',
		Bildirishnomalar: 'الإشعارات',
		Profil: 'الملف الشخصي',
		Sozlamalar: 'الإعدادات',
		"Bosh sahifa": 'الرئيسية',
		"O'quvchilar": 'الطلاب',
		Guruhlarim: 'مجموعاتي',
		Statistika: 'الإحصائيات',
		'Student Panel': 'لوحة الطالب',
		'Reception Panel': 'لوحة الاستقبال',
		'Education CRM': 'نظام التعليم',
		"Yangi bildirishnoma yo'q": 'لا توجد إشعارات جديدة',
		Chiqish: 'خروج',
		'Tilni tanlash': 'اختيار اللغة',
		'Til sozlamasi': 'إعداد اللغة',
		'Sayt tili': 'لغة الموقع',
		"Tanlangan til brauzerda saqlanadi va barcha panel sahifalarida qo'llanadi.": 'يتم حفظ اللغة المختارة في المتصفح وتطبيقها على كل اللوحات.',
	},
}

const translationOriginals = new WeakMap()
const translationRenderedValues = new WeakMap()
const reverseTranslations = Object.values(TRANSLATIONS).reduce((acc, dictionary) => {
	Object.entries(dictionary).forEach(([source, value]) => {
		acc[value] = source
	})
	return acc
}, {})

function getInitialLanguage() {
	if (typeof window === 'undefined') return 'uz'
	const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
	return LANGUAGE_OPTIONS.some(item => item.value === saved) ? saved : 'uz'
}

function normalizeTranslationSource(value) {
	return reverseTranslations[value] || value
}

function translateTextValue(value, language) {
	if (language === 'uz') return normalizeTranslationSource(value)
	const trimmed = value.trim()
	if (!trimmed) return value
	const source = normalizeTranslationSource(trimmed)
	const translated = TRANSLATIONS[language]?.[source]
	if (!translated) return value
	return value.replace(trimmed, translated)
}

function applyLanguageToDom(language) {
	if (typeof document === 'undefined') return
	document.documentElement.lang = language
	document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
	document.body?.classList.toggle('is-rtl', language === 'ar')

	const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
		acceptNode(node) {
			const parent = node.parentElement
			if (!parent) return NodeFilter.FILTER_REJECT
			if (['SCRIPT', 'STYLE', 'TEXTAREA'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT
			if (parent.closest('[data-no-translate]')) return NodeFilter.FILTER_REJECT
			return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
		},
	})
	const nodes = []
	while (walker.nextNode()) nodes.push(walker.currentNode)
	nodes.forEach(node => {
		const current = node.nodeValue
		const previousRendered = translationRenderedValues.get(node)
		const shouldRefreshOriginal =
			!translationOriginals.has(node) || current !== previousRendered
		const original = shouldRefreshOriginal
			? normalizeTranslationSource(current)
			: translationOriginals.get(node)
		translationOriginals.set(node, original)
		const translated = translateTextValue(original, language)
		translationRenderedValues.set(node, translated)
		if (current !== translated) {
			node.nodeValue = translated
		}
	})

	document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(element => {
		const current = element.getAttribute('placeholder') || ''
		const previousRendered = element.dataset.i18nPlaceholderRendered || ''
		const original =
			!element.dataset.i18nPlaceholderOriginal || current !== previousRendered
				? normalizeTranslationSource(current)
				: element.dataset.i18nPlaceholderOriginal
		const translated = translateTextValue(original, language)
		element.dataset.i18nPlaceholderOriginal = original
		element.dataset.i18nPlaceholderRendered = translated
		if (element.getAttribute('placeholder') !== translated) {
			element.setAttribute('placeholder', translated)
		}
	})
}

function setAppLanguage(language) {
	if (typeof window === 'undefined') return
	window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
	window.dispatchEvent(new CustomEvent('ilmnest-language-change', { detail: language }))
}

function useAppLanguage() {
	const [language, setLanguage] = useState(getInitialLanguage)

	useEffect(() => {
		function handleChange(event) {
			setLanguage(event.detail || getInitialLanguage())
		}
		window.addEventListener('ilmnest-language-change', handleChange)
		return () => window.removeEventListener('ilmnest-language-change', handleChange)
	}, [])

	return [language, setAppLanguage]
}

function LanguageRuntime() {
	const [language] = useAppLanguage()

	useEffect(() => {
		document.documentElement.lang = language
		document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
		document.body.dataset.language = language
		applyLanguageToDom(language)
		const observer = new MutationObserver(() => {
			window.requestAnimationFrame(() => applyLanguageToDom(language))
		})
		observer.observe(document.body, {
			childList: true,
			subtree: true,
			characterData: true,
		})
		return () => observer.disconnect()
	}, [language])

	return null
}

function LanguageSelector({ compact = false }) {
	const [language, changeLanguage] = useAppLanguage()
	const selectorLabel = {
		uz: 'Tilni tanlash',
		ru: 'Выбор языка',
		en: 'Choose language',
		ar: 'اختيار اللغة',
	}[language] || 'Tilni tanlash'

	return (
		<label className={`language-selector ${compact ? 'compact' : ''}`} data-no-translate>
			<span>{compact ? LANGUAGE_OPTIONS.find(item => item.value === language)?.short : selectorLabel}</span>
			<select value={language} onChange={event => changeLanguage(event.target.value)}>
				{LANGUAGE_OPTIONS.map(option => (
					<option key={option.value} value={option.value}>
						{compact ? option.short : option.label}
					</option>
				))}
			</select>
		</label>
	)
}

function getInitialTheme() {
	if (typeof window === 'undefined') return 'light'
	const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
	return THEME_OPTIONS.some(item => item.value === saved) ? saved : 'light'
}

function setAppTheme(theme) {
	if (typeof window === 'undefined') return
	const nextTheme = THEME_OPTIONS.some(item => item.value === theme) ? theme : 'light'
	window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
	window.dispatchEvent(new CustomEvent('ilmnest-theme-change', { detail: nextTheme }))
}

function useAppTheme() {
	const [theme, setTheme] = useState(getInitialTheme)

	useEffect(() => {
		function handleChange(event) {
			setTheme(event.detail || getInitialTheme())
		}
		window.addEventListener('ilmnest-theme-change', handleChange)
		return () => window.removeEventListener('ilmnest-theme-change', handleChange)
	}, [])

	return [theme, setAppTheme]
}

function ThemeRuntime() {
	const [theme] = useAppTheme()

	useEffect(() => {
		document.documentElement.dataset.theme = theme
		document.body.dataset.theme = theme
		document.body.classList.toggle('theme-dark', theme === 'dark')
		document.body.classList.toggle('theme-light', theme !== 'dark')
	}, [theme])

	return null
}

function ThemeToggleButton() {
	const [theme, changeTheme] = useAppTheme()
	const isDark = theme === 'dark'
	const nextTheme = isDark ? 'light' : 'dark'

	return (
		<button
			type='button'
			className={`topbar-icon theme-toggle-btn ${isDark ? 'active' : ''}`}
			title={isDark ? "Kun rejimiga o'tish" : "Tun rejimiga o'tish"}
			onClick={() => changeTheme(nextTheme)}
			data-no-translate
		>
			<Icon name={isDark ? 'light_mode' : 'dark_mode'} />
			<span className='theme-toggle-label'>{isDark ? 'Kun' : 'Tun'}</span>
		</button>
	)
}

function AppearanceSettingsCard() {
	const [theme, changeTheme] = useAppTheme()

	return (
		<div className='language-setting-card appearance-setting-card'>
			<div>
				<strong>Kun / tun rejimi</strong>
				<p>Interfeys ranglarini ko'zingizga qulay holatga almashtiring.</p>
			</div>
			<div className='theme-segmented' data-no-translate>
				{THEME_OPTIONS.map(option => (
					<button
						key={option.value}
						type='button'
						className={theme === option.value ? 'active' : ''}
						onClick={() => changeTheme(option.value)}
					>
						<Icon name={option.icon} />
						<span>
							<strong>{option.label}</strong>
							<small>{option.description}</small>
						</span>
					</button>
				))}
			</div>
		</div>
	)
}

const ROLE_DEFAULT_PATH = {
	student: '/student/dashboard',
	director: '/director/dashboard',
	reception: '/reception/students',
	teacher: '/teacher/attendance',
}

const NAV_ITEMS = {
	student: [
		{ to: '/student/dashboard', label: 'Dashboard', icon: 'dashboard' },
		{ to: '/student/attendance', label: 'Davomat', icon: 'event_available' },
		{ to: '/student/payments', label: "To'lovlar", icon: 'payments' },
		{ to: '/student/schedule', label: 'Jadval', icon: 'calendar_month' },
		{ to: '/student/notifications', label: 'Bildirishnomalar', icon: 'notifications' },
		{ to: '/student/profile', label: 'Profil', icon: 'person' },
		{ to: '/student/settings', label: 'Sozlamalar', icon: 'settings' },
	],
	director: [
		{ to: '/director/dashboard', label: 'Dashboard', icon: 'dashboard' },
		{ to: '/director/students', label: "O'quvchilar", icon: 'group' },
		{ to: '/director/payments', label: "To'lovlar", icon: 'payments' },
		{ to: '/director/statistics', label: 'Statistika', icon: 'leaderboard' },
		{ to: '/director/complaints', label: 'Shikoyatlar', icon: 'report' },
		{ to: '/director/settings', label: 'Sozlamalar', icon: 'settings' },
	],
	reception: [
		{ to: '/reception/dashboard', label: 'Bosh sahifa', icon: 'dashboard' },
		{ to: '/reception/students', label: "O'quvchilar", icon: 'group' },
		{ to: '/reception/payments', label: "To'lovlar", icon: 'payments' },
		{ to: '/reception/requests', label: "Bog'lanish", icon: 'support_agent' },
		{ to: '/reception/attendance', label: 'Davomat', icon: 'event_available' },
		{ to: '/reception/settings', label: 'Sozlamalar', icon: 'settings' },
	],
	teacher: [
		{ to: '/teacher/dashboard', label: 'Dashboard', icon: 'dashboard' },
		{ to: '/teacher/attendance', label: 'Davomat', icon: 'event_available' },
		{ to: '/teacher/groups', label: 'Guruhlarim', icon: 'group' },
		{ to: '/teacher/statistics', label: 'Statistika', icon: 'leaderboard' },
		{ to: '/teacher/settings', label: 'Sozlamalar', icon: 'settings' },
	],
}

const LANDING_COURSES = [
	'Ingliz tili',
	'Nemis tili',
	'Rus tili',
	'Arab tili',
	'Matematika',
	'Kimyo',
	'Biologiya',
	'Dasturlash Frontend',
	'Dasturlash Backend',
	'Ona tili va adabiyot',
]

const LANDING_SHOWCASE = [
	{
		title: 'IELTS & Chet Tillari',
		description:
			'Speaking, grammar, vocabulary va international exam tayyorlovni natijaga yo‘naltirilgan formatda olib boramiz.',
		meta: 'IELTS Intensive · Ingliz · Nemis · Rus · Arab',
		icon: 'translate',
	},
	{
		title: 'Aniq Fanlar',
		description:
			'Matematika, kimyo va biologiya fanlarida fundamental baza va imtihon strategiyasini birga quramiz.',
		meta: 'Matematika · Kimyo · Biologiya',
		icon: 'functions',
	},
	{
		title: 'IT Yo‘nalishlari',
		description:
			'Frontend va backend dasturlash bo‘yicha amaliy loyihalar, portfolio va ishga tayyorlash tizimi bilan.',
		meta: 'Frontend · Backend · Real project workflow',
		icon: 'code',
	},
]

const LANDING_TESTIMONIALS = [
	{
		name: 'Shahzoda R.',
		role: 'IELTS student',
		quote:
			"ILM NEST ichida nazorat kuchli. Dars, davomat va payment holati aniq bo'lgani uchun o'qish jarayoni ancha tartibli bo'ldi.",
	},
	{
		name: 'Azamat K.',
		role: 'Frontend student',
		quote:
			'Ustozlar bilan ishlash, jadvalning aniq yuritilishi va topshiriqlar nazorati menga intizom berdi. Natijada real portfolio yig‘dim.',
	},
	{
		name: 'Dilafruz O.',
		role: 'Ota-ona fikri',
		quote:
			'Markaz ichidagi tizim shaffof. Farzandimning holatini, davomati va to‘lovlarini nazorat qilish ancha oson bo‘ldi.',
	},
]

const LANDING_FAQS = [
	{
		question: "Qaysi yo'nalishlar mavjud?",
		answer:
			"Ingliz, nemis, rus, arab tili, matematika, kimyo, biologiya, frontend, backend va ona tili-adabiyot yo'nalishlari mavjud.",
	},
	{
		question: "Student kabinet orqali nimalarni ko'rish mumkin?",
		answer:
			"Student kabinet ichida jadval, davomat, to'lovlar, bildirishnomalar va shaxsiy profil ma'lumotlarini ko'rish mumkin.",
	},
	{
		question: "Sinov dars tizimi qanday ishlaydi?",
		answer:
			"Yangi student 3 ta o'qish kuni sinov holatida yuradi. Shu muddatdan keyin tizim avtomatik ravishda faol yoki qarzdor holatni belgilaydi.",
	},
]

const LANDING_COURSE_SPOTLIGHTS = [
	{
		title: 'Chet tillari',
		subtitle: 'Ingliz, nemis, rus va arab tili',
		meta: 'IELTS, CEFR va speaking practice bilan',
		icon: 'translate',
	},
	{
		title: 'Aniq fanlar',
		subtitle: 'Matematika, kimyo va biologiya',
		meta: 'Fundamental baza va imtihon tayyorlov',
		icon: 'functions',
	},
	{
		title: 'Dasturlash',
		subtitle: 'Frontend va backend yo‘nalishlari',
		meta: 'Amaliy loyiha, portfolio va ishga tayyorlov',
		icon: 'code',
	},
	{
		title: 'Ona tili va adabiyot',
		subtitle: 'Nazariya va test strategiyasi',
		meta: 'Abituriyentlar uchun tartibli tayyorlov',
		icon: 'menu_book',
	},
]

const LANDING_TRUST_ITEMS = [
	"3 kunlik sinov tizimi va avtomatik status nazorati",
	"Reception orqali real vaqt student va to'lov boshqaruvi",
	"Teacher panelida davomat, tarix va guruhlar nazorati",
	"Director uchun tushum, qarzdorlik va kurslar analytics'i",
]

const LANDING_ABOUT_POINTS = [
	{
		title: "Nazoratli ta'lim muhiti",
		description:
			"Har bir studentning davomat, to'lov va o'sish holati muntazam kuzatiladi.",
	},
	{
		title: 'Kuchli yo\'nalishlar',
		description:
			"Ingliz tili, matematika, IT va boshqa fanlar bo'yicha tartibli o'quv jarayoni yuritiladi.",
	},
	{
		title: 'Ota-ona va student uchun qulaylik',
		description:
			"Student kabineti, eslatmalar va aniq jadval tufayli hamma narsa tushunarli bo'lib turadi.",
	},
]

const LANDING_SPACE_SHOWCASE = [
	{
		title: 'Direktor nazorati',
		description: "Markaz ko'rsatkichlari, tushum va umumiy nazorat bitta joyda.",
		image: '/landing-dashboard.png',
	},
	{
		title: 'Reception oqimi',
		description: "Yangi o'quvchi qo'shish, to'lov qabul qilish va sinov boshqaruvi.",
		image: '/reception-panel.png',
	},
	{
		title: 'Student kabineti',
		description: "Jadval, to'lov va bildirishnomalarni studentning o'zi kuzatadi.",
		image: '/student-panel.png',
	},
]

const LANDING_STUDY_FLOW = [
	{
		step: '01',
		title: "Yo'nalishni tanlash",
		description:
			"O'quvchi qaysi til yoki fan bo'yicha o'qishini aniqlaydi, reception mos guruhni tavsiya qiladi.",
	},
	{
		step: '02',
		title: 'Sinov va moslashuv',
		description:
			"3 kunlik sinov orqali studentning qatnashuvi va qiziqishi kuzatilib, keyingi bosqich belgilanadi.",
	},
	{
		step: '03',
		title: 'Muntazam nazorat',
		description:
			"Davomat, topshiriq va to'lov holati tizim orqali muntazam yuritiladi.",
	},
	{
		step: '04',
		title: 'Natija va aloqa',
		description:
			"Student, ota-ona va markaz o'rtasida tushunarli aloqa bo'lib, natija yo'lida birga ishlanadi.",
	},
]

const LANDING_SHOWCASE_CLEAN = [
	{
		title: 'IELTS & Chet tillari',
		description:
			"Speaking, grammar, vocabulary va xalqaro imtihon tayyorlovini natijaga yo'naltirilgan formatda olib boramiz.",
		meta: "IELTS Intensive · Ingliz · Nemis · Rus · Arab",
		icon: 'translate',
	},
	{
		title: 'Aniq fanlar',
		description:
			"Matematika, kimyo va biologiya fanlarida fundamental baza va imtihon strategiyasini birga quramiz.",
		meta: 'Matematika · Kimyo · Biologiya',
		icon: 'functions',
	},
	{
		title: 'IT yo‘nalishlari',
		description:
			"Frontend va backend dasturlash bo'yicha amaliy loyihalar, portfolio va ishga tayyorlash tizimi bilan.",
		meta: 'Frontend · Backend · Real project workflow',
		icon: 'code',
	},
]

const LANDING_SHOWCASE_RICH = [
	{
		title: 'IELTS & Chet tillari',
		description:
			"Speaking, grammar, vocabulary va xalqaro imtihon tayyorlovini natijaga yo'naltirilgan formatda olib boramiz.",
		meta: 'IELTS Intensive · Ingliz · Nemis · Rus · Arab',
		result: '7.0+ IELTS fokus',
		forWho:
			"Abituriyentlar, ishchi yoshlar va speaking kuchaytirmoqchi bo'lganlar uchun",
		outcome:
			'Speaking confidence, vocabulary growth va xalqaro imtihon tayyorligi',
		gradient: 'linear-gradient(135deg, #0f2e78 0%, #2b63ea 100%)',
		icon: 'translate',
	},
	{
		title: 'Aniq fanlar',
		description:
			"Matematika, kimyo va biologiya fanlarida fundamental baza va imtihon strategiyasini birga quramiz.",
		meta: 'Matematika · Kimyo · Biologiya',
		result: 'DTM va foundation tayyorlov',
		forWho:
			"Matematika va tabiiy fanlardan kuchli baza qurmoqchi bo'lgan o'quvchilar uchun",
		outcome:
			'Mavzularni tushunish, test ishlash tezligi va kuchli nazariy baza',
		gradient: 'linear-gradient(135deg, #16533d 0%, #22a06b 100%)',
		icon: 'functions',
	},
	{
		title: 'IT yo‘nalishlari',
		description:
			"Frontend va backend dasturlash bo'yicha amaliy loyihalar, portfolio va ishga tayyorlash tizimi bilan.",
		meta: 'Frontend · Backend · Real project workflow',
		result: 'Portfolio va real project',
		forWho:
			"IT'ga kirmoqchi bo'lgan yangi boshlovchilar va skill oshirmoqchi bo'lganlar uchun",
		outcome:
			'Real loyiha tajribasi, portfolio va ishga yaqin kompetensiya',
		gradient: 'linear-gradient(135deg, #4b1f86 0%, #7c3aed 100%)',
		icon: 'code',
	},
]

const LANDING_TESTIMONIALS_CLEAN = [
	{
		name: 'Shahzoda R.',
		role: 'IELTS student',
		outcome: '7.0 IELTS natija',
		avatar: '/testimonial-shahzoda.svg',
		quote:
			"ILM NEST ichida nazorat kuchli. Dars, davomat va to'lov holati aniq bo'lgani uchun o'qish jarayoni ancha tartibli bo'ldi.",
	},
	{
		name: 'Azamat K.',
		role: 'Frontend student',
		outcome: 'Portfolio va freelance start',
		avatar: '/testimonial-azamat.svg',
		quote:
			"Ustozlar bilan ishlash, jadvalning aniq yuritilishi va topshiriqlar nazorati menga intizom berdi. Natijada real portfolio yig'dim.",
	},
	{
		name: 'Dilafruz O.',
		role: 'Ota-ona fikri',
		outcome: "Shaffof nazorat va aloqa",
		avatar: '/testimonial-dilafruz.svg',
		quote:
			"Markaz ichidagi tizim shaffof. Farzandimning holatini, davomati va to'lovlarini nazorat qilish ancha oson bo'ldi.",
	},
]

const LANDING_GALLERY = [
	{
		title: 'Director paneli',
		description: 'Tushum, qarzdorlik va markaz bo‘yicha real vaqt analytics.',
		image: '/landing-dashboard.png',
	},
	{
		title: 'Reception paneli',
		description: "Student qo'shish, kurs biriktirish va to'lov qabul qilish.",
		image: '/reception-panel.png',
	},
	{
		title: "O'qituvchi paneli",
		description: 'Davomat, guruhlar va kundalik nazorat jarayoni.',
		image: '/teacher-panel.png',
	},
	{
		title: 'Student kabineti',
		description: 'Balans, jadval, to‘lovlar va bildirishnomalar bir joyda.',
		image: '/student-panel.png',
	},
	{
		title: 'Login tizimi',
		description: 'Tartibli kirish jarayoni va rollar bo‘yicha himoya.',
		image: '/login-panel.png',
	},
]

const LANDING_PRODUCT_DEMOS = [
	{
		title: 'Director paneli',
		description: "Tushum, xarajat va sof foydani bir oynada ko'rsatadigan demo dashboard.",
		eyebrow: 'Director demo',
		role: 'DIREKTOR',
		type: 'director',
		primaryAction: 'Dashboard ochish',
		secondaryAction: "Hisobot ko'rish",
	},
	{
		title: 'Reception paneli',
		description: "Qabulxona oqimi: student qo'shish, status filtri va to'lov qabul qilish jarayoni.",
		eyebrow: 'Reception demo',
		role: 'ADMINISTRATOR',
		type: 'reception',
		primaryAction: "Student qo'shish",
		secondaryAction: "To'lov olish",
	},
	{
		title: "O'qituvchi paneli",
		description: "Davomat, guruhlar va bugungi dars nazorati bitta ishchi panelda jamlangan.",
		eyebrow: 'Teacher demo',
		role: "O'QITUVCHI",
		type: 'teacher',
		primaryAction: 'Davomat ochish',
		secondaryAction: 'Guruhlarim',
	},
	{
		title: 'Student kabineti',
		description: "Balans, jadval, to'lov va bildirishnomalarni student o'zi ko'radigan jonli kabinet.",
		eyebrow: 'Student demo',
		role: 'STUDENT',
		type: 'student',
		primaryAction: 'Kabinetga kirish',
		secondaryAction: "To'lovlar",
	},
	{
		title: 'Login tizimi',
		description: "Student, admin va QR/Web App kirish oqimi qanday ishlashini demo tarzda ko'rsatadi.",
		eyebrow: 'Login demo',
		role: 'AUTH',
		type: 'login',
		primaryAction: 'Student login',
		secondaryAction: 'QR orqali kirish',
	},
]

function CountUp({ end = 0, suffix = '', duration = 1200 }) {
	const [value, setValue] = useState(0)

	useEffect(() => {
		let frame = 0
		const steps = 30
		const increment = end / steps
		const timer = setInterval(() => {
			frame += 1
			if (frame >= steps) {
				setValue(end)
				clearInterval(timer)
				return
			}
			setValue(Math.round(increment * frame))
		}, Math.max(20, Math.floor(duration / steps)))

		return () => clearInterval(timer)
	}, [end, duration])

	return (
		<>
			{value.toLocaleString('ru-RU')}
			{suffix}
		</>
	)
}

function RevealSection({ as: Tag = 'section', className = '', delay = 0, children, ...props }) {
	const ref = useRef(null)
	const [visible, setVisible] = useState(false)

	useEffect(() => {
		const node = ref.current
		if (!node) return

		const observer = new IntersectionObserver(
			entries => {
				const [entry] = entries
				if (entry?.isIntersecting) {
					setVisible(true)
					observer.disconnect()
				}
			},
			{ threshold: 0.16 },
		)

		observer.observe(node)
		return () => observer.disconnect()
	}, [])

	return (
		<Tag
			ref={ref}
			className={`reveal-section ${visible ? 'visible' : ''} ${className}`.trim()}
			style={{ '--reveal-delay': `${delay}ms` }}
			{...props}
		>
			{children}
		</Tag>
	)
}

function Icon({ name, className = '' }) {
	return (
		<span className={`material-symbols-outlined ${className}`.trim()}>
			{name}
		</span>
	)
}

function formatMoney(value) {
	return `${Number(value || 0).toLocaleString('ru-RU')} UZS`
}

function parseLandingLeadMessage(message = '') {
	const text = String(message || '')
	const directionMatch = text.match(/Yo'nalish:\s*([^\n]+)/i)
	const descriptionMatch = text.match(/Tavsif:\s*([\s\S]*)/i)
	return {
		direction: directionMatch?.[1]?.trim() || "Yo'nalish ko'rsatilmagan",
		description: descriptionMatch?.[1]?.trim() || text.trim() || 'Tavsif yozilmagan',
	}
}

function getCourseIconByTitle(title = '') {
	const normalized = String(title || '').toLowerCase()
	if (normalized.includes('ingliz') || normalized.includes('nemis') || normalized.includes('rus') || normalized.includes('arab') || normalized.includes('koreys') || normalized.includes('turk')) return 'translate'
	if (normalized.includes('matem') || normalized.includes('kimyo') || normalized.includes('biolog') || normalized.includes('fizik')) return 'functions'
	if (normalized.includes('frontend') || normalized.includes('backend') || normalized.includes('dastur') || normalized.includes('python') || normalized.includes('react')) return 'code'
	if (normalized.includes('ona tili') || normalized.includes('adab') || normalized.includes('tarix')) return 'menu_book'
	return 'school'
}

function getPaymentMethodMeta(method = '') {
	const normalized = String(method || '').trim().toLowerCase()
	if (normalized === 'manual' || normalized === 'cash' || normalized === 'naqd') {
		return {
			label: "Naqd / Qo'lda qabul qilingan",
			shortLabel: 'Naqd',
			icon: 'payments',
		}
	}
	if (normalized === 'click') {
		return {
			label: 'Click',
			shortLabel: 'Click',
			icon: 'touch_app',
		}
	}
	if (normalized === 'payme') {
		return {
			label: 'Payme',
			shortLabel: 'Payme',
			icon: 'account_balance_wallet',
		}
	}
	if (normalized === 'bank' || normalized === 'transfer') {
		return {
			label: "Bank o'tkazmasi",
			shortLabel: 'Bank',
			icon: 'account_balance',
		}
	}
	return {
		label: method || 'Nomaʼlum usul',
		shortLabel: method || 'Nomaʼlum',
		icon: 'credit_card',
	}
}

function formatDateLabel(value = new Date()) {
	return new Intl.DateTimeFormat('uz-UZ', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	}).format(value)
}

function formatIsoDate(value = new Date()) {
	const date = value instanceof Date ? value : new Date(value)
	if (Number.isNaN(date.getTime())) return ''
	return date.toISOString().slice(0, 10)
}

function getShortWeekdayLabel(value = new Date()) {
	const date = value instanceof Date ? value : new Date(value)
	if (Number.isNaN(date.getTime())) return ''
	return new Intl.DateTimeFormat('uz-UZ', { weekday: 'short' }).format(date)
}

const WEEKDAY_OPTIONS = [
	{ key: 'du', label: 'Dushanba' },
	{ key: 'se', label: 'Seshanba' },
	{ key: 'chor', label: 'Chorshanba' },
	{ key: 'pay', label: 'Payshanba' },
	{ key: 'juma', label: 'Juma' },
	{ key: 'shan', label: 'Shanba' },
]

function normalizeScheduleDayKey(value = '') {
	const normalized = String(value)
		.trim()
		.toLowerCase()
		.replace(/['`']/g, '')
		.replace(/\s+/g, '')
	const aliases = {
		du: 'du',
		dush: 'du',
		dushanba: 'du',
		mon: 'du',
		monday: 'du',
		se: 'se',
		sesh: 'se',
		seshanba: 'se',
		tue: 'se',
		tuesday: 'se',
		chor: 'chor',
		chorshanba: 'chor',
		wed: 'chor',
		wednesday: 'chor',
		pay: 'pay',
		payshanba: 'pay',
		thu: 'pay',
		thursday: 'pay',
		juma: 'juma',
		jum: 'juma',
		fri: 'juma',
		friday: 'juma',
		shan: 'shan',
		shanba: 'shan',
		sat: 'shan',
		saturday: 'shan',
		yak: 'yak',
		yakshanba: 'yak',
		sun: 'yak',
		sunday: 'yak',
	}
	return aliases[normalized] || ''
}

function parseScheduleString(value = '') {
	const [daysPart = '', timePart = ''] = String(value).split(',')
	const days = daysPart
		.split('-')
		.map(normalizeScheduleDayKey)
		.filter(Boolean)
	const [startTime = '', endTime = ''] = timePart
		.split('-')
		.map(item => item.trim())
	return { days, startTime, endTime }
}

function buildScheduleString(days = [], startTime = '', endTime = '') {
	const normalizedDays = [...days].filter(Boolean)
	if (!normalizedDays.length) return ''
	const timePart =
		startTime && endTime ? `${startTime} - ${endTime}` : startTime || endTime || ''
	return timePart
		? `${normalizedDays.join('-')}, ${timePart}`
		: normalizedDays.join('-')
}

function toggleScheduleDay(days = [], key) {
	return days.includes(key) ? days.filter(item => item !== key) : [...days, key]
}

function formatPhoneInput(value = '') {
	const digits = value.replace(/\D/g, '').slice(0, 12)
	let normalized = digits
	if (normalized.startsWith('998')) {
		normalized = normalized
	} else if (normalized.startsWith('8')) {
		normalized = `99${normalized}`
	} else if (normalized.length) {
		normalized = `998${normalized}`
	}
	const parts = [
		normalized.slice(0, 3),
		normalized.slice(3, 5),
		normalized.slice(5, 8),
		normalized.slice(8, 10),
		normalized.slice(10, 12),
	].filter(Boolean)
	return parts.length ? `+${parts.join(' ')}` : ''
}

function formatRole(user) {
	if (user.role === 'director') return 'DIREKTOR'
	if (user.role === 'reception') return 'ADMINISTRATOR'
	if (user.role === 'teacher') return "O'QITUVCHI"
	return 'XODIM'
}

function getStudentStatusMeta(status) {
	if (status === 'active') return { tone: 'success', label: 'Faol' }
	if (status === 'trial') return { tone: 'warning', label: 'Sinovda' }
	return { tone: 'danger', label: 'Qarzdor' }
}

function getAttendanceStatusMeta(status) {
	if (status === 'present') return { tone: 'success', label: 'Keldi', icon: 'check_circle' }
	if (status === 'late') return { tone: 'warning', label: 'Kechikdi', icon: 'schedule' }
	if (status === 'excused') return { tone: 'default', label: 'Sababli', icon: 'assignment_turned_in' }
	return { tone: 'danger', label: 'Kelmadi', icon: 'cancel' }
}

function formatTeacherAttendanceLabel(value) {
	return `${value || 0}%`
}

function getInitials(name = '') {
	return name
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map(part => part[0])
		.join('')
		.toUpperCase()
}

function getStudyMonthNumber(student) {
	if (!student?.enrolledAt) return 1
	const start = new Date(student.enrolledAt)
	if (Number.isNaN(start.getTime())) return 1
	const now = new Date()
	const months =
		(now.getFullYear() - start.getFullYear()) * 12 +
		(now.getMonth() - start.getMonth())
	return Math.max(months + 1, 1)
}

function getStudyMonthLabel(student) {
	return `${getStudyMonthNumber(student)}-oyda o'qiyapti`
}

function getScheduleSortKey(value = '') {
	const match = String(value).match(/(\d{1,2}):(\d{2})/)
	if (!match) return 9999
	return Number(match[1]) * 60 + Number(match[2])
}

function Badge({ tone = 'default', children }) {
	return <span className={`badge ${tone}`}>{children}</span>
}

function MiniTrendChart({
	items = [],
	valueKey = 'value',
	labelKey = 'label',
	tone = 'navy',
	formatValue = value => value,
}) {
	const max = Math.max(...items.map(item => Number(item?.[valueKey] || 0)), 1)
	if (!items.length) {
		return <div className='trend-empty'>Ma'lumot hozircha topilmadi</div>
	}
	return (
		<div className={`mini-trend-chart tone-${tone}`}>
			{items.map((item, index) => (
				<div key={`${item?.[labelKey] || index}-${index}`} className='mini-trend-bar'>
					<b className='mini-trend-value'>{formatValue(item?.[valueKey] || 0)}</b>
					<span
						className='mini-trend-fill'
						style={{
							height: `${Math.max((Number(item?.[valueKey] || 0) / max) * 100, 12)}%`,
						}}
						title={`${item?.[labelKey]}: ${formatValue(item?.[valueKey] || 0)}`}
					/>
					<small>{formatShortTrendLabel(item?.[labelKey])}</small>
				</div>
			))}
		</div>
	)
}

function TrendLineChart({
	items = [],
	valueKey = 'value',
	labelKey = 'label',
	formatValue = value => value,
	formatAxis = null,
	formatTooltip = null,
	emptyText = "Ma'lumot topilmadi",
}) {
	const [hoveredPoint, setHoveredPoint] = useState(null)
	if (!items.length) {
		return <div className='trend-empty'>{emptyText}</div>
	}
	const values = items.map(item => Number(item?.[valueKey] || 0))
	const max = Math.max(...values, 1)
	const latestValue = values[values.length - 1] || 0
	const averageValue = values.length
		? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
		: 0
	const peakValue = Math.max(...values, 0)
	const axisTicks = [max, max * 0.66, max * 0.33, 0]
	const gradientId = `trendAreaFill-${labelKey}-${items.length}`
	const points = items.map((item, index) => {
		const x = items.length === 1 ? 50 : (index / (items.length - 1)) * 100
		const y = 100 - (Number(item?.[valueKey] || 0) / max) * 76 - 8
		return `${x},${Math.max(8, y)}`
	}).join(' ')
	const pointMeta = items.map((item, index) => {
		const x = items.length === 1 ? 50 : (index / (items.length - 1)) * 100
		const y = 100 - (Number(item?.[valueKey] || 0) / max) * 76 - 8
		return {
			id: `${item?.[labelKey] || index}-${index}`,
			x,
			y: Math.max(8, y),
			label: item?.[labelKey] || '',
			value: Number(item?.[valueKey] || 0),
		}
	})
	const areaPoints = `0,100 ${points} 100,100`
	const axisFormatter = formatAxis || formatValue
	const tooltipFormatter = formatTooltip || formatValue
	return (
		<div className='trend-line-chart'>
			<div className='trend-line-shell'>
				<div className='trend-line-axis'>
					{axisTicks.map((tick, index) => (
						<span key={`${tick}-${index}`}>{axisFormatter(Math.round(tick))}</span>
					))}
				</div>
				<div className='trend-line-plot'>
					<div className='trend-line-guides'>
						<span />
						<span />
						<span />
						<span />
					</div>
					{hoveredPoint ? (
						<div
							className='chart-tooltip trend-chart-tooltip'
							style={{
								left: `${hoveredPoint.left}px`,
								top: `${hoveredPoint.top}px`,
							}}
						>
							<strong>{formatTrendTooltipLabel(hoveredPoint.label)}</strong>
							<span>{tooltipFormatter(hoveredPoint.value)}</span>
						</div>
					) : null}
					<svg viewBox='0 0 100 100' preserveAspectRatio='none' className='trend-line-canvas'>
						<defs>
							<linearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
								<stop offset='0%' stopColor='rgba(47,102,240,0.24)' />
								<stop offset='100%' stopColor='rgba(47,102,240,0.02)' />
							</linearGradient>
						</defs>
						<polygon points={areaPoints} fill={`url(#${gradientId})`} />
						<polyline points={points} />
						{items.map((item, index) => {
							const x = items.length === 1 ? 50 : (index / (items.length - 1)) * 100
							const y = 100 - (Number(item?.[valueKey] || 0) / max) * 76 - 8
							return (
								<circle
									key={`${item?.[labelKey] || index}-${index}`}
									cx={x}
									cy={Math.max(8, y)}
									r='2.7'
								/>
							)
						})}
					</svg>
					<div className='trend-line-hotspots'>
						{pointMeta.map(point => (
							<button
								key={point.id}
								type='button'
								className='trend-line-hotspot'
								style={{
									left: `${point.x}%`,
									top: `${point.y}%`,
								}}
								onMouseEnter={event => {
									const rect = event.currentTarget.getBoundingClientRect()
									const parentRect = event.currentTarget.parentElement.getBoundingClientRect()
									setHoveredPoint({
										label: point.label,
										value: point.value,
										left: rect.left - parentRect.left + rect.width / 2,
										top: rect.top - parentRect.top - 10,
									})
								}}
								onMouseLeave={() => setHoveredPoint(null)}
								onFocus={event => {
									const rect = event.currentTarget.getBoundingClientRect()
									const parentRect = event.currentTarget.parentElement.getBoundingClientRect()
									setHoveredPoint({
										label: point.label,
										value: point.value,
										left: rect.left - parentRect.left + rect.width / 2,
										top: rect.top - parentRect.top - 10,
									})
								}}
								onBlur={() => setHoveredPoint(null)}
								aria-label={`${formatTrendTooltipLabel(point.label)} - ${tooltipFormatter(point.value)}`}
							/>
						))}
					</div>
				</div>
			</div>
			<div className='trend-line-grid'>
				{items.map((item, index) => (
					<div key={`${item?.[labelKey] || index}-${index}`} className='trend-line-item'>
						<strong>{formatValue(item?.[valueKey] || 0)}</strong>
						<span>{formatShortTrendLabel(item?.[labelKey])}</span>
					</div>
				))}
			</div>
			<div className='trend-line-summary'>
				<div>
					<span>Oxirgi ko'rsatkich</span>
					<strong>{formatValue(latestValue)}</strong>
				</div>
				<div>
					<span>O'rtacha</span>
					<strong>{formatValue(averageValue)}</strong>
				</div>
				<div>
					<span>Eng yuqori</span>
					<strong>{formatValue(peakValue)}</strong>
				</div>
			</div>
		</div>
	)
}

function EmptyStateNotice({ message }) {
	return <div className='dashboard-empty-state'>{message}</div>
}

function fileToBase64(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			const result = String(reader.result || '')
			resolve(result.includes(',') ? result.split(',')[1] : result)
		}
		reader.onerror = () => reject(new Error("Faylni o'qib bo'lmadi"))
		reader.readAsDataURL(file)
	})
}

function downloadStudentImportTemplate() {
	const rows = [
		[
			'full_name',
			'phone',
			'course',
			'teacher',
			'status',
			'enrolled_at',
			'billing_start_date',
			'balance',
			'study_month',
			'note',
		],
		[
			'Muhammadali Karimov',
			'+998932303410',
			'IELTS Intensive',
			'Dilshod Teacher',
			'faol',
			'2025-12-10',
			'2026-05-01',
			'800000',
			'6',
			'Eski student importi',
		],
	]
	const csv = rows.map(row => row.join(',')).join('\n')
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = 'student-import-template.csv'
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}

function readFileAsDataUrl(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result)
		reader.onerror = () => reject(new Error('Rasm yuklanmadi'))
		reader.readAsDataURL(file)
	})
}

function downloadTextFile(
	filename,
	content,
	type = 'text/plain;charset=utf-8',
) {
	const blob = new Blob([content], { type })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = filename
	link.click()
	URL.revokeObjectURL(url)
}

function downloadBlobFile(filename, blob) {
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = filename
	link.click()
	URL.revokeObjectURL(url)
}

function formatPeriodLabel(period = '') {
	if (!period || !period.includes('-')) return period
	const [, month] = period.split('-')
	const months = {
		'01': 'Yanvar',
		'02': 'Fevral',
		'03': 'Mart',
		'04': 'Aprel',
		'05': 'May',
		'06': 'Iyun',
		'07': 'Iyul',
		'08': 'Avgust',
		'09': 'Sentabr',
		'10': 'Oktabr',
		'11': 'Noyabr',
		'12': 'Dekabr',
	}
	return months[month] || period
}

function formatShortTrendLabel(value = '') {
	if (!value) return '-'
	const shortMonths = {
		'01': 'Yan',
		'02': 'Fev',
		'03': 'Mar',
		'04': 'Apr',
		'05': 'May',
		'06': 'Iyn',
		'07': 'Iyul',
		'08': 'Avg',
		'09': 'Sen',
		'10': 'Okt',
		'11': 'Noy',
		'12': 'Dek',
	}
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		const [, month, day] = value.split('-')
		return `${day}.${month}`
	}
	if (/^\d{4}-\d{2}$/.test(value)) {
		const [, month] = value.split('-')
		return shortMonths[month] || value
	}
	if (/^\d{2}-\d{2}$/.test(value)) {
		const [month, day] = value.split('-')
		return `${day}.${month}`
	}
	return value
}

function formatTrendTooltipLabel(value = '') {
	if (!value) return '-'
	const fullMonths = {
		'01': 'Yanvar',
		'02': 'Fevral',
		'03': 'Mart',
		'04': 'Aprel',
		'05': 'May',
		'06': 'Iyun',
		'07': 'Iyul',
		'08': 'Avgust',
		'09': 'Sentabr',
		'10': 'Oktabr',
		'11': 'Noyabr',
		'12': 'Dekabr',
	}
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		const [year, month, day] = value.split('-')
		return `${day} ${fullMonths[month] || month} ${year}`
	}
	if (/^\d{4}-\d{2}$/.test(value)) {
		const [year, month] = value.split('-')
		return `${fullMonths[month] || month} ${year}`
	}
	if (/^\d{2}-\d{2}$/.test(value)) {
		const [month, day] = value.split('-')
		return `${day} ${fullMonths[month] || month}`
	}
	return value
}

function formatCompactMoney(value = 0) {
	const amount = Number(value || 0)
	if (amount >= 1_000_000_000_000) {
		return `${Number((amount / 1_000_000_000_000).toFixed(amount >= 10_000_000_000_000 ? 0 : 1))} trln`
	}
	if (amount >= 1_000_000_000) {
		return `${Number((amount / 1_000_000_000).toFixed(amount >= 10_000_000_000 ? 0 : 1))} mlrd`
	}
	if (amount >= 1_000_000) {
		return `${Number((amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1))} mln`
	}
	if (amount >= 1_000) {
		return `${Math.round(amount / 1_000)} ming`
	}
	return `${amount.toLocaleString('en-US')} so'm`
}

function formatDateRangeCaption(from = '', to = '') {
	if (from && to) return `${formatShortTrendLabel(from)} - ${formatShortTrendLabel(to)}`
	if (from) return `${formatShortTrendLabel(from)} dan boshlab`
	if (to) return `${formatShortTrendLabel(to)} gacha`
	return "So'nggi ko'rsatkichlar"
}

function isDateInRange(value, from, to) {
	if (!value) return true
	if (from && value < from) return false
	if (to && value > to) return false
	return true
}

function getQrPreviewUrl(value) {
	return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(value)}`
}

async function copyText(value) {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(value)
		return
	}
	const input = document.createElement('textarea')
	input.value = value
	document.body.appendChild(input)
	input.select()
	document.execCommand('copy')
	document.body.removeChild(input)
}

const toast = Swal.mixin({
	toast: true,
	position: 'top-end',
	showConfirmButton: false,
	timer: 2800,
	timerProgressBar: true,
})

function showError(message) {
	return Swal.fire({
		icon: 'error',
		title: 'Xatolik',
		text: message,
		confirmButtonColor: '#133385',
	})
}

function showSuccess(title, text) {
	return Swal.fire({
		icon: 'success',
		title,
		text,
		confirmButtonColor: '#133385',
	})
}

function Modal({ title, subtitle, onClose, children }) {
	return (
		<div className='modal-backdrop' onClick={onClose}>
			<div className='modal-card' onClick={event => event.stopPropagation()}>
				<div className='modal-head'>
					<div>
						<h3>{title}</h3>
						{subtitle ? <p>{subtitle}</p> : null}
					</div>
					<button type='button' className='close-btn' onClick={onClose}>
						<Icon name='close' />
					</button>
				</div>
				{children}
			</div>
		</div>
	)
}

function ActionButton({
	children,
	secondary = false,
	onClick,
	type = 'button',
	icon,
	disabled = false,
}) {
	return (
		<button
			type={type}
			className={secondary ? 'action-btn secondary' : 'action-btn'}
			onClick={onClick}
			disabled={disabled}
		>
			{icon ? <Icon name={icon} className='button-icon' /> : null}
			{children}
		</button>
	)
}

function PageHeader({ title, subtitle, actions }) {
	return (
		<section className='page-intro'>
			<div>
				<h1>{title}</h1>
				<p>{subtitle}</p>
			</div>
			{actions ? <div className='intro-actions'>{actions}</div> : null}
		</section>
	)
}

function DemoMetric({ label, value, tone = 'default' }) {
	return (
		<div className={`demo-metric-card ${tone}`}>
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	)
}

function ProductDemoWindow({ item, children }) {
	const routeMap = {
		director: 'intelligent.uz/director/dashboard',
		reception: 'intelligent.uz/reception/students',
		teacher: 'intelligent.uz/teacher/attendance',
		student: 'intelligent.uz/student/dashboard',
		login: 'intelligent.uz/login',
	}
	const previewImageMap = {
		director: '/landing-dashboard.png',
		reception: '/reception-panel.png',
		teacher: '/teacher-panel.png',
		student: '/student-panel.png',
		login: '/login-panel.png',
	}
	const widgetMap = {
		director: [
			{ label: "Sof foyda", value: '+18.4%', tone: 'success' },
			{ label: "Qarzdorlik", value: '12.4M', tone: 'warning' },
		],
		reception: [
			{ label: "Yangi student", value: '6 ta', tone: 'success' },
			{ label: "To'lovlar", value: '3.8M', tone: 'default' },
		],
		teacher: [
			{ label: 'Davomat', value: '92%', tone: 'success' },
			{ label: 'Bugungi dars', value: '3 ta', tone: 'default' },
		],
		student: [
			{ label: 'Balans', value: '320k', tone: 'success' },
			{ label: 'Reminder', value: '2 kun', tone: 'warning' },
		],
		login: [
			{ label: 'Web App', value: 'Auto', tone: 'success' },
			{ label: 'QR Login', value: 'Ready', tone: 'default' },
		],
	}
	return (
		<div className='product-demo-window'>
			<div className='product-demo-browser'>
				<div className='product-demo-browser-dots'>
					<span />
					<span />
					<span />
				</div>
				<div className='product-demo-browser-pill'>{routeMap[item.type] || routeMap.login}</div>
			</div>
			<div className='product-demo-layout'>
				<div className='product-demo-content'>
					<div className='product-demo-content-head'>
						<div>
							<strong>{item.title}</strong>
							<span>{item.role}</span>
						</div>
						<div className='product-demo-head-badge'>
							<span className='live-dot' />
							Real demo
						</div>
					</div>
					<div className='product-demo-preview-band'>
						<div className='product-demo-shot-card'>
							<img src={previewImageMap[item.type] || previewImageMap.login} alt={item.title} />
							<div className='product-demo-shot-overlay'>
								<div className='product-demo-shot-badge'>Live preview</div>
								<div className='product-demo-mini-chart'>
									<span style={{ '--mini-height': '36%' }} />
									<span style={{ '--mini-height': '58%' }} />
									<span style={{ '--mini-height': '44%' }} />
									<span style={{ '--mini-height': '78%' }} />
									<span style={{ '--mini-height': '66%' }} />
								</div>
							</div>
						</div>
						<div className='product-demo-floating-widgets'>
							{(widgetMap[item.type] || widgetMap.login).map(widget => (
								<div key={widget.label} className={`product-demo-widget ${widget.tone}`}>
									<span>{widget.label}</span>
									<strong>{widget.value}</strong>
								</div>
							))}
						</div>
					</div>
					<div className='product-demo-skeleton-row' aria-hidden='true'>
						<span className='long' />
						<span className='medium' />
						<span className='short' />
					</div>
					{children}
				</div>
			</div>
		</div>
	)
}

function ProductDemoSurface({ item }) {
	const [view, setView] = useState(
		item.type === 'director'
			? 'monthly'
			: item.type === 'reception'
				? 'trial'
				: item.type === 'teacher'
					? 'today'
					: item.type === 'student'
						? 'overview'
						: 'student',
	)

	if (item.type === 'director') {
		const views = {
			monthly: {
				badge: "Oylik nazorat",
				metrics: [
					{ label: "Oylik tushum", value: '128.4M UZS', tone: 'default' },
					{ label: "O'qituvchi oyligi", value: '41.0M UZS', tone: 'warning' },
					{ label: 'Sof foyda', value: '63.7M UZS', tone: 'success' },
				],
				rows: [
					['IELTS Intensive', '42 student', '28.8M'],
					['Matematika', '31 student', '18.2M'],
					['Frontend', '24 student', '15.9M'],
				],
			},
			profit: {
				badge: 'Foyda rejimi',
				metrics: [
					{ label: 'Jami xarajat', value: '64.7M UZS', tone: 'warning' },
					{ label: 'Qarzdorlik', value: '12.4M UZS', tone: 'danger' },
					{ label: 'Sof foyda', value: '63.7M UZS', tone: 'success' },
				],
				rows: [
					['Ijara', 'Oylik xarajat', '12.0M'],
					['Reklama', 'Lead oqimi', '8.5M'],
					['Admin + internet', 'Doimiy', '3.2M'],
				],
			},
		}
		const current = views[view]
		return (
			<ProductDemoWindow item={item}>
				<div className='product-demo-surface'>
				<div className='product-demo-toolbar'>
					<div className='product-demo-pills'>
						<button type='button' className={view === 'monthly' ? 'active' : ''} onClick={() => setView('monthly')}>Tushum</button>
						<button type='button' className={view === 'profit' ? 'active' : ''} onClick={() => setView('profit')}>Foyda</button>
					</div>
					<Badge tone='success'>{current.badge}</Badge>
				</div>
				<div className='demo-metric-grid'>
					{current.metrics.map(metric => <DemoMetric key={metric.label} {...metric} />)}
				</div>
				<div className='product-demo-table'>
					<div className='product-demo-row head'><span>Yo'nalish</span><span>Holat</span><span>Qiymat</span></div>
					{current.rows.map(row => (
						<div key={row[0]} className='product-demo-row'><span>{row[0]}</span><span>{row[1]}</span><span>{row[2]}</span></div>
					))}
				</div>
				</div>
			</ProductDemoWindow>
		)
	}

	if (item.type === 'reception') {
		const views = {
			trial: {
				metrics: [
					{ label: 'Sinovdagilar', value: '14 ta', tone: 'warning' },
					{ label: "Bugungi to'lov", value: '3.8M UZS', tone: 'success' },
				],
				rows: [
					['Aziza R.', 'IELTS Intensive', '2/3 kun'],
					['Murod A.', 'Frontend', '1/3 kun'],
					['Muslima T.', 'Matematika', '3/3 kun'],
				],
			},
			payments: {
				metrics: [
					{ label: "Naqd to'lov", value: '2.4M UZS', tone: 'default' },
					{ label: 'Click/Payme', value: '1.4M UZS', tone: 'success' },
				],
				rows: [
					['Muhammadali', '580 000 UZS', 'Qabul qilindi'],
					['Kamronbek', '900 000 UZS', 'Chek yuborildi'],
					['Mubina', '420 000 UZS', 'Telegram ulandi'],
				],
			},
		}
		const current = views[view]
		return (
			<ProductDemoWindow item={item}>
				<div className='product-demo-surface'>
				<div className='product-demo-toolbar'>
					<div className='product-demo-pills'>
						<button type='button' className={view === 'trial' ? 'active' : ''} onClick={() => setView('trial')}>Sinov</button>
						<button type='button' className={view === 'payments' ? 'active' : ''} onClick={() => setView('payments')}>To'lovlar</button>
					</div>
					<Badge tone='warning'>Reception oqimi</Badge>
				</div>
				<div className='demo-metric-grid two'>
					{current.metrics.map(metric => <DemoMetric key={metric.label} {...metric} />)}
				</div>
				<div className='product-demo-list'>
					{current.rows.map(row => (
						<div key={row[0]} className='product-demo-list-item'>
							<strong>{row[0]}</strong>
							<span>{row[1]}</span>
							<b>{row[2]}</b>
						</div>
					))}
				</div>
				</div>
			</ProductDemoWindow>
		)
	}

	if (item.type === 'teacher') {
		const views = {
			today: {
				metrics: [
					{ label: 'Bugungi darslar', value: '3 ta', tone: 'default' },
					{ label: 'Davomat', value: '92%', tone: 'success' },
				],
				rows: [
					['IELTS Evening', '18/20 present', '17:00'],
					['Frontend N8', '12/14 present', '19:00'],
				],
			},
			groups: {
				metrics: [
					{ label: 'Guruhlar', value: '5 ta', tone: 'default' },
					{ label: 'Studentlar', value: '74 ta', tone: 'success' },
				],
				rows: [
					['IELTS Intensive', '26 student', 'Lead teacher'],
					['Matematika Pro', '18 student', 'Nazorat kuchli'],
				],
			},
		}
		const current = views[view]
		return (
			<ProductDemoWindow item={item}>
				<div className='product-demo-surface'>
				<div className='product-demo-toolbar'>
					<div className='product-demo-pills'>
						<button type='button' className={view === 'today' ? 'active' : ''} onClick={() => setView('today')}>Bugun</button>
						<button type='button' className={view === 'groups' ? 'active' : ''} onClick={() => setView('groups')}>Guruhlar</button>
					</div>
					<Badge tone='success'>Dars nazorati</Badge>
				</div>
				<div className='demo-metric-grid two'>
					{current.metrics.map(metric => <DemoMetric key={metric.label} {...metric} />)}
				</div>
				<div className='product-demo-list'>
					{current.rows.map(row => (
						<div key={row[0]} className='product-demo-list-item'>
							<strong>{row[0]}</strong>
							<span>{row[1]}</span>
							<b>{row[2]}</b>
						</div>
					))}
				</div>
				</div>
			</ProductDemoWindow>
		)
	}

	if (item.type === 'student') {
		const views = {
			overview: {
				metrics: [
					{ label: 'Balans', value: '320 000 UZS', tone: 'success' },
					{ label: 'Davomat', value: '94%', tone: 'default' },
				],
				rows: [
					['Bugungi dars', 'IELTS Intensive', '17:00'],
					['Keyingi eslatma', "May oylik to'lovi", '2 kun qoldi'],
				],
			},
			payments: {
				metrics: [
					{ label: "Oxirgi to'lov", value: '580 000 UZS', tone: 'success' },
					{ label: 'Holat', value: 'Tolangan', tone: 'default' },
				],
				rows: [
					['Aprel', 'Tolangan', '29.04.2026'],
					['May', 'Kutilmoqda', '10.05.2026'],
				],
			},
		}
		const current = views[view]
		return (
			<ProductDemoWindow item={item}>
				<div className='product-demo-surface'>
				<div className='product-demo-toolbar'>
					<div className='product-demo-pills'>
						<button type='button' className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}>Kabinet</button>
						<button type='button' className={view === 'payments' ? 'active' : ''} onClick={() => setView('payments')}>To'lovlar</button>
					</div>
					<Badge tone='success'>Student view</Badge>
				</div>
				<div className='demo-metric-grid two'>
					{current.metrics.map(metric => <DemoMetric key={metric.label} {...metric} />)}
				</div>
				<div className='product-demo-list'>
					{current.rows.map(row => (
						<div key={row[0]} className='product-demo-list-item'>
							<strong>{row[0]}</strong>
							<span>{row[1]}</span>
							<b>{row[2]}</b>
						</div>
					))}
				</div>
				</div>
			</ProductDemoWindow>
		)
	}

	return (
		<ProductDemoWindow item={item}>
			<div className='product-demo-surface'>
			<div className='product-demo-toolbar'>
				<div className='product-demo-pills'>
					<button type='button' className={view === 'student' ? 'active' : ''} onClick={() => setView('student')}>Student</button>
					<button type='button' className={view === 'admin' ? 'active' : ''} onClick={() => setView('admin')}>Admin</button>
					<button type='button' className={view === 'qr' ? 'active' : ''} onClick={() => setView('qr')}>QR</button>
				</div>
				<Badge tone='success'>Kirish oqimi</Badge>
			</div>
			<div className='demo-login-card'>
				<strong>{view === 'qr' ? 'QR / Web App orqali kirish' : `${view === 'student' ? 'Student' : 'Admin'} login demo`}</strong>
				<div className='demo-login-fields'>
					<div><span>Login</span><b>{view === 'admin' ? 'mamatovozodbek' : '+998 93 230 34 10'}</b></div>
					<div><span>Parol</span><b>{view === 'qr' ? 'Token orqali avtomatik' : '12345678'}</b></div>
				</div>
				<div className='demo-login-actions'>
					<button type='button' className='marketing-primary-btn demo-action-btn'>
						{view === 'qr' ? 'Profilga o‘tish' : 'Kirish'}
					</button>
					<button type='button' className='marketing-link-btn demo-action-btn secondary'>
						{view === 'student' ? "Web App ochish" : "Telegram bot ulash"}
					</button>
				</div>
			</div>
			</div>
		</ProductDemoWindow>
	)
}

function RoleLayout({ user, onLogout, children, token }) {
	const nav = NAV_ITEMS[user.role]
	const panelLabel =
		user.role === 'reception'
			? 'Reception Panel'
			: user.role === 'student'
				? 'Student Panel'
				: 'Education CRM'
	const [notifications, setNotifications] = useState([])
	const [showNotifications, setShowNotifications] = useState(false)
	const [notificationFilter, setNotificationFilter] = useState('all')
	const unreadNotificationsCount = notifications.filter(item => item.status !== 'read').length
	const filteredNotifications = useMemo(
		() =>
			notificationFilter === 'unread'
				? notifications.filter(item => item.status !== 'read')
				: notifications,
		[notifications, notificationFilter],
	)
	const [sidebarOpen, setSidebarOpen] = useState(false)
	const [searchValue, setSearchValue] = useState('')
	const [theme] = useAppTheme()
	const location = useLocation()
	const navigate = useNavigate()

	useEffect(() => {
		let cancelled = false
		async function loadNotifications() {
			try {
				const data = await api.getNotifications(token)
				if (!cancelled && Array.isArray(data)) setNotifications(data)
			} catch {
				// Keep current notifications if polling fails.
			}
		}
		loadNotifications()
		const interval = window.setInterval(loadNotifications, 20000)
		return () => {
			cancelled = true
			window.clearInterval(interval)
		}
	}, [token])

	useEffect(() => {
		setSidebarOpen(false)
	}, [location.pathname])

	useEffect(() => {
		const currentSearch =
			new URLSearchParams(location.search).get('search') || ''
		setSearchValue(currentSearch)
	}, [location.pathname, location.search])

	async function handleReadNotification(notificationId) {
		await api.readNotification(token, notificationId)
		setNotifications(items =>
			items.map(item =>
				item.id === notificationId ? { ...item, status: 'read' } : item,
			),
		)
	}

	async function handleReadAllNotifications() {
		await api.readAllNotifications(token)
		setNotifications(items => items.map(item => ({ ...item, status: 'read' })))
		setNotificationFilter('all')
	}

	function handleGlobalSearch(event) {
		event.preventDefault()
		const query = searchValue.trim()
		if (user.role === 'student') {
			navigate('/student/dashboard')
			return
		}
		if (user.role === 'teacher') {
			navigate(
				`/teacher/groups${query ? `?search=${encodeURIComponent(query)}` : ''}`,
			)
			return
		}
		const basePath =
			user.role === 'director' ? '/director/students' : '/reception/students'
		navigate(
			`${basePath}${query ? `?search=${encodeURIComponent(query)}` : ''}`,
		)
	}

	return (
		<div
			className={`app-shell theme-${theme} ${sidebarOpen ? 'sidebar-open' : ''}`}
			data-theme={theme}
		>
			{sidebarOpen ? (
				<button
					type='button'
					className='sidebar-overlay'
					onClick={() => setSidebarOpen(false)}
				/>
			) : null}
			<aside className='sidebar'>
				<div className='sidebar-inner'>
					<div className='sidebar-brand'>
						<div className='brand-logo'>
							<img src='/ilmnest.jpg' alt='ILM NEST logo' className='brand-logo-image' />
						</div>
						<div>
							<strong>ILM NEST</strong>
							<p>{panelLabel}</p>
						</div>
					</div>

					<nav className='sidebar-nav'>
						{nav.map(item => (
							<NavLink
								key={item.to}
								to={item.to}
								className={({ isActive }) =>
									isActive ? 'sidebar-link active' : 'sidebar-link'
								}
							>
								<Icon name={item.icon} className='sidebar-icon' />
								{item.label}
							</NavLink>
						))}
					</nav>
				</div>

				<button type='button' className='sidebar-logout' onClick={onLogout}>
					<Icon name='logout' className='logout-icon' />
					Chiqish
				</button>
			</aside>

			<div className='page-shell'>
				<header className='page-topbar'>
					<button
						type='button'
						className='hamburger-btn'
						onClick={() => setSidebarOpen(value => !value)}
					>
						<Icon name='menu' />
					</button>
					<form className='search-box' onSubmit={handleGlobalSearch}>
						<Icon name='search' className='search-icon' />
						<input
							placeholder="Ism, telefon yoki kurs bo'yicha qidiring..."
							value={searchValue}
							onChange={event => setSearchValue(event.target.value)}
						/>
					</form>

					<div className='topbar-user'>
						<ThemeToggleButton />
						<button
							type='button'
							className='topbar-icon'
							onClick={() => setShowNotifications(value => !value)}
						>
							<Icon name='notifications' />
							{unreadNotificationsCount ? (
								<span className='topbar-icon-badge'>{unreadNotificationsCount}</span>
							) : null}
						</button>

						{showNotifications ? (
							<div className='notifications-popover'>
								<div className='notifications-head'>
									<strong>Bildirishnomalar</strong>
									<div className='notifications-head-actions'>
										{unreadNotificationsCount ? <Badge tone='danger'>{unreadNotificationsCount} ta yangi</Badge> : null}
										{unreadNotificationsCount ? (
											<button
												type='button'
												className='notification-read-all-btn'
												title="Hammasini o'qildi deb belgilash"
												onClick={handleReadAllNotifications}
											>
												<Icon name='done_all' />
											</button>
										) : null}
									</div>
								</div>
								<div className='notification-filter-tabs'>
									<button
										type='button'
										className={notificationFilter === 'all' ? 'active' : ''}
										onClick={() => setNotificationFilter('all')}
									>
										Barchasi
									</button>
									<button
										type='button'
										className={notificationFilter === 'unread' ? 'active' : ''}
										onClick={() => setNotificationFilter('unread')}
									>
										O'qilmagan
									</button>
								</div>
								<div className='notifications-list'>
									{filteredNotifications.length ? (
										filteredNotifications.map(item => (
											<button
												key={item.id}
												type='button'
												className={
													item.status === 'read'
														? 'notification-item read'
														: 'notification-item'
												}
												onClick={() => handleReadNotification(item.id)}
											>
												<strong>{item.title}</strong>
												<span>{item.message}</span>
											</button>
										))
									) : (
										<div className='notification-empty'>
											Yangi bildirishnoma yo'q
										</div>
									)}
								</div>
							</div>
						) : null}
						<div className='user-meta'>
							<strong>{user.fullName}</strong>
							<span>{formatRole(user)}</span>
						</div>
						<div className='user-avatar'>
							{user.profileImage ? (
								<img src={resolveAssetUrl(user.profileImage)} alt={user.fullName} />
							) : (
								getInitials(user.fullName)
							)}
						</div>
					</div>
				</header>

				<main className='page-content'>{children}</main>
			</div>
		</div>
	)
}

function ProfileSettingsCard({
	token,
	meta,
	title = 'Profilni tahrirlash',
	onProfileUpdated,
}) {
	const [selectedFileName, setSelectedFileName] = useState('')
	const [form, setForm] = useState({
		fullName: meta.user.fullName || '',
		username: meta.user.username || '',
		phone: meta.user.phone || '',
		profileImage: meta.user.profileImage || '',
		password: '',
	})
	const [message, setMessage] = useState('')

	async function handleFileChange(event) {
		const file = event.target.files?.[0]
		if (!file) return
		try {
			const dataUrl = await readFileAsDataUrl(file)
			setSelectedFileName(file.name)
			setForm(current => ({ ...current, profileImage: dataUrl }))
		} catch (err) {
			await showError(err.message)
		}
	}

	async function handleSubmit(event) {
		event.preventDefault()
		try {
			const updatedProfile = await api.updateProfile(token, form)
			setMessage('Profil muvaffaqiyatli yangilandi')
			setForm(current => ({ ...current, password: '' }))
			setSelectedFileName('')
			onProfileUpdated?.(updatedProfile)
			await showSuccess('Saqlandi', 'Profil muvaffaqiyatli yangilandi')
		} catch (err) {
			await showError(err.message)
		}
	}

	return (
		<section className='card settings-card'>
			<h3>{title}</h3>
			<div className='language-setting-card'>
				<div>
					<strong>Til sozlamasi</strong>
					<p>Tanlangan til brauzerda saqlanadi va barcha panel sahifalarida qo'llanadi.</p>
				</div>
				<LanguageSelector />
			</div>
			<AppearanceSettingsCard />
			<form className='modal-form' onSubmit={handleSubmit}>
				<div className='field-grid'>
					<div>
						<label>Ism familiya</label>
						<input
							value={form.fullName}
							onChange={e => setForm({ ...form, fullName: e.target.value })}
						/>
					</div>
					<div>
						<label>Username</label>
						<input
							value={form.username}
							onChange={e => setForm({ ...form, username: e.target.value })}
						/>
					</div>
					<div>
						<label>Telefon</label>
						<input
							value={form.phone}
							onChange={e => setForm({ ...form, phone: e.target.value })}
						/>
					</div>
					<div>
						<label>Profil rasmi</label>
						<label className='file-upload-field'>
							<input type='file' accept='image/*' onChange={handleFileChange} />
							<span className='file-upload-button'>
								<Icon name='upload' className='button-icon' />
								Rasm yuklash
							</span>
							<span className='file-upload-name'>
								{selectedFileName || 'PNG, JPG yoki WEBP fayl tanlang'}
							</span>
						</label>
					</div>
					<div>
						<label>Yangi parol</label>
						<input
							type='password'
							value={form.password}
							onChange={e => setForm({ ...form, password: e.target.value })}
						/>
					</div>
				</div>
				<div className='modal-actions'>
					{message ? <span className='success-text'>{message}</span> : <span />}
					<ActionButton type='submit' icon='save'>
						Saqlash
					</ActionButton>
				</div>
			</form>
		</section>
	)
}

function StudentHistoryModal({ history, onClose }) {
	return (
		<Modal
			title='Student tarixi'
			subtitle="O'quvchi bo'yicha o'zgarishlar"
			onClose={onClose}
		>
			<div className='timeline-list'>
				{history.map(item => (
					<div key={item.id} className='timeline-item'>
						<strong>{item.title}</strong>
						<span>{item.details || item.action}</span>
						<span>{item.createdAt}</span>
					</div>
				))}
			</div>
		</Modal>
	)
}

function CourseModal({ initialData, onClose, onSubmit }) {
	const initialSchedule = parseScheduleString(initialData.schedule || '')
	const [submitting, setSubmitting] = useState(false)
	const [form, setForm] = useState({
		...initialData,
		scheduleDays: initialSchedule.days,
		startTime: initialSchedule.startTime,
		endTime: initialSchedule.endTime,
	})
	return (
		<Modal
			title={form.id ? 'Kursni tahrirlash' : 'Yangi kurs'}
			subtitle="Kurs ma'lumotlarini kiriting"
			onClose={onClose}
		>
			<form
				className='modal-form'
				onSubmit={async event => {
					if (submitting) {
						event.preventDefault()
						return
					}
					setSubmitting(true)
					try {
						await onSubmit(event, {
							...form,
							schedule: buildScheduleString(
								form.scheduleDays,
								form.startTime,
								form.endTime,
							),
						})
					} finally {
						setSubmitting(false)
					}
				}}
			>
				<div className='field-grid'>
					<div>
						<label>Nomi</label>
						<input
							value={form.title}
							onChange={e => setForm({ ...form, title: e.target.value })}
						/>
					</div>
					<div>
						<label>Oylik to'lov</label>
						<input
							type='number'
							value={form.monthlyFee}
							onChange={e =>
								setForm({ ...form, monthlyFee: Number(e.target.value) })
							}
						/>
					</div>
					<div className='full-span'>
						<label>Dars kunlari</label>
						<div className='weekday-grid'>
							{WEEKDAY_OPTIONS.map(day => (
								<button
									key={day.key}
									type='button'
									className={
										form.scheduleDays?.includes(day.key)
											? 'weekday-chip active'
											: 'weekday-chip'
									}
									onClick={() =>
										setForm(current => ({
											...current,
											scheduleDays: toggleScheduleDay(
												current.scheduleDays || [],
												day.key,
											),
										}))
									}
								>
									{day.label}
								</button>
							))}
						</div>
					</div>
					<div>
						<label>Boshlanish vaqti</label>
						<input
							type='time'
							value={form.startTime}
							onChange={e => setForm({ ...form, startTime: e.target.value })}
						/>
					</div>
					<div>
						<label>Tugash vaqti</label>
						<input
							type='time'
							value={form.endTime}
							onChange={e => setForm({ ...form, endTime: e.target.value })}
						/>
					</div>
				</div>
				<div className='modal-actions'>
					<button type='button' className='ghost-outline' onClick={onClose}>
						Bekor qilish
					</button>
					<ActionButton type='submit' icon='save' disabled={submitting}>
						{submitting ? 'Saqlanmoqda...' : 'Saqlash'}
					</ActionButton>
				</div>
			</form>
		</Modal>
	)
}

function TeacherModal({ initialData, courses, onClose, onSubmit }) {
	const [form, setForm] = useState(initialData)
	const [submitting, setSubmitting] = useState(false)
	return (
		<Modal
			title={form.id ? "O'qituvchini tahrirlash" : "Yangi o'qituvchi"}
			subtitle="O'qituvchi ma'lumotlarini kiriting"
			onClose={onClose}
		>
			<form
				className='modal-form teacher-modal-form'
				onSubmit={async event => {
					if (submitting) {
						event.preventDefault()
						return
					}
					setSubmitting(true)
					try {
						await onSubmit(event, form)
					} finally {
						setSubmitting(false)
					}
				}}
			>
				<div className='field-grid'>
					<div>
						<label>Ism familiya</label>
						<input
							value={form.fullName}
							onChange={e => setForm({ ...form, fullName: e.target.value })}
						/>
					</div>
					<div>
						<label>Username</label>
						<input
							value={form.username}
							onChange={e => setForm({ ...form, username: e.target.value })}
						/>
					</div>
					<div>
						<label>Telefon</label>
						<input
							value={form.phone || ''}
							onChange={e => setForm({ ...form, phone: e.target.value })}
						/>
					</div>
					<div>
						<label>Oylik to'lovi</label>
						<input
							type='number'
							value={form.monthlySalary || 0}
							onChange={e =>
								setForm({ ...form, monthlySalary: Number(e.target.value || 0) })
							}
						/>
					</div>
					<div>
						<label>Yangi parol</label>
						<input
							type='password'
							value={form.password || ''}
							onChange={e => setForm({ ...form, password: e.target.value })}
						/>
					</div>
					<div className='full-span'>
						<label>O'qitadigan kurslari</label>
						<div className='checkbox-grid checkbox-grid-scroll'>
							{courses.map(course => {
								const checked = (form.courseIds || []).includes(course.id)
								return (
									<label key={course.id} className='checkbox-card'>
										<input
											type='checkbox'
											checked={checked}
											onChange={e =>
												setForm({
													...form,
													courseIds: e.target.checked
														? [...(form.courseIds || []), course.id]
														: (form.courseIds || []).filter(
																id => id !== course.id,
															),
												})
											}
										/>
										<span>{course.title}</span>
									</label>
								)
							})}
						</div>
					</div>
				</div>
				<div className='modal-actions'>
					<button type='button' className='ghost-outline' onClick={onClose}>
						Bekor qilish
					</button>
					<ActionButton type='submit' icon='save' disabled={submitting}>
						{submitting ? 'Saqlanmoqda...' : 'Saqlash'}
					</ActionButton>
				</div>
			</form>
		</Modal>
	)
}

function PublicSiteHeader() {
	const [menuOpen, setMenuOpen] = useState(false)
	const [headerProgress, setHeaderProgress] = useState(0)
	const navItems = [
		{ href: '#haqimizda', label: 'Biz haqimizda', active: true },
		{ href: '#courses', label: 'Kurslar' },
		{ href: '#courses', label: 'Narxlar' },
		{ href: '#location', label: 'Manzil' },
		{ href: '#stats', label: 'Afzalliklar' },
	]

	useEffect(() => {
		function handleScroll() {
			const next = Math.min(1, window.scrollY / 220)
			setHeaderProgress(next)
		}

		handleScroll()
		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	return (
		<>
			<header
				className='marketing-header'
				style={{
					'--header-blur': `${8 + headerProgress * 16}px`,
					'--header-bg': `rgba(255, 255, 255, ${0.72 + headerProgress * 0.22})`,
					'--header-border': `rgba(214, 225, 242, ${0.35 + headerProgress * 0.45})`,
					'--header-shadow': `0 ${10 + headerProgress * 12}px ${24 + headerProgress * 18}px rgba(18, 51, 133, ${0.04 + headerProgress * 0.08})`,
				}}
			>
				<Link to='/' className='marketing-brand'>
					<span className='marketing-brand-mark'>
						<img src='/ilmnest.jpg' alt='ILM NEST logo' className='marketing-brand-logo-image' />
					</span>
					<span className='marketing-brand-copy'>
						<strong>ILM NEST</strong>
						<span>Ta'lim markazi</span>
					</span>
				</Link>
				<nav className='marketing-nav-shell'>
					<div className='marketing-nav'>
						{navItems.map(item => (
							<a key={`${item.href}-${item.label}`} href={item.href} >
								{item.label}
							</a>
						))}
					</div>
				</nav>
				<div className='marketing-actions'>
					<LanguageSelector compact />
					<Link to='/student/login' className='marketing-header-link'>Kirish</Link>
					<Link to='/admins' className='marketing-header-link marketing-header-cta'>Admin kirish</Link>
					{/* <a href='#aloqa' className=''>
							<strong>Bog'lanish</strong>
					</a> */}
				</div>
				<button
					type='button'
					className='marketing-menu-btn'
					onClick={() => setMenuOpen(value => !value)}
				>
					<Icon name={menuOpen ? 'close' : 'menu'} />
				</button>
			</header>
			{menuOpen ? (
				<div className='marketing-mobile-menu'>
					{navItems.map(item => (
						<a key={`${item.href}-${item.label}`} href={item.href} onClick={() => setMenuOpen(false)}>
							{item.label}
						</a>
					))}
					<a href='#aloqa' onClick={() => setMenuOpen(false)}>Bog'lanish</a>
					<LanguageSelector />
					<Link to='/student/login' onClick={() => setMenuOpen(false)}>Kirish</Link>
					<Link to='/admins' onClick={() => setMenuOpen(false)}>Admin kirish</Link>
				</div>
			) : null}
		</>
	)
}

function PublicSiteFooter() {
	return (
		<footer className='marketing-footer'>
			<div className='marketing-footer-grid'>
				<div>
					<h3>ILM NEST</h3>
					<p>Eng yaxshi sarmoya ilm uchun sarflanganidir. ILM NEST o'quv markazi sifatli ta'lim va real natijaga yo'naltirilgan muhit yaratadi.</p>
				</div>
				<div className='footer-social-block'>
					<h4>Ijtimoiy tarmoqlar</h4>
					<div className='footer-socials'>
						<a href='https://t.me/intelligent_edu_uz' target='_blank' rel='noreferrer'>Telegram</a>
						<a href='https://instagram.com/intelligent_uzedu' target='_blank' rel='noreferrer'>Instagram</a>
						<a href='tel:+998958006500'>+998 95 800 65 00</a>
					</div>
				</div>
				<div>
					<h4>Aloqa</h4>
					<p>Telefon: +998 95 800 65 00</p>
					<p>Manzil: Andijon vil. Qo'rg'ontepa</p>
					<p><Link to='/dasturchilar' className='footer-dev-link'>Dasturchilar</Link></p>
				</div>
			</div>
			<div className='marketing-footer-bottom'>
				<span className='landing-v2-footer-copy'>2026 ILM NEST Ta'lim Markazi. Barcha huquqlar himoyalangan.</span>
				
			</div>
		</footer>
	)
}

function HomePage() {
	const location = useLocation()
	const [activeFaq, setActiveFaq] = useState(0)
	const [testimonialIndex, setTestimonialIndex] = useState(0)
	const [publicCourses, setPublicCourses] = useState([])
	const [scrollProgress, setScrollProgress] = useState(0)
	const [heroCursor, setHeroCursor] = useState({ x: 50, y: 50, active: false })
	const [statsStarted, setStatsStarted] = useState(false)
	const [animatedStats, setAnimatedStats] = useState({
		students: 0,
		courses: 0,
		quality: 0,
	})
	const [selectedCourse, setSelectedCourse] = useState(null)
	const [contactForm, setContactForm] = useState({
		fullName: '',
		phone: '',
		interest: '',
		message: '',
	})
	const touchStartX = useRef(0)

	useEffect(() => {
		if (location.pathname !== '/aloqa' && location.hash !== '#aloqa') return
		const timer = window.setTimeout(() => {
			document.getElementById('aloqa')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}, 120)
		return () => window.clearTimeout(timer)
	}, [location.pathname, location.hash])

	useEffect(() => {
		const timer = setInterval(() => {
			setTestimonialIndex(current => (current + 1) % LANDING_TESTIMONIALS_CLEAN.length)
		}, 4200)
		return () => clearInterval(timer)
	}, [])

	useEffect(() => {
		api.getPublicCourses().then(setPublicCourses).catch(() => setPublicCourses([]))
	}, [])

	useEffect(() => {
		function handleScroll() {
			const max = document.documentElement.scrollHeight - window.innerHeight
			const next = max > 0 ? (window.scrollY / max) * 100 : 0
			setScrollProgress(Math.max(0, Math.min(100, next)))
		}

		handleScroll()
		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	useEffect(() => {
		const nodes = Array.from(document.querySelectorAll('.landing-reveal'))
		if (!nodes.length) return undefined

		const observer = new IntersectionObserver(
			entries => {
				entries.forEach(entry => {
					if (!entry.isIntersecting) return
					entry.target.classList.add('is-visible')
					if (entry.target.classList.contains('landing-pro-stats')) {
						setStatsStarted(true)
					}
					observer.unobserve(entry.target)
				})
			},
			{ rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
		)

		nodes.forEach(node => observer.observe(node))
		return () => observer.disconnect()
	}, [publicCourses.length])

	useEffect(() => {
		if (!statsStarted) return undefined

		const target = {
			students: 500,
			courses: publicCourses.length || 0,
			quality: 100,
		}
		const duration = 1300
		const startedAt = performance.now()
		let frameId = 0

		function easeOutCubic(value) {
			return 1 - Math.pow(1 - value, 3)
		}

		function tick(now) {
			const progress = Math.min(1, (now - startedAt) / duration)
			const eased = easeOutCubic(progress)
			setAnimatedStats({
				students: Math.round(target.students * eased),
				courses: Math.round(target.courses * eased),
				quality: Math.round(target.quality * eased),
			})
			if (progress < 1) {
				frameId = requestAnimationFrame(tick)
			}
		}

		frameId = requestAnimationFrame(tick)
		return () => cancelAnimationFrame(frameId)
	}, [statsStarted, publicCourses.length])

	async function handleContactSubmit(event) {
		event.preventDefault()
		try {
			const selectedInterest =
				contactForm.interest ||
				publicCourses[0]?.title ||
				"Yo'nalish tanlanmagan"
			await api.createContactRequest({
				fullName: contactForm.fullName,
				phone: contactForm.phone,
				message: `Yo'nalish: ${selectedInterest}\n\nTavsif: ${contactForm.message}`,
			})
			await showSuccess(
				"So'rov qabul qilindi",
				"Tez orada siz bilan bog'lanamiz",
			)
			setContactForm({ fullName: '', phone: '', interest: '', message: '' })
		} catch (err) {
			await showError(err.message)
		}
	}

	function handleHeroPointerMove(event) {
		const rect = event.currentTarget.getBoundingClientRect()
		const x = ((event.clientX - rect.left) / rect.width) * 100
		const y = ((event.clientY - rect.top) / rect.height) * 100
		setHeroCursor({ x, y, active: true })
	}

	function handleHeroPointerLeave() {
		setHeroCursor({ x: 50, y: 50, active: false })
	}

	function handleCourseEnroll(course) {
		setSelectedCourse(null)
		setContactForm(current => ({
			...current,
			interest: course.title,
			message: current.message || `${course.title} kursi bo'yicha batafsil ma'lumot olmoqchiman.`,
		}))
		window.requestAnimationFrame(() => {
			document.getElementById('aloqa')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		})
	}

	function handleTestimonialTouchStart(event) {
		touchStartX.current = event.touches[0]?.clientX || 0
	}

	function handleTestimonialTouchEnd(event) {
		const endX = event.changedTouches[0]?.clientX || 0
		const delta = endX - touchStartX.current
		if (Math.abs(delta) < 42) return
		if (delta < 0) {
			setTestimonialIndex(current => (current + 1) % LANDING_TESTIMONIALS_CLEAN.length)
			return
		}
		setTestimonialIndex(current =>
			current === 0 ? LANDING_TESTIMONIALS_CLEAN.length - 1 : current - 1,
		)
	}

	const intelligentMapEmbedUrl =
		'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d252.12275876100858!2d72.75812780987344!3d40.73044889930237!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38bd034cfa31ee17%3A0xa02f7303657f0fc6!2sIntelligent!5e1!3m2!1suz!2s!4v1778150677382!5m2!1suz!2s'
	const intelligentMapOpenUrl =
		'https://www.google.com/maps/search/?api=1&query=40.7304489,72.7581278'

	const courseOptions = publicCourses

	return (
		<div className='marketing-page landing-pro'>
			<div className='scroll-progress-bar' style={{ width: `${scrollProgress}%` }} />
			<PublicSiteHeader />
			<main className='marketing-main landing-pro-main'>
				<section className='landing-pro-hero landing-reveal reveal-soft is-visible' id='haqimizda'>
					<div className='landing-pro-hero-bg'>
						<img
							src='https://lh3.googleusercontent.com/aida-public/AB6AXuCPuiqgl9sO_KJ2QlwpiVuMpxvd4KWNJ4pg8A1t1Rct6UFvtQzZCnth_ujk2AxPwaGMj6ctsH5yatdHLG02JDO3ahXimXTY3KmVSxcgAkdgtOT4WzBDU3BQ5tqg_nLpk6DvbZopMH_hSvz6ijSABZjUMnsVdD2R1XsTCR8syt-YXQT78v5OBUj1IEEO5Y8BvX_DbjYY6dXMVO7hblM6gh78fBEMzjTQjIl7JEMbi45BFBkLhiOCUnv28rbg8DhMdvaKEY5hDlzQyS8p'
							alt=''
						/>
					</div>
					<div className='landing-pro-hero-shell'>
						<div className='landing-pro-hero-content landing-reveal reveal-left is-visible'>
							<span className='landing-pro-eyebrow'><span /> O'zbekistondagi etalon ta'lim darajasi</span>
							<h1><span>Bilim va natija</span>birlashgan markaz</h1>
							<p>ILM NEST - bu shunchaki o'quv markazi emas. Bu o'quvchining yo'nalishi, davomat, to'lov va natijasini tartibli nazorat qiladigan zamonaviy ta'lim muhiti.</p>
							<div className='landing-pro-actions'>
								<a href='#courses' className='marketing-primary-btn'>Kurslarni ko'rish</a>
								<a href='#aloqa' className='marketing-link-btn'>Bepul maslahat</a>
							</div>
							<div className='landing-pro-student-proof'>
								<div className='landing-pro-avatars'>
									<img src='https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80' alt='' />
									<img src='https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80' alt='' />
									<img src='https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=facearea&facepad=2&w=120&h=120&q=80' alt='' />
								</div>
								<strong>500+</strong>
								<span>mamnun o'quvchilar va ota-onalar</span>
							</div>
						</div>
						<div className='landing-pro-hero-media landing-reveal reveal-right is-visible'>
							<div className='landing-pro-hero-photo'>
								<img
									src='https://lh3.googleusercontent.com/aida-public/AB6AXuCPuiqgl9sO_KJ2QlwpiVuMpxvd4KWNJ4pg8A1t1Rct6UFvtQzZCnth_ujk2AxPwaGMj6ctsH5yatdHLG02JDO3ahXimXTY3KmVSxcgAkdgtOT4WzBDU3BQ5tqg_nLpk6DvbZopMH_hSvz6ijSABZjUMnsVdD2R1XsTCR8syt-YXQT78v5OBUj1IEEO5Y8BvX_DbjYY6dXMVO7hblM6gh78fBEMzjTQjIl7JEMbi45BFBkLhiOCUnv28rbg8DhMdvaKEY5hDlzQyS8p'
									alt="ILM NEST zamonaviy ta'lim muhiti"
								/>
							</div>
							<div className='landing-pro-floating-result'>
								<span className='landing-pro-result-check' aria-hidden='true' />
								<div>
									<strong>98%</strong>
									<span>o'quvchilar birinchi oydayoq o'sishni sezadi</span>
								</div>
							</div>
						</div>
					</div>
				</section>

				<section className='landing-pro-stats landing-reveal reveal-soft' id='stats' data-no-translate>
					<div className='landing-reveal reveal-up' style={{ '--reveal-delay': '0ms' }}>
						<Icon name='groups' />
						<strong>{animatedStats.students}+</strong>
						<span>O'quvchi tajribasi</span>
					</div>
					<div className='landing-reveal reveal-up' style={{ '--reveal-delay': '90ms' }}>
						<Icon name='school' />
						<strong>{animatedStats.courses}</strong>
						<span>Faol yo'nalish</span>
					</div>
					<div className='landing-reveal reveal-up' style={{ '--reveal-delay': '180ms' }}>
						<Icon name='workspace_premium' />
						<strong>{animatedStats.quality}%</strong>
						<span>Sifat nazorati</span>
					</div>
				</section>

				<section className='landing-pro-about' id='about'>
					<div className='landing-pro-about-media landing-reveal reveal-left'>
						<img
							src='https://lh3.googleusercontent.com/aida-public/AB6AXuACq0itED3lbvGy5uTsAmHHPVeSyc4iAjycpDDoWdfec_d0cXHrCjT0xn9BVzrcESfNr2Y1L0fRzVMitk_uHAR3E9GmdPPcFngh8N3VmTxeB_BpVbRUcEBBsdV_rspIrFg1_Ga4yeE3Wfc4DqvMmdPDcFX4RBmzk-4HLGO-WLu1kKjAe5iiuXn4tCfFwx6XG8n5tS1CVEEBDuCQVGnUN4H8qtv0Dre13-VMH3GzEHqn-7aLx95uKleOK0rg-J6ZvRsTC2H6UAtEBkj0'
							alt="ILM NEST o'quvchilari"
						/>
					</div>
					<div className='landing-pro-about-copy landing-reveal reveal-right'>
						<h2>Nega aynan bizni tanlashingiz kerak?</h2>
						<p>ILM NEST kuchli ustozlar, tartibli reception nazorati va tushunarli o'quv jarayonini birlashtiradi. Har bir o'quvchi qaysi bosqichda ekani aniq ko'rinadi.</p>
						<div className='landing-pro-about-list'>
							<article className='landing-reveal reveal-up' style={{ '--reveal-delay': '0ms' }}>
								<Icon name='verified' />
								<div>
									<h3>Eksklyuziv metodologiya</h3>
									<p>Har bir yo'nalish uchun bosqichma-bosqich reja va aniq nazorat.</p>
								</div>
							</article>
							<article className='landing-reveal reveal-up' style={{ '--reveal-delay': '90ms' }}>
								<Icon name='rocket_launch' />
								<div>
									<h3>Natijaga yo'naltirilgan jarayon</h3>
									<p>Davomat, to'lov va o'sish ko'rsatkichlari bir tizimda ko'rinadi.</p>
								</div>
							</article>
							<article className='landing-reveal reveal-up' style={{ '--reveal-delay': '180ms' }}>
								<Icon name='support_agent' />
								<div>
									<h3>Reception orqali tezkor aloqa</h3>
									<p>Yangi so'rovlar reception paneliga tushadi va tezda ko'rib chiqiladi.</p>
								</div>
							</article>
						</div>
					</div>
				</section>

				<section className='landing-pro-band'>
					<div className='landing-pro-section-head landing-reveal reveal-up'>
						<span>Afzalliklar</span>
						<h2>Nima uchun ILM NEST?</h2>
					</div>
					<div className='landing-pro-feature-grid'>
						{[
							['verified', "Tartibli ta'lim", "Dars jarayoni, davomat va to'lovlar bitta tizim orqali nazorat qilinadi."],
							['school', 'Kuchli ustozlar', "Har bir yo'nalishda o'quvchiga tushunarli, bosqichma-bosqich yondashuv beriladi."],
							['monitoring', "Natija ko'rinadi", "Oylik holat, qarzdorlik, jadval va bildirishnomalar ochiq ko'rinadi."],
						].map((item, index) => (
							<article className='landing-pro-feature landing-reveal reveal-up' style={{ '--reveal-delay': `${index * 90}ms` }} key={item[1]}>
								<Icon name={item[0]} />
								<h3>{item[1]}</h3>
								<p>{item[2]}</p>
							</article>
						))}
					</div>
				</section>

				<section className='landing-pro-courses' id='courses'>
					<div className='landing-pro-section-head landing-reveal reveal-up'>
						<span>Yo'nalishlar</span>
						<h2>Sizga mos yo'nalishni tanlang</h2>
					</div>
					<div className='landing-pro-course-grid'>
						{courseOptions.length ? courseOptions.map((course, index) => (
							<article
								key={`${course.id || course.title}-${index}`}
								className='landing-pro-course landing-reveal reveal-zoom'
								style={{ '--reveal-delay': `${Math.min(index, 5) * 80}ms` }}
								role='button'
								tabIndex={0}
								onClick={() => setSelectedCourse(course)}
								onKeyDown={event => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault()
										setSelectedCourse(course)
									}
								}}
							>
								<div className='landing-pro-course-icon'><Icon name={getCourseIconByTitle(course.title)} /></div>
								<h3>{course.title}</h3>
								<p>{course.schedule || "Jadval va guruh ma'lumotlari reception orqali aniqlashtiriladi."}</p>
								<div className='landing-pro-course-bottom'>
									<span>Oylik to'lov</span>
									<strong>{formatMoney(course.monthlyFee)}</strong>
								</div>
								<div className='landing-pro-course-actions'>
									<button type='button' onClick={event => { event.stopPropagation(); setSelectedCourse(course) }}>Batafsil</button>
									<button type='button' onClick={event => { event.stopPropagation(); handleCourseEnroll(course) }}>Yozilish</button>
								</div>
							</article>
						)) : (
							<div className='landing-pro-course-empty landing-reveal reveal-up'>
								<Icon name='school' />
								<h3>Hozircha kurs qo'shilmagan</h3>
								<p>Director panelida kurs yaratilsa, shu yerda nomi va narxi bilan avtomatik chiqadi.</p>
							</div>
						)}
					</div>
				</section>

				<section className='landing-pro-gallery'>
					<div className='landing-pro-section-head center landing-reveal reveal-up'>
						<span>Atmosfera</span>
						<h2>Bizning bino va sharoitlar</h2>
					</div>
					<div className='landing-pro-gallery-grid'>
						<div className='landing-pro-gallery-item large landing-reveal reveal-left'>
							<img src='https://lh3.googleusercontent.com/aida-public/AB6AXuCiC-qOhjEzbEq1qzmZoEZ241r7ffUOnPfaxs8gHQREv6eGSUfWUi1TQi3tSZ_gfY5ysceQ-6T6t_vUMUsBM4MmvjCdPvi0e0USzhUXUAT1wQqWxDEzJZ71b2WhPBqYZRXDt-LCiCeQEeUIt2X4bgv18kDtrjT-k1lr7Uo5S0tTv2G8NGmeyXXM9_xu_cI6ND6MiPaVgquL-vLilMwQ9AOHRVPqWaomg8K0UZigiJ9shiBztwFpGEWMtshO675r83AB9ye4nWuIZV4z' alt='ILM NEST lobby' />
						</div>
						<div className='landing-pro-gallery-item landing-reveal reveal-right' style={{ '--reveal-delay': '110ms' }}>
							<img src='https://lh3.googleusercontent.com/aida-public/AB6AXuCR_IT3CGj4L4UYS2VReFHlrAfYIfV_m5nSlcoT4LM4OzBYNVCx5lpbpLAA1j23Twks7vqUe7KF9rjvjH60wr5xbDUb5uj9YPje_hiBo78rJ4bj4nlGW-DvP0CLbJtL9reqn7y8KLqg13df_UtaE-o656EsvDlJr5wrHNvgK40FYQ5gXlDVR6Vm3SeK7chdaQlMyVRmINcDXuylPw2TbZupMPv4Rhek1wbfabrZTpbBMvNG1NNinBGjdWpZIGSCwnIIHsMrlEId6hsY' alt='ILM NEST classroom' />
						</div>
						<div className='landing-pro-gallery-item landing-reveal reveal-right' style={{ '--reveal-delay': '190ms' }}>
							<img src='https://lh3.googleusercontent.com/aida-public/AB6AXuD0J7emyoE02hQ3SZosD8olTO1uMLvZBNtOt1x2ULM2wgYignBRLpQrKdBTloNxobQLS5ld3NioUCpKnsgPM72Ck1Zs9DAPWaOfihIqJszLBb1y_MtH2TWoTPjJM30cDURbMQGTCD_9GuIcOKpBzVOrJgkshKGKPBk0P2dprDtX0gM2tM43a7pdnoB_77iXUNs9afbHguisGC8eZuK28rEXOaGZ8vL-rLb_yQ5B6bWjt0bWF5TUBIZ1HJcZe0IaXVfvSNwOQ5D6Z4q6' alt='ILM NEST study room' />
						</div>
					</div>
				</section>

				<section className='landing-pro-process'>
					<div className='landing-pro-section-head landing-reveal reveal-up'>
						<span>Jarayon</span>
						<h2>O'qishga kirish sodda</h2>
					</div>
					<div className='landing-pro-process-grid'>
						{[
							['01', "Yo'nalishni tanlang", "Qaysi kurs kerakligini belgilang va qisqa ma'lumot qoldiring."],
							['02', "Reception bog'lanadi", "Administrator vaqt, guruh va ustoz bo'yicha aniqlashtiradi."],
							['03', 'Dars boshlanadi', "O'quvchi tizimga qo'shiladi, davomat va to'lov nazorati yuradi."],
						].map((item, index) => (
							<div className='landing-pro-step landing-reveal reveal-up' style={{ '--reveal-delay': `${index * 95}ms` }} key={item[0]}>
								<span>{item[0]}</span>
								<h3>{item[1]}</h3>
								<p>{item[2]}</p>
							</div>
						))}
					</div>
				</section>

				<section className='landing-pro-location' id='location'>
					<div className='landing-pro-location-copy landing-reveal reveal-left'>
						<span>Manzil</span>
						<h2>ILM NEST bilan bog'laning</h2>
						<p>Andijon viloyati, Qo'rg'ontepa. Reception sizga mos yo'nalish, guruh va dars vaqtini tushuntirib beradi.</p>
						<div className='landing-pro-contact-links'>
							<a href='tel:+998958006500'><Icon name='call' /> +998 95 800 65 00</a>
							<a href='https://t.me/intelligent_edu_uz' target='_blank' rel='noreferrer'><Icon name='send' /> Telegram</a>
							<a href={intelligentMapOpenUrl} target='_blank' rel='noreferrer'><Icon name='map' /> Google Maps</a>
						</div>
					</div>
					<div className='landing-pro-map landing-reveal reveal-right'>
						<iframe title='ILM NEST location map' src={intelligentMapEmbedUrl} loading='lazy' referrerPolicy='no-referrer-when-downgrade' />
					</div>
				</section>

				<section className='landing-pro-cta'>
					<div className='landing-pro-cta-card landing-reveal reveal-zoom'>
						<div className='landing-pro-cta-copy'>
							<span className='landing-pro-cta-kicker'>Cheklovli qabul</span>
							<h2>Kelajakni bugundan boshlang</h2>
							<p>Birinchi sinov darsi bo'yicha ma'lumot oling va o'zingizga mos yo'nalishni reception bilan tanlang.</p>
							<div className='landing-pro-cta-points'>
								<span><b>Real kurs narxlari</b></span>
								<span><b>Reception tezkor aloqasi</b></span>
							</div>
						</div>
						<div className='landing-pro-cta-panel'>
							<div className='landing-pro-cta-panel-top'>
								<Icon name='support_agent' />
								<div>
									<strong>Reception bilan bog'lanish</strong>
									<span>1-2 daqiqa ichida so'rov yuboring</span>
								</div>
							</div>
							<div className='landing-pro-cta-actions'>
								<a href='#aloqa' className='landing-pro-cta-primary'>
									<span>Ro'yxatdan o'tish</span>
									<Icon name='arrow_forward' />
								</a>
								<a href='tel:+998958006500' className='landing-pro-cta-secondary'>
									<Icon name='call' />
									<span>+998 95 800 65 00</span>
								</a>
							</div>
						</div>
					</div>
				</section>

				<section className='landing-pro-contact' id='aloqa'>
					<div className='landing-pro-contact-copy landing-reveal reveal-left'>
						<span>So'rov qoldirish</span>
						<h2>Reception siz bilan bog'lanadi</h2>
						<p>Formani yuborganingizdan keyin murojaat reception paneliga `Yangi` holatda tushadi. Ko'rilgandan keyin admin uni `Ko'rildi` qilib belgilaydi.</p>
					</div>
					<form className='landing-pro-contact-form landing-reveal reveal-right' onSubmit={handleContactSubmit}>
						<label>
							<span>Ism familiya</span>
							<input
								type='text'
								name='fullName'
								placeholder='Mamatov Ozodbek'
								autoComplete='name'
								required
								value={contactForm.fullName}
								onChange={event => setContactForm({ ...contactForm, fullName: event.target.value })}
							/>
						</label>
						<label>
							<span>Telefon raqami</span>
							<input
								type='tel'
								name='phone'
								placeholder='+998 95 800 65 00'
								autoComplete='tel'
								required
								value={contactForm.phone}
								onChange={event => setContactForm({ ...contactForm, phone: formatPhoneInput(event.target.value) })}
							/>
						</label>
						<label>
							<span>Qiziqayotgan yo'nalish</span>
							<select
								name='interest'
								required
								value={contactForm.interest}
								onChange={event => setContactForm({ ...contactForm, interest: event.target.value })}
							>
								<option value=''>Yo'nalishni tanlang</option>
								{courseOptions.map(course => (
									<option key={course.id || course.title} value={course.title}>{course.title}</option>
								))}
							</select>
						</label>
						<label>
							<span>Batafsil tavsif</span>
							<textarea
								name='message'
								placeholder="Qaysi vaqtda o'qimoqchisiz, darajangiz qanday yoki savolingizni yozing"
								required
								value={contactForm.message}
								onChange={event => setContactForm({ ...contactForm, message: event.target.value })}
							/>
						</label>
						<button type='submit' className='marketing-primary-btn'>Yuborish</button>
					</form>
				</section>
			</main>
			{selectedCourse ? (
				<div className='landing-course-modal-backdrop' role='presentation' onClick={() => setSelectedCourse(null)}>
					<div
						className='landing-course-modal'
						role='dialog'
						aria-modal='true'
						aria-labelledby='landing-course-modal-title'
						onClick={event => event.stopPropagation()}
					>
						<button type='button' className='landing-course-modal-close' onClick={() => setSelectedCourse(null)} aria-label='Yopish'>
							<Icon name='close' />
						</button>
						<div className='landing-course-modal-icon'>
							<Icon name={getCourseIconByTitle(selectedCourse.title)} />
						</div>
						<span className='landing-course-modal-kicker'>Kurs haqida</span>
						<h2 id='landing-course-modal-title'>{selectedCourse.title}</h2>
						<p>{selectedCourse.description || selectedCourse.schedule || "Reception bu kurs bo'yicha jadval, guruh va dars boshlanish vaqtini tushuntirib beradi."}</p>
						<div className='landing-course-modal-grid'>
							<div>
								<span>Oylik to'lov</span>
								<strong>{formatMoney(selectedCourse.monthlyFee)}</strong>
							</div>
							<div>
								<span>Jadval</span>
								<strong>{selectedCourse.schedule || 'Reception orqali'}</strong>
							</div>
							<div>
								<span>Ustoz</span>
								<strong>{selectedCourse.teacherName || selectedCourse.teacher || 'Biriktirilmagan'}</strong>
							</div>
						</div>
						<div className='landing-course-modal-actions'>
							<button type='button' className='marketing-link-btn' onClick={() => setSelectedCourse(null)}>Yopish</button>
							<button type='button' className='marketing-primary-btn' onClick={() => handleCourseEnroll(selectedCourse)}>Shu kursga yozilish</button>
						</div>
					</div>
				</div>
			) : null}
			<PublicSiteFooter />
		</div>
	)

	return (
		<div className='marketing-page'>
			<div className='scroll-progress-bar' style={{ width: `${scrollProgress}%` }} />
			<div className='marketing-parallax parallax-one' style={{ transform: `translate3d(0, ${scrollProgress * 0.45}px, 0)` }} />
			<div className='marketing-parallax parallax-two' style={{ transform: `translate3d(0, ${scrollProgress * -0.3}px, 0)` }} />
			<div
				className='marketing-gradient-shift'
				style={{
					opacity: Math.min(0.82, scrollProgress / 130),
					background: `linear-gradient(180deg, rgba(219,234,254,${0.15 + scrollProgress / 400}) 0%, rgba(239,246,255,${0.08 + scrollProgress / 500}) 30%, rgba(255,255,255,0) 100%)`,
				}}
			/>
			<PublicSiteHeader />
			<main className='marketing-main'>
				<RevealSection className='hero-section' as='section'>
					<div className='hero-copy'>
						<span className='hero-badge'>ILM NEST Education Center</span>
						<h1>Qo'rg'ontepadagi zamonaviy o'quv markazi uchun ishonchli va tartibli muhit</h1>
						<p>
							ILM NEST ichida kuchli ustozlar, tartibli nazorat, qulay student
							kabineti va zamonaviy o'quv jarayoni birlashadi. Bu sahifa markaz
							haqida birinchi taassurotni aniq, chiroyli va ishonchli ko'rsatish
							uchun yangidan yig'ilgan.
						</p>
						<div className='hero-actions'>
							<Link to='/student/login' className='marketing-primary-btn'>
								Student kabinet
							</Link>
							<a href='#aloqa' className='marketing-link-btn'>
								Bog'lanish
							</a>
						</div>
						<div className='hero-stats'>
							<div>
								<strong>10+</strong>
								<span>Ta'lim yo'nalishi</span>
							</div>
							<div>
								<strong>3 ta</strong>
								<span>Asosiy panel</span>
							</div>
							<div>
								<strong>24/7</strong>
								<span>Raqamli nazorat</span>
							</div>
						</div>
						<div className='hero-trust-strip'>
							{LANDING_TRUST_ITEMS.map(item => (
								<div key={item} className='hero-trust-chip'>
									<Icon name='check_circle' className='filled-icon' />
									<span>{item}</span>
								</div>
							))}
						</div>
					</div>
					<div className='hero-visual'>
						<div className='hero-panel'>
							<div className='hero-browser-bar'>
								<div className='hero-browser-dots'>
									<span className='window-dot red' />
									<span className='window-dot yellow' />
									<span className='window-dot green' />
								</div>
								<div className='hero-browser-pill'>intelligent.uz/director</div>
							</div>
							<div className='hero-panel-top'>
								<span>Direktor uchun real vaqt analytics</span>
								<Badge tone='success'>Faol tizim</Badge>
							</div>
							<div className='hero-screenshot-frame'>
								<div
									className={heroCursor.active ? 'hero-screenshot-surface active' : 'hero-screenshot-surface'}
									style={{
										'--cursor-x': `${heroCursor.x}%`,
										'--cursor-y': `${heroCursor.y}%`,
									}}
									onMouseMove={handleHeroPointerMove}
									onMouseLeave={handleHeroPointerLeave}
								>
									<img src='/landing-dashboard.png' alt='Intelligent director dashboard preview' />
									<div className='hero-screenshot-shimmer' />
									<div className='hero-screenshot-glass' />
									<div className='hero-screenshot-cursor'>
										<span />
									</div>
								</div>
							</div>
							<div className='hero-metric-grid'>
								<div className='hero-metric-card' style={{ animationDelay: '0s' }}>
									<span>Oylik tushum</span>
									<strong>124.5M UZS</strong>
								</div>
								<div className='hero-metric-card' style={{ animationDelay: '.2s' }}>
									<span>Faol o'quvchilar</span>
									<strong>1,248 ta</strong>
								</div>
								<div className='hero-metric-card' style={{ animationDelay: '.4s' }}>
									<span>Sinovdagilar</span>
									<strong>46 ta</strong>
								</div>
								<div className='hero-metric-card' style={{ animationDelay: '.6s' }}>
									<span>Qarzdorlar</span>
									<strong>84 ta</strong>
								</div>
							</div>
							<div className='hero-live-strip'>
								<div className='hero-live-badge'>
									<span className='live-dot' />
									Real vaqt monitoring
								</div>
								<div className='hero-mini-chart'>
									<span style={{ '--bar-height': '48%' }} />
									<span style={{ '--bar-height': '72%' }} />
									<span style={{ '--bar-height': '58%' }} />
									<span style={{ '--bar-height': '84%' }} />
									<span style={{ '--bar-height': '66%' }} />
								</div>
							</div>
							<div className='hero-mockup-strip'>
								<div className='hero-mockup-card'>
									<strong>Reception</strong>
									<span>Student qo'shish, kurs biriktirish, to'lov qabul qilish</span>
								</div>
								<div className='hero-mockup-card'>
									<strong>Teacher</strong>
									<span>Davomat, guruhlar, history va kunlik nazorat</span>
								</div>
							</div>
							<div className='hero-table-preview'>
								<div className='hero-table-row head'>
									<span>Student</span>
									<span>Status</span>
									<span>Balans</span>
								</div>
								<div className='hero-table-row'>
									<span>Aziz A.</span>
									<span>Faol</span>
									<span>+450 000</span>
								</div>
								<div className='hero-table-row'>
									<span>Malika M.</span>
									<span>Sinov</span>
									<span>0 UZS</span>
								</div>
							</div>
						</div>
					</div>
				</RevealSection>

				<RevealSection className='marketing-section' id='haqimizda' delay={40}>
					<div className='about-shell'>
						<div className='about-visual-stack'>
							<div className='about-hero-card'>
								<div className='about-hero-copy'>
									<span>Biz haqimizda</span>
									<strong>Natijaga ishlaydigan zamonaviy o'quv markazi</strong>
									<p>
										ILM NEST ichida ta'lim faqat dars bilan tugamaydi. Qabul,
										nazorat, student holati va aloqa tizimli ravishda yuritiladi.
									</p>
								</div>
							</div>
							<div className='about-gallery-grid'>
								{LANDING_SPACE_SHOWCASE.map(item => (
									<article key={item.title} className='about-media-card'>
										<div className='about-media-frame'>
											<img src={item.image} alt={item.title} />
										</div>
										<div className='about-media-copy'>
											<strong>{item.title}</strong>
											<p>{item.description}</p>
										</div>
									</article>
								))}
							</div>
						</div>
						<div className='about-copy'>
							<div className='section-heading'>
								<span>Markaz ruhi</span>
								<h2>ILM NEST ichida nazorat, muhit va o'sish bir yo'nalishda ishlaydi</h2>
								<p>
									O'quvchi kirganda markaz tartibini, ota-ona esa ishonchni his
									qilishi kerak. Shu sabab bosh sahifa endi markaz ruhini aniq va
									sotuvchan ko'rsatadigan landing ko'rinishida yig'ildi.
								</p>
							</div>
							<div className='about-point-list'>
								{LANDING_ABOUT_POINTS.map(item => (
									<div key={item.title} className='about-point-card'>
										<div className='about-point-icon'>
											<Icon name='check_circle' className='filled-icon' />
										</div>
										<div>
											<strong>{item.title}</strong>
											<p>{item.description}</p>
										</div>
									</div>
								))}
							</div>
							<div className='about-summary-strip'>
								<div>
									<strong>Offline darslar</strong>
									<span>Tartibli guruhlar va qulay dars muhitida</span>
								</div>
								<div>
									<strong>Digital nazorat</strong>
									<span>Reception, teacher va student kabinet bir tizimda</span>
								</div>
							</div>
						</div>
					</div>
				</RevealSection>

				<RevealSection className='marketing-section' id='yonalishlar' delay={60}>
					<div className='section-heading'>
						<span>Yo'nalishlar</span>
						<h2>ILM NEST o'quv markazida o'qitiladigan fanlar</h2>
						<p>
							Har bir yo'nalish uchun alohida metodika, kuchli ustoz va
							nazoratli o'qish muhiti qurilgan.
						</p>
					</div>
					<div className='course-pill-grid'>
						{LANDING_COURSE_SPOTLIGHTS.map(course => (
							<div key={course.title} className='course-pill-card course-showcase-card'>
								<div className='course-showcase-icon'>
									<Icon name={course.icon} />
								</div>
								<strong>{course.title}</strong>
								<span>{course.subtitle}</span>
								<small>{course.meta}</small>
							</div>
						))}
					</div>
				</RevealSection>

				<RevealSection className='marketing-section' delay={100}>
					<div className='section-heading'>
						<span>Natijalar</span>
						<h2>Raqamlarda ko'rinadigan o'sish va nazorat</h2>
						<p>
							Markaz ichida ta'lim jarayoni, studentlar oqimi va nazorat
							ko'rsatkichlari bir tizimda boshqariladi.
						</p>
					</div>
					<div className='result-counter-grid'>
						<div className='result-counter-card'>
							<strong><CountUp end={1200} suffix='+' /></strong>
							<span>Faol o'quvchilar bilan ishlash sig'imi</span>
						</div>
						<div className='result-counter-card'>
							<strong><CountUp end={92} suffix='%' /></strong>
							<span>Davomat va nazorat samaradorligi</span>
						</div>
						<div className='result-counter-card'>
							<strong><CountUp end={10} suffix='+' /></strong>
							<span>Asosiy fan va yo'nalishlar</span>
						</div>
						<div className='result-counter-card'>
							<strong>24/7</strong>
							<span>Dashboard va student kabinet nazorati</span>
						</div>
					</div>
				</RevealSection>

				<RevealSection className='marketing-section' delay={140}>
					<div className='section-heading'>
						<span>Afzalliklar</span>
						<h2>ILM NESTni tanlashga sabab bo'ladigan asosiy jihatlar</h2>
						<p>
							Markazga kelgan odam faqat fan emas, tartib, qulaylik va ishonchli
							muhitni ham ko'radi.
						</p>
					</div>
					<div className='feature-grid'>
						<div className='feature-card'>
							<Icon name='school' />
							<h3>Kuchli o'quv muhiti</h3>
							<p>Har bir guruhda nazoratli qatnashuv va izchil o'sishga urg'u beriladi.</p>
						</div>
						<div className='feature-card'>
							<Icon name='groups' />
							<h3>Studentga yaqin yondashuv</h3>
							<p>Reception, ustoz va student o'rtasida aloqa uzilmaydi, jarayon aniq bo'ladi.</p>
						</div>
						<div className='feature-card'>
							<Icon name='workspace_premium' />
							<h3>Natijaga yo'nalish</h3>
							<p>Til, matematika va IT yo'nalishlarida real progress ko'rinadigan tizim qurilgan.</p>
						</div>
						<div className='feature-card'>
							<Icon name='support_agent' />
							<h3>Shaffof boshqaruv</h3>
							<p>To'lov, davomat va kundalik holatlar tushunarli boshqariladi va nazoratda turadi.</p>
						</div>
					</div>
				</RevealSection>

				<RevealSection className='marketing-section' id='jarayon' delay={180}>
					<div className='section-heading'>
						<span>Jarayon</span>
						<h2>O'quvchi markazga kirgandan keyingi asosiy yo'l shu tarzda ishlaydi</h2>
						<p>
							Bu blok markazning qanday ishlashini oddiy va ishonchli ko'rsatadi:
							qabul, sinov, nazorat va natija bosqichlari tartib bilan ketadi.
						</p>
					</div>
					<div className='journey-grid'>
						{LANDING_STUDY_FLOW.map((item, index) => (
							<section
								key={item.step}
								className='journey-card'
								style={{ '--journey-delay': `${index * 80}ms` }}
							>
								<div className='journey-step'>{item.step}</div>
								<div className='journey-copy'>
									<h3>{item.title}</h3>
									<p>{item.description}</p>
								</div>
							</section>
						))}
					</div>
				</RevealSection>

				<RevealSection className='marketing-section' id='fikrlar' delay={260}>
					<div className='section-heading'>
						<span>Fikrlar</span>
						<h2>O'quvchilar va ota-onalar ishonchini beradigan tajriba</h2>
					</div>
					<div className='testimonial-carousel'>
						<div
							className='testimonial-track'
							style={{ transform: `translateX(-${testimonialIndex * 100}%)` }}
							onTouchStart={handleTestimonialTouchStart}
							onTouchEnd={handleTestimonialTouchEnd}
						>
							{LANDING_TESTIMONIALS_CLEAN.map(item => (
								<article key={item.name} className='testimonial-card testimonial-slide'>
								<div className='testimonial-head'>
									<div className='testimonial-avatar real-avatar'>
										<img src={item.avatar} alt={item.name} />
									</div>
									<div className='testimonial-stars'>
										<Icon name='star' className='filled-icon' />
										<Icon name='star' className='filled-icon' />
										<Icon name='star' className='filled-icon' />
										<Icon name='star' className='filled-icon' />
										<Icon name='star' className='filled-icon' />
									</div>
								</div>
								<p>"{item.quote}"</p>
								<div className='testimonial-author'>
									<strong>{item.name}</strong>
									<span>{item.role}</span>
								</div>
								<div className='testimonial-outcome'>{item.outcome}</div>
								</article>
							))}
						</div>
						<div className='testimonial-controls'>
							<div className='testimonial-dots'>
								{LANDING_TESTIMONIALS_CLEAN.map((item, index) => (
									<button
										key={item.name}
										type='button'
										className={testimonialIndex === index ? 'active' : ''}
										onClick={() => setTestimonialIndex(index)}
										aria-label={`${item.name} fikrini ko'rsatish`}
									/>
								))}
							</div>
							<div className='testimonial-arrow-row'>
								<button
									type='button'
									className='testimonial-arrow'
									onClick={() =>
										setTestimonialIndex(current =>
											current === 0 ? LANDING_TESTIMONIALS_CLEAN.length - 1 : current - 1,
										)
									}
									aria-label='Oldingi fikr'
								>
									<Icon name='west' />
								</button>
								<button
									type='button'
									className='testimonial-arrow'
									onClick={() =>
										setTestimonialIndex(current =>
											(current + 1) % LANDING_TESTIMONIALS_CLEAN.length,
										)
									}
									aria-label='Keyingi fikr'
								>
									<Icon name='east' />
								</button>
							</div>
						</div>
					</div>
				</RevealSection>

				{false ? (
					<RevealSection className='marketing-section marketing-gallery-section' delay={240}>
					<div className='section-heading'>
						<span>Gallery</span>
						<h2>Platformaning real ishchi sahifalari</h2>
						<p>
							Ichki panellar, student kabineti va login oqimi bitta tizimda
							ishlaydigan real product sifatida ko‘rinadi.
						</p>
					</div>
					<div className='gallery-shell'>
						<div
							className='gallery-track'
							style={{ transform: `translateX(-${galleryIndex * 100}%)` }}
						>
							{LANDING_PRODUCT_DEMOS.map(item => (
								<article key={item.title} className='gallery-slide'>
									<ProductDemoSurface item={item} />
								</article>
							))}
						</div>
						<div className='gallery-controls'>
							<div className='gallery-dots'>
								{LANDING_PRODUCT_DEMOS.map((item, index) => (
									<button
										key={item.title}
										type='button'
										className={galleryIndex === index ? 'active' : ''}
										onClick={() => setGalleryIndex(index)}
										aria-label={`${item.title} ni ko'rsatish`}
									/>
								))}
							</div>
							<div className='gallery-arrows'>
								<button
									type='button'
									className='testimonial-arrow'
									onClick={() =>
										setGalleryIndex(current =>
											current === 0 ? LANDING_PRODUCT_DEMOS.length - 1 : current - 1,
										)
									}
									aria-label='Oldingi screenshot'
								>
									<Icon name='west' />
								</button>
								<button
									type='button'
									className='testimonial-arrow'
									onClick={() =>
										setGalleryIndex(current => (current + 1) % LANDING_PRODUCT_DEMOS.length)
									}
									aria-label='Keyingi screenshot'
								>
									<Icon name='east' />
								</button>
							</div>
						</div>
					</div>
					</RevealSection>
				) : null}

				<RevealSection className='marketing-section' delay={300}>
					<div className='cta-section'>
						<div>
							<span className='hero-badge'>Boshlash vaqti keldi</span>
							<h2>ILM NEST bilan tartibli, nazoratli va yoqimli o'qish muhitiga qo'shiling</h2>
							<p>
								Markaz bilan tanishing, yo'nalishingizni tanlang va reception bilan
								bog'lanib o'qishni boshlash uchun birinchi qadamni qo'ying.
							</p>
						</div>
						<div className='cta-actions'>
							<Link to='/student/login' className='marketing-primary-btn'>
								Student kabinet
							</Link>
							<Link to='/admins' className='marketing-link-btn'>
								Admin login
							</Link>
						</div>
					</div>
				</RevealSection>

				<section className='marketing-section'>
					<div className='section-heading'>
						<span>FAQ</span>
						<h2>Ko'p beriladigan savollar</h2>
					</div>
					<div className='faq-list'>
						{LANDING_FAQS.map((item, index) => (
							<button
								key={item.question}
								type='button'
								className={activeFaq === index ? 'faq-item active' : 'faq-item'}
								onClick={() => setActiveFaq(current => (current === index ? -1 : index))}
							>
								<div className='faq-head'>
									<strong>{item.question}</strong>
									<Icon name={activeFaq === index ? 'remove' : 'add'} />
								</div>
								{activeFaq === index ? <p>{item.answer}</p> : null}
							</button>
						))}
					</div>
				</section>

				<RevealSection className='marketing-section contact-section' id='aloqa' delay={340}>
					<div className='contact-grid'>
						<div className='contact-card'>
							<div className='section-heading'>
								<span>Aloqa</span>
								<h2>Biz bilan bog'laning</h2>
								<p>
									Qaysi yo'nalish sizga mos ekanini aniqlash, darslar haqida
									ma'lumot olish yoki student kabinet bo'yicha savol berish
									uchun formani to'ldiring.
								</p>
							</div>
							<div className='contact-info-row'>
								<div className='contact-info-chip'>
									<Icon name='support_agent' />
									<div>
										<strong>Reception bilan aloqa</strong>
										<span>So'rov reception paneliga real vaqt tushadi</span>
									</div>
								</div>
								<div className='contact-info-chip'>
									<Icon name='schedule' />
									<div>
										<strong>Ish vaqti</strong>
										<span>Dushanba - Shanba, 08:00 - 20:00</span>
									</div>
								</div>
							</div>
							<form className='contact-form' onSubmit={handleContactSubmit}>
								<input
									placeholder='F.I.Sh'
									value={contactForm.fullName}
									onChange={event => setContactForm({ ...contactForm, fullName: event.target.value })}
								/>
								<input
									placeholder='+998 90 123 45 67'
									value={contactForm.phone}
									onChange={event => setContactForm({ ...contactForm, phone: formatPhoneInput(event.target.value) })}
								/>
								<textarea
									placeholder="Savolingiz yoki qiziqqan yo'nalishingizni yozing"
									value={contactForm.message}
									onChange={event => setContactForm({ ...contactForm, message: event.target.value })}
								/>
								<button className='marketing-primary-btn'>So'rov yuborish</button>
							</form>
						</div>
						<div className='location-card'>
							<div className='section-heading'>
								<span>Location</span>
								<h2>Bizning joylashuv</h2>
							</div>
							<div className='map-placeholder'>
								<iframe
									title='Intelligent location'
									src='https://maps.google.com/maps?q=Qorgontepa%20Andijon&t=&z=13&ie=UTF8&iwloc=&output=embed'
									loading='lazy'
									referrerPolicy='no-referrer-when-downgrade'
								/>
								<div className='map-overlay-card'>
									<div className='map-pin'>
										<Icon name='location_on' />
									</div>
									<div>
										<strong>ILM NEST Education Center</strong>
										<span>Andijon viloyati, Qo'rg'ontepa tumani</span>
										<a
											href='https://maps.google.com/?daddr=Qorgontepa%20Andijon'
											target='_blank'
											rel='noreferrer'
											className='map-route-btn'
										>
											Yo'l ko'rsatish
										</a>
									</div>
								</div>
							</div>
							<div className='location-actions'>
								<a href='tel:+998901234567' className='location-action-chip'>
									<Icon name='call' />
									<span>Qo'ng'iroq</span>
								</a>
								<a href='https://t.me/intelligent_support' target='_blank' rel='noreferrer' className='location-action-chip'>
									<Icon name='send' />
									<span>Telegram</span>
								</a>
								<a href='https://instagram.com/intelligent_edu' target='_blank' rel='noreferrer' className='location-action-chip'>
									<Icon name='photo_camera' />
									<span>Instagram</span>
								</a>
							</div>
						</div>
					</div>
				</RevealSection>
			</main>
			<PublicSiteFooter />
		</div>
	)
}

function DevelopersPage() {
	const [developers, setDevelopers] = useState([])

	useEffect(() => {
		api.getDevelopersPublic().then(setDevelopers).catch(() => setDevelopers([]))
	}, [])

	return (
		<div className='marketing-page developers-standalone-page'>
			<main className='marketing-main developers-page'>
				<section className='developers-hero'>
					<div className='developers-hero-copy'>
						<span>Team</span>
						<h1>Dasturchilar jamoasi</h1>
						<p>
							ILM-NEST O'quv markazi loyihasining dizayn, frontend va backend arxitekturasi
							ustida ishlayotgan jamoa a'zolari bilan tanishing.
						</p>
					</div>
					<div className='developers-hero-stats'>
						<div>
							<strong>3 ta</strong>
							<span>Asosiy mutaxassis</span>
						</div>
						<div>
							<strong>Full-stack</strong>
							<span>Jamoaviy ishlab chiqish</span>
						</div>
					</div>
				</section>
				<div className='developer-card-grid'>
					{developers.map(developer => (
						<Link key={developer.slug} to={`/dasturchilar/${developer.slug}`} className='developer-card'>
							<div className='developer-avatar'>
								{developer.image ? <img src={resolveAssetUrl(developer.image)} alt={developer.fullName} /> : <span>{getInitials(developer.fullName)}</span>}
							</div>
							<div className='developer-card-copy'>
								<div className='developer-card-top'>
									<h3>{developer.fullName}</h3>
								</div>
								<strong>{developer.roleTitle}</strong>
								<p>{developer.shortBio}</p>
								<div className='developer-skill-row'>
									{developer.skills.slice(0, 4).map(skill => (
										<span key={skill}>{skill}</span>
									))}
								</div>
							</div>
						</Link>
					))}
				</div>
			</main>
		</div>
	)
}

function DeveloperDetailPage() {
	const { slug } = useParams()
	const [developer, setDeveloper] = useState(null)

	useEffect(() => {
		api.getDeveloperPublic(slug).then(setDeveloper).catch(() => setDeveloper(null))
	}, [slug])

	if (!developer) {
		return <div className='loading-screen'>Dasturchi ma'lumoti yuklanmoqda...</div>
	}

	return (
		<div className='marketing-page developers-standalone-page'>
			<main className='marketing-main developer-detail-page'>
				<section className='developer-hero' style={developer.bannerImage ? { backgroundImage: `linear-gradient(rgba(10,23,62,.65), rgba(10,23,62,.65)), url(${resolveAssetUrl(developer.bannerImage)})` } : undefined}>
					<div className='developer-hero-avatar'>
						{developer.image ? <img src={resolveAssetUrl(developer.image)} alt={developer.fullName} /> : <span>{getInitials(developer.fullName)}</span>}
					</div>
					<div className='developer-hero-copy'>
						<Badge tone='success'>{developer.roleTitle}</Badge>
						<h1>{developer.fullName}</h1>
						<p>{developer.shortBio}</p>
						<div className='developer-link-row'>
							{developer.telegramUrl ? <a href={developer.telegramUrl} target='_blank' rel='noreferrer'>Telegram</a> : null}
							{developer.instagramUrl ? <a href={developer.instagramUrl} target='_blank' rel='noreferrer'>Instagram</a> : null}
							{developer.githubUrl ? <a href={developer.githubUrl} target='_blank' rel='noreferrer'>GitHub</a> : null}
							{developer.websiteUrl ? <a href={developer.websiteUrl} target='_blank' rel='noreferrer'>Website</a> : null}
						</div>
					</div>
				</section>

				<section className='developer-detail-grid'>
					<div className='card developer-about-card'>
						<h3>Biografiya</h3>
						<p>{developer.bio || developer.shortBio}</p>
					</div>
					<div className='card developer-skill-card'>
						<h3>Ko'nikmalar</h3>
						<div className='developer-skill-row'>
							{developer.skills.map(skill => (
								<span key={skill}>{skill}</span>
							))}
						</div>
					</div>
					{developer.certificateImage ? (
						<div className='card developer-certificate-card'>
							<h3>Sertifikat</h3>
							<img src={resolveAssetUrl(developer.certificateImage)} alt='Sertifikat' />
						</div>
					) : null}
				</section>
			</main>
		</div>
	)
}

function DeveloperPortalPage() {
	const [auth, setAuth] = useState(() => {
		const raw = localStorage.getItem('intelligent-developer-auth')
		return raw ? JSON.parse(raw) : null
	})
	const [loginForm, setLoginForm] = useState({ username: '', password: '' })
	const [profile, setProfile] = useState(null)
	const [form, setForm] = useState(null)
	const [uploadNames, setUploadNames] = useState({
		image: '',
		bannerImage: '',
		certificateImage: '',
	})
	const [showPassword, setShowPassword] = useState(false)
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (!auth?.token) {
			setProfile(null)
			setForm(null)
			return
		}
		api.getDeveloperMe(auth.token).then(data => {
			setProfile(data)
			setForm({
				username: data.username || '',
				fullName: data.fullName || '',
				age: data.age || '',
				roleTitle: data.roleTitle || '',
				shortBio: data.shortBio || '',
				bio: data.bio || '',
				skills: (data.skills || []).join(', '),
				telegramUrl: data.telegramUrl || '',
				instagramUrl: data.instagramUrl || '',
				githubUrl: data.githubUrl || '',
				websiteUrl: data.websiteUrl || '',
				image: data.image || '',
				bannerImage: data.bannerImage || '',
				certificateImage: data.certificateImage || '',
				password: '',
			})
		}).catch(() => {
			localStorage.removeItem('intelligent-developer-auth')
			setAuth(null)
		})
	}, [auth?.token])

	async function handleDeveloperLogin(event) {
		event.preventDefault()
		setLoading(true)
		try {
			const data = await api.developerLogin(loginForm)
			localStorage.setItem('intelligent-developer-auth', JSON.stringify(data))
			setAuth(data)
			await showSuccess('Kirish muvaffaqiyatli', 'Portfolio panel ochildi')
		} catch (err) {
			await showError(err.message)
		} finally {
			setLoading(false)
		}
	}

	async function handleAssetChange(field, file) {
		if (!file) return
		const value = await readFileAsDataUrl(file)
		setForm(current => ({ ...current, [field]: value }))
		setUploadNames(current => ({ ...current, [field]: file.name }))
	}

	async function handleDeveloperSave(event) {
		event.preventDefault()
		setLoading(true)
		try {
			const payload = {
				...form,
				skills: String(form.skills || '')
					.split(',')
					.map(item => item.trim())
					.filter(Boolean),
			}
			const data = await api.updateDeveloperMe(auth.token, payload)
			setProfile(data)
			setForm(current => ({ ...current, password: '' }))
			await showSuccess('Saqlandi', "Portfolio ma'lumotlari yangilandi")
		} catch (err) {
			await showError(err.message)
		} finally {
			setLoading(false)
		}
	}

	if (!auth) {
		return (
			<div className='login-screen login-screen-admin'>
				<main className='admin-login-wrap'>
					<div className='admin-brand'>
						<div className='admin-brand-icon'>
							<Icon name='code' className='filled-icon' />
						</div>
						<span className='admin-brand-text'>Dasturchilar Paneli</span>
					</div>
					<div className='admin-login-card'>
						<div className='admin-login-copy'>
							<h2>Portfolio login</h2>
							<p>Faqat o'zingizning sahifangizni boshqarish uchun kiring.</p>
						</div>
						<form className='admin-login-form' onSubmit={handleDeveloperLogin}>
							<div className='admin-field-group'>
								<label>Login</label>
								<div className='admin-input-shell'>
									<Icon name='person' className='admin-input-icon' />
									<input value={loginForm.username} onChange={event => setLoginForm({ ...loginForm, username: event.target.value })} />
								</div>
							</div>
							<div className='admin-field-group'>
								<label>Parol</label>
								<div className='admin-input-shell'>
									<Icon name='lock' className='admin-input-icon' />
									<input type={showPassword ? 'text' : 'password'} value={loginForm.password} onChange={event => setLoginForm({ ...loginForm, password: event.target.value })} />
									<button type='button' className='admin-visibility-btn' onClick={() => setShowPassword(value => !value)}>
										<Icon name={showPassword ? 'visibility_off' : 'visibility'} className='admin-input-icon' />
									</button>
								</div>
							</div>
							<button className='admin-submit-btn' disabled={loading}>
								{loading ? 'Kirilmoqda...' : 'Kirish'}
							</button>
						</form>
					</div>
				</main>
			</div>
		)
	}

	if (!form || !profile) {
		return <div className='loading-screen'>Portfolio panel yuklanmoqda...</div>
	}

	return (
		<div className='developer-portal-page'>
			<div className='developer-portal-head'>
				<div>
					<h1>{profile.fullName} paneli</h1>
					<p>Faqat o'zingizning portfolio kartangizni va batafsil sahifangizni boshqarasiz.</p>
				</div>
				<div className='developer-portal-actions'>
					<Link to={`/dasturchilar/${profile.slug}`} className='marketing-link-btn'>
						Public sahifa
					</Link>
					<button type='button' className='marketing-primary-btn' onClick={() => {
						localStorage.removeItem('intelligent-developer-auth')
						setAuth(null)
					}}>
						Chiqish
					</button>
				</div>
			</div>

			<form className='developer-portal-form' onSubmit={handleDeveloperSave}>
				<div className='developer-portal-grid'>
					<section className='card settings-card'>
						<h3>Asosiy ma'lumotlar</h3>
						<div className='modal-form'>
							<div className='field-grid'>
								<div>
									<label>Login</label>
									<input value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} />
								</div>
								<div>
									<label>F.I.Sh</label>
									<input value={form.fullName} onChange={event => setForm({ ...form, fullName: event.target.value })} />
								</div>
								<div>
									<label>Yosh</label>
									<input value={form.age} onChange={event => setForm({ ...form, age: event.target.value })} />
								</div>
								<div>
									<label>Kim bo'lib ishlaydi</label>
									<input value={form.roleTitle} onChange={event => setForm({ ...form, roleTitle: event.target.value })} />
								</div>
							</div>
							<div>
								<label>Qisqa tafsif</label>
								<input value={form.shortBio} onChange={event => setForm({ ...form, shortBio: event.target.value })} />
							</div>
							<div>
								<label>Batafsil tafsif</label>
								<textarea className='developer-textarea' value={form.bio} onChange={event => setForm({ ...form, bio: event.target.value })} />
							</div>
							<div>
								<label>Skillar (vergul bilan)</label>
								<input value={form.skills} onChange={event => setForm({ ...form, skills: event.target.value })} />
							</div>
							<div>
								<label>Yangi parol</label>
								<input type='password' value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} />
							</div>
						</div>
					</section>

					<section className='card settings-card'>
						<h3>Linklar va media</h3>
						<div className='modal-form'>
							<div className='field-grid'>
								<div>
									<label>Telegram</label>
									<input value={form.telegramUrl} onChange={event => setForm({ ...form, telegramUrl: event.target.value })} />
								</div>
								<div>
									<label>Instagram</label>
									<input value={form.instagramUrl} onChange={event => setForm({ ...form, instagramUrl: event.target.value })} />
								</div>
								<div>
									<label>GitHub</label>
									<input value={form.githubUrl} onChange={event => setForm({ ...form, githubUrl: event.target.value })} />
								</div>
								<div>
									<label>Website</label>
									<input value={form.websiteUrl} onChange={event => setForm({ ...form, websiteUrl: event.target.value })} />
								</div>
							</div>
							<div className='field-grid'>
								<div>
									<label>Profil rasmi</label>
									<label className='developer-upload-card'>
										<input type='file' accept='image/*' onChange={event => handleAssetChange('image', event.target.files?.[0])} />
										<div className='developer-upload-icon'>
											<Icon name='upload' />
										</div>
										<div className='developer-upload-copy'>
											<strong>Profil rasmini yuklash</strong>
											<span>{uploadNames.image || (form.image ? 'Rasm biriktirilgan' : 'PNG, JPG yoki WEBP')}</span>
										</div>
									</label>
								</div>
								<div>
									<label>Banner rasmi</label>
									<label className='developer-upload-card'>
										<input type='file' accept='image/*' onChange={event => handleAssetChange('bannerImage', event.target.files?.[0])} />
										<div className='developer-upload-icon'>
											<Icon name='image' />
										</div>
										<div className='developer-upload-copy'>
											<strong>Banner yuklash</strong>
											<span>{uploadNames.bannerImage || (form.bannerImage ? 'Banner biriktirilgan' : 'Hero fon rasmi uchun')}</span>
										</div>
									</label>
								</div>
								<div>
									<label>Sertifikat rasmi</label>
									<label className='developer-upload-card'>
										<input type='file' accept='image/*' onChange={event => handleAssetChange('certificateImage', event.target.files?.[0])} />
										<div className='developer-upload-icon'>
											<Icon name='workspace_premium' />
										</div>
										<div className='developer-upload-copy'>
											<strong>Sertifikat yuklash</strong>
											<span>{uploadNames.certificateImage || (form.certificateImage ? 'Sertifikat biriktirilgan' : 'Diplom yoki sertifikat rasmi')}</span>
										</div>
									</label>
								</div>
							</div>
						</div>
					</section>
				</div>
				<div className='developer-portal-submit'>
					<button className='marketing-primary-btn' disabled={loading}>
						{loading ? 'Saqlanmoqda...' : "Ma'lumotlarni saqlash"}
					</button>
				</div>
			</form>
		</div>
	)
}

function StudentLoginPage({ onLogin }) {
	const [searchParams] = useSearchParams()
	const [studentForm, setStudentForm] = useState({ phone: '', password: '' })
	const [loading, setLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)

	useEffect(() => {
		const phone = searchParams.get('phone') || ''
		const password = searchParams.get('password') || ''
		const access = searchParams.get('access') || ''
		if (access) return
		if (phone || password) {
			setStudentForm({
				phone: phone ? formatPhoneInput(phone) : '',
				password: password || '',
			})
		}
	}, [searchParams])

	async function handleStudentLogin(event) {
		event.preventDefault()
		setLoading(true)
		try {
			const data = await api.studentLogin(studentForm)
			onLogin(data)
		} catch (err) {
			await showError(err.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='login-screen login-screen-admin'>
			<main className='admin-login-wrap'>
				<div className='admin-brand'>
					<div className='admin-brand-icon'>
						<img src='/ilmnest.jpg' alt='ILM NEST logo' className='admin-brand-logo-image' />
					</div>
					<span className='admin-brand-text'>ILM NEST</span>
				</div>

				<div className='admin-login-card'>
					<div className='admin-login-copy'>
						<h2>Xush kelibsiz!</h2>
						<p>Student kabinetga telefon va parol bilan kiring. Default parol: 12345678</p>
					</div>

					<form className='admin-login-form' onSubmit={handleStudentLogin}>
						<div className='admin-field-group'>
							<label htmlFor='student-phone'>Telefon raqam</label>
							<div className='admin-input-shell'>
								<Icon name='call' className='admin-input-icon' />
								<input
									id='student-phone'
									placeholder='+998932303410'
									value={studentForm.phone}
									onChange={event =>
										setStudentForm({
											...studentForm,
											phone: formatPhoneInput(event.target.value),
										})
									}
								/>
							</div>
						</div>

						<div className='admin-field-group'>
							<label htmlFor='student-password'>Parol</label>
							<div className='admin-input-shell'>
								<Icon name='lock' className='admin-input-icon' />
								<input
									id='student-password'
									type={showPassword ? 'text' : 'password'}
									placeholder='********'
									value={studentForm.password}
									onChange={event =>
										setStudentForm({ ...studentForm, password: event.target.value })
									}
								/>
								<button
									type='button'
									className='admin-visibility-btn'
									onClick={() => setShowPassword(value => !value)}
								>
									<Icon
										name={showPassword ? 'visibility_off' : 'visibility'}
										className='admin-input-icon'
									/>
								</button>
							</div>
						</div>

						<button className='admin-submit-btn' disabled={loading}>
							{loading ? 'Kutilmoqda...' : 'Kirish'}
						</button>
					</form>

					
				</div>
			</main>
		</div>
	)
}

function AdminLoginPage({ onLogin }) {
	const [staffForm, setStaffForm] = useState({
		username: '',
		password: '',
	})
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)

	async function handleStaffLogin(event) {
		event.preventDefault()
		setLoading(true)
		setError('')
		try {
			const data = await api.login(staffForm)
			onLogin(data)
		} catch (err) {
			setError(err.message)
			await showError(err.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='login-screen login-screen-admin'>
			<main className='admin-login-wrap'>
				<div className='admin-brand'>
					<div className='admin-brand-icon'>
						<img src='/ilmnest.jpg' alt='ILM NEST logo' className='admin-brand-logo-image' />
					</div>
					<span className='admin-brand-text'>ILM NEST</span>
				</div>

				<div className='admin-login-card'>
					<div className='admin-login-copy'>
						<h2>Xush kelibsiz!</h2>
						<p>ILM NEST tizimiga kiring.</p>
					</div>

					<form className='admin-login-form' onSubmit={handleStaffLogin}>
						<div className='admin-field-group'>
							<label htmlFor='admin-username'>Foydalanuvchi nomi</label>
							<div className='admin-input-shell'>
								<Icon name='person' className='admin-input-icon' />
								<input
									id='admin-username'
									placeholder='@Username'
									value={staffForm.username}
									onChange={event =>
										setStaffForm({ ...staffForm, username: event.target.value })
									}
								/>
							</div>
						</div>

						<div className='admin-field-group'>
							<label htmlFor='admin-password'>Parol</label>
							<div className='admin-input-shell'>
								<Icon name='lock' className='admin-input-icon' />
								<input
									id='admin-password'
									type={showPassword ? 'text' : 'password'}
									placeholder='********'
									value={staffForm.password}
									onChange={event =>
										setStaffForm({ ...staffForm, password: event.target.value })
									}
								/>
								<button
									type='button'
									className='admin-visibility-btn'
									onClick={() => setShowPassword(value => !value)}
								>
									<Icon
										name={showPassword ? 'visibility_off' : 'visibility'}
										className='admin-input-icon'
									/>
								</button>
							</div>
						</div>

						<div className='admin-login-row'>
							<label className='admin-remember'>
								<input type='checkbox' />
								<span>Eslab qolish</span>
							</label>
						</div>

						<button className='admin-submit-btn' disabled={loading}>
							{loading ? 'Kutilmoqda...' : 'Tizimga kirish'}
						</button>
					</form>
				</div>
			</main>
		</div>
	)
}

function StudentRegisterPage() {
	const [searchParams] = useSearchParams()
	const token = searchParams.get('token') || ''
	const [data, setData] = useState(null)
	const [form, setForm] = useState({ phone: '', password: '' })
	const [loading, setLoading] = useState(true)
	const [submitting, setSubmitting] = useState(false)
	const [showPassword, setShowPassword] = useState(false)

	useEffect(() => {
		if (!token) {
			setLoading(false)
			return
		}
		api
			.validateStudentRegisterToken(token)
			.then(result => {
				setData(result)
				setForm(current => ({ ...current, phone: formatPhoneInput(result.phone || '') }))
			})
			.catch(err => showError(err.message))
			.finally(() => setLoading(false))
	}, [token])

	async function handleSubmit(event) {
		event.preventDefault()
		setSubmitting(true)
		try {
			await api.registerStudent({
				token,
				phone: form.phone,
				password: form.password,
			})
			await showSuccess("Ro'yxatdan o'tildi", 'Endi student login orqali tizimga kirishingiz mumkin')
		} catch (err) {
			await showError(err.message)
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className='login-screen login-screen-admin'>
			<main className='admin-login-wrap'>
				<div className='admin-brand'>
					<div className='admin-brand-icon'>
						<img src='/ilmnest.jpg' alt='ILM NEST logo' className='admin-brand-logo-image' />
					</div>
					<span className='admin-brand-text'>ILM NEST</span>
				</div>
				<div className='admin-login-card'>
					<div className='admin-login-copy'>
						<h2>Ro'yxatdan o'tish</h2>
						<p>Student kabinet uchun hisob yarating.</p>
					</div>
					{loading ? (
						<div className='loading-screen'>Token tekshirilmoqda...</div>
					) : !token || !data ? (
						<div className='form-error'>Token topilmadi yoki yaroqsiz</div>
					) : (
						<form className='admin-login-form' onSubmit={handleSubmit}>
							<div className='admin-field-group'>
								<label>Ism</label>
								<div className='admin-input-shell'>
									<Icon name='person' className='admin-input-icon' />
									<input value={data.firstName} readOnly />
								</div>
							</div>
							<div className='admin-field-group'>
								<label>Familiya</label>
								<div className='admin-input-shell'>
									<Icon name='badge' className='admin-input-icon' />
									<input value={data.lastName} readOnly />
								</div>
							</div>
							<div className='admin-field-group'>
								<label>Telefon</label>
								<div className='admin-input-shell'>
									<Icon name='call' className='admin-input-icon' />
									<input
										value={form.phone}
										onChange={event =>
											setForm({
												...form,
												phone: formatPhoneInput(event.target.value),
											})
										}
									/>
								</div>
							</div>
							<div className='admin-field-group'>
								<label>Parol</label>
								<div className='admin-input-shell'>
									<Icon name='lock' className='admin-input-icon' />
									<input
										type={showPassword ? 'text' : 'password'}
										value={form.password}
										onChange={event =>
											setForm({ ...form, password: event.target.value })
										}
									/>
									<button
										type='button'
										className='admin-visibility-btn'
										onClick={() => setShowPassword(value => !value)}
									>
										<Icon
											name={showPassword ? 'visibility_off' : 'visibility'}
											className='admin-input-icon'
										/>
									</button>
								</div>
							</div>
							<button className='admin-submit-btn' disabled={submitting}>
								{submitting ? 'Saqlanmoqda...' : "Ro'yxatdan o'tish"}
							</button>
						</form>
					)}
					<div className='login-help'>
						<p>
							Hisobingiz bormi?{' '}
							<Link to='/student/login' className='text-link'>
								Student login
							</Link>
						</p>
					</div>
				</div>
			</main>
		</div>
	)
}

function StatCard({
	label,
	value,
	note,
	tone = 'default',
	icon = 'dashboard',
}) {
	return (
		<section className={`kpi-card ${tone}`}>
			<div className='kpi-head'>
				<span>{label}</span>
				<div className={`kpi-icon ${tone}`}>
					<Icon name={icon} />
				</div>
			</div>
			<strong>{value}</strong>
			{note ? (
				<p className={`stat-note stat-note-${tone}`}>
					{note}
				</p>
			) : null}
		</section>
	)
}

function useStudentData(token) {
	const [data, setData] = useState(null)
	useEffect(() => {
		api.getStudentMe(token).then(setData)
	}, [token])
	return data
}

function useReceptionData(token, query = {}) {
	const [students, setStudents] = useState([])
	const search = query.search || ''
	const status = query.status || ''
	const includeArchived = Boolean(query.includeArchived)

	async function reload(next = query) {
		const data = await api.getReceptionStudents(token, next)
		if (Array.isArray(data)) setStudents(data)
		return data
	}

	useEffect(() => {
		let cancelled = false
		async function load() {
			try {
				const data = await api.getReceptionStudents(token, { search, status, includeArchived })
				if (!cancelled && Array.isArray(data)) setStudents(data)
			} catch {
				// Keep the last good data visible if a refresh fails.
			}
		}
		load()
		const interval = window.setInterval(load, 15000)
		return () => {
			cancelled = true
			window.clearInterval(interval)
		}
	}, [token, search, status, includeArchived])

	return { students, reload, setStudents }
}

function usePaymentsData(token) {
	const [payments, setPayments] = useState([])
	const reload = async () => {
		const data = await api.getAllPayments(token)
		if (Array.isArray(data)) setPayments(data)
		return data
	}
	useEffect(() => {
		let cancelled = false
		async function load() {
			try {
				const data = await api.getAllPayments(token)
				if (!cancelled && Array.isArray(data)) setPayments(data)
			} catch {
				// Keep current payments if a poll fails.
			}
		}
		load()
		const interval = window.setInterval(load, 15000)
		return () => {
			cancelled = true
			window.clearInterval(interval)
		}
	}, [token])
	return [payments, setPayments, reload]
}

function StudentDashboardPage({ token }) {
	const data = useStudentData(token)
	if (!data) return <div className='card'>Yuklanmoqda...</div>
	const { profile, payments } = data
	const statusMeta = getStudentStatusMeta(profile.status)
	const debt = Math.max(
		Number(profile.monthlyFee || 0) - Number(profile.balance || 0),
		0,
	)

	return (
		<>
			<section className='student-overview-card'>
				<div className='student-overview-copy'>
					<div className='card-label-row'>
						<span className='card-label'>STUDENT KABINETI</span>
						<Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
					</div>
					<h1>{profile.fullName}</h1>
					<p>
						Kurs: <strong>{profile.courseTitle || '-'}</strong> · Ustoz:{' '}
						<strong>{profile.teacherName || '-'}</strong>
					</p>
					<div className='student-overview-pills'>
						<span className='overview-pill'>
							<Icon name='event_available' />
							Keyingi dars: {profile.nextLessonDate || '-'}
						</span>
						<span className='overview-pill'>
							<Icon name='workspace_premium' />
							Sinov progress: {profile.trialProgress || 0}/
							{profile.trialRequired || 3}
						</span>
					</div>
				</div>
				<div className='student-overview-balance'>
					<span>Joriy balans</span>
					<strong>{formatMoney(profile.balance)}</strong>
					<small>
						{debt > 0
							? `Yopilishi kerak: ${formatMoney(debt)}`
							: "Qarzdorlik yo'q"}
					</small>
				</div>
			</section>

			<div className='student-summary-grid'>
				<StatCard
					label='Status'
					value={statusMeta.label}
					note='Kabinet holati'
					icon='verified_user'
					tone={statusMeta.tone}
				/>
				<StatCard
					label="Oylik to'lov"
					value={formatMoney(profile.monthlyFee)}
					note='Kurs tarifi'
					icon='payments'
				/>
				<StatCard
					label='Sinov progress'
					value={`${profile.trialProgress || 0}/${profile.trialRequired || 3}`}
					note='Dars kuni hisoboti'
					icon='school'
					tone='warning'
				/>
			</div>

			<div className='student-grid'>
				<section className='card balance-box'>
					<div className='card-label-row'>
						<span className='card-label'>MENING BALANSIM</span>
						<Badge tone={statusMeta.tone}>
							{statusMeta.label}
						</Badge>
					</div>
					<div className='student-balance'>{formatMoney(profile.balance)}</div>
					<div className='student-actions'>
						<ActionButton icon='add_circle'>To'ldirish</ActionButton>
						<button type='button' className='square-btn icon-only-btn'>
							<Icon name='history' />
						</button>
					</div>
				</section>

				<section className='card course-box'>
					<span className='card-label'>JORIY KURS</span>
					<h2>{profile.courseTitle}</h2>
					<p className='teacher-line'>Ustoz: {profile.teacherName}</p>
					<div className='course-mini-stats'>
						<div>
							<span>OYLIK TO'LOV</span>
							<strong>{formatMoney(profile.monthlyFee)}</strong>
						</div>
						<div>
							<span>SINOV HOLATI</span>
							<strong>{profile.trialProgress || 0}/{profile.trialRequired || 3}</strong>
						</div>
					</div>
					<div className='student-quick-links'>
						<Link to='/student/schedule' className='ghost-outline link-btn'>
							Jadvalni ko'rish
						</Link>
						<Link
							to='/student/notifications'
							className='ghost-outline link-btn secondary-link-btn'
						>
							Bildirishnomalar
						</Link>
					</div>
				</section>

				<section className='card payment-table-card'>
					<div className='card-head-row'>
						<h3>To'lovlar Tarixi</h3>
						<Link to='/student/payments' className='text-link'>
							Barchasini ko'rish
						</Link>
					</div>
					{payments.length ? (
						<div className='table-shell'>
							<table>
								<thead>
									<tr>
										<th>SANA</th>
										<th>SUMMA</th>
										<th>USUL</th>
										<th>STATUS</th>
										<th>AMAL</th>
									</tr>
								</thead>
								<tbody>
									{payments.map(payment => (
										<tr key={payment.id}>
											<td>{payment.createdAt}</td>
											<td className='amount-cell'>
												{formatMoney(payment.amount)}
											</td>
											<td>{getPaymentMethodMeta(payment.method).shortLabel}</td>
											<td>
												<Badge
													tone={payment.status === 'paid' ? 'success' : 'danger'}
												>
													{payment.status === 'paid'
														? 'Muvaffaqiyatli'
														: payment.status}
												</Badge>
											</td>
											<td className='receipt-cell'>
												<Icon name='receipt_long' />
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<EmptyStateNotice message="To'lovlar tarixi hozircha yo'q." />
					)}
				</section>
			</div>
		</>
	)
}

function StudentAttendancePage({ token }) {
	const [data, setData] = useState(null)
	useEffect(() => {
		api.getStudentAttendance(token).then(setData)
	}, [token])
	if (!data) return <div className='card'>Yuklanmoqda...</div>
	const attendanceByDate = new Map((data.items || []).map(item => [String(item.date).slice(0, 10), item.status]))
	const calendarDays = Array.from({ length: 30 }, (_, index) => {
		const date = new Date()
		date.setDate(date.getDate() - (29 - index))
		const key = formatIsoDate(date)
		return {
			key,
			day: String(date.getDate()).padStart(2, '0'),
			weekday: getShortWeekdayLabel(date),
			status: attendanceByDate.get(key) || 'empty',
		}
	})
	return (
		<>
			<PageHeader title='Davomat' subtitle='Oxirgi 30 kunlik qatnashuv' />
			<div className='three-column-grid'>
				<StatCard label='Davomat foizi' value={`${data.percentage}%`} note="So'nggi 30 kun" icon='leaderboard' />
				<StatCard label='Keldi' value={`${data.last30Days.present} ta`} note='Present' icon='check_circle' />
				<StatCard label='Kelmadi' value={`${data.last30Days.absent} ta`} note='Absent' tone='danger' icon='cancel' />
			</div>
			<section className='card attendance-calendar-card'>
				<div className='card-head-row'>
					<div>
						<h3>Davomat kalendari</h3>
						<p>Oxirgi 30 kun ichida qaysi kuni kelgan yoki kelmagan ko'rinadi</p>
					</div>
				</div>
				<div className='attendance-calendar-grid'>
					{calendarDays.map(day => (
						<div key={day.key} className={`attendance-calendar-day ${day.status}`}>
							<small>{day.weekday}</small>
							<strong>{day.day}</strong>
							<span>{day.status === 'present' ? 'Keldi' : day.status === 'absent' ? 'Kelmadi' : '-'}</span>
						</div>
					))}
				</div>
			</section>
			<section className='card table-card'>
				{data.items.length ? (
					<div className='table-shell responsive-cards'>
						<table>
							<thead>
								<tr>
									<th>Sana</th>
									<th>Holat</th>
								</tr>
							</thead>
							<tbody>
								{data.items.map(item => (
									<tr key={`${item.date}-${item.status}`}>
										<td>{item.date}</td>
										<td data-label="O'quvchi">
											<Badge tone={item.status === 'present' ? 'success' : 'danger'}>
												{item.status === 'present' ? 'Keldi' : 'Kelmadi'}
											</Badge>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<EmptyStateNotice message="Davomat ma'lumoti hozircha yo'q." />
				)}
			</section>
		</>
	)
}

function StudentPaymentsPage({ token }) {
	const [data, setData] = useState(null)
	useEffect(() => {
		api.getStudentPayments(token).then(setData)
	}, [token])
	if (!data) return <div className='card'>Yuklanmoqda...</div>
	function downloadStudentReceipt(payment) {
		const content = [
			'ILM NEST - TOLOV CHEKI',
			'',
			`Sana: ${payment.createdAt}`,
			`Summa: ${formatMoney(payment.amount)}`,
			`Usul: ${getPaymentMethodMeta(payment.method).shortLabel}`,
			`Status: ${payment.status === 'paid' ? 'Muvaffaqiyatli' : payment.status}`,
			`Qabul qildi: ${payment.receivedBy || '-'}`,
			'',
			'Chek avtomatik yaratildi.',
		].join('\n')
		downloadTextFile(`ilm-nest-check-${payment.id}.txt`, content)
	}
	return (
		<>
			<PageHeader title="To'lovlar" subtitle='Barcha payment tarixingiz' />
			<div className='two-column-grid'>
				<StatCard label='Joriy balans' value={formatMoney(data.balance)} note="Hisobingizdagi mablag'" icon='payments' />
				<StatCard label='Qarz' value={formatMoney(data.debt)} note="Agar mavjud bo'lsa" tone={data.debt > 0 ? 'danger' : 'default'} icon='warning' />
			</div>
			<section className='card table-card'>
				{data.items.length ? (
					<div className='student-receipt-grid'>
						{data.items.map(payment => (
							<article key={payment.id} className='student-receipt-card'>
								<div className='student-receipt-top'>
									<div className='receipt-success-icon'>
										<Icon name='check_circle' />
									</div>
									<Badge tone={payment.status === 'paid' ? 'success' : 'danger'}>
										{payment.status === 'paid' ? 'Muvaffaqiyatli' : payment.status}
									</Badge>
								</div>
								<strong>{formatMoney(payment.amount)}</strong>
								<div className='student-receipt-meta'>
									<span>Sana: <b>{payment.createdAt}</b></span>
									<span>Usul: <b>{getPaymentMethodMeta(payment.method).shortLabel}</b></span>
									<span>Qabul qildi: <b>{payment.receivedBy || '-'}</b></span>
								</div>
								<button type='button' className='page-btn secondary' onClick={() => downloadStudentReceipt(payment)}>
									<Icon name='download' />
									Chekni yuklab olish
								</button>
							</article>
						))}
					</div>
				) : (
					<EmptyStateNotice message="To'lov tarixi hozircha yo'q." />
				)}
			</section>
		</>
	)
}

function StudentSchedulePage({ token }) {
	const [data, setData] = useState(null)
	useEffect(() => {
		api.getStudentSchedule(token).then(setData)
	}, [token])
	if (!data) return <div className='card'>Yuklanmoqda...</div>
	return (
		<>
			<PageHeader title='Jadval' subtitle='Haftalik dars jadvali' />
			<section className='card schedule-card'>
				<div className='schedule-card-head'>
					<div>
						<h3>{data.courseTitle}</h3>
						<p>{data.teacherName || "Ustoz biriktirilmagan"}</p>
					</div>
					<Badge tone='success'>Haftalik jadval</Badge>
				</div>
				<div className='course-summary-grid'>
					<div>
						<span>Ustoz</span>
						<strong>{data.teacherName || "Biriktirilmagan"}</strong>
					</div>
					<div>
						<span>Dars vaqti</span>
						<strong>{data.items?.find(item => item.time)?.time || '-'}</strong>
					</div>
					<div>
						<span>Xona</span>
						<strong>{data.room || 'Receptiondan aniqlanadi'}</strong>
					</div>
					<div>
						<span>Keyingi dars</span>
						<strong>{data.nextLessonDate || '-'}</strong>
					</div>
				</div>
				<div className='schedule-week-grid'>
					{data.items.map(item => (
						<div
							key={item.day}
							className={item.isToday ? 'schedule-day-card today' : 'schedule-day-card'}
						>
							<div className='schedule-day-top'>
								<strong>{item.day}</strong>
								{item.isToday ? <span>Bugun</span> : null}
							</div>
							<div className='schedule-day-time'>
								<Icon name='schedule' />
								{item.time || '-'}
							</div>
						</div>
					))}
				</div>
			</section>
		</>
	)
}

function StudentNotificationsPage({ token }) {
	const [items, setItems] = useState([])
	useEffect(() => {
		api.getStudentNotifications(token).then(setItems)
	}, [token])

	async function readNotification(id) {
		await api.readNotification(token, id)
		setItems(current => current.map(item => item.id === id ? { ...item, status: 'read' } : item))
	}

	return (
		<>
			<PageHeader title='Bildirishnomalar' subtitle='Student uchun barcha ogohlantirishlar' />
			<section className='card'>
				<div className='student-notification-list'>
					{items.length ? (
						items.map(item => {
							const text = `${item.title || ''} ${item.message || ''}`.toLowerCase()
							const icon = text.includes('qarz')
								? 'warning'
								: text.includes("to'lov") || text.includes('tolov')
									? 'payments'
									: text.includes('dars')
										? 'event'
										: 'notifications'
							return (
								<button key={item.id} type='button' className={item.status === 'read' ? 'student-notification-item read' : 'student-notification-item'} onClick={() => readNotification(item.id)}>
									<span className='student-notification-icon'><Icon name={icon} /></span>
									<span>
										<strong>{item.title}</strong>
										<small>{item.message}</small>
									</span>
									<Badge tone={item.status === 'read' ? 'gray' : 'warning'}>
										{item.status === 'read' ? "O'qilgan" : 'Yangi'}
									</Badge>
								</button>
							)
						})
					) : (
						<div className='notification-empty'>Bildirishnoma yo'q.</div>
					)}
				</div>
			</section>
		</>
	)
}

function StudentProfilePage({ token }) {
	const [data, setData] = useState(null)
	const [form, setForm] = useState({ password: '' })
	const [complaintForm, setComplaintForm] = useState({ teacherId: '', reason: '' })
	const [complaintSaving, setComplaintSaving] = useState(false)
	useEffect(() => {
		api.getStudentProfile(token).then(profile => {
			setData(profile)
			setComplaintForm(current => ({
				...current,
				teacherId: profile.teacherId ? String(profile.teacherId) : '',
			}))
		})
	}, [token])
	if (!data) return <div className='card'>Yuklanmoqda...</div>

	async function handleSubmit(event) {
		event.preventDefault()
		try {
			await api.updateStudentPassword(token, form)
			setForm({ password: '' })
			await showSuccess('Yangilandi', 'Parol muvaffaqiyatli yangilandi')
		} catch (err) {
			await showError(err.message)
		}
	}

	async function handleComplaintSubmit(event) {
		event.preventDefault()
		if (complaintSaving) return
		setComplaintSaving(true)
		try {
			await api.createStudentComplaint(token, {
				teacherId: complaintForm.teacherId ? Number(complaintForm.teacherId) : data.teacherId,
				reason: complaintForm.reason,
			})
			setComplaintForm(current => ({ ...current, reason: '' }))
			await showSuccess('Yuborildi', 'Shikoyat direktorga yuborildi')
		} catch (err) {
			await showError(err.message)
		} finally {
			setComplaintSaving(false)
		}
	}

	return (
		<>
			<PageHeader
				title='Profil'
				subtitle="Shaxsiy ma'lumotlar va parol boshqaruvi"
			/>
			<section className='card settings-card'>
				<form className='modal-form' onSubmit={handleSubmit}>
					<div className='field-grid'>
					<div>
						<label>F.I.Sh</label>
						<input value={data.fullName} readOnly />
					</div>
					<div>
						<label>Telefon</label>
						<input value={data.phone || ''} readOnly />
					</div>
					<div>
						<label>Kurs</label>
						<input value={data.courseTitle || '-'} readOnly />
					</div>
					<div>
						<label>Ustoz</label>
						<input value={data.teacherName || "Ustoz biriktirilmagan"} readOnly />
					</div>
					<div>
						<label>Yangi parol</label>
						<input
							type='password'
							value={form.password}
							onChange={event => setForm({ password: event.target.value })}
						/>
					</div>
					</div>
					<div className='modal-actions'>
						<span />
						<ActionButton type='submit' icon='save'>Parolni saqlash</ActionButton>
					</div>
				</form>
			</section>
			<section className='card settings-card complaint-card'>
				<div className='card-head-row'>
					<div>
						<h3>Ustoz bo'yicha shikoyat</h3>
						<p>Shikoyat faqat director panelida ko'rinadi va ko'rib chiqiladi.</p>
					</div>
					<Badge tone='warning'>Maxfiy</Badge>
				</div>
				<form className='modal-form' onSubmit={handleComplaintSubmit}>
					<div className='field-grid'>
						<div>
							<label>Ustozni tanlang</label>
							<select
								value={complaintForm.teacherId}
								onChange={event => setComplaintForm(current => ({ ...current, teacherId: event.target.value }))}
							>
								{data.teacherId ? (
									<option value={data.teacherId}>{data.teacherName || 'Biriktirilgan ustoz'}</option>
								) : (
									<option value=''>Ustoz biriktirilmagan</option>
								)}
							</select>
						</div>
						<div className='full-span'>
							<label>Shikoyat sababi</label>
							<textarea
								rows={5}
								value={complaintForm.reason}
								onChange={event => setComplaintForm(current => ({ ...current, reason: event.target.value }))}
								placeholder="Masalan: dars tushuntirish uslubi, kechikish yoki boshqa muammo..."
							/>
						</div>
					</div>
					<div className='modal-actions'>
						<span />
						<ActionButton type='submit' icon='report' disabled={complaintSaving}>
							{complaintSaving ? 'Yuborilmoqda...' : 'Direktorga yuborish'}
						</ActionButton>
					</div>
				</form>
			</section>
		</>
	)
}

function StudentSettingsPage({ token }) {
	const [form, setForm] = useState({ password: '' })

	async function handleSubmit(event) {
		event.preventDefault()
		try {
			await api.updateStudentPassword(token, form)
			setForm({ password: '' })
			await showSuccess('Yangilandi', 'Parol muvaffaqiyatli yangilandi')
		} catch (err) {
			await showError(err.message)
		}
	}

	return (
		<>
			<PageHeader
				title='Sozlamalar'
				subtitle='Til va kabinet sozlamalarini boshqarish'
			/>
			<section className='card settings-card'>
				<h3>Kabinet sozlamalari</h3>
				<div className='language-setting-card'>
					<div>
						<strong>Til sozlamasi</strong>
						<p>Tanlangan til brauzerda saqlanadi va student kabinetida qo'llanadi.</p>
					</div>
					<LanguageSelector />
				</div>
				<AppearanceSettingsCard />
				<form className='modal-form' onSubmit={handleSubmit}>
					<div className='field-grid'>
						<div>
							<label>Yangi parol</label>
							<input
								type='password'
								value={form.password}
								onChange={event => setForm({ password: event.target.value })}
							/>
						</div>
					</div>
					<div className='modal-actions'>
						<span />
						<ActionButton type='submit' icon='save'>Parolni saqlash</ActionButton>
					</div>
				</form>
			</section>
		</>
	)
}

function StudentFormModal({ meta, initialData, onClose, onSubmit }) {
	const initialSchedule = parseScheduleString(initialData.schedule || '')
	const [submitting, setSubmitting] = useState(false)
	const [form, setForm] = useState({
		...initialData,
		status: initialData.status || 'trial',
		trialRequired: Number(initialData.trialRequired || 3),
		billingStartDate: initialData.billingStartDate || '',
		scheduleDays: initialSchedule.days,
	})
	const selectedCourse = meta.courses.find(
		course => Number(course.id) === Number(form.courseId),
	)
	const selectedCourseSchedule = parseScheduleString(selectedCourse?.schedule || '')
	const availableTeachers = meta.teachers.filter(teacher =>
		(teacher.courseIds || []).includes(Number(form.courseId)),
	)

	useEffect(() => {
		if (!availableTeachers.length) return
		const hasSelectedTeacher = availableTeachers.some(
			teacher => Number(teacher.id) === Number(form.teacherId),
		)
		if (!hasSelectedTeacher) {
			setForm(current => ({ ...current, teacherId: availableTeachers[0].id }))
		}
	}, [form.courseId])

	useEffect(() => {
		const parsed = parseScheduleString(selectedCourse?.schedule || '')
		setForm(current => ({
			...current,
			scheduleDays: current.scheduleDays?.length ? current.scheduleDays : parsed.days,
		}))
	}, [selectedCourse?.id])

	return (
		<Modal
			title={initialData.id ? "O'quvchini tahrirlash" : "Yangi o'quvchi"}
			subtitle="Student ma'lumotlarini to'ldiring"
			onClose={onClose}
		>
			<form
				className='modal-form'
				onSubmit={async event => {
					if (submitting) {
						event.preventDefault()
						return
					}
					if (!availableTeachers.length) {
						event.preventDefault()
						showError(
							"Avval director bu kursga mos o'qituvchi biriktirishi kerak",
						)
						return
					}
					setSubmitting(true)
					try {
						await onSubmit(event, {
							...form,
							trialRequired: form.status === 'active' ? 0 : Number(form.trialRequired || 3),
							schedule: buildScheduleString(
								form.scheduleDays,
								selectedCourseSchedule.startTime,
								selectedCourseSchedule.endTime,
							),
						})
					} finally {
						setSubmitting(false)
					}
				}}
			>
				<div className='field-grid'>
					<div>
						<label>F.I.Sh</label>
						<input
							value={form.fullName}
							onChange={e => setForm({ ...form, fullName: e.target.value })}
						/>
					</div>
					<div>
						<label>Telefon</label>
						<input
							value={form.phone}
							onChange={e => setForm({ ...form, phone: e.target.value })}
						/>
					</div>
					<div>
						<label>Kurs</label>
						<select
							value={form.courseId}
							onChange={e =>
								setForm({ ...form, courseId: Number(e.target.value) })
							}
						>
							{meta.courses.map(course => (
								<option key={course.id} value={course.id}>
									{course.title}
								</option>
							))}
						</select>
					</div>
					<div>
						<label>O'qituvchi</label>
						<select
							value={form.teacherId}
							onChange={e =>
								setForm({ ...form, teacherId: Number(e.target.value) })
							}
						>
							{availableTeachers.length ? (
								availableTeachers.map(teacher => (
									<option key={teacher.id} value={teacher.id}>
										{teacher.fullName}
									</option>
								))
							) : (
								<option value=''>Bu kurs uchun ustoz biriktirilmagan</option>
							)}
						</select>
					</div>
					<div>
						<label>Kurs narxi</label>
						<input
							value={
								selectedCourse ? formatMoney(selectedCourse.monthlyFee) : ''
							}
							readOnly
						/>
					</div>
					<div>
						<label>Status</label>
						<select
							value={form.status}
							onChange={e => setForm({ ...form, status: e.target.value })}
						>
							<option value='trial'>Sinov</option>
							<option value='active'>Faol</option>
						</select>
					</div>
					{form.status === 'trial' ? (
						<div>
							<label>Sinov muddati</label>
							<select
								value={form.trialRequired}
								onChange={e => setForm({ ...form, trialRequired: Number(e.target.value) })}
							>
								{[1, 2, 3, 4].map(day => (
									<option key={day} value={day}>
										{day} kun
									</option>
								))}
							</select>
						</div>
					) : null}
					<div className='full-span'>
						<label>Dars kunlari</label>
						<div className='weekday-grid'>
							{WEEKDAY_OPTIONS.map(day => {
								const allowedDays = selectedCourseSchedule.days
								const disabled = allowedDays.length
									? !allowedDays.includes(day.key)
									: false
								return (
									<button
										key={day.key}
										type='button'
										className={
											form.scheduleDays?.includes(day.key)
												? 'weekday-chip active'
												: 'weekday-chip'
										}
										disabled={disabled}
										onClick={() =>
											!disabled &&
											setForm(current => ({
												...current,
												scheduleDays: toggleScheduleDay(
													current.scheduleDays || [],
													day.key,
												),
											}))
										}
									>
										{day.label}
									</button>
								)
							})}
						</div>
					</div>
					<div>
						<label>Oylik boshlanish sanasi</label>
						<input
							type='date'
							value={form.billingStartDate}
							onChange={e =>
								setForm({ ...form, billingStartDate: e.target.value })
							}
						/>
					</div>
					<div>
						<label>Qoidasi</label>
						<input
							value={
								form.status === 'active'
									? "Faol student: oylik to'lov darhol hisoblanadi"
									: `Sinov student: ${form.trialRequired || 3} ta o'qish kuni sinov`
							}
							readOnly
						/>
					</div>
				</div>
				<div className='modal-actions'>
					<button type='button' className='ghost-outline' onClick={onClose}>
						Bekor qilish
					</button>
					<ActionButton type='submit' disabled={submitting}>
						{submitting ? 'Saqlanmoqda...' : 'Saqlash'}
					</ActionButton>
				</div>
			</form>
		</Modal>
	)
}

function groupStudentsByLearningTrack(students = []) {
	const groups = new Map()
	students.forEach(student => {
		const courseTitle = student.courseTitle || "Noma'lum yo'nalish"
		const teacherName = student.teacherName || 'Ustoz biriktirilmagan'
		const schedule = student.schedule || "Vaqt kiritilmagan"
		const courseKey = student.courseId || courseTitle
		const teacherKey = student.teacherId || teacherName
		const key = `${courseKey}__${teacherKey}__${schedule}`
		if (!groups.has(key)) {
			groups.set(key, {
				key,
				courseTitle,
				teacherName,
				schedule,
				label: `${courseTitle} · ${teacherName}`,
				members: [],
			})
		}
		groups.get(key).members.push(student)
	})
	return Array.from(groups.values())
		.map(group => ({
			...group,
			members: [...group.members].sort((a, b) =>
				String(a.fullName || '').localeCompare(String(b.fullName || ''), 'uz'),
			),
		}))
		.sort((a, b) => {
			const byTime = getScheduleSortKey(a.schedule) - getScheduleSortKey(b.schedule)
			if (byTime !== 0) return byTime
			return a.courseTitle.localeCompare(b.courseTitle, 'uz')
		})
}

function buildReceptionTracks(students = [], meta = {}) {
	const courses = Array.isArray(meta?.courses) ? meta.courses.filter(course => course.isActive !== false) : []
	const teachers = Array.isArray(meta?.teachers) ? meta.teachers : []
	const tracks = new Map()
	const semanticIndex = new Map()

	const toSemanticKey = (courseTitle, teacherName, schedule) =>
		[String(courseTitle || '').trim(), String(teacherName || '').trim(), String(schedule || '').trim()]
			.join('__')
			.toLowerCase()

	const pushTrack = ({ key, courseTitle, teacherName, schedule, members }) => {
		const semanticKey = toSemanticKey(courseTitle, teacherName, schedule || "Jadval kiritilmagan")
		const normalizedMembers = Array.isArray(members) ? members : []
		const existingKey = semanticIndex.get(semanticKey)
		if (existingKey && tracks.has(existingKey)) {
			const current = tracks.get(existingKey)
			const mergedMembers = new Map()
			;[...(current.members || []), ...normalizedMembers].forEach(student => {
				if (student?.id) mergedMembers.set(String(student.id), student)
			})
			tracks.set(existingKey, {
				...current,
				courseTitle: current.courseTitle || courseTitle,
				teacherName: current.teacherName || teacherName,
				schedule: current.schedule || schedule || "Jadval kiritilmagan",
				label: `${current.courseTitle || courseTitle} / ${current.teacherName || teacherName}`,
				members: Array.from(mergedMembers.values()).sort((a, b) =>
					String(a.fullName || '').localeCompare(String(b.fullName || ''), 'uz'),
				),
			})
			return
		}
		if (tracks.has(key)) return
		semanticIndex.set(semanticKey, key)
		tracks.set(key, {
			key,
			courseTitle,
			teacherName,
			schedule: schedule || "Jadval kiritilmagan",
			label: `${courseTitle} / ${teacherName}`,
			members: [...normalizedMembers].sort((a, b) =>
				String(a.fullName || '').localeCompare(String(b.fullName || ''), 'uz'),
			),
		})
	}

	courses.forEach(course => {
		const relatedTeachers = teachers.filter(teacher =>
			(teacher.courseIds || []).includes(Number(course.id)),
		)
		const teacherPool = relatedTeachers.length
			? relatedTeachers
			: [{ id: `no-teacher-${course.id}`, fullName: "Ustoz biriktirilmagan" }]

		teacherPool.forEach(teacher => {
			const members = students.filter(student => {
				const sameCourse =
					Number(student.courseId || 0) === Number(course.id) ||
					String(student.courseTitle || '') === String(course.title || '')
				if (!sameCourse) return false
				if (String(teacher.id).startsWith('no-teacher-')) return true
				return (
					Number(student.teacherId || 0) === Number(teacher.id) ||
					String(student.teacherName || '') === String(teacher.fullName || '')
				)
			})

			pushTrack({
				key: `${course.id}__${teacher.id}`,
				courseTitle: course.title || "Noma'lum kurs",
				teacherName: teacher.fullName || "Ustoz biriktirilmagan",
				schedule: members[0]?.schedule || course.schedule || '',
				members,
			})
		})
	})

	groupStudentsByLearningTrack(students).forEach(group => {
		if (!tracks.has(group.key)) {
			pushTrack(group)
		}
	})

	return Array.from(tracks.values())
		.filter(group => Array.isArray(group.members) && group.members.length > 0)
		.sort((a, b) => {
			const byTime = getScheduleSortKey(a.schedule) - getScheduleSortKey(b.schedule)
			if (byTime !== 0) return byTime
			return String(a.courseTitle || '').localeCompare(String(b.courseTitle || ''), 'uz')
		})
}

function isSameRecordId(left, right) {
	if (left === null || left === undefined || right === null || right === undefined) return false
	return String(left) === String(right)
}

function PaymentCollectionWorkspace({
	token,
	students,
	payments,
	initialStudentId = null,
	onPaymentSaved,
	embedded = true,
	lockedGroupKey = '',
	showStudentList = true,
}) {
	const groupedStudents = useMemo(
		() => groupStudentsByLearningTrack(students),
		[students],
	)
	const [groupSearch, setGroupSearch] = useState('')
	const [studentSearch, setStudentSearch] = useState('')
	const [selectedGroupKey, setSelectedGroupKey] = useState(lockedGroupKey || '')
	const [selectedStudentId, setSelectedStudentId] = useState(
		initialStudentId || null,
	)
	const [paymentForm, setPaymentForm] = useState({
		amount: '',
		method: 'manual',
		allowDiscount: false,
		reason: '',
	})
	const [paymentSubmitting, setPaymentSubmitting] = useState(false)
	const paymentSubmittingRef = useRef(false)

	const visibleGroups = useMemo(() => {
		const query = groupSearch.trim().toLowerCase()
		const baseGroups = lockedGroupKey
			? groupedStudents.filter(group => group.key === lockedGroupKey)
			: groupedStudents
		if (!query) return baseGroups
		return baseGroups.filter(group =>
			[group.courseTitle, group.teacherName, group.schedule]
				.filter(Boolean)
				.some(value => String(value).toLowerCase().includes(query)),
		)
	}, [groupSearch, groupedStudents, lockedGroupKey])

	useEffect(() => {
		if (initialStudentId) {
			setSelectedStudentId(initialStudentId)
		}
	}, [initialStudentId])

	useEffect(() => {
		if (!groupedStudents.length) {
			setSelectedGroupKey('')
			return
		}

		if (initialStudentId) {
			const matched = groupedStudents.find(group =>
				group.members.some(student => isSameRecordId(student.id, initialStudentId)),
			)
			if (matched) {
				setSelectedGroupKey(matched.key)
				setSelectedStudentId(initialStudentId)
				return
			}
		}

		if (lockedGroupKey) {
			setSelectedGroupKey(lockedGroupKey)
			return
		}

		if (!selectedGroupKey || !groupedStudents.some(group => group.key === selectedGroupKey)) {
			setSelectedGroupKey(groupedStudents[0].key)
		}
	}, [groupedStudents, initialStudentId, selectedGroupKey, lockedGroupKey])

	const currentGroup =
		groupedStudents.find(group => group.key === (lockedGroupKey || selectedGroupKey)) ||
		visibleGroups.find(group => group.key === selectedGroupKey) ||
		groupedStudents.find(group => group.key === selectedGroupKey) ||
		visibleGroups[0] ||
		null

	const visibleMembers = useMemo(() => {
		const query = studentSearch.trim().toLowerCase()
		const members = currentGroup?.members || []
		if (!query) return members
		return members.filter(student =>
			[
				student.fullName,
				student.phone,
				student.courseTitle,
				student.teacherName,
				getStudyMonthLabel(student),
			]
				.filter(Boolean)
				.some(value => String(value).toLowerCase().includes(query)),
		)
	}, [currentGroup, studentSearch])

	const forcedInitialStudent = useMemo(() => {
		if (showStudentList || !initialStudentId) return null
		return students.find(student => isSameRecordId(student.id, initialStudentId)) || null
	}, [initialStudentId, showStudentList, students])

	useEffect(() => {
		if (forcedInitialStudent) {
			setSelectedStudentId(forcedInitialStudent.id)
			return
		}
		if (!currentGroup?.members?.length) {
			setSelectedStudentId(null)
			return
		}

		const hasCurrent = currentGroup.members.some(
			student => isSameRecordId(student.id, selectedStudentId),
		)
		if (!hasCurrent) {
			setSelectedStudentId(currentGroup.members[0].id)
		}
	}, [currentGroup, forcedInitialStudent, selectedStudentId])

	const selectedStudent =
		forcedInitialStudent ||
		currentGroup?.members.find(student => isSameRecordId(student.id, selectedStudentId)) ||
		visibleMembers[0] ||
		null

	useEffect(() => {
		if (!selectedStudent) return
		setPaymentForm({
			amount: String(Number(selectedStudent.monthlyFee || 0)),
			method: 'manual',
			allowDiscount: false,
			reason: '',
		})
	}, [selectedStudent?.id])

	const minimumAmount = Number(selectedStudent?.monthlyFee || 0)
	const enteredAmount = Number(paymentForm.amount || 0)
	const needsReason = enteredAmount > 0 && enteredAmount < minimumAmount

	async function handleSubmit(event) {
		event.preventDefault()
		if (!selectedStudent) return
		if (paymentSubmittingRef.current) return
		paymentSubmittingRef.current = true
		try {
			setPaymentSubmitting(true)
			const response = await api.createPayment(token, {
				studentId: selectedStudent.id,
				amount: enteredAmount,
				method: paymentForm.method,
				reason: paymentForm.allowDiscount ? paymentForm.reason : '',
				externalId: `manual-${selectedStudent.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			})
			await Swal.fire({
				title: "To'lov qabul qilindi",
				imageUrl: response.receipt.receiptImageDataUrl,
				imageWidth: 520,
				imageAlt: "To'lov cheki",
				html: `
					<div style="text-align:left;line-height:1.7">
						<div><strong>F.I.Sh:</strong> ${response.receipt.fullName}</div>
						<div><strong>Telefon:</strong> ${response.receipt.phone || '-'}</div>
						<div><strong>Summa:</strong> ${formatMoney(response.receipt.amount)}</div>
						<div><strong>Sana:</strong> ${response.receipt.paidAt}</div>
						${response.receipt.reason ? `<div><strong>Sabab:</strong> ${response.receipt.reason}</div>` : ''}
					</div>
				`,
				confirmButtonColor: '#133385',
			})
			setPaymentForm(current => ({
				...current,
				amount: String(minimumAmount),
				method: 'manual',
				allowDiscount: false,
				reason: '',
			}))
			onPaymentSaved?.()
		} catch (err) {
			await showError(err.message)
		} finally {
			paymentSubmittingRef.current = false
			setPaymentSubmitting(false)
		}
	}

	return (
		<div className={embedded ? 'payment-flow-shell' : 'payment-flow-shell inside-modal'}>
			{!lockedGroupKey ? (
				<section className='card payment-flow-card'>
					<div className='attendance-hub-top'>
						<div>
							<span className='card-label'>Yo'nalish va ustoz</span>
							<h3>To'lov qabul qilish oqimi</h3>
							<p>Guruh kartasini oching, studentni tanlang va oylik to'lovni qabul qiling.</p>
						</div>
						<div className='attendance-hub-controls'>
							<input
								type='text'
								placeholder="Kurs, ustoz yoki vaqt bo'yicha qidiring..."
								value={groupSearch}
								onChange={event => setGroupSearch(event.target.value)}
							/>
							<input
								type='text'
								placeholder="Studentni qidiring..."
								value={studentSearch}
								onChange={event => setStudentSearch(event.target.value)}
							/>
						</div>
					</div>
					<div className='attendance-group-grid top-space'>
						{visibleGroups.map(group => (
							<button
								key={group.key}
								type='button'
								className={`attendance-group-card ${selectedGroupKey === group.key ? 'selected' : ''}`}
								onClick={() => {
									setSelectedGroupKey(group.key)
									setStudentSearch('')
								}}
							>
								<div className='attendance-group-head'>
									<div>
										<strong>{group.courseTitle}</strong>
										<span>{group.teacherName}</span>
									</div>
									<Badge tone='default'>{group.members.length} ta</Badge>
								</div>
								<div className='attendance-group-body'>
									<div className='attendance-group-time'>
										<Icon name='schedule' />
										<span>{group.schedule}</span>
									</div>
									<div className='attendance-group-meta'>
										<span>To'lov oynasini oching</span>
										<Icon name='chevron_right' />
									</div>
								</div>
							</button>
						))}
					</div>
				</section>
			) : null}

			{currentGroup && selectedStudent ? (
				<section className='card payment-workspace-card top-space'>
					<div className='payment-workspace-head'>
						<div>
							<span className='card-label'>Tanlangan guruh</span>
							<h3>{currentGroup.courseTitle}</h3>
							<p>
								{currentGroup.teacherName} / {currentGroup.schedule}
							</p>
						</div>
						<Badge tone='default'>{visibleMembers.length} ta student</Badge>
					</div>
					{showStudentList ? (
						<div className='payment-inline-search'>
							<input
								type='text'
								className='toolbar-search'
								placeholder="Studentni qidiring..."
								value={studentSearch}
								onChange={event => setStudentSearch(event.target.value)}
							/>
						</div>
					) : null}
					<div className={showStudentList ? 'payment-workspace-grid' : 'payment-workspace-grid single-column'}>
						{showStudentList ? (
							<div className='payment-student-list'>
							{visibleMembers.map((student, index) => (
								<button
									key={student.id}
									type='button'
									className={`payment-student-card ${selectedStudent?.id === student.id ? 'active' : ''}`}
									onClick={() => setSelectedStudentId(student.id)}
								>
									<div className='student-identity'>
										<div className={`avatar-badge tone-${index % 5}`}>
											{getInitials(student.fullName)}
										</div>
										<div className='course-cell'>
											<strong>{student.fullName}</strong>
											<span>{getStudyMonthLabel(student)}</span>
										</div>
									</div>
									<div className='payment-student-card-meta'>
										<span>{getStudyMonthLabel(student)} / {formatMoney(student.monthlyFee || 0)}</span>
										<Badge tone={getStudentStatusMeta(student.status).tone}>
											{getStudentStatusMeta(student.status).label}
										</Badge>
									</div>
								</button>
							))}
							</div>
						) : null}
						<form className='payment-editor-card' onSubmit={handleSubmit}>
							<div className='payment-editor-head'>
								<div>
									<h4>{selectedStudent.fullName}</h4>
									<p>
										{selectedStudent.phone || '-'} / {getStudyMonthLabel(selectedStudent)}
									</p>
								</div>
								<Badge tone={getStudentStatusMeta(selectedStudent.status).tone}>
									{getStudentStatusMeta(selectedStudent.status).label}
								</Badge>
							</div>
							<div className='payment-editor-summary'>
								<span>Oylik: {formatMoney(minimumAmount)}</span>
								<span>Balans: {formatMoney(selectedStudent.balance || 0)}</span>
								<span>Ustoz: {selectedStudent.teacherName || '-'}</span>
							</div>
							<div className='field-grid compact-grid'>
								<div>
									<label>To'lov summasi</label>
									<input
										type='number'
										min='0'
										value={paymentForm.amount}
										onChange={event =>
											setPaymentForm(current => ({
												...current,
												amount: event.target.value,
											}))
										}
									/>
									<small className='field-help'>
										Minimal summa: {formatMoney(minimumAmount)}
									</small>
								</div>
								<div>
									<label>To'lov usuli</label>
									<select
										value={paymentForm.method}
										onChange={event =>
											setPaymentForm(current => ({
												...current,
												method: event.target.value,
											}))
										}
									>
										<option value='manual'>Naqd pul</option>
										<option value='click'>Click</option>
										<option value='payme'>Payme</option>
									</select>
								</div>
							</div>
							<label className='toggle-row compact'>
								<input
									type='checkbox'
									checked={paymentForm.allowDiscount}
									onChange={event =>
										setPaymentForm(current => ({
											...current,
											allowDiscount: event.target.checked,
											reason: event.target.checked ? current.reason : '',
										}))
									}
								/>
								<div>
									<strong>Sababli to'lov</strong>
									<span>Kamroq summa uchun sabab yozing</span>
								</div>
							</label>
							{paymentForm.allowDiscount ? (
								<div>
									<label>Sabab</label>
									<textarea
										rows='3'
										value={paymentForm.reason}
										onChange={event =>
											setPaymentForm(current => ({
												...current,
												reason: event.target.value,
											}))
										}
										placeholder="Masalan: oilaviy sharoiti sabab vaqtincha qisman to'lov qilindi"
									/>
								</div>
							) : null}
							{needsReason && !paymentForm.allowDiscount ? (
								<div className='form-inline-alert warning'>
									<Icon name='warning' />
									<span>Kurs narxidan kam summa uchun "Sababli to'lov"ni yoqing.</span>
								</div>
							) : null}
							<div className='modal-actions payment-editor-actions'>
								<button
									type='button'
									className='ghost-outline'
									onClick={() =>
										setPaymentForm({
											amount: String(minimumAmount),
											method: 'manual',
											allowDiscount: false,
											reason: '',
										})
									}
								>
									Tozalash
								</button>
								<ActionButton
									type='submit'
									icon='payments'
									disabled={paymentSubmitting}
								>
									{paymentSubmitting ? "Saqlanmoqda..." : "To'lovni saqlash"}
								</ActionButton>
							</div>
						</form>
					</div>
				</section>
			) : null}
		</div>
	)
}

function ReceptionStudentsPage({ token, meta }) {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const [search, setSearch] = useState('')
	const [status, setStatus] = useState('')
	const [includeArchived, setIncludeArchived] = useState(false)
	const studentsTableRef = useRef(null)
	const [renderedStudentRows, setRenderedStudentRows] = useState(0)
	const { students, reload } = useReceptionData(token, {
		search: '',
		status: '',
		includeArchived: false,
	})
	const [studentModal, setStudentModal] = useState(null)
	const [historyModal, setHistoryModal] = useState(null)
	const [studentSaving, setStudentSaving] = useState(false)
	const studentSavingRef = useRef(false)
	const studentBaseCount = Array.isArray(students) ? students.length : 0
	const displayedStudents = useMemo(() => {
		const query = search.trim().toLowerCase()
		return students.filter(student => {
			const statusMatches = !status || student.status === status
			const searchableText = [
				student.fullName,
				student.phone,
				student.courseTitle,
				student.teacherName,
				student.status,
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase()
			const searchMatches = !query || searchableText.includes(query)
			return statusMatches && searchMatches
		})
	}, [students, search, status])
	const visibleStudentCount = Math.max(studentBaseCount, displayedStudents.length, renderedStudentRows)

	useEffect(() => {
		const searchFromUrl = searchParams.get('search') || ''
		setSearch(searchFromUrl)
		reload({ search: searchFromUrl, status, includeArchived })
	}, [searchParams])

	useEffect(() => {
		const timer = window.setTimeout(() => {
			reload({ search, status, includeArchived })
		}, 250)
		return () => window.clearTimeout(timer)
	}, [search, status, includeArchived])

	useEffect(() => {
		const count = studentsTableRef.current?.querySelectorAll('tr')?.length || 0
		setRenderedStudentRows(Math.max(count, displayedStudents.length))
	}, [displayedStudents])

	const emptyForm = {
		fullName: '',
		phone: '',
		courseId: meta.courses[0]?.id || '',
		teacherId: meta.teachers[0]?.id || '',
		balance: 0,
		lastPaymentDate: '',
		status: 'trial',
		trialRequired: 3,
		billingStartDate: '',
		schedule: '',
	}

	async function submitStudent(event, form) {
		event.preventDefault()
		if (studentSavingRef.current) return
		studentSavingRef.current = true
		try {
			setStudentSaving(true)
			if (!form.id) {
				const created = await api.createStudent(token, form)
				await Swal.fire({
					icon: 'success',
					title: "O'quvchi qo'shildi",
					html: `
						<div style="text-align:left;line-height:1.8">
							<div><strong>Telefon:</strong> ${created.phone}</div>
							<div><strong>Default parol:</strong> ${created.defaultPassword}</div>
							<div><strong>Web App havola:</strong><br /><a href="${created.loginUrl}" target="_blank" rel="noreferrer">${created.loginUrl}</a></div>
						</div>
					`,
					confirmButtonColor: '#133385',
				})
				setStudentModal(null)
				reload({ search, status, includeArchived })
				return
			}

			if (form.id) {
				await api.updateStudent(token, form.id, form)
				await showSuccess('Yangilandi', "O'quvchi ma'lumotlari saqlandi")
			} else {
				await api.createStudent(token, form)
				await showSuccess(
					'Qo‘shildi',
					"Yangi o'quvchi muvaffaqiyatli qo'shildi",
				)
			}
			setStudentModal(null)
			reload({ search, status, includeArchived })
		} catch (err) {
			await showError(err.message)
		} finally {
			studentSavingRef.current = false
			setStudentSaving(false)
		}
	}

	async function handleDelete(studentId) {
		const result = await Swal.fire({
			icon: 'warning',
			title: "O'quvchini o'chirasizmi?",
			showCancelButton: true,
			confirmButtonText: "Ha, o'chirish",
			cancelButtonText: 'Bekor qilish',
			confirmButtonColor: '#dc2626',
		})
		if (!result.isConfirmed) return
		await api.deleteStudent(token, studentId)
		reload({ search, status, includeArchived })
		toast.fire({ icon: 'success', title: "O'quvchi o'chirildi" })
	}

	async function handleArchive(studentId) {
		await api.archiveStudent(token, studentId)
		reload({ search, status, includeArchived })
		toast.fire({ icon: 'success', title: 'Student arxivlandi' })
	}

	async function handleHistory(studentId) {
		const history = await api.getStudentHistory(token, studentId)
		setHistoryModal(history)
	}

	async function handleRegisterLink(studentId) {
		try {
			const data = await api.createStudentRegisterToken(token, studentId)
			const qrUrl = data.qrImageDataUrl || getQrPreviewUrl(data.botStartUrl || data.loginUrl || data.registerUrl)
			const directUrl = data.botStartUrl || data.loginUrl || data.registerUrl
			const result = await Swal.fire({
				title: "Student bot havolasi",
				html: `
					<div class="register-link-preview">
						<img class="register-link-qr" src="${qrUrl}" alt="QR code" />
						<div class="register-link-body">
							<div class="register-link-meta"><strong>Default parol:</strong> ${data.defaultPassword || '12345678'}</div>
							<div class="register-link-meta"><strong>QR yangilangan:</strong> ${data.expiresAt}</div>
							<div class="register-link-meta"><strong>Yo'nalish:</strong> Telegram bot orqali ulash</div>
							<a class="register-link-anchor" href="${directUrl}" target="_blank" rel="noreferrer">${directUrl}</a>
						</div>
					</div>
				`,
				showDenyButton: true,
				denyButtonText: 'Linkni nusxalash',
				confirmButtonText: 'Yopish',
				confirmButtonColor: '#133385',
				denyButtonColor: '#1c91d3',
				width: 640,
			})
			if (result.isDenied) {
				await copyText(directUrl)
				toast.fire({ icon: 'success', title: 'Web App linki nusxalandi' })
			}
		} catch (err) {
			await showError(err.message)
		}
	}

	return (
		<>
			<PageHeader
				title="O'quvchilar ro'yxati"
				actions={
					<>
						<ActionButton
							icon='person_add'
							onClick={() => setStudentModal(emptyForm)}
						>
							Yangi o'quvchi
						</ActionButton>
						<ActionButton
							secondary
							icon='account_balance_wallet'
							onClick={() => navigate('/reception/payments')}
						>
							To'lov qabul qilish
						</ActionButton>
					</>
				}
			/>

			<section className='toolbar-card'>
				<div className='filter-chips'>
					{[
						{ key: '', label: 'Barchasi' },
						{ key: 'trial', label: 'Sinovdagilar' },
						{ key: 'active', label: 'Faol' },
						{ key: 'debtor', label: 'Qarzdorlar' },
					].map(item => (
						<button
							key={item.key}
							type='button'
							className={status === item.key ? 'chip active' : 'chip'}
							onClick={() => {
								setStatus(item.key)
								reload({ search, status: item.key, includeArchived })
							}}
						>
							{item.label}
						</button>
					))}
				</div>

				<div className='toolbar-right'>
					<input
						className='toolbar-search'
						placeholder="Ism, telefon yoki kurs bo'yicha qidiring..."
						value={search}
						onChange={event => setSearch(event.target.value)}
					/>
				</div>
			</section>

			<section className='card table-card'>
				<div className='section-title-row compact'>
					<div>
						<span className='card-label'>Ro'yxat</span>
						<h3>O'quvchilar bazasi</h3>
					</div>
					<Badge tone='default'>{visibleStudentCount} ta</Badge>
				</div>
				{displayedStudents.length ? (
					<div className='table-shell responsive-cards'>
						<table>
							<thead>
								<tr>
									<th>O'quvchi</th>
									<th>Kontakt</th>
									<th>Kurs va O'qituvchi</th>
									<th>Balans</th>
									<th>Status</th>
									<th>Amallar</th>
								</tr>
							</thead>
							<tbody ref={studentsTableRef}>
								{displayedStudents.map((student, index) => (
								<tr key={student.id}>
									<td data-label="Kurs va O'qituvchi">
											<div className='student-identity'>
												<div className={`avatar-badge tone-${index % 5}`}>
													{getInitials(student.fullName)}
												</div>
												<div>
													<strong>{student.fullName}</strong>
													<span>{getStudyMonthLabel(student)}</span>
												</div>
											</div>
									</td>
									<td data-label='Balans'>
										<div className='contact-cell'>
											<strong>{student.phone}</strong>
											<span>
												{student.telegramId
													? `Telegram ulangan: ${student.telegramId}`
													: 'Telegram ulanmagan'}
											</span>
										</div>
									</td>
									<td data-label='Status'>
										<div className='course-cell'>
											<strong>{student.courseTitle}</strong>
											<span>{student.teacherName}</span>
										</div>
									</td>
									<td data-label='Amallar'>
										<span
											className={
												student.status === 'active'
													? 'money-chip positive reception-balance-chip'
													: student.status === 'trial'
														? 'money-chip neutral reception-balance-chip'
														: 'money-chip negative reception-balance-chip'
											}
										>
											{student.status === 'active'
												? '+'
												: student.status === 'trial'
													? ''
													: '-'}
											{formatMoney(Math.abs(student.balance))}
										</span>
									</td>
									<td>
										<div className='course-cell'>
											<Badge tone={getStudentStatusMeta(student.status).tone}>
												{getStudentStatusMeta(student.status).label}
											</Badge>
											{student.status === 'trial' ? (
												<span>
													{student.trialProgress || 0}/
													{student.trialRequired || 3} kun
													{student.paymentDueDate
														? ` · Muddat: ${student.paymentDueDate}`
														: ''}
												</span>
											) : student.paymentDueDate ? (
												<span>To'lov muddati: {student.paymentDueDate}</span>
											) : null}
										</div>
									</td>
									<td>
										<div className='table-actions'>
											<button
												type='button'
												onClick={() => setStudentModal({ ...student })}
											>
												<Icon name='edit' />
											</button>
											<button
												type='button'
												onClick={() => handleHistory(student.id)}
											>
												<Icon name='history' />
											</button>
											<button
												type='button'
												onClick={() => handleRegisterLink(student.id)}
											>
												<Icon name='qr_code_2' />
											</button>
											<button
												type='button'
												onClick={() =>
													navigate(`/reception/payments?studentId=${student.id}`)
												}
											>
												<Icon name='person_add' />
											</button>
											{/* <button
												type='button'
												onClick={() => handleArchive(student.id)}
											>
												<Icon name='archive' />
											</button> */}
											<button
												type='button'
												onClick={() => handleDelete(student.id)}
											>
												<Icon name='delete' />
											</button>
										</div>
									</td>
								</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<EmptyStateNotice message="O'quvchilar hozircha yo'q." />
				)}
			</section>

			{studentModal ? (
				<StudentFormModal
					meta={meta}
					initialData={studentModal}
					onClose={() => setStudentModal(null)}
					onSubmit={submitStudent}
				/>
			) : null}

			{historyModal ? (
				<StudentHistoryModal
					history={historyModal}
					onClose={() => setHistoryModal(null)}
				/>
			) : null}
		</>
	)
}

function ReceptionDashboardPage({ token }) {
	const [students, setStudents] = useState([])
	const [payments] = usePaymentsData(token)
	const [contactRequests, setContactRequests] = useState([])
	const navigate = useNavigate()

	const visibleStudents = useMemo(
		() => (Array.isArray(students) ? students : [])
			.filter(student => !student.isArchived && student.status !== 'archived'),
		[students],
	)
	const active = visibleStudents.filter(student => student.status === 'active').length
	const debtors = visibleStudents.filter(student => student.status === 'debtor').length
	const trial = visibleStudents.filter(student => student.status === 'trial').length
	const uniquePaymentStudents = useMemo(
		() => new Set(payments.map(payment => payment.studentId || payment.studentName).filter(Boolean)).size,
		[payments],
	)
	const dashboardStudentCount = Math.max(visibleStudents.length, uniquePaymentStudents)
	const dashboardActiveCount = visibleStudents.length ? active : dashboardStudentCount
	const totalPaymentsToday = useMemo(() => {
		const today = new Date().toLocaleDateString('sv-SE')
		return payments
			.filter(payment => {
				const rawDate = payment.createdAt || payment.paidAt || payment.date
				const parsed = new Date(rawDate)
				const compactDate = String(rawDate || '').match(/\d{4}-\d{2}-\d{2}/)?.[0]
				const paymentDate = Number.isNaN(parsed.getTime())
					? compactDate || String(rawDate || '').slice(0, 10)
					: parsed.toLocaleDateString('sv-SE')
				return paymentDate === today
			})
			.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
	}, [payments])
	const dashboardPaymentsTotal = totalPaymentsToday || payments
		.slice(0, 5)
		.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
	const todayGroups = useMemo(() => {
		const dayKeyMap = ['yak', 'du', 'se', 'chor', 'pay', 'juma', 'shan']
		const todayKey = dayKeyMap[new Date().getDay()]
		return groupStudentsForAttendance(visibleStudents)
			.filter(group => parseScheduleString(group.members[0]?.schedule || '').days.includes(todayKey))
			.sort((a, b) => getScheduleSortKey(a.members[0]?.schedule) - getScheduleSortKey(b.members[0]?.schedule))
			.slice(0, 4)
	}, [visibleStudents])
	const recentActivities = useMemo(() => {
		const paymentItems = payments.slice(0, 4).map(payment => ({
			id: `payment-${payment.id}`,
			title: payment.studentName,
			description: payment.courseTitle || "Kurs ko'rsatilmagan",
			meta: `${formatMoney(payment.amount)} / ${getPaymentMethodMeta(payment.method).shortLabel}`,
			date: payment.createdAt,
		}))
		const requestItems = contactRequests.slice(0, 3).map(item => ({
			id: `request-${item.id}`,
			title: item.fullName,
			description: item.status === 'new' ? 'Yangi murojaat' : "Ko'rib chiqilgan murojaat",
			meta: item.phone,
			date: item.createdAt,
		}))
		return [...paymentItems, ...requestItems]
			.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
			.slice(0, 5)
	}, [payments, contactRequests])
	const newRequests = useMemo(
		() => contactRequests.filter(item => item.status === 'new').slice(0, 5),
		[contactRequests]
	)
	const debtorsList = useMemo(
		() =>
			visibleStudents
				.filter(student => student.status === 'debtor')
				.sort((a, b) => Number(a.balance || 0) - Number(b.balance || 0))
				.slice(0, 5),
		[visibleStudents]
	)

	useEffect(() => {
		let cancelled = false
		async function loadStudents() {
			try {
				const primary = await api.getReceptionStudents(token, { search: '', status: '', includeArchived: false })
				if (cancelled) return
				if (Array.isArray(primary) && primary.length) {
					setStudents(primary)
					return
				}
				const fallback = await api.getReceptionStudents(token, { search: '', status: '', includeArchived: true })
				if (!cancelled) setStudents(Array.isArray(fallback) ? fallback : [])
			} catch {
				// Keep the last good dashboard numbers if a refresh fails.
			}
		}
		async function loadContacts() {
			try {
				const data = await api.getReceptionContactRequests(token)
				if (!cancelled && Array.isArray(data)) setContactRequests(data)
			} catch {
				// Keep current contact requests if polling fails.
			}
		}
		loadStudents()
		loadContacts()
		const interval = window.setInterval(() => {
			loadStudents()
			loadContacts()
		}, 15000)
		return () => {
			cancelled = true
			window.clearInterval(interval)
		}
	}, [token])

	return (
		<>
			<PageHeader
				title='Bosh sahifa'
				subtitle="Bugungi reception ishlari va tezkor holat"
			/>
			<div className='three-column-grid'>
				<StatCard
					label='Jami studentlar'
					value={`${dashboardStudentCount} ta`}
					note={`${dashboardActiveCount} ta faol`}
					icon='group'
				/>
				<StatCard
					label='Sinovdagilar'
					value={`${trial} ta`}
					note='Kuzatuv ostidagi studentlar'
					icon='hourglass_top'
				/>
				<StatCard
					label='Qarzdorlar'
					value={`${debtors} ta`}
					note="To'lov nazorati kerak"
					tone='danger'
					icon='warning'
				/>
				<StatCard
					label="Bugungi to'lovlar"
					value={formatMoney(dashboardPaymentsTotal)}
					note='Bugungi tushum'
					icon='payments'
				/>
			</div>
			<section className='card reception-dashboard-section'>
				<div className='section-title-row compact'>
					<h3>Tezkor amallar</h3>
				</div>
				<div className='reception-quick-actions'>
					<button type='button' className='quick-action-tile' onClick={() => navigate('/reception/students')}>
						<Icon name='group' />
						<div>
							<strong>O'quvchilar</strong>
							<span>Baza va statuslar</span>
						</div>
					</button>
					<button type='button' className='quick-action-tile' onClick={() => navigate('/reception/payments')}>
						<Icon name='payments' />
						<div>
							<strong>To'lov olish</strong>
							<span>Guruh va student bo'yicha</span>
						</div>
					</button>
					<button type='button' className='quick-action-tile' onClick={() => navigate('/reception/attendance')}>
						<Icon name='event_available' />
						<div>
							<strong>Davomat olish</strong>
							<span>Bugungi guruhlar bilan</span>
						</div>
					</button>
					<button type='button' className='quick-action-tile' onClick={() => navigate('/reception/requests')}>
						<Icon name='support_agent' />
						<div>
							<strong>Bog'lanishlar</strong>
							<span>Yangi murojaatlarni ko'rish</span>
						</div>
					</button>
				</div>
				<div className='timeline-list' hidden>
					{payments.slice(0, 5).map(payment => (
						<div key={payment.id} className='timeline-item timeline-item-rich'>
							<strong>{payment.studentName}</strong>
							<span>{payment.courseTitle || "Kurs ko'rsatilmagan"}</span>
							<span>
								{formatMoney(payment.amount)} · {getPaymentMethodMeta(payment.method).shortLabel}
							</span>
						</div>
					))}
				</div>
			</section>
		</>
	)
}

function ReceptionPaymentsPage({ token, meta }) {
	const [searchParams, setSearchParams] = useSearchParams()
	const { students, reload } = useReceptionData(token, {
		search: '',
		status: '',
		includeArchived: false,
	})
	const [payments, setPayments] = usePaymentsData(token)
	const [paymentGroupModal, setPaymentGroupModal] = useState(null)
	const [paymentStudentModal, setPaymentStudentModal] = useState(null)
	const [paymentStudentSearch, setPaymentStudentSearch] = useState('')
	const groupedStudents = useMemo(
		() => buildReceptionTracks(students, meta),
		[students, meta],
	)

	useEffect(() => {
		const studentIdFromUrl = searchParams.get('studentId')
		if (!studentIdFromUrl || !groupedStudents.length) return

		const matchedGroup = groupedStudents.find(group =>
			(group.members || []).some(student => isSameRecordId(student.id, studentIdFromUrl)),
		)
		const matchedStudent = matchedGroup?.members?.find(
			student => isSameRecordId(student.id, studentIdFromUrl),
		)

		if (!matchedGroup || !matchedStudent) return
		if (isSameRecordId(paymentStudentModal?.studentId, matchedStudent.id)) return

		setPaymentGroupModal(null)
		setPaymentStudentSearch('')
		setPaymentStudentModal({
			groupKey: matchedGroup.key,
			courseTitle: matchedGroup.courseTitle,
			teacherName: matchedGroup.teacherName,
			schedule: matchedGroup.schedule,
			studentId: matchedStudent.id,
			studentName: matchedStudent.fullName,
			studentStatus: matchedStudent.status,
			studyMonth: getStudyMonthLabel(matchedStudent),
			phone: matchedStudent.phone,
		})
		setSearchParams({}, { replace: true })
	}, [groupedStudents, paymentStudentModal?.studentId, searchParams, setSearchParams])

	async function handlePaymentSaved() {
		const nextPayments = await api.getAllPayments(token)
		setPayments(nextPayments)
		reload({ search: '', status: '', includeArchived: false })
		setPaymentGroupModal(null)
		setPaymentStudentModal(null)
	}

	const visiblePaymentModalStudents = useMemo(() => {
		if (!paymentGroupModal) return []
		const query = paymentStudentSearch.trim().toLowerCase()
		if (!query) return paymentGroupModal.members || []
		return (paymentGroupModal.members || []).filter(student =>
			[student.fullName, student.phone, getStudyMonthLabel(student)]
				.filter(Boolean)
				.some(value => String(value).toLowerCase().includes(query)),
		)
	}, [paymentGroupModal, paymentStudentSearch])

	return (
		<>
			<PageHeader
				title="To'lovlar"
				subtitle="Yo'nalish, ustoz va vaqt bo'yicha guruhni tanlab oylik to'lovni qabul qiling"
			/>
			<section className='card payment-flow-card'>
				<div className='attendance-hub-top'>
					<div>
						<span className='card-label'>Yo'nalish va ustoz</span>
						<h3>To'lov qilinadigan guruhlar</h3>
						<p>Kurs kartasini oching, keyin studentni tanlab to'lov qiling.</p>
					</div>
				</div>
				<div className='attendance-group-grid top-space'>
					{groupedStudents.length ? groupedStudents.map(group => (
						<button
							key={group.key}
							type='button'
							className='attendance-group-card'
							onClick={() => {
								setPaymentStudentSearch('')
								setSearchParams({}, { replace: true })
								setPaymentGroupModal(group)
							}}
						>
							<div className='attendance-group-head'>
								<div>
									<strong>{group.courseTitle}</strong>
									<span>{group.teacherName}</span>
								</div>
								<Badge tone='default'>{group.members.length} ta</Badge>
							</div>
							<div className='attendance-group-body'>
								<div className='attendance-group-time'>
									<Icon name='schedule' />
									<span>{group.schedule}</span>
								</div>
								<div className='attendance-group-meta'>
									<span>Studentlarni ochish</span>
									<Icon name='chevron_right' />
								</div>
							</div>
						</button>
					)) : <EmptyStateNotice message="To'lov uchun guruhlar hozircha yo'q." />}
				</div>
			</section>
			<section className='card table-card'>
				<div className='section-title-row'>
					<div>
						<span className='card-label'>Tranzaksiya tarixi</span>
						<h3>So'nggi qabul qilingan to'lovlar</h3>
					</div>
				</div>
				{payments.length ? (
					<div className='table-shell responsive-cards'>
						<table>
							<thead>
								<tr>
									<th>O'quvchi</th>
									<th>Kurs</th>
									<th>Miqdor</th>
									<th>Usul</th>
									<th>Sabab</th>
									<th>Sana</th>
								</tr>
							</thead>
							<tbody>
								{payments.map(payment => (
									<tr key={payment.id}>
										<td data-label="O'quvchi">{payment.studentName}</td>
										<td data-label='Kurs'>{payment.courseTitle}</td>
										<td data-label='Miqdor' className='amount-cell'>{formatMoney(payment.amount)}</td>
										<td data-label='Usul'>{getPaymentMethodMeta(payment.method).shortLabel}</td>
										<td data-label='Sabab'>{payment.reason || '-'}</td>
										<td data-label='Sana'>{payment.createdAt}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<EmptyStateNotice message="To'lovlar hozircha yo'q." />
				)}
			</section>
			{paymentGroupModal ? (
				<Modal
					title={paymentGroupModal.courseTitle}
					subtitle={`${paymentGroupModal.teacherName} / ${paymentGroupModal.schedule}`}
					onClose={() => setPaymentGroupModal(null)}
				>
					<div className='payment-picker-shell'>
						<input
							type='text'
							className='toolbar-search'
							placeholder="Studentni qidiring..."
							value={paymentStudentSearch}
							onChange={event => setPaymentStudentSearch(event.target.value)}
						/>
						<div className='payment-picker-list top-space'>
							{visiblePaymentModalStudents.length ? visiblePaymentModalStudents.map((student, index) => (
								<button
									key={student.id}
									type='button'
									className='payment-picker-row'
									onClick={() => {
										setPaymentGroupModal(null)
										setSearchParams({}, { replace: true })
										setPaymentStudentModal({
											groupKey: paymentGroupModal.key,
											courseTitle: paymentGroupModal.courseTitle,
											teacherName: paymentGroupModal.teacherName,
											schedule: paymentGroupModal.schedule,
											studentId: student.id,
											studentName: student.fullName,
											studentStatus: student.status,
											studyMonth: getStudyMonthLabel(student),
											phone: student.phone,
										})
									}}
								>
									<div className='student-identity'>
										<div className={`avatar-badge tone-${index % 5}`}>
											{getInitials(student.fullName)}
										</div>
										<div className='course-cell'>
											<strong>{student.fullName}</strong>
											<span>{getStudyMonthLabel(student)}</span>
										</div>
									</div>
									<Badge tone={getStudentStatusMeta(student.status).tone}>
										{getStudentStatusMeta(student.status).label}
									</Badge>
								</button>
							)) : <EmptyStateNotice message="Bu guruhda student topilmadi." />}
						</div>
					</div>
				</Modal>
			) : null}
			{paymentStudentModal ? (
				<Modal
					title={paymentStudentModal.studentName}
					subtitle={`${paymentStudentModal.phone || '-'} / ${paymentStudentModal.studyMonth}`}
					onClose={() => setPaymentStudentModal(null)}
				>
					<PaymentCollectionWorkspace
						token={token}
						students={students}
						payments={payments}
						initialStudentId={paymentStudentModal.studentId}
						onPaymentSaved={handlePaymentSaved}
						embedded={false}
						lockedGroupKey={paymentStudentModal.groupKey}
						showStudentList={false}
					/>
				</Modal>
			) : null}
		</>
	)
}

function ReceptionContactRequestsPage({ token }) {
	const [items, setItems] = useState([])
	const [statusFilter, setStatusFilter] = useState('all')

	async function load() {
		const data = await api.getReceptionContactRequests(token)
		setItems(data)
	}

	useEffect(() => {
		load()
	}, [token])

	async function handleStatus(id, status) {
		await api.updateReceptionContactRequestStatus(token, id, status)
		load()
	}

	const statusMeta = {
		new: { label: 'Yangi', tone: 'warning' },
		read: { label: "Ko'rildi", tone: 'default' },
		contacted: { label: "Bog'landik", tone: 'info' },
		coming: { label: 'Keladi', tone: 'success' },
		rejected: { label: 'Rad etdi', tone: 'danger' },
	}
	const filteredItems = items.filter(item => statusFilter === 'all' || item.status === statusFilter)
	const statusCounts = items.reduce((acc, item) => {
		acc[item.status] = (acc[item.status] || 0) + 1
		return acc
	}, {})

	return (
		<>
			<PageHeader
				title="Bog'lanish"
				subtitle="Asosiy sahifadagi murojaatlar reception paneliga tushadi"
			/>
			<section className='contact-requests-panel'>
				<div className='crm-status-board'>
					{[
						{ key: 'all', label: 'Barchasi' },
						{ key: 'new', label: 'Yangi' },
						{ key: 'contacted', label: "Bog'landik" },
						{ key: 'coming', label: 'Keladi' },
						{ key: 'rejected', label: 'Rad etdi' },
					].map(item => (
						<button
							key={item.key}
							type='button'
							className={statusFilter === item.key ? 'crm-status-chip active' : 'crm-status-chip'}
							onClick={() => setStatusFilter(item.key)}
						>
							<span>{item.label}</span>
							<strong>{item.key === 'all' ? items.length : statusCounts[item.key] || 0}</strong>
						</button>
					))}
				</div>
				{filteredItems.length ? (
					<div className='contact-request-grid'>
						{filteredItems.map(item => {
							const lead = parseLandingLeadMessage(item.message)
							const meta = statusMeta[item.status] || statusMeta.new
							return (
								<article key={item.id} className={`contact-request-card ${item.status === 'new' ? 'new' : 'read'}`}>
									<div className='contact-request-head'>
										<div className='contact-request-avatar'>
											{String(item.fullName || '?').slice(0, 2).toUpperCase()}
										</div>
										<div>
											<strong>{item.fullName}</strong>
											<span>{item.phone}</span>
										</div>
										<Badge tone={meta.tone}>{meta.label}</Badge>
									</div>
									<div className='contact-request-meta'>
										<div>
											<span>Yo'nalish</span>
											<strong>{lead.direction}</strong>
										</div>
										<div>
											<span>Sana</span>
											<strong>{item.createdAt}</strong>
										</div>
									</div>
									<div className='contact-request-message'>
										<span>Tavsif</span>
										<p>{lead.description}</p>
									</div>
									<div className='contact-request-actions'>
										<a href={`tel:${item.phone}`} className='page-btn secondary'>Qo'ng'iroq qilish</a>
										<button type='button' className='page-btn' onClick={() => handleStatus(item.id, 'contacted')}>
											Bog'landik
										</button>
										<button type='button' className='page-btn success' onClick={() => handleStatus(item.id, 'coming')}>
											Keladi
										</button>
										<button type='button' className='page-btn danger' onClick={() => handleStatus(item.id, 'rejected')}>
											Rad etdi
										</button>
									</div>
								</article>
							)
						})}
					</div>
				) : (
					<EmptyStateNotice message="Bu status bo'yicha murojaat yo'q." />
				)}
			</section>
		</>
	)
}

function groupStudentsForAttendance(students = []) {
	const map = new Map()
	students.forEach(student => {
		const courseTitle = student.courseTitle || "Noma'lum guruh"
		const teacherName = student.teacherName || "Ustoz biriktirilmagan"
		const schedule = student.schedule || "Vaqt kiritilmagan"
		const key = `${courseTitle}__${teacherName}__${schedule}`
		if (!map.has(key)) {
			map.set(key, { key, courseTitle, teacherName, label: `${courseTitle} - ${teacherName}`, members: [] })
		}
		map.get(key).members.push(student)
	})
	return Array.from(map.values())
}

function AttendancePresenceToggle({ checked, onChange, disabled = false }) {
	return (
		<label className={`attendance-check-row ${disabled ? 'disabled' : ''}`}>
			<input
				type='checkbox'
				checked={checked}
				disabled={disabled}
				onChange={event => onChange(event.target.checked ? 'present' : 'absent')}
			/>
			<span className={checked ? 'attendance-check-indicator active' : 'attendance-check-indicator'}>
				{checked ? <Icon name='check' /> : null}
			</span>
			<span className='attendance-check-copy'>
				<strong>{checked ? 'Keldi' : 'Belgilash'}</strong>
				<small>{checked ? 'Davomat belgilandi' : "Kelgan bo'lsa belgilang"}</small>
			</span>
		</label>
	)
}

function AttendanceManagerPage({ token, meta, role = 'reception' }) {
	const { students } = useReceptionData(token, { search: '', status: '' })
	const [lessonDate, setLessonDate] = useState(new Date().toISOString().slice(0, 10))
	const [groupSearch, setGroupSearch] = useState('')
	const [memberSearch, setMemberSearch] = useState('')
	const [attendanceMap, setAttendanceMap] = useState({})
	const [history, setHistory] = useState([])
	const [groupModal, setGroupModal] = useState(null)
	const [attendanceSaving, setAttendanceSaving] = useState(false)
	const attendanceSavingRef = useRef(false)
	const groups = useMemo(
		() => (role === 'reception' ? buildReceptionTracks(students, meta) : groupStudentsForAttendance(students)),
		[students, meta, role],
	)
	const editable = role === 'reception'

	useEffect(() => {
		let cancelled = false
		async function loadHistory() {
			try {
				const data = await api.getAttendanceHistory(token, { range: 'day', lessonDate })
				if (!cancelled && Array.isArray(data)) setHistory(data)
			} catch {
				// Keep the last visible attendance data if refresh fails.
			}
		}
		loadHistory()
		const interval = window.setInterval(loadHistory, 15000)
		return () => {
			cancelled = true
			window.clearInterval(interval)
		}
	}, [token, lessonDate])

	const historyMap = useMemo(() => {
		const next = {}
		history.forEach(item => {
			next[item.studentId] = item.status
		})
		return next
	}, [history])

	const visibleGroups = groups
		.filter(group => {
			const query = groupSearch.trim().toLowerCase()
			if (!query) return true
			return [group.courseTitle, group.teacherName, group.label, group.members[0]?.schedule]
				.filter(Boolean)
				.some(value => String(value).toLowerCase().includes(query))
		})
		.sort((a, b) => {
			const getTimeKey = value => {
				const match = String(value || '').match(/(\d{1,2}):(\d{2})/)
				if (!match) return 9999
				return Number(match[1]) * 60 + Number(match[2])
			}
			return getTimeKey(a.members[0]?.schedule) - getTimeKey(b.members[0]?.schedule)
		})

	const currentGroup = groupModal ? groups.find(group => group.key === groupModal.key) || groupModal : null
	const visibleMembers = (currentGroup?.members || []).filter(student => {
		const query = memberSearch.trim().toLowerCase()
		if (!query) return true
		return [student.fullName, student.phone, student.courseTitle, student.teacherName, getStudyMonthLabel(student)]
			.filter(Boolean)
			.some(value => String(value).toLowerCase().includes(query))
	})

	async function handleSaveAttendance() {
		if (attendanceSavingRef.current) return
		attendanceSavingRef.current = true
		try {
			setAttendanceSaving(true)
			await api.saveAttendanceBatch(token, {
				lessonDate,
				entries: (currentGroup?.members || []).map(student => ({
					studentId: student.id,
					status: attendanceMap[student.id] || historyMap[student.id] || 'absent',
				})),
			})
			const fresh = await api.getAttendanceHistory(token, { range: 'day', lessonDate })
			setHistory(fresh)
			setGroupModal(null)
			await showSuccess('Davomat saqlandi', `${currentGroup?.members.length || 0} ta o'quvchi bo'yicha davomat yangilandi`)
		} catch (err) {
			await showError(err.message)
		} finally {
			attendanceSavingRef.current = false
			setAttendanceSaving(false)
		}
	}

	return (
		<>
			<PageHeader
				title='Davomat olish'
				subtitle="Bugungi davomatni reception panel orqali belgilang"
			/>
			<section className='card attendance-hub-card'>
				<div className='attendance-hub-top'>
					<div>
						<span className='card-label'>Guruh va sana</span>
						<h3>Reception davomat paneli</h3>
						<p>{formatDateLabel(new Date(lessonDate))}</p>
					</div>
					<div className='attendance-hub-controls'>
						<input type='date' value={lessonDate} onChange={event => setLessonDate(event.target.value)} />
						<input
							type='text'
							placeholder="Kurs, ustoz yoki vaqt bo'yicha qidiring..."
							value={groupSearch}
							onChange={event => setGroupSearch(event.target.value)}
						/>
					</div>
				</div>
				<div className='attendance-group-grid top-space'>
					{visibleGroups.length ? visibleGroups.map(group => {
						const schedule = group.members[0]?.schedule || "Vaqt kiritilmagan"
						return (
							<button
								key={group.key}
								type='button'
								className='attendance-group-card'
								onClick={() => setGroupModal(group)}
							>
								<div className='attendance-group-head'>
									<div>
										<strong>{group.courseTitle}</strong>
										<span>{group.teacherName}</span>
									</div>
									<Badge tone='default'>{group.members.length} ta</Badge>
								</div>
								<div className='attendance-group-body'>
									<div className='attendance-group-time'>
										<Icon name='schedule' />
										<span>{schedule}</span>
									</div>
									<div className='attendance-group-meta'>
										<span>Studentlar ro'yxatini oching</span>
										<Icon name='chevron_right' />
									</div>
								</div>
							</button>
						)
					}) : <EmptyStateNotice message="Bugungi davomat uchun guruh topilmadi." />}
				</div>
			</section>
			{groupModal ? (
				<Modal
					title={groupModal.courseTitle}
					subtitle={`${groupModal.teacherName} · ${groupModal.members[0]?.schedule || "Vaqt kiritilmagan"}`}
					onClose={() => setGroupModal(null)}
				>
					<div className='attendance-modal-shell'>
						<div className='attendance-fast-actions'>
							<input
								className='toolbar-search'
								placeholder="Ism, telefon yoki kurs bo'yicha qidiring..."
								value={memberSearch}
								onChange={event => setMemberSearch(event.target.value)}
							/>
							<button
								type='button'
								className='page-btn success'
								onClick={() => {
									const next = {}
									;(currentGroup?.members || []).forEach(student => {
										next[student.id] = 'present'
									})
									setAttendanceMap(current => ({ ...current, ...next }))
								}}
							>
								<Icon name='done_all' />
								Barchasi keldi
							</button>
							<button
								type='button'
								className='page-btn secondary'
								onClick={() => {
									const next = {}
									;(currentGroup?.members || []).forEach(student => {
										next[student.id] = 'absent'
									})
									setAttendanceMap(current => ({ ...current, ...next }))
								}}
							>
								<Icon name='restart_alt' />
								Barchasi kelmadi
							</button>
						</div>
						<div className='attendance-student-list top-space'>
							{visibleMembers.length ? visibleMembers.map((student, index) => {
								const statusValue =
									attendanceMap[student.id] || historyMap[student.id] || 'absent'
								const isPresent = statusValue === 'present'
								return (
									<article key={student.id} className='attendance-student-row'>
										<div className='attendance-student-row-main'>
											<div className={`avatar-badge tone-${index % 5}`}>
												{getInitials(student.fullName)}
											</div>
											<div className='attendance-student-row-copy'>
												<strong>{student.fullName}</strong>
												<span>{student.phone || '-'} · {student.teacherName || "Ustoz biriktirilmagan"}</span>
											</div>
										</div>
										<div className='attendance-student-row-check'>
											<AttendancePresenceToggle
												checked={isPresent}
												disabled={!editable}
												onChange={value =>
													setAttendanceMap(current => ({
														...current,
														[student.id]: value,
													}))
												}
											/>
										</div>
									</article>
								)
							}) : <EmptyStateNotice message="Bu guruhda student yo'q." />}
						</div>
						<div className='attendance-footer'>
							<div className='attendance-actions'>
								<button type='button' className='text-link' onClick={() => setAttendanceMap({})}>
									Tanlovni tozalash
								</button>
								<ActionButton icon='save' onClick={handleSaveAttendance} disabled={attendanceSaving}>
									{attendanceSaving ? 'Saqlanmoqda...' : 'Davomatni saqlash'}
								</ActionButton>
							</div>
						</div>
					</div>
				</Modal>
			) : null}
		</>
	)
}

function ReceptionAttendancePage({ token, meta }) {
	return <AttendanceManagerPage token={token} meta={meta} role='reception' />
}

function StudentImportSection({ token }) {
	const [selectedFile, setSelectedFile] = useState(null)
	const [preview, setPreview] = useState(null)
	const [settingsBundle, setSettingsBundle] = useState(null)
	const [loading, setLoading] = useState(false)
	const [importing, setImporting] = useState(false)
	const [importFilter, setImportFilter] = useState('all')

	useEffect(() => {
		api.getSettings(token).then(setSettingsBundle).catch(() => setSettingsBundle(null))
	}, [token])

	const courses = settingsBundle?.courses || []
	const teachers = settingsBundle?.teachers || []

	useEffect(() => {
		if (!preview || !settingsBundle) return
		updatePreviewRows(rows => rows)
	}, [settingsBundle])

	function getTeachersForCourse(courseId) {
		const normalizedCourseId = Number(courseId)
		if (!normalizedCourseId) return teachers
		const assigned = teachers.filter(teacher =>
			(teacher.courseIds || []).map(Number).includes(normalizedCourseId)
		)
		return assigned.length ? assigned : teachers
	}

	function buildPreviewSummary(rows = []) {
		const phoneCounts = rows.reduce((acc, row) => {
			const key = String(row.phone || '').replace(/\D/g, '')
			if (key) acc[key] = (acc[key] || 0) + 1
			return acc
		}, {})
		const duplicateRows = rows.filter(row => {
			const key = String(row.phone || '').replace(/\D/g, '')
			return key && phoneCounts[key] > 1
		}).length
		return {
			totalRows: rows.length,
			readyRows: rows.filter(row => row.ready).length,
			errorRows: rows.filter(row => row.errors?.length).length,
			warningRows: rows.filter(row => row.warnings?.length).length,
			duplicateRows,
			skipRows: rows.filter(row => !row.ready).length,
		}
	}

	function validateImportRow(row) {
		const errors = []
		const warnings = [...(row.warnings || [])].filter(item =>
			![
				'Kurs topilmadi',
				"O'qituvchi topilmadi",
				"Tanlangan o'qituvchi bu kursga biriktirilmagan",
				'Kurs nomi kiritilmagan',
				"O'qituvchi kiritilmagan",
				'F.I.SH kiritilmagan',
				'Telefon raqami kiritilmagan',
				'Import faylida telefon takrorlangan',
				'Faylda telefon takrorlangan',
			].includes(item)
		)
		const baseErrors = [...(row.errors || [])].filter(item =>
			![
				'Kurs topilmadi',
				"O'qituvchi topilmadi",
				"Tanlangan o'qituvchi bu kursga biriktirilmagan",
				'Kurs nomi kiritilmagan',
				"O'qituvchi kiritilmagan",
				'F.I.SH kiritilmagan',
				'Telefon raqami kiritilmagan',
				'Import faylida telefon takrorlangan',
				'Faylda telefon takrorlangan',
			].includes(item)
		)
		errors.push(...baseErrors)

		const courseId = Number(row.courseId)
		const teacherId = Number(row.teacherId)
		const course = courses.find(item => Number(item.id) === courseId)
		const teacher = teachers.find(item => Number(item.id) === teacherId)

		if (!String(row.fullName || '').trim()) errors.push('F.I.SH kiritilmagan')
		if (!String(row.phone || '').replace(/\D/g, '')) errors.push('Telefon raqami kiritilmagan')
		if (!courseId || !course) errors.push('Kurs tanlanmagan')
		if (!teacherId || !teacher) errors.push("O'qituvchi tanlanmagan")
		if (course && teacher && !(teacher.courseIds || []).map(Number).includes(courseId)) {
			errors.push("Tanlangan o'qituvchi bu kursga biriktirilmagan")
		}

		return {
			...row,
			courseId: course?.id || row.courseId || null,
			courseTitle: course?.title || row.courseTitle || '',
			teacherId: teacher?.id || row.teacherId || null,
			teacherName: teacher?.fullName || row.teacherName || '',
			schedule: row.schedule || course?.schedule || '',
			errors,
			warnings,
			ready: errors.length === 0,
		}
	}

	function decorateImportRows(rows = []) {
		const phoneCounts = rows.reduce((acc, row) => {
			const key = String(row.phone || '').replace(/\D/g, '')
			if (key) acc[key] = (acc[key] || 0) + 1
			return acc
		}, {})
		return rows.map(row => {
			const key = String(row.phone || '').replace(/\D/g, '')
			const duplicateWarning = key && phoneCounts[key] > 1 ? 'Faylda telefon takrorlangan' : ''
			const warnings = duplicateWarning && !(row.warnings || []).includes(duplicateWarning)
				? [...(row.warnings || []), duplicateWarning]
				: row.warnings || []
			return { ...row, warnings }
		})
	}

	function updatePreviewRows(updater) {
		setPreview(current => {
			if (!current) return current
			const rows = decorateImportRows(updater(current.rows || []).map(validateImportRow))
			return {
				...current,
				rows,
				summary: buildPreviewSummary(rows),
			}
		})
	}

	function handlePreviewCourseChange(rowNumber, courseId) {
		const selectedCourse = courses.find(course => Number(course.id) === Number(courseId))
		const availableTeachers = getTeachersForCourse(courseId)
		const firstTeacher = availableTeachers[0]
		updatePreviewRows(rows =>
			rows.map(row =>
				row.rowNumber === rowNumber
					? {
							...row,
							courseId: selectedCourse?.id || null,
							courseTitle: selectedCourse?.title || '',
							schedule: row.schedule || selectedCourse?.schedule || '',
							teacherId: firstTeacher?.id || null,
							teacherName: firstTeacher?.fullName || '',
						}
					: row,
			),
		)
	}

	function handlePreviewTeacherChange(rowNumber, teacherId) {
		const selectedTeacher = teachers.find(teacher => Number(teacher.id) === Number(teacherId))
		updatePreviewRows(rows =>
			rows.map(row =>
				row.rowNumber === rowNumber
					? {
							...row,
							teacherId: selectedTeacher?.id || null,
							teacherName: selectedTeacher?.fullName || '',
						}
					: row,
			),
		)
	}

	function handlePreviewFieldChange(rowNumber, field, value) {
		updatePreviewRows(rows =>
			rows.map(row =>
				row.rowNumber === rowNumber
					? {
							...row,
							[field]: value,
						}
					: row,
			),
		)
	}

	async function handlePreview() {
		if (!selectedFile) {
			await showError('Import uchun fayl tanlang')
			return
		}
		try {
			setLoading(true)
			const fileDataBase64 = await fileToBase64(selectedFile)
			const result = await api.previewStudentImport(token, {
				fileName: selectedFile.name,
				fileDataBase64,
			})
			const rows = decorateImportRows((result.rows || []).map(validateImportRow))
			setPreview({ ...result, rows, summary: buildPreviewSummary(rows) })
		} catch (error) {
			await showError(error.message)
		} finally {
			setLoading(false)
		}
	}

	async function handleImport() {
		if (!preview?.summary?.readyRows) {
			await showError("Import uchun tayyor qator topilmadi")
			return
		}
		try {
			setImporting(true)
			const result = await api.importStudentsBatch(token, preview.rows.filter(row => row.ready))
			await showSuccess('Import yakunlandi', `${result.createdCount} ta o'quvchi qo'shildi`)
			setSelectedFile(null)
			setPreview(null)
		} catch (error) {
			await showError(error.message)
		} finally {
			setImporting(false)
		}
	}

	const filteredPreviewRows = preview?.rows?.filter(row => {
		if (importFilter === 'ready') return row.ready
		if (importFilter === 'error') return row.errors?.length
		if (importFilter === 'warning') return row.warnings?.length && !row.errors?.length
		return true
	}) || []

	return (
		<section className='card settings-card'>
			<div className='card-head-row'>
				<div>
					<h3>Eski o'quvchilarni import qilish</h3>
					<p>Excel, CSV yoki JSON fayl orqali eski studentlarni bir martada tizimga yuklang</p>
				</div>
				<ActionButton secondary icon='download' onClick={downloadStudentImportTemplate}>
					Shablon
				</ActionButton>
			</div>
			<div className='import-panel'>
				<div className='import-panel-top'>
					<label className='file-upload-box'>
						<input
							type='file'
							accept='.xlsx,.csv,.json'
							onChange={event => {
								setSelectedFile(event.target.files?.[0] || null)
								setPreview(null)
							}}
						/>
						<div>
							<strong>{selectedFile ? selectedFile.name : 'Import faylini tanlang'}</strong>
							<span>.xlsx, .csv yoki .json yuklashingiz mumkin</span>
						</div>
					</label>
					<div className='import-panel-actions'>
						<ActionButton secondary icon='preview' onClick={handlePreview} disabled={loading || importing}>
							{loading ? 'Tekshirilmoqda...' : "Preview ko'rish"}
						</ActionButton>
						<ActionButton icon='upload_file' onClick={handleImport} disabled={importing || loading || !preview?.summary?.readyRows}>
							{importing ? 'Import qilinmoqda...' : 'Import qilish'}
						</ActionButton>
					</div>
				</div>
				{preview ? (
					<div className='import-preview top-space'>
						<div className='import-summary-grid'>
							<div className='import-summary-card'>
								<span>Jami qator</span>
								<strong>{preview.summary.totalRows}</strong>
							</div>
							<div className='import-summary-card success'>
								<span>Tayyor</span>
								<strong>{preview.summary.readyRows}</strong>
							</div>
							<div className='import-summary-card danger'>
								<span>Xato</span>
								<strong>{preview.summary.errorRows}</strong>
							</div>
							<div className='import-summary-card warning'>
								<span>Ogohlantirish</span>
								<strong>{preview.summary.warningRows}</strong>
							</div>
							<div className='import-summary-card warning'>
								<span>Takror telefon</span>
								<strong>{preview.summary.duplicateRows || 0}</strong>
							</div>
							<div className='import-summary-card danger'>
								<span>O'tkaziladi</span>
								<strong>{preview.summary.skipRows || 0}</strong>
							</div>
						</div>
						<div className='import-filter-tabs'>
							{[
								{ key: 'all', label: 'Barchasi', count: preview.summary.totalRows },
								{ key: 'ready', label: 'Tayyor', count: preview.summary.readyRows },
								{ key: 'error', label: 'Xatolar', count: preview.summary.errorRows },
								{ key: 'warning', label: 'Ogohlantirish', count: preview.summary.warningRows },
							].map(item => (
								<button
									key={item.key}
									type='button'
									className={importFilter === item.key ? 'active' : ''}
									onClick={() => setImportFilter(item.key)}
								>
									<span>{item.label}</span>
									<strong>{item.count || 0}</strong>
								</button>
							))}
						</div>
						<div className='table-shell responsive-cards top-space'>
							<table>
								<thead>
									<tr>
										<th>Qator</th>
										<th>O'quvchi</th>
										<th>Kurs</th>
										<th>O'qituvchi</th>
										<th>Holat</th>
										<th>Izoh</th>
									</tr>
								</thead>
								<tbody>
									{filteredPreviewRows.map(row => (
										<tr key={`${row.rowNumber}-${row.phone}`}>
											<td data-label='Qator'>#{row.rowNumber}</td>
											<td data-label="O'quvchi">
												<div className='import-student-cell'>
													<input
														className='compact-input'
														value={row.fullName || ''}
														placeholder='F.I.Sh'
														onChange={event => handlePreviewFieldChange(row.rowNumber, 'fullName', event.target.value)}
													/>
													<input
														className='compact-input'
														value={row.phone || ''}
														placeholder='+998...'
														onChange={event => handlePreviewFieldChange(row.rowNumber, 'phone', event.target.value)}
													/>
												</div>
											</td>
											<td data-label='Kurs'>
												<select
													className='compact-select'
													value={row.courseId || ''}
													onChange={event => handlePreviewCourseChange(row.rowNumber, event.target.value)}
												>
													<option value=''>Kurs tanlang</option>
													{courses.map(course => (
														<option key={course.id} value={course.id}>
															{course.title}
														</option>
													))}
												</select>
											</td>
											<td data-label="O'qituvchi">
												<select
													className='compact-select'
													value={row.teacherId || ''}
													onChange={event => handlePreviewTeacherChange(row.rowNumber, event.target.value)}
												>
													<option value=''>Teacher tanlang</option>
													{getTeachersForCourse(row.courseId).map(teacher => (
														<option key={teacher.id} value={teacher.id}>
															{teacher.fullName}
														</option>
													))}
												</select>
											</td>
											<td data-label='Holat'>
												<Badge tone={row.ready ? 'success' : 'danger'}>
													{row.ready ? 'Tayyor' : 'Xato'}
												</Badge>
											</td>
											<td data-label='Izoh'>
												<div className='import-issues'>
													{row.errors?.length ? (
														<span className='danger-text'>{row.errors.join(', ')}</span>
													) : row.warnings?.length ? (
														<span className='warning-text'>{row.warnings.join(', ')}</span>
													) : (
														<span className='muted-label'>Tayyor</span>
													)}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				) : null}
			</div>
		</section>
	)
}

function ReceptionSettingsPage({ meta, token, onProfileUpdated }) {
	return (
		<>
			<PageHeader
				title='Sozlamalar'
				subtitle='Reception profili va akkaunt sozlamalari'
			/>
			<ProfileSettingsCard
				token={token}
				meta={meta}
				title='Reception profili'
				onProfileUpdated={onProfileUpdated}
			/>
			<StudentImportSection token={token} />
		</>
	)
}

function useTeacherStudents(token) {
	const [students, setStudents] = useState([])
	const reload = async () => {
		const data = await api.getTeacherStudents(token)
		if (Array.isArray(data)) setStudents(data)
		return data
	}
	useEffect(() => {
		let cancelled = false
		async function load() {
			try {
				const data = await api.getTeacherStudents(token)
				if (!cancelled && Array.isArray(data)) setStudents(data)
			} catch {
				// Preserve the last good teacher dashboard data.
			}
		}
		load()
		const interval = window.setInterval(load, 15000)
		return () => {
			cancelled = true
			window.clearInterval(interval)
		}
	}, [token])
	return { students, reload }
}

function TeacherAttendancePage({ token }) {
	const { students, reload } = useTeacherStudents(token)
	const teacherStudents = Array.isArray(students) ? students : []
	const groups = useMemo(() => groupStudentsForAttendance(teacherStudents), [teacherStudents])
	const [selectedGroup, setSelectedGroup] = useState('')
	const [lessonDate, setLessonDate] = useState(new Date().toISOString().slice(0, 10))
	const [history, setHistory] = useState([])
	const attendanceTableRef = useRef(null)
	const [renderedAttendanceRows, setRenderedAttendanceRows] = useState(0)
	const effectiveSelectedGroup = selectedGroup || groups[0]?.key || ''

	useEffect(() => {
		if (!selectedGroup && groups[0]) {
			setSelectedGroup(groups[0].key)
		}
	}, [groups, selectedGroup])

	useEffect(() => {
		let cancelled = false
		async function loadHistory() {
			try {
				const data = await api.getTeacherAttendanceHistory(token, 'day', lessonDate)
				if (!cancelled && Array.isArray(data)) setHistory(data)
			} catch {
				// Keep the visible attendance state if a refresh fails.
			}
		}
		loadHistory()
		const interval = window.setInterval(loadHistory, 15000)
		return () => {
			cancelled = true
			window.clearInterval(interval)
		}
	}, [token, lessonDate])

	const historyMap = useMemo(() => {
		const next = {}
		history.forEach(item => {
			next[item.studentId] = item.status
		})
		return next
	}, [history])

	const currentGroup = groups.find(group => group.key === effectiveSelectedGroup) ||
		groups[0] || { members: [], label: '' }
	const currentMembers = Array.isArray(currentGroup.members) ? currentGroup.members : []
	const attendanceMembers = currentMembers.length
		? currentMembers
		: (groups[0]?.members?.length ? groups[0].members : teacherStudents)
	const attendanceRowsCount = Math.max(attendanceMembers.length, renderedAttendanceRows)
	const currentSchedule =
		attendanceMembers[0]?.schedule || 'Jadval kiritilmagan'
	const currentGroupAttendancePercent = attendanceMembers.length
		? Math.round(
				(attendanceMembers.filter(student => (historyMap[student.id] || 'present') === 'present').length /
					attendanceMembers.length) * 100,
			)
		: 0

	useEffect(() => {
		const count = attendanceTableRef.current?.querySelectorAll('tr')?.length || 0
		setRenderedAttendanceRows(Math.max(count, attendanceMembers.length))
	}, [attendanceMembers])

	return (
		<>
			<section className='teacher-header'>
				<div>
					<h1>Davomat ko'rinishi</h1>
					<p>{formatDateLabel(new Date(lessonDate))}</p>
				</div>
				<div className='group-switcher'>
					<select
						value={effectiveSelectedGroup}
						onChange={e => setSelectedGroup(e.target.value)}
					>
						{groups.length ? groups.map(group => (
							<option key={group.key} value={group.key}>
								Guruh: {group.label}
							</option>
						)) : <option value=''>Guruh yo'q</option>}
					</select>
					<input type='date' value={lessonDate} onChange={event => setLessonDate(event.target.value)} />
				</div>
			</section>

			<div className='teacher-stats'>
				<section className='card mini-stat-card'>
					<div className='mini-stat-icon'>
						<Icon name='group' />
					</div>
					<div>
						<span>Jami o'quvchilar</span>
						<strong>{attendanceRowsCount}</strong>
					</div>
				</section>
				<section className='card mini-stat-card'>
					<div className='mini-stat-icon green'>
						<Icon name='trending_up' />
					</div>
					<div>
						<span>O'rtacha davomat</span>
						<strong>{currentGroupAttendancePercent}%</strong>
					</div>
				</section>
				<section className='next-lesson-card'>
					<span>Tanlangan guruh</span>
					<strong>{currentGroup.label || (attendanceMembers.length ? "Barcha o'quvchilar" : 'Guruh tanlanmagan')}</strong>
					<p>{currentSchedule}</p>
				</section>
			</div>

			<section className='card attendance-card'>
				<div className='card-head-row'>
					<h3>{currentGroup.label || "Davomat ko'rinishi"}</h3>
					<span>{attendanceRowsCount} o'quvchi ro'yxatda</span>
				</div>
				{attendanceMembers.length ? (
					<div className='table-shell responsive-cards'>
						<table>
							<thead>
								<tr>
									<th>O'QUVCHI F.I.SH</th>
									<th>STATUS</th>
									<th>IZOH</th>
								</tr>
							</thead>
							<tbody ref={attendanceTableRef}>
								{attendanceMembers.map((student, index) => {
									const current = historyMap[student.id] || 'present'
									const meta = getAttendanceStatusMeta(current)
									return (
										<tr key={student.id}>
											<td data-label="O'quvchi">
												<div className='student-identity'>
													<div className={`avatar-badge tone-${index % 5}`}>
														{getInitials(student.fullName)}
													</div>
													<strong>{student.fullName}</strong>
												</div>
											</td>
											<td data-label='Status'>
												<Badge tone={meta.tone}>{meta.label}</Badge>
											</td>
											<td data-label='Izoh'>
												<span className='muted-label'>-</span>
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				) : (
					<EmptyStateNotice message="Tanlangan guruhda davomat yozuvi yo'q." />
				)}
			</section>
		</>
	)
}

function TeacherGroupsPage({ token }) {
	const { students } = useTeacherStudents(token)
	const [history, setHistory] = useState([])
	const teacherStudents = Array.isArray(students) ? students : []
	const groups = useMemo(() => {
		const map = new Map()
		teacherStudents.forEach(student => {
			const key = student.courseTitle || "Noma'lum guruh"
			if (!map.has(key)) map.set(key, [])
			map.get(key).push(student)
		})
		return Array.from(map.entries()).map(([name, members]) => ({
			name,
			members,
		}))
	}, [teacherStudents])
	useEffect(() => {
		let cancelled = false
		async function loadHistory() {
			try {
				const data = await api.getTeacherAttendanceHistory(token, 'month')
				if (!cancelled && Array.isArray(data)) setHistory(data)
			} catch {
				// Keep the current group stats if polling fails.
			}
		}
		loadHistory()
		const interval = window.setInterval(loadHistory, 20000)
		return () => {
			cancelled = true
			window.clearInterval(interval)
		}
	}, [token])

	const groupHistoryStats = useMemo(() => {
		const map = new Map()
		history.forEach(item => {
			const key = item.courseTitle || "Noma'lum guruh"
			if (!map.has(key)) {
				map.set(key, { present: 0, absent: 0, total: 0, trendBuckets: {} })
			}
			const stat = map.get(key)
			stat.total += 1
			if (item.status === 'present') stat.present += 1
			if (item.status !== 'present') stat.absent += 1
			const label = String(item.lessonDate || '').slice(5, 10)
			if (!stat.trendBuckets[label]) stat.trendBuckets[label] = { label, present: 0, total: 0 }
			stat.trendBuckets[label].total += 1
			if (item.status === 'present') stat.trendBuckets[label].present += 1
		})
		return map
	}, [history])

	return (
		<>
			<PageHeader
				title='Mening Guruhlarim'
				subtitle="Barcha guruhlar va davomat ko'rsatkichlari"
			/>
			<div className='group-cards'>
				{groups.map((group, index) => {
					const stat = groupHistoryStats.get(group.name)
					const avg = stat?.total
						? Math.round((stat.present / stat.total) * 100)
						: group.members.length
							? Math.round(
									group.members.reduce(
										(sum, item) => sum + Number(item.attendancePercent || 0),
										0,
									) / group.members.length,
								)
							: 0
					const trendItems = stat
						? Object.values(stat.trendBuckets)
								.map(item => ({
									label: item.label,
									value: item.total ? Math.round((item.present / item.total) * 100) : 0,
								}))
								.slice(-7)
						: []
					return (
						<div key={group.name} className='card group-card'>
							<div className='group-card-top'>
								<div>
									<strong>{group.name}</strong>
									<span>{group.members.length} o'quvchi</span>
								</div>
								<div className='group-card-icon'>
									<Icon name={index % 2 === 0 ? 'menu_book' : 'architecture'} />
								</div>
							</div>
							<div className='progress-meta'>
								<span>Davomat ko'rsatkichi</span>
								<strong>{avg}%</strong>
							</div>
							<div className='group-attendance-breakdown'>
								<span>Keldi: <strong>{stat?.present || 0}</strong></span>
								<span>Kelmadi: <strong>{stat?.absent || 0}</strong></span>
								<span>Yozuv: <strong>{stat?.total || 0}</strong></span>
							</div>
							<div className='progress-bar'>
								<span
									style={{ width: `${avg}%` }}
									className={avg > 80 ? 'good' : 'warn'}
								/>
							</div>
							{trendItems.length ? (
								<MiniTrendChart
									items={trendItems}
									valueKey='value'
									labelKey='label'
									tone='green'
									formatValue={value => `${Math.round(Number(value || 0))}%`}
								/>
							) : null}
						</div>
					)
				})}
			</div>
		</>
	)
}

function TeacherDashboardPage({ token }) {
	const { students } = useTeacherStudents(token)
	const [history, setHistory] = useState([])
	const teacherStudents = Array.isArray(students) ? students : []
	const groups = useMemo(() => groupStudentsForAttendance(teacherStudents), [teacherStudents])
	const historyStudentCount = useMemo(
		() => new Set(history.map(item => item.studentId || item.studentName).filter(Boolean)).size,
		[history],
	)
	const historyGroupsCount = useMemo(
		() => new Set(history.map(item => item.courseTitle).filter(Boolean)).size,
		[history],
	)
	const studentsCount = Math.max(teacherStudents.length, historyStudentCount)
	const groupsCount = Math.max(groups.length, historyGroupsCount)
	const activeStudentsCount = teacherStudents.filter(student => student.status === 'active').length
	const historyAttendanceAverage = history.length
		? Math.round((history.filter(item => item.status === 'present').length / history.length) * 100)
		: 0
	const averageAttendance = history.length
		? historyAttendanceAverage
		: teacherStudents.length
			? Math.round(
					teacherStudents.reduce((sum, item) => sum + Number(item.attendancePercent || 0), 0) /
						teacherStudents.length,
				)
			: 0
	const dayKeyMap = ['yak', 'du', 'se', 'chor', 'pay', 'juma', 'shan']
	const todayKey = dayKeyMap[new Date().getDay()]
	const todayLessonsCount = groups.filter(group =>
		parseScheduleString(group.members[0]?.schedule || '').days.includes(todayKey),
	).length
	const todayLessonGroups = groups
		.filter(group => parseScheduleString(group.members[0]?.schedule || '').days.includes(todayKey))
		.map(group => {
			const parsed = parseScheduleString(group.members[0]?.schedule || '')
			return {
				key: group.key,
				label: group.label,
				courseTitle: group.courseTitle,
				teacherName: group.teacherName,
				startTime: parsed.startTime || 'Vaqt kiritilmagan',
				endTime: parsed.endTime,
				count: group.members.length,
			}
		})
		.sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)))
	useEffect(() => {
		let cancelled = false
		async function loadHistory() {
			try {
				const data = await api.getTeacherAttendanceHistory(token, 'month')
				if (!cancelled && Array.isArray(data)) setHistory(data)
			} catch {
				// Keep dashboard cards stable on temporary network issues.
			}
		}
		loadHistory()
		const interval = window.setInterval(loadHistory, 20000)
		return () => {
			cancelled = true
			window.clearInterval(interval)
		}
	}, [token])
	const attendanceTrend = useMemo(() => {
		const buckets = {}
		history.slice(0, 18).reverse().forEach(item => {
			const key = String(item.lessonDate || '').slice(5, 10)
			if (!buckets[key]) buckets[key] = { label: key, value: 0, total: 0 }
			buckets[key].total += 1
			if (item.status === 'present') buckets[key].value += 1
		})
		return Object.values(buckets)
			.map(item => ({
				label: item.label,
				value: item.total ? Math.round((item.value / item.total) * 100) : 0,
			}))
			.slice(-6)
	}, [history])
	return (
		<>
			<PageHeader
				title='Dashboard'
				subtitle="O'qituvchi uchun umumiy ko'rinish"
			/>
			<div className='three-column-grid'>
				<StatCard
					label='Studentlar'
					value={`${studentsCount} ta`}
					note={`${groupsCount} ta guruh - ${activeStudentsCount || studentsCount} ta faol`}
					icon='group'
				/>
				<StatCard
					label='Davomat'
					value={`${averageAttendance}%`}
					note="Joriy ko'rsatkich"
					icon='event_available'
				/>
				<StatCard
					label='Bugungi darslar'
					value={`${todayLessonsCount} ta`}
					note='Hammasi jadval asosida'
					icon='schedule'
				/>
			</div>
			{attendanceTrend.length ? (
				<section className='card'>
					<div className='dashboard-trend-head'>
						<strong>Davomat trendi</strong>
						<span>So'nggi darslar bo'yicha o'rtacha foiz</span>
					</div>
					<MiniTrendChart
						items={attendanceTrend}
						valueKey='value'
						labelKey='label'
						tone='green'
						formatValue={value => `${Math.round(Number(value || 0))}%`}
					/>
				</section>
			) : null}
			<section className='card today-lessons-card'>
				<div className='card-head-row'>
					<div>
						<h3>Bugungi darslar</h3>
						<p>Bugun qaysi guruh, nechada va nechta o'quvchi borligi</p>
					</div>
					<Badge tone={todayLessonGroups.length ? 'success' : 'default'}>
						{todayLessonGroups.length} ta dars
					</Badge>
				</div>
				{todayLessonGroups.length ? (
					<div className='today-lessons-list'>
						{todayLessonGroups.map(group => (
							<article key={group.key} className='today-lesson-item'>
								<div className='today-lesson-time'>
									<strong>{group.startTime}</strong>
									<span>{group.endTime || '-'}</span>
								</div>
								<div>
									<strong>{group.courseTitle}</strong>
									<span>{group.teacherName}</span>
								</div>
								<Badge tone='info'>{group.count} o'quvchi</Badge>
							</article>
						))}
					</div>
				) : (
					<EmptyStateNotice message="Bugun jadval bo'yicha dars yo'q." />
				)}
			</section>
		</>
	)
}

function TeacherStatisticsPage({ token }) {
	const { students } = useTeacherStudents(token)
	const [history, setHistory] = useState([])
	const teacherStudents = Array.isArray(students) ? students : []

	useEffect(() => {
		let cancelled = false
		async function loadHistory() {
			try {
				const data = await api.getTeacherAttendanceHistory(token, 'month')
				if (!cancelled && Array.isArray(data)) setHistory(data)
			} catch {
				// Keep statistics visible if polling fails.
			}
		}
		loadHistory()
		const interval = window.setInterval(loadHistory, 20000)
		return () => {
			cancelled = true
			window.clearInterval(interval)
		}
	}, [token])

	const studentAttendanceStats = useMemo(() => {
		const map = new Map()
		history.forEach(item => {
			const key = Number(item.studentId)
			if (!key) return
			if (!map.has(key)) map.set(key, { present: 0, total: 0 })
			const stat = map.get(key)
			stat.total += 1
			if (item.status === 'present') stat.present += 1
		})
		return map
	}, [history])

	return (
		<>
			<PageHeader
				title='Statistika'
				subtitle='Davomat va guruh samaradorligi'
			/>
			<section className='card table-card'>
				{teacherStudents.length ? (
					<div className='table-shell responsive-cards'>
						<table>
							<thead>
								<tr>
									<th>Student</th>
									<th>Kurs</th>
									<th>Davomat</th>
								</tr>
							</thead>
							<tbody>
								{teacherStudents.map(student => (
									<tr key={student.id}>
										<td data-label='Student'>{student.fullName}</td>
										<td data-label='Kurs'>{student.courseTitle}</td>
										<td data-label='Davomat' className='amount-cell'>
											{(() => {
												const stat = studentAttendanceStats.get(Number(student.id))
												return stat?.total
													? Math.round((stat.present / stat.total) * 100)
													: Number(student.attendancePercent || 0)
											})()}%
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<EmptyStateNotice message="Studentlar hozircha yo'q." />
				)}
			</section>
			<section className='card table-card'>
				<div className='card-head-row'>
					<h3>Davomat tarixi</h3>
					<p>So'nggi 30 kunlik yozuvlar</p>
				</div>
				{history.length ? (
					<div className='table-shell responsive-cards'>
						<table>
							<thead>
								<tr>
									<th>Sana</th>
									<th>Student</th>
									<th>Kurs</th>
									<th>Holat</th>
								</tr>
							</thead>
							<tbody>
								{history.map(item => (
									<tr key={item.id}>
										<td data-label='Sana'>{item.lessonDate}</td>
										<td data-label='Student'>{item.studentName}</td>
										<td data-label='Kurs'>{item.courseTitle}</td>
										<td data-label='Holat'>
											<Badge
												tone={item.status === 'present' ? 'success' : 'danger'}
											>
												{item.status === 'present' ? 'Keldi' : 'Kelmadi'}
											</Badge>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<EmptyStateNotice message="Davomat tarixi hozircha yo'q." />
				)}
			</section>
		</>
	)
}

function TeacherSettingsPage({ meta, token, onProfileUpdated }) {
	return (
		<>
			<PageHeader title='Sozlamalar' subtitle="O'qituvchi profili" />
			<ProfileSettingsCard
				token={token}
				meta={meta}
				title="O'qituvchi profili"
				onProfileUpdated={onProfileUpdated}
			/>
		</>
	)
}

function DirectorDashboardPage({ token }) {
	const [data, setData] = useState(null)
	const [error, setError] = useState('')
	const [chartPeriod, setChartPeriod] = useState('monthly')
	const [dateRange, setDateRange] = useState({ from: '', to: '' })
	const [hoveredPoint, setHoveredPoint] = useState(null)
	const [isRevenueFullscreen, setIsRevenueFullscreen] = useState(false)
	const [isChartDragging, setIsChartDragging] = useState(false)
	const revenueChartWrapRef = useRef(null)
	const chartDragRef = useRef(null)
	useEffect(() => {
		setError('')
		api
			.getDirectorOverview(token)
			.then(setData)
			.catch(error => setError(error.message || "Analitika olinmadi"))
	}, [token])

	function updateRevenueTooltip(event, point) {
		const stage = event.currentTarget.closest('.revenue-line-stage')
		if (!stage) return
		const rect = event.currentTarget.getBoundingClientRect()
		const stageRect = stage.getBoundingClientRect()
		const rawLeft = rect.left - stageRect.left + rect.width / 2
		const rawTop = rect.top - stageRect.top - 12
		setHoveredPoint({
			label: point.label,
			value: point.value,
			left: Math.max(96, Math.min(stageRect.width - 96, rawLeft)),
			top: Math.max(62, Math.min(stageRect.height - 18, rawTop)),
		})
	}

	function handleRevenueChartPointerDown(event) {
		if (!isRevenueFullscreen || event.button !== 0) return
		if (event.target.closest('button, input, select, textarea, a')) return
		const target = event.currentTarget
		chartDragRef.current = {
			x: event.clientX,
			y: event.clientY,
			scrollLeft: target.scrollLeft,
			scrollTop: target.scrollTop,
		}
		setIsChartDragging(true)
		target.setPointerCapture?.(event.pointerId)
	}

	function handleRevenueChartPointerMove(event) {
		const drag = chartDragRef.current
		if (!drag) return
		event.preventDefault()
		event.currentTarget.scrollLeft = drag.scrollLeft - (event.clientX - drag.x)
		event.currentTarget.scrollTop = drag.scrollTop - (event.clientY - drag.y)
	}

	function stopRevenueChartDrag(event) {
		if (!chartDragRef.current) return
		chartDragRef.current = null
		setIsChartDragging(false)
		event.currentTarget.releasePointerCapture?.(event.pointerId)
	}

	if (error) return <div className='card'>{error}</div>
	if (!data) return <div className='card'>Analitika yuklanmoqda...</div>
	const trendSets = data.trends || {
		daily: [],
		weekly: [],
		monthly: data.monthlyRevenue || [],
	}
	const baseChartData = trendSets[chartPeriod]?.length
		? trendSets[chartPeriod]
		: trendSets.monthly || []
	const chartData = baseChartData.filter(item => {
		if (chartPeriod === 'daily') {
			return isDateInRange(item.startDate, dateRange.from, dateRange.to)
		}
		const startOk = !dateRange.from || item.endDate >= dateRange.from
		const endOk = !dateRange.to || item.startDate <= dateRange.to
		return startOk && endOk
	})
	const maxRevenue = Math.max(...chartData.map(item => item.revenue), 1)
	const totalRevenue = chartData.reduce(
		(sum, item) => sum + Number(item.revenue || 0),
		0,
	)
	const averageRevenue = chartData.length
		? Math.round(totalRevenue / chartData.length)
		: 0
	const peakRevenue = chartData.length
		? Math.max(...chartData.map(item => Number(item.revenue || 0)))
		: 0
	const currentRevenue = Number(chartData[chartData.length - 1]?.revenue || 0)
	const previousRevenue = Number(chartData[chartData.length - 2]?.revenue || 0)
	const revenueDelta = currentRevenue - previousRevenue
	const growthNumber =
		previousRevenue > 0
			? Math.round((revenueDelta / previousRevenue) * 100)
			: null
	const growthPercent =
		previousRevenue > 0
			? `${growthNumber > 0 ? '+' : ''}${growthNumber}%`
			: 'Yangi davr'
	const revenueAxisTicks = [maxRevenue, maxRevenue * 0.66, maxRevenue * 0.33, 0]
	const chartSubtitleMap = {
		daily: "Oxirgi 7 kunlik moliyaviy o'sish ko'rsatkichlari",
		weekly: "Oxirgi 8 haftalik moliyaviy o'sish ko'rsatkichlari",
		monthly: "Oxirgi 6 oylik moliyaviy o'sish ko'rsatkichlari",
	}
	const summaryLabelMap = {
		daily: "O'RTACHA KUNLIK",
		weekly: "O'RTACHA HAFTALIK",
		monthly: "O'RTACHA OYLIK",
	}
	const peakLabelMap = {
		daily: 'ENG YUQORI KUN',
		weekly: 'ENG YUQORI HAFTA',
		monthly: 'ENG YUQORI OY',
	}
	const totalLabelMap = {
		daily: '7 KUNLIK JAMI',
		weekly: '8 HAFTALIK JAMI',
		monthly: '6 OYLIK JAMI',
	}
	const chartPoints = chartData.length
		? chartData.length === 1
			? (() => {
					return `0,50 100,50`
				})()
			: chartData
				.map((item, index) => {
					const x = chartData.length === 1 ? 50 : (index / (chartData.length - 1)) * 100
					const ratio = Number(item.revenue || 0) / maxRevenue
					const y = 84 - ratio * 64
					return `${x},${Math.max(18, Math.min(84, y))}`
				})
				.join(' ')
		: ''
	const chartAreaPoints = chartPoints
		? chartData.length === 1
			? `0,50 100,50 100,100 0,100`
			: `${chartPoints} 100,100 0,100`
		: ''
	const averageLineY = chartData.length
		? Math.max(18, Math.min(84, 84 - (averageRevenue / maxRevenue) * 64))
		: null
	const chartPointMeta = chartData.map((item, index) => {
		const x = chartData.length === 1 ? 50 : (index / (chartData.length - 1)) * 100
		const ratio = Number(item.revenue || 0) / maxRevenue
		const y = chartData.length === 1 ? 50 : 84 - ratio * 64
		const value = Number(item.revenue || 0)
		return {
			id: `${item.period || item.label}-${index}`,
			x,
			y: Math.max(18, Math.min(84, y)),
			label: formatTrendTooltipLabel(item.label || item.period),
			value,
			radius: value === peakRevenue && value > 0 ? 4.4 : 3.4,
		}
	})
	const chartRangeCaption = formatDateRangeCaption(dateRange.from, dateRange.to)
	const growthLabel = previousRevenue > 0 ? "O'SISH SUR'ATI" : 'HOLAT'
	const chartHealthTone = growthNumber === null || growthNumber >= 0 ? 'positive' : 'negative'

	async function handleExport(type) {
		const blob = await api.exportReport(token, type, 'xlsx', {
			period: chartPeriod,
			from: dateRange.from,
			to: dateRange.to,
		})
		downloadBlobFile('intelligent-report.xlsx', blob)
	}

	async function handlePrint() {
		const blob = await api.exportReport(token, 'overview', 'pdf', {
			period: chartPeriod,
			from: dateRange.from,
			to: dateRange.to,
		})
		downloadBlobFile('intelligent-report.pdf', blob)
	}

	return (
		<>
			<PageHeader
				title='Direktor Paneli'
				subtitle="Markaz ko'rsatkichlarini boshqarish va tahlil qilish."
				actions={
					<>
						<ActionButton
							secondary
							icon='file_download'
							onClick={() => handleExport('overview')}
						>
							Excel
						</ActionButton>
						<ActionButton secondary icon='picture_as_pdf' onClick={handlePrint}>
							PDF
						</ActionButton>
						<Link to='/director/students' className='action-btn link-btn'>
							<Icon name='add' className='button-icon' />
							Yangi o'quvchi
						</Link>
					</>
				}
			/>

			<div className='director-kpis'>
				<StatCard
					label='OYLIK TUSHUM'
					value={formatMoney(data.cards.monthlyRevenue)}
					note={`${growthPercent} o'tgan oyga nisbatan`}
					icon='payments'
				/>
				<StatCard
					label="BOSHQA XARAJATLAR"
					value={formatMoney(data.cards.operatingExpenses || 0)}
					note='Ijara, reklama, internet, admin'
					icon='receipt_long'
					tone='warning'
				/>
				<StatCard
					label="O'QITUVCHI OYLIGI"
					value={formatMoney(data.cards.teachersPayroll || 0)}
					note={`${data.cards.teachersCount || 0} ta o'qituvchi`}
					icon='badge'
					tone='warning'
				/>
				<StatCard
					label='SOF FOYDA'
					value={formatMoney(data.cards.netProfit || 0)}
					note='Barcha xarajatlardan keyingi foyda'
					icon='trending_up'
					tone={Number(data.cards.netProfit || 0) >= 0 ? 'success' : 'danger'}
				/>
				<StatCard
					label="O'QUVCHILAR SONI"
					value={`${data.cards.totalStudents} ta`}
					note={`${data.cards.trialStudentsCount || 0} ta sinovda`}
					icon='group'
				/>
				<StatCard
					label='QARZDORLAR'
					value={`${data.cards.debtorsCount} ta`}
					note='Faol nazorat talab etiladi'
					tone='danger'
					icon='money_off'
				/>
			</div>

			<section className={isRevenueFullscreen ? 'card chart-card chart-card-fullscreen revenue-chart-section' : 'card chart-card revenue-chart-section'}>
				<div className='card-head-row'>
					<div>
						<h3>Tushumlar dinamikasi</h3>
						<p>{chartSubtitleMap[chartPeriod]}</p>
					</div>
					<div className='chart-head-actions'>
						<div className='segmented-switch'>
							<button
								type='button'
								className={chartPeriod === 'daily' ? 'active' : ''}
								onClick={() => setChartPeriod('daily')}
							>
								Kunlik
							</button>
							<button
								type='button'
								className={chartPeriod === 'weekly' ? 'active' : ''}
								onClick={() => setChartPeriod('weekly')}
							>
								Haftalik
							</button>
							<button
								type='button'
								className={chartPeriod === 'monthly' ? 'active' : ''}
								onClick={() => setChartPeriod('monthly')}
							>
								Oylik
							</button>
						</div>
						<button
							type='button'
							className={isRevenueFullscreen ? 'chart-fullscreen-btn active' : 'chart-fullscreen-btn'}
							onClick={() => setIsRevenueFullscreen(value => !value)}
							title={isRevenueFullscreen ? 'To‘liq ekrandan chiqish' : 'To‘liq ekranda ko‘rish'}
						>
							<Icon name={isRevenueFullscreen ? 'fullscreen_exit' : 'fullscreen'} />
							<span>{isRevenueFullscreen ? 'Chiqish' : "To'liq"}</span>
						</button>
					</div>
				</div>
				<div className='chart-meta-strip'>
					<span className='chart-range-badge'>{chartRangeCaption}</span>
					<p>Ko'k chiziq davrlar bo'yicha real tushum o'zgarishini ko'rsatadi.</p>
				</div>
				<div className='revenue-insight-row'>
					<div className='revenue-insight-card primary'>
						<span>Joriy davr</span>
						<strong>{formatMoney(currentRevenue)}</strong>
						<small>{chartPointMeta[chartPointMeta.length - 1]?.label || '-'}</small>
					</div>
					<div className='revenue-insight-card'>
						<span>Eng yuqori nuqta</span>
						<strong>{formatMoney(peakRevenue)}</strong>
						<small>Tanlangan davrdagi pik tushum</small>
					</div>
					<div className={`revenue-insight-card ${chartHealthTone}`}>
						<span>{growthLabel}</span>
						<strong>{growthPercent}</strong>
						<small>
							{previousRevenue > 0
								? `${formatMoney(Math.abs(revenueDelta))} farq`
								: 'Oldingi davr yo‘q'}
						</small>
					</div>
					<div className='revenue-insight-card'>
						<span>Davrlar soni</span>
						<strong>{chartData.length} ta</strong>
						<small>{summaryLabelMap[chartPeriod].toLowerCase()} kesim</small>
					</div>
				</div>
				<div className='chart-filter-row'>
					<label>
						<span>Dan</span>
						<input
							type='date'
							value={dateRange.from}
							onChange={event =>
								setDateRange(current => ({ ...current, from: event.target.value }))
							}
						/>
					</label>
					<label>
						<span>Gacha</span>
						<input
							type='date'
							value={dateRange.to}
							onChange={event =>
								setDateRange(current => ({ ...current, to: event.target.value }))
							}
						/>
					</label>
					<button
						type='button'
						className='mini-pill'
						onClick={() => setDateRange({ from: '', to: '' })}
					>
						Filterni tozalash
					</button>
				</div>

				<div
					ref={revenueChartWrapRef}
					className={[
						isRevenueFullscreen ? 'revenue-chart-wrap is-fullscreen' : 'revenue-chart-wrap',
						isChartDragging ? 'is-dragging' : '',
					].join(' ').trim()}
					onPointerDown={handleRevenueChartPointerDown}
					onPointerMove={handleRevenueChartPointerMove}
					onPointerUp={stopRevenueChartDrag}
					onPointerCancel={stopRevenueChartDrag}
					style={{
						minHeight: isRevenueFullscreen ? '600px' : '420px',
						height: isRevenueFullscreen ? 'calc(100vh - 300px)' : '420px',
					}}
				>
					<div className='chart-y-axis'>
						{revenueAxisTicks.map((tick, index) => (
							<span key={`${tick}-${index}`}>{formatCompactMoney(Math.round(tick))}</span>
						))}
					</div>
					<div
						className='revenue-line-stage'
						style={{
							position: 'relative',
							height: isRevenueFullscreen ? 'calc(100vh - 420px)' : '306px',
							minHeight: isRevenueFullscreen ? '410px' : '306px',
							width: '100%',
						}}
					>
						<div className='chart-grid-lines'>
							<span />
							<span />
							<span />
							<span />
						</div>
						{hoveredPoint ? (
							<div
								className='chart-tooltip'
								style={{
									left: `${hoveredPoint.left}px`,
									top: `${hoveredPoint.top}px`,
								}}
							>
								<strong>{hoveredPoint.label}</strong>
								<span>{formatMoney(hoveredPoint.value)}</span>
							</div>
						) : null}
						{averageLineY !== null ? (
							<div className='chart-average-guide' style={{ top: `${averageLineY}%` }}>
								<span>O'rtacha {formatMoney(averageRevenue)}</span>
							</div>
						) : null}
						{chartData.length ? (
							<svg
								className='revenue-line-canvas'
								viewBox='0 0 100 100'
								preserveAspectRatio='none'
								style={{
									position: 'relative',
									width: '100%',
									height: '100%',
									display: 'block',
									overflow: 'visible',
									zIndex: 2,
								}}
							>
								<defs>
									<linearGradient id='revenueLineGradient' x1='0%' y1='0%' x2='100%' y2='0%'>
										<stop offset='0%' stopColor='#1d4ed8' />
										<stop offset='52%' stopColor='#2563eb' />
										<stop offset='100%' stopColor='#0ea5e9' />
									</linearGradient>
									<linearGradient id='revenueAreaGradient' x1='0%' y1='0%' x2='0%' y2='100%'>
										<stop offset='0%' stopColor='#2563eb' stopOpacity='0.28' />
										<stop offset='55%' stopColor='#38bdf8' stopOpacity='0.10' />
										<stop offset='100%' stopColor='#ffffff' stopOpacity='0' />
									</linearGradient>
								</defs>
								<polygon
									points={chartAreaPoints}
									fill='url(#revenueAreaGradient)'
									stroke='none'
								/>
								<polyline
									points={chartPoints}
									vectorEffect='non-scaling-stroke'
									fill='none'
									stroke='url(#revenueLineGradient)'
									strokeWidth='3'
									strokeLinecap='round'
									strokeLinejoin='round'
								/>
								{chartPointMeta.map(point => (
									<circle
										key={point.id}
										cx={point.x}
										cy={point.y}
										r={point.radius}
										vectorEffect='non-scaling-stroke'
										fill='#ffffff'
										stroke='#2563eb'
										strokeWidth='3'
									/>
								))}
							</svg>
						) : null}
						{chartData.length ? (
							<>
							{chartData.length === 1 && chartPointMeta[0] ? (
								<div
									aria-hidden='true'
									style={{
										position: 'absolute',
										left: 0,
										right: 0,
										top: `${chartPointMeta[0].y}%`,
										height: 5,
										background: '#2563eb',
										borderRadius: 999,
										boxShadow: 'none',
										transform: 'translateY(-50%)',
										zIndex: 3,
									}}
								/>
							) : null}
							<div className='revenue-line-hotspots'>
								{chartPointMeta.map(point => (
									<button
										key={point.id}
										type='button'
										className='revenue-line-hotspot'
										style={{ left: `${point.x}%`, top: `${point.y}%` }}
										onMouseEnter={event => {
											updateRevenueTooltip(event, point)
										}}
										onMouseLeave={() => setHoveredPoint(null)}
										onFocus={event => {
											updateRevenueTooltip(event, point)
										}}
										onBlur={() => setHoveredPoint(null)}
										aria-label={`${point.label}: ${formatMoney(point.value)}`}
									/>
								))}
							</div>
							<div className='revenue-chart-labels'>
								{chartData.map((item, index) => (
									<span key={`${item.period || item.label}-${index}`}>
										{formatShortTrendLabel(item.label || item.period)}
									</span>
								))}
							</div>
							</>
						) : (
							<div className='revenue-chart-empty'>
								Tanlangan davr bo'yicha tushum topilmadi.
							</div>
						)}
					</div>
				</div>

				<div className='chart-summary'>
					<div className='summary-mini'>
						<span>{summaryLabelMap[chartPeriod]}</span>
						<strong>{formatMoney(averageRevenue)}</strong>
					</div>
					<div className='summary-mini'>
						<span>{peakLabelMap[chartPeriod]}</span>
						<strong>{formatMoney(peakRevenue)}</strong>
					</div>
					<div className='summary-mini'>
						<span>{totalLabelMap[chartPeriod]}</span>
						<strong>{formatMoney(totalRevenue)}</strong>
					</div>
					<div className='summary-mini'>
						<span>{growthLabel}</span>
						<strong>{growthPercent}</strong>
					</div>
				</div>
			</section>

			<section className='card analytics-card'>
				<div className='card-head-row'>
					<div>
						<h3>Yo'nalishlar bo'yicha tahlil</h3>
						<p>Kurslar va guruhlar samaradorligi</p>
					</div>
					<Link to='/director/statistics' className='mini-pill link-btn'>
						To'liq hisobot
					</Link>
				</div>

				{data.courseAnalysis.length ? (
					<div className='table-shell responsive-cards'>
						<table>
							<thead>
								<tr>
									<th>YO'NALISH</th>
									<th>GURUHLAR</th>
									<th>O'QUVCHILAR</th>
									<th>TUSHUM</th>
									<th>SAMARADORLIK</th>
								</tr>
							</thead>
							<tbody>
								{data.courseAnalysis.map((course, index) => (
									<tr key={course.id}>
										<td data-label="Yo'nalish">
											<div className='course-analytics-name'>
												<div className={`course-icon tone-${index % 4}`}>
													{['EN', 'MT', 'WD', 'IT'][index % 4]}
												</div>
												<div>
													<strong>{course.title}</strong>
												</div>
											</div>
										</td>
										<td data-label='Guruhlar'>{course.groupsCount} ta</td>
										<td data-label="O'quvchilar">{course.studentsCount} ta</td>
										<td data-label='Tushum' className='amount-cell'>{formatMoney(course.revenue)}</td>
										<td
											data-label='Samaradorlik'
											className={
												course.efficiency >= 85 ? 'success-text' : 'warning-text'
											}
										>
											{course.efficiency}%
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<EmptyStateNotice message="Yo'nalishlar bo'yicha ma'lumot hozircha yo'q." />
				)}
			</section>
		</>
	)
}

function DirectorStudentsPage({ token }) {
	const [searchParams] = useSearchParams()
	const searchFromUrl = searchParams.get('search') || ''
	const { students } = useReceptionData(token, {
		search: searchFromUrl,
		status: '',
	})
	return (
		<>
			<PageHeader
				title="O'quvchilar"
				subtitle="Barcha studentlar bo'yicha umumiy nazorat"
			/>
			<section className='card table-card'>
				{students.length ? (
					<div className='table-shell responsive-cards'>
						<table>
							<thead>
								<tr>
									<th>O'quvchi</th>
									<th>Kurs</th>
									<th>O'qituvchi</th>
									<th>Balans</th>
									<th>Status</th>
									<th>To'lov muddati</th>
								</tr>
							</thead>
							<tbody>
								{students.map(student => (
									<tr key={student.id}>
										<td data-label="O'quvchi">{student.fullName}</td>
										<td data-label='Kurs'>{student.courseTitle}</td>
										<td data-label="O'qituvchi">{student.teacherName}</td>
										<td data-label='Balans' className='amount-cell'>
											{formatMoney(student.balance)}
										</td>
										<td data-label='Status'>
											<Badge tone={getStudentStatusMeta(student.status).tone}>
												{getStudentStatusMeta(student.status).label}
											</Badge>
										</td>
										<td data-label="To'lov muddati">
											{student.status === 'trial'
												? `${student.trialProgress || 0}/${student.trialRequired || 3} kun`
												: student.paymentDueDate || '-'}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<EmptyStateNotice message="O'quvchilar hozircha yo'q." />
				)}
			</section>
		</>
	)
}

function DirectorPaymentsPage({ token }) {
	const [payments] = usePaymentsData(token)
	const [finance, setFinance] = useState(null)
	const [error, setError] = useState('')

	useEffect(() => {
		setError('')
		api
			.getDirectorFinance(token)
			.then(setFinance)
			.catch(error => setError(error.message || "Moliya ma'lumotlari olinmadi"))
	}, [token])

	return (
		<>
			<PageHeader
				title="To'lovlar"
				subtitle='Barcha tranzaksiyalar va oqimlar'
			/>
			{error ? <div className='card'>{error}</div> : null}
			{finance ? (
				<div className='three-column-grid'>
					<StatCard
						label='Bugungi tushum'
						value={formatMoney(finance.totals.todayRevenue)}
						note='Bugungi kassa'
						icon='payments'
					/>
					<StatCard
						label="O'qituvchi oyligi"
						value={formatMoney(finance.totals.teachersPayroll || 0)}
						note={`${finance.payroll?.teachersCount || 0} ta ustoz`}
						tone='warning'
						icon='badge'
					/>
					<StatCard
						label='Sof foyda'
						value={formatMoney(finance.totals.netProfit || 0)}
						note='Joriy oy bo‘yicha'
						tone={Number(finance.totals.netProfit || 0) >= 0 ? 'success' : 'danger'}
						icon='monitoring'
					/>
					<StatCard
						label='Qarz summasi'
						value={formatMoney(finance.debtors.debtAmount)}
						note={`${finance.debtors.debtorsCount} ta qarzdor`}
						tone='danger'
						icon='warning'
					/>
					<StatCard
						label='Oylik tushum'
						value={formatMoney(finance.totals.monthlyRevenue)}
						note='Joriy oy'
						icon='leaderboard'
					/>
				</div>
			) : null}
			<section className='card table-card'>
				{finance ? (
					<div className='analytics-panels analytics-panels-tight'>
						<div className='analytics-panel'>
							<div className='card-head-row compact'>
								<h3>To'lov usullari</h3>
								<span className='mini-meta'>Qaysi kanal ko'proq ishlayapti</span>
							</div>
							<div className='metric-chip-grid'>
								{finance.paymentMethods.length ? (
									finance.paymentMethods.map(item => (
										<div key={item.method} className='metric-chip-card'>
											<strong>
												<Icon name={getPaymentMethodMeta(item.method).icon} className='inline-icon' />{' '}
												{getPaymentMethodMeta(item.method).label}
											</strong>
											<span>{item.count} ta tranzaksiya</span>
											<b>{formatMoney(item.amount)}</b>
										</div>
									))
								) : (
									<EmptyStateNotice message="To'lov usullari bo'yicha ma'lumot yo'q." />
								)}
							</div>
						</div>
						<div className='analytics-panel'>
							<div className='card-head-row compact'>
								<h3>Top o'qituvchilar</h3>
								<span className='mini-meta'>Tushum bo'yicha</span>
							</div>
							<div className='timeline-list'>
								{finance.topTeachers.length ? (
									finance.topTeachers.map(teacher => (
										<div key={teacher.id} className='timeline-item'>
											<strong>{teacher.fullName}</strong>
											<span>
												Tushum: {formatMoney(teacher.revenue)} · Oylik:{' '}
												{formatMoney(teacher.monthlySalary || 0)}
											</span>
										</div>
									))
								) : (
									<EmptyStateNotice message="O'qituvchilar bo'yicha ma'lumot yo'q." />
								)}
							</div>
						</div>
						<div className='analytics-panel'>
							<div className='card-head-row compact'>
								<h3>Xarajatlar tarkibi</h3>
								<span className='mini-meta'>Joriy oy hisoboti</span>
							</div>
							<div className='timeline-list'>
								<div className='timeline-item'>
									<strong>Ijara</strong>
									<span>{formatMoney(finance.expenses?.rent || 0)}</span>
								</div>
								<div className='timeline-item'>
									<strong>Reklama</strong>
									<span>{formatMoney(finance.expenses?.advertising || 0)}</span>
								</div>
								<div className='timeline-item'>
									<strong>Internet</strong>
									<span>{formatMoney(finance.expenses?.internet || 0)}</span>
								</div>
								<div className='timeline-item'>
									<strong>Administrator</strong>
									<span>{formatMoney(finance.expenses?.adminSalary || 0)}</span>
								</div>
								<div className='timeline-item'>
									<strong>Jami boshqa xarajatlar</strong>
									<span>{formatMoney(finance.totals.operatingExpenses || 0)}</span>
								</div>
							</div>
						</div>
					</div>
				) : null}
				<div className='table-shell responsive-cards'>
					{payments.length ? (
						<table>
							<thead>
								<tr>
									<th>O'quvchi</th>
									<th>Kurs</th>
									<th>Miqdor</th>
									<th>Usul</th>
									<th>Sana</th>
								</tr>
							</thead>
							<tbody>
								{payments.map(payment => (
									<tr key={payment.id}>
										<td data-label="O'quvchi">{payment.studentName}</td>
										<td data-label='Kurs'>{payment.courseTitle}</td>
										<td data-label='Miqdor' className='amount-cell'>{formatMoney(payment.amount)}</td>
										<td data-label='Usul'>{getPaymentMethodMeta(payment.method).shortLabel}</td>
										<td data-label='Sana'>{payment.createdAt}</td>
									</tr>
								))}
							</tbody>
						</table>
					) : (
						<EmptyStateNotice message="To'lovlar hozircha yo'q." />
					)}
				</div>
			</section>
		</>
	)
}

function DirectorAttendancePage() {
	return <Navigate to='/director/dashboard' replace />
}

function DirectorStatisticsPage({ token }) {
	const [data, setData] = useState(null)
	const [finance, setFinance] = useState(null)
	const [error, setError] = useState('')
	useEffect(() => {
		setError('')
		Promise.all([api.getDirectorOverview(token), api.getDirectorFinance(token)])
			.then(([overview, financeSummary]) => {
				setData(overview)
				setFinance(financeSummary)
			})
			.catch(error => setError(error.message || "Statistika olinmadi"))
	}, [token])
	if (error) return <div className='card'>{error}</div>
	if (!data) return <div className='card'>Yuklanmoqda...</div>
	return (
		<>
			<PageHeader
				title='Statistika'
				subtitle="Kurslar samaradorligi va KPI ko'rsatkichlari"
			/>
			<div className='three-column-grid'>
				<StatCard
					label='Jami student'
					value={`${data.cards.totalStudents} ta`}
					note='Umumiy bazada'
					icon='group'
				/>
				<StatCard
					label='Qarzdorlar'
					value={`${data.cards.debtorsCount} ta`}
					note='Nazorat ostida'
					tone='danger'
					icon='warning'
				/>
				<StatCard
					label='Oylik tushum'
					value={formatMoney(data.cards.monthlyRevenue)}
					note='Joriy davr'
					icon='payments'
				/>
			</div>
			{finance ? (
				<section className='card table-card'>
					<div className='card-head-row'>
						<h3>Kurslar bo'yicha tushum</h3>
						<p>Finance kesimi</p>
					</div>
					<div className='analytics-panels'>
						<div className='analytics-panel'>
							<h3>Kurslar</h3>
							<div className='timeline-list'>
								{finance.byCourse.length ? (
									finance.byCourse.map(item => (
										<div key={item.title} className='timeline-item'>
											<strong>{item.title}</strong>
											<span>{formatMoney(item.revenue)}</span>
										</div>
									))
								) : (
									<EmptyStateNotice message="Kurslar bo'yicha ma'lumot yo'q." />
								)}
							</div>
						</div>
						<div className='analytics-panel'>
							<h3>To'lov usullari</h3>
							<div className='metric-chip-grid'>
								{finance.paymentMethods.length ? (
									finance.paymentMethods.map(item => (
										<div key={item.method} className='metric-chip-card'>
											<strong>
												<Icon name={getPaymentMethodMeta(item.method).icon} className='inline-icon' />{' '}
												{getPaymentMethodMeta(item.method).label}
											</strong>
											<span>{item.count} ta</span>
											<b>{formatMoney(item.amount)}</b>
										</div>
									))
								) : (
									<EmptyStateNotice message="To'lov usullari bo'yicha ma'lumot yo'q." />
								)}
							</div>
						</div>
						<div className='analytics-panel'>
							<h3>Top o'qituvchilar</h3>
							<div className='timeline-list'>
								{finance.topTeachers.length ? (
									finance.topTeachers.map(teacher => (
										<div key={teacher.id} className='timeline-item'>
											<strong>{teacher.fullName}</strong>
											<span>
												Tushum: {formatMoney(teacher.revenue)} · Oylik:{' '}
												{formatMoney(teacher.monthlySalary || 0)}
											</span>
										</div>
									))
								) : (
									<EmptyStateNotice message="O'qituvchilar bo'yicha ma'lumot yo'q." />
								)}
							</div>
						</div>
					</div>
				</section>
			) : null}
			<section className='card table-card'>
				<div className='card-head-row'>
					<div>
						<h3>Student va o'qituvchi analytics'i</h3>
						<p>Statuslar, qabul oqimi va ustoz samaradorligi</p>
					</div>
				</div>
				<div className='analytics-panels'>
					<div className='analytics-panel'>
						<h3>Student statusi</h3>
						<div className='metric-chip-grid'>
							<div className='metric-chip-card'>
								<strong>Faol</strong>
								<b>{data.studentStatusBreakdown.activeCount || 0} ta</b>
							</div>
							<div className='metric-chip-card warning'>
								<strong>Sinovda</strong>
								<b>{data.studentStatusBreakdown.trialCount || 0} ta</b>
							</div>
							<div className='metric-chip-card danger'>
								<strong>Qarzdor</strong>
								<b>{data.studentStatusBreakdown.debtorCount || 0} ta</b>
							</div>
						</div>
					</div>
					<div className='analytics-panel'>
						<h3>Qabul trendi</h3>
						<p className='mini-meta'>Oylar bo'yicha yangi o'quvchilar soni</p>
						<TrendLineChart
							items={data.admissionsTrend.map(item => ({ label: item.period, value: item.count }))}
							valueKey='value'
							labelKey='label'
							formatValue={value => `${Math.round(Number(value || 0))} ta`}
							emptyText="Qabul trendi hali shakllanmagan"
						/>
					</div>
				</div>
				<div className='table-shell responsive-cards top-space'>
					{data.teacherPerformance.length ? (
						<table>
							<thead>
								<tr>
									<th>O'qituvchi</th>
									<th>Student</th>
									<th>Faol</th>
									<th>Sinov</th>
									<th>Qarzdor</th>
									<th>Davomat</th>
									<th>Tushum</th>
								</tr>
							</thead>
							<tbody>
								{data.teacherPerformance.map(teacher => (
									<tr key={teacher.id}>
										<td data-label="O'qituvchi">{teacher.fullName}</td>
										<td data-label='Student'>{teacher.studentsCount} ta</td>
										<td data-label='Faol'>{teacher.activeStudentsCount} ta</td>
										<td data-label='Sinov'>{teacher.trialStudentsCount} ta</td>
										<td data-label='Qarzdor'>{teacher.debtorsCount} ta</td>
										<td data-label='Davomat' className={Number(teacher.attendancePercent || 0) >= 80 ? 'success-text' : 'warning-text'}>
											{Number(teacher.attendancePercent || 0)}%
										</td>
										<td data-label='Tushum' className='amount-cell'>{formatMoney(teacher.revenue)}</td>
									</tr>
								))}
							</tbody>
						</table>
					) : (
						<EmptyStateNotice message="O'qituvchilar statistikasi hozircha yo'q." />
					)}
				</div>
			</section>
		</>
	)
}

function DirectorComplaintsPage({ token }) {
	const [items, setItems] = useState([])
	const [loading, setLoading] = useState(true)
	const [savingId, setSavingId] = useState(null)
	const [error, setError] = useState('')
	const statusMeta = {
		new: { label: 'Yangi', tone: 'warning' },
		reviewing: { label: "Ko'rib chiqilmoqda", tone: 'info' },
		resolved: { label: 'Hal qilindi', tone: 'success' },
		rejected: { label: 'Rad etildi', tone: 'danger' },
	}

	async function loadComplaints() {
		try {
			setError('')
			const data = await api.getDirectorComplaints(token)
			setItems(Array.isArray(data) ? data : [])
		} catch (err) {
			setError(err.message || 'Shikoyatlar olinmadi')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		let cancelled = false
		async function load() {
			try {
				setError('')
				const data = await api.getDirectorComplaints(token)
				if (!cancelled) setItems(Array.isArray(data) ? data : [])
			} catch (err) {
				if (!cancelled) setError(err.message || 'Shikoyatlar olinmadi')
			} finally {
				if (!cancelled) setLoading(false)
			}
		}
		load()
		const interval = window.setInterval(load, 25000)
		return () => {
			cancelled = true
			window.clearInterval(interval)
		}
	}, [token])

	async function handleStatus(id, status) {
		setSavingId(id)
		try {
			await api.updateDirectorComplaintStatus(token, id, status)
			await loadComplaints()
		} catch (err) {
			await showError(err.message)
		} finally {
			setSavingId(null)
		}
	}

	if (loading) return <div className='card'>Yuklanmoqda...</div>
	if (error) return <div className='card'>{error}</div>

	return (
		<>
			<PageHeader title='Shikoyatlar' subtitle="Studentlardan kelgan ustoz bo'yicha murojaatlar" />
			<div className='three-column-grid'>
				<StatCard label='Yangi' value={`${items.filter(item => item.status === 'new').length} ta`} note="Ko'rib chiqilmagan" icon='report' tone='warning' />
				<StatCard label="Jarayonda" value={`${items.filter(item => item.status === 'reviewing').length} ta`} note='Director nazoratida' icon='visibility' />
				<StatCard label='Yopilgan' value={`${items.filter(item => ['resolved', 'rejected'].includes(item.status)).length} ta`} note='Hal qilinganlar' icon='task_alt' tone='success' />
			</div>
			<section className='card complaints-board'>
				{items.length ? (
					items.map(item => {
						const meta = statusMeta[item.status] || statusMeta.new
						return (
							<article key={item.id} className='complaint-card-item'>
								<div className='complaint-main'>
									<div className='complaint-avatar'>{getInitials(item.studentName)}</div>
									<div>
										<div className='complaint-title-row'>
											<strong>{item.studentName}</strong>
											<Badge tone={meta.tone}>{meta.label}</Badge>
										</div>
										<p>{item.reason}</p>
										<span>
											{item.courseTitle || '-'} · Ustoz: {item.teacherName || '-'} · {item.createdAt}
										</span>
									</div>
								</div>
								<div className='complaint-actions'>
									<button type='button' className='page-btn secondary' disabled={savingId === item.id} onClick={() => handleStatus(item.id, 'reviewing')}>
										<Icon name='visibility' />
										Ko'rib chiqish
									</button>
									<button type='button' className='page-btn success' disabled={savingId === item.id} onClick={() => handleStatus(item.id, 'resolved')}>
										<Icon name='task_alt' />
										Hal qilindi
									</button>
									<button type='button' className='page-btn danger' disabled={savingId === item.id} onClick={() => handleStatus(item.id, 'rejected')}>
										<Icon name='block' />
										Rad etish
									</button>
								</div>
							</article>
						)
					})
				) : (
					<EmptyStateNotice message="Shikoyatlar hozircha yo'q." />
				)}
			</section>
		</>
	)
}

function DirectorSettingsPage({ meta, token, onProfileUpdated }) {
	const [bundle, setBundle] = useState(null)
	const [error, setError] = useState('')
	const [courseModal, setCourseModal] = useState(null)
	const [teacherModal, setTeacherModal] = useState(null)
	const [telegramChannels, setTelegramChannels] = useState([])
	const [broadcastForm, setBroadcastForm] = useState({
		title: '',
		message: '',
		audience: 'students',
	})
	const [expenseForm, setExpenseForm] = useState({
		rent_expense: 0,
		advertising_expense: 0,
		internet_expense: 0,
		admin_salary_expense: 0,
	})
	const [settingsSaving, setSettingsSaving] = useState('')

	useEffect(() => {
		setError('')
		api
			.getSettings(token)
			.then(setBundle)
			.catch(error => setError(error.message || "Sozlamalar olinmadi"))
	}, [token])

	useEffect(() => {
		if (!bundle?.settings) return
		setExpenseForm({
			rent_expense: Number(bundle.settings.rent_expense || 0),
			advertising_expense: Number(bundle.settings.advertising_expense || 0),
			internet_expense: Number(bundle.settings.internet_expense || 0),
			admin_salary_expense: Number(bundle.settings.admin_salary_expense || 0),
		})
		try {
			const parsed =
				bundle.telegramChannels ||
				(bundle.settings.telegram_required_channels
					? JSON.parse(bundle.settings.telegram_required_channels)
					: [])
			setTelegramChannels(Array.isArray(parsed) ? parsed : [])
		} catch {
			setTelegramChannels([])
		}
	}, [bundle])

	if (error) return <div className='card'>{error}</div>
	if (!bundle) return <div className='card'>Sozlamalar yuklanmoqda...</div>

	async function handleCourseSubmit(event, form) {
		event.preventDefault()
		if (settingsSaving) return
		try {
			setSettingsSaving('course')
			if (form.id) {
				await api.updateCourse(token, form.id, form)
			} else {
				await api.createCourse(token, form)
			}
			setCourseModal(null)
			setBundle(await api.getSettings(token))
		} catch (err) {
			await showError(err.message)
		} finally {
			setSettingsSaving('')
		}
	}

	async function handleDeleteCourse(courseId) {
		await api.deleteCourse(token, courseId)
		setBundle(await api.getSettings(token))
	}

	async function handleRestoreCourse(course) {
		await api.updateCourse(token, course.id, {
			title: course.title,
			monthlyFee: course.monthlyFee,
			schedule: course.schedule,
			isActive: true,
		})
		setBundle(await api.getSettings(token))
	}

	async function handleTeacherSubmit(event, form) {
		event.preventDefault()
		if (settingsSaving) return
		if (!form.courseIds?.length) {
			await showError("O'qituvchiga kamida bitta kurs biriktiring")
			return
		}
		try {
			setSettingsSaving('teacher')
			if (form.id) {
				await api.updateTeacher(token, form.id, form)
			} else {
				await api.createTeacher(token, form)
			}
			setTeacherModal(null)
			setBundle(await api.getSettings(token))
		} catch (err) {
			await showError(err.message)
		} finally {
			setSettingsSaving('')
		}
	}

	async function handleDeleteTeacher(teacherId) {
		await api.deleteTeacher(token, teacherId)
		setBundle(await api.getSettings(token))
	}

	async function handleSaveExpenses(event) {
		event.preventDefault()
		if (settingsSaving) return
		try {
			setSettingsSaving('expenses')
			await api.saveSettings(token, expenseForm)
			setBundle(await api.getSettings(token))
			toast.fire({ icon: 'success', title: 'Xarajatlar saqlandi' })
		} finally {
			setSettingsSaving('')
		}
	}

	function handleChannelChange(index, key, value) {
		setTelegramChannels(current =>
			current.map((item, itemIndex) =>
				itemIndex === index ? { ...item, [key]: value } : item,
			),
		)
	}

	function handleAddChannel() {
		setTelegramChannels(current => [...current, { id: '', title: '', url: '' }])
	}

	function handleRemoveChannel(index) {
		setTelegramChannels(current => current.filter((_, itemIndex) => itemIndex !== index))
	}

	async function handleSaveChannels() {
		if (settingsSaving) return
		const sanitized = telegramChannels
			.map(item => ({
				id: String(item.id || '').trim(),
				title: String(item.title || '').trim(),
				url: String(item.url || '').trim(),
			}))
			.filter(item => item.id || item.url)
		try {
			setSettingsSaving('channels')
			await api.saveSettings(token, { telegram_required_channels: sanitized })
			setBundle(await api.getSettings(token))
			toast.fire({ icon: 'success', title: 'Telegram kanallari saqlandi' })
		} finally {
			setSettingsSaving('')
		}
	}

	async function handleSendBroadcast(event) {
		event.preventDefault()
		if (settingsSaving) return
		if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
			await showError('Sarlavha va xabar matnini kiriting')
			return
		}
		try {
			setSettingsSaving('broadcast')
			const result = await api.broadcastNotifications(token, broadcastForm)
			setBroadcastForm(current => ({ ...current, title: '', message: '' }))
			toast.fire({
				icon: 'success',
				title: `Yuborildi: sayt ${result.siteCount || 0} ta, bot ${result.botCount || 0} ta`,
			})
		} finally {
			setSettingsSaving('')
		}
	}

	const audienceOptions = [
		{ value: 'students', label: "O'quvchilarga", note: "Sayt va bot orqali faqat o'quvchilarga boradi." },
		{ value: 'teachers', label: "O'qituvchilarga", note: "Sayt va bot orqali faqat o'qituvchilarga boradi." },
		{ value: 'reception', label: 'Receptionga', note: "Ichki admin xabar sifatida receptionga boradi." },
		{ value: 'directors', label: 'Direktorlarga', note: "Faqat direktor akkauntlariga yuboriladi." },
		{ value: 'staff', label: 'Xodimlarga', note: "Teacher, reception va directorlarga yuboriladi." },
		{ value: 'students_teachers', label: "O'quvchi va o'qituvchilarga", note: "Sayt va bot orqali student ham, teacher ham oladi." },
		{ value: 'bot_only', label: 'Botga', note: "Faol Telegram ulanishi bor foydalanuvchilarga faqat botdan ketadi." },
		{ value: 'all', label: 'Barchaga', note: "Sayt bildirishnomasi va bot orqali hamma foydalanuvchiga boradi." },
	]
	const selectedAudience =
		audienceOptions.find(option => option.value === broadcastForm.audience) || audienceOptions[0]

	return (
		<>
			<PageHeader
				title='Sozlamalar'
				subtitle='Direktor profili va tizim parametrlari'
			/>
			<ProfileSettingsCard
				token={token}
				meta={meta}
				title='Direktor profili'
				onProfileUpdated={onProfileUpdated}
			/>
			<section className='card settings-card'>
				<div className='card-head-row'>
					<div>
						<h3>Xarajatlar</h3>
						<p>Ijara, reklama, internet va administrator oyligi</p>
					</div>
				</div>
				<form className='modal-form' onSubmit={handleSaveExpenses}>
					<div className='field-grid'>
						<div>
							<label>Ijara</label>
							<input
								type='number'
								value={expenseForm.rent_expense}
								onChange={event =>
									setExpenseForm(current => ({
										...current,
										rent_expense: Number(event.target.value || 0),
									}))
								}
							/>
						</div>
						<div>
							<label>Reklama</label>
							<input
								type='number'
								value={expenseForm.advertising_expense}
								onChange={event =>
									setExpenseForm(current => ({
										...current,
										advertising_expense: Number(event.target.value || 0),
									}))
								}
							/>
						</div>
						<div>
							<label>Internet</label>
							<input
								type='number'
								value={expenseForm.internet_expense}
								onChange={event =>
									setExpenseForm(current => ({
										...current,
										internet_expense: Number(event.target.value || 0),
									}))
								}
							/>
						</div>
						<div>
							<label>Administrator oyligi</label>
							<input
								type='number'
								value={expenseForm.admin_salary_expense}
								onChange={event =>
									setExpenseForm(current => ({
										...current,
										admin_salary_expense: Number(event.target.value || 0),
									}))
								}
							/>
						</div>
					</div>
					<div className='chart-summary'>
						<div className='summary-mini'>
							<span>BOSHQA XARAJATLAR</span>
							<strong>
								{formatMoney(
									Number(expenseForm.rent_expense || 0) +
										Number(expenseForm.advertising_expense || 0) +
										Number(expenseForm.internet_expense || 0) +
										Number(expenseForm.admin_salary_expense || 0),
								)}
							</strong>
						</div>
					</div>
					<div className='modal-actions'>
						<ActionButton type='submit' icon='save' disabled={settingsSaving === 'expenses'}>
							{settingsSaving === 'expenses' ? 'Saqlanmoqda...' : 'Xarajatlarni saqlash'}
						</ActionButton>
					</div>
				</form>
			</section>
			<section className='card settings-card'>
				<div className='card-head-row'>
					<div>
						<h3>Telegram kanallari</h3>
						<p>Botdan foydalanishdan oldin obuna bo‘lishi kerak bo‘lgan kanal va guruhlar</p>
					</div>
					<ActionButton secondary icon='add' onClick={handleAddChannel}>
						Kanal qo'shish
					</ActionButton>
				</div>
				<div className='stack-list compact-gap'>
					{telegramChannels.length ? telegramChannels.map((channel, index) => (
						<div key={`channel-${index}`} className='channel-row-card'>
							<div className='field-grid three-columns'>
								<div>
									<label>Nomi</label>
									<input
										type='text'
										value={channel.title || ''}
										onChange={event => handleChannelChange(index, 'title', event.target.value)}
										placeholder='Matematika kanali'
									/>
								</div>
								<div>
									<label>Chat ID yoki @username</label>
									<input
										type='text'
										value={channel.id || ''}
										onChange={event => handleChannelChange(index, 'id', event.target.value)}
										placeholder='@ilmnest_math'
									/>
								</div>
								<div>
									<label>Link</label>
									<input
										type='text'
										value={channel.url || ''}
										onChange={event => handleChannelChange(index, 'url', event.target.value)}
										placeholder='https://t.me/ilmnest_math'
									/>
								</div>
							</div>
							<div className='inline-end'>
								<button
									type='button'
									className='table-icon-button danger'
									onClick={() => handleRemoveChannel(index)}
								>
									<Icon name='delete' />
								</button>
							</div>
						</div>
					)) : <EmptyStateNotice message='Majburiy kanal hozircha qo‘shilmagan.' />}
				</div>
				<div className='modal-actions top-divider'>
					<ActionButton icon='save' onClick={handleSaveChannels} disabled={settingsSaving === 'channels'}>
						{settingsSaving === 'channels' ? 'Saqlanmoqda...' : 'Kanallarni saqlash'}
					</ActionButton>
				</div>
			</section>
			<section className='card settings-card'>
				<div className='card-head-row'>
					<div>
						<h3>Bildirishnoma yuborish</h3>
						<p>Sayt va bot foydalanuvchilariga ommaviy xabar yuborish</p>
					</div>
				</div>
				<form className='modal-form' onSubmit={handleSendBroadcast}>
					<div className='field-grid'>
						<div>
							<label>Sarlavha</label>
							<input
								type='text'
								value={broadcastForm.title}
								onChange={event =>
									setBroadcastForm(current => ({ ...current, title: event.target.value }))
								}
								placeholder='Masalan: Oylik to‘lov vaqti keldi'
							/>
						</div>
						<div>
							<label>Qayerga yuboriladi</label>
							<select
								value={broadcastForm.audience}
								onChange={event =>
									setBroadcastForm(current => ({ ...current, audience: event.target.value }))
								}
							>
								{audienceOptions.map(option => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
					</div>
					<div className='broadcast-audience-note'>
						<Badge tone='default'>{selectedAudience.label}</Badge>
						<p>{selectedAudience.note}</p>
					</div>
					<div>
						<label>Xabar matni</label>
						<textarea
							rows={5}
							value={broadcastForm.message}
							onChange={event =>
								setBroadcastForm(current => ({ ...current, message: event.target.value }))
							}
							placeholder='Masalan: Hurmatli o‘quvchi, may oyligi uchun to‘lov muddati keldi.'
						/>
					</div>
					<div className='modal-actions'>
						<ActionButton type='submit' icon='send' disabled={settingsSaving === 'broadcast'}>
							{settingsSaving === 'broadcast' ? 'Yuborilmoqda...' : 'Xabarni yuborish'}
						</ActionButton>
					</div>
				</form>
			</section>
			<section className='card table-card'>
				<div className='card-head-row'>
					<h3>Kurslar boshqaruvi</h3>
					<ActionButton
						icon='add'
						onClick={() =>
							setCourseModal({ title: '', monthlyFee: 0, schedule: '' })
						}
					>
						Yangi kurs
					</ActionButton>
				</div>
				{bundle.courses.length ? (
					<div className='table-shell'>
						<table>
							<thead>
								<tr>
									<th>Nomi</th>
									<th>Oylik to'lov</th>
									<th>Jadval</th>
									<th>Holat</th>
									<th>Amallar</th>
								</tr>
							</thead>
							<tbody>
								{bundle.courses.map(course => (
									<tr key={course.id}>
										<td data-label='Nomi'>{course.title}</td>
										<td data-label="Oylik to'lov">{formatMoney(course.monthlyFee)}</td>
										<td data-label='Jadval'>{course.schedule}</td>
										<td data-label='Holat'>
											<Badge tone={course.isActive ? 'success' : 'gray'}>
												{course.isActive ? 'Faol' : 'Ochiq emas'}
											</Badge>
										</td>
										<td data-label='Amallar'>
											<div className='table-actions'>
												<button
													type='button'
													onClick={() => setCourseModal({ ...course })}
												>
													<Icon name='edit' />
												</button>
												<button
													type='button'
													onClick={() =>
														course.isActive
															? handleDeleteCourse(course.id)
															: handleRestoreCourse(course)
													}
												>
													<Icon name={course.isActive ? 'delete' : 'restore'} />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<EmptyStateNotice message="Kurslar hozircha qo'shilmagan." />
				)}
			</section>
			<section className='card table-card'>
				<div className='card-head-row'>
					<h3>O'qituvchilar</h3>
					<ActionButton
						icon='person_add'
						onClick={() =>
							setTeacherModal({
								fullName: '',
								username: '',
								phone: '',
								monthlySalary: 0,
								password: '',
								courseIds: [],
							})
						}
					>
						Yangi o'qituvchi
					</ActionButton>
				</div>
				{bundle.teachers.length ? (
					<div className='table-shell responsive-cards'>
						<table>
							<thead>
								<tr>
									<th>F.I.Sh</th>
									<th>Username</th>
									<th>Telefon</th>
									<th>Oylik</th>
									<th>Kurslar</th>
									<th>Amallar</th>
								</tr>
							</thead>
							<tbody>
								{bundle.teachers.map(teacher => (
									<tr key={teacher.id}>
										<td data-label='F.I.Sh'>{teacher.fullName}</td>
										<td data-label='Username'>{teacher.username}</td>
										<td data-label='Telefon'>{teacher.phone || '-'}</td>
										<td data-label='Oylik' className='amount-cell'>
											{formatMoney(teacher.monthlySalary || 0)}
										</td>
										<td data-label='Kurslar'>
											{(teacher.courseIds || []).length
												? bundle.courses
														.filter(course =>
															(teacher.courseIds || []).includes(course.id),
														)
														.map(course => course.title)
														.join(', ')
												: '-'}
										</td>
										<td data-label='Amallar'>
											<div className='table-actions'>
												<button
													type='button'
													onClick={() =>
														setTeacherModal({
															...teacher,
															password: '',
															courseIds: teacher.courseIds || [],
														})
													}
												>
													<Icon name='edit' />
												</button>
												<button
													type='button'
													onClick={() => handleDeleteTeacher(teacher.id)}
												>
													<Icon name='delete' />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<EmptyStateNotice message="O'qituvchilar hozircha qo'shilmagan." />
				)}
			</section>
			{courseModal ? (
				<CourseModal
					initialData={courseModal}
					onClose={() => setCourseModal(null)}
					onSubmit={handleCourseSubmit}
				/>
			) : null}
			{teacherModal ? (
				<TeacherModal
					initialData={teacherModal}
					courses={bundle.courses.filter(course => course.isActive !== false)}
					onClose={() => setTeacherModal(null)}
					onSubmit={handleTeacherSubmit}
				/>
			) : null}
		</>
	)
}

function ProtectedApp({ auth, meta, onLogout, onProfileUpdated }) {
	const user = meta.user

	return (
		<RoleLayout user={user} onLogout={onLogout} token={auth.token}>
			<Routes>
				<Route
					path='/'
					element={<Navigate to={ROLE_DEFAULT_PATH[user.role]} replace />}
				/>

				<Route
					path='/student/dashboard'
					element={<StudentDashboardPage token={auth.token} />}
				/>
				<Route
					path='/student/attendance'
					element={<StudentAttendancePage token={auth.token} />}
				/>
				<Route
					path='/student/payments'
					element={<StudentPaymentsPage token={auth.token} />}
				/>
				<Route
					path='/student/schedule'
					element={<StudentSchedulePage token={auth.token} />}
				/>
				<Route
					path='/student/notifications'
					element={<StudentNotificationsPage token={auth.token} />}
				/>
				<Route
					path='/student/profile'
					element={<StudentProfilePage token={auth.token} />}
				/>
				<Route
					path='/student/settings'
					element={<StudentSettingsPage token={auth.token} />}
				/>

				<Route
					path='/reception/dashboard'
					element={<ReceptionDashboardPage token={auth.token} />}
				/>
				<Route
					path='/reception/students'
					element={<ReceptionStudentsPage token={auth.token} meta={meta} />}
				/>
				<Route
					path='/reception/payments'
					element={<ReceptionPaymentsPage token={auth.token} meta={meta} />}
				/>
				<Route
					path='/reception/requests'
					element={<ReceptionContactRequestsPage token={auth.token} />}
				/>
				<Route
					path='/reception/attendance'
					element={<ReceptionAttendancePage token={auth.token} meta={meta} />}
				/>
				<Route
					path='/reception/settings'
					element={
						<ReceptionSettingsPage
							token={auth.token}
							meta={meta}
							onProfileUpdated={onProfileUpdated}
						/>
					}
				/>

				<Route
					path='/teacher/dashboard'
					element={<TeacherDashboardPage token={auth.token} />}
				/>
				<Route
					path='/teacher/attendance'
					element={<TeacherAttendancePage token={auth.token} />}
				/>
				<Route
					path='/teacher/groups'
					element={<TeacherGroupsPage token={auth.token} />}
				/>
				<Route
					path='/teacher/statistics'
					element={<TeacherStatisticsPage token={auth.token} />}
				/>
				<Route
					path='/teacher/settings'
					element={
						<TeacherSettingsPage
							meta={meta}
							token={auth.token}
							onProfileUpdated={onProfileUpdated}
						/>
					}
				/>

				<Route
					path='/director/dashboard'
					element={<DirectorDashboardPage token={auth.token} />}
				/>
				<Route
					path='/director/students'
					element={<DirectorStudentsPage token={auth.token} />}
				/>
				<Route
					path='/director/payments'
					element={<DirectorPaymentsPage token={auth.token} />}
				/>
				<Route
					path='/director/attendance'
					element={<DirectorAttendancePage token={auth.token} />}
				/>
				<Route
					path='/director/statistics'
					element={<DirectorStatisticsPage token={auth.token} />}
				/>
				<Route
					path='/director/complaints'
					element={<DirectorComplaintsPage token={auth.token} />}
				/>
				<Route
					path='/director/settings'
					element={
						<DirectorSettingsPage
							meta={meta}
							token={auth.token}
							onProfileUpdated={onProfileUpdated}
						/>
					}
				/>

				<Route
					path='*'
					element={<Navigate to={ROLE_DEFAULT_PATH[user.role]} replace />}
				/>
			</Routes>
		</RoleLayout>
	)
}

function AppInner() {
	useBuildRefreshGuard()
	const navigate = useNavigate()
	const location = useLocation()
	const [auth, setAuth] = useState(() => {
		const raw = localStorage.getItem('intelligent-auth')
		return raw ? JSON.parse(raw) : null
	})
	const [meta, setMeta] = useState(null)
	const [autoLoginLoading, setAutoLoginLoading] = useState(false)

	useEffect(() => {
		const search = new URLSearchParams(location.search)
		const access = search.get('access')
		const studentToken = search.get('studentToken')
		if (!access && !studentToken) return
		if (autoLoginLoading) return

		if (studentToken) {
			localStorage.setItem(
				'intelligent-auth',
				JSON.stringify({ token: studentToken, user: { role: 'student' } }),
			)
			setAuth({ token: studentToken, user: { role: 'student' } })
			navigate(location.pathname, { replace: true })
			return
		}

		setAutoLoginLoading(true)
		api
			.studentAccessLogin({ accessToken: access })
			.then(data => {
				localStorage.setItem('intelligent-auth', JSON.stringify(data))
				setAuth(data)
				navigate(ROLE_DEFAULT_PATH[data.user.role], { replace: true })
			})
			.catch(async err => {
				await showError(err.message)
				navigate('/student/login', { replace: true })
			})
			.finally(() => setAutoLoginLoading(false))
	}, [autoLoginLoading, location.pathname, location.search, navigate])

	useEffect(() => {
		if (!auth?.token) {
			setMeta(null)
			return
		}

		api
			.getMeta(auth.token)
			.then(data => {
				if (!ROLE_DEFAULT_PATH[data.user.role]) {
					localStorage.removeItem('intelligent-auth')
					setAuth(null)
					setMeta(null)
					navigate('/', { replace: true })
					return
				}
				setMeta(data)
				if (
					window.location.pathname === '/admins' ||
					window.location.pathname === '/login'
				) {
					navigate(ROLE_DEFAULT_PATH[data.user.role], { replace: true })
				}
			})
			.catch(() => {
				localStorage.removeItem('intelligent-auth')
				setAuth(null)
				setMeta(null)
				navigate('/admins', { replace: true })
			})
	}, [auth?.token, navigate])

	function handleProfileUpdated(profile) {
		setMeta(current =>
			current
				? {
						...current,
						user: {
							...current.user,
							...profile,
						},
					}
				: current,
		)
	}

	function handleLogin(data) {
		localStorage.setItem('intelligent-auth', JSON.stringify(data))
		setAuth(data)
		navigate(ROLE_DEFAULT_PATH[data.user.role], { replace: true })
	}

	function handleLogout() {
		const target = auth?.user?.role === 'student' ? '/student/login' : '/admins'
		localStorage.removeItem('intelligent-auth')
		setAuth(null)
		setMeta(null)
		navigate(target, { replace: true })
	}

	if (autoLoginLoading) {
		return (
			<>
				<LanguageRuntime />
				<ThemeRuntime />
				<div className='loading-screen'>Kabinetga kirilmoqda...</div>
			</>
		)
	}

	if (!auth) {
		return (
			<>
				<LanguageRuntime />
				<ThemeRuntime />
				<Routes>
					<Route path='/' element={<HomePage />} />
					<Route path='/aloqa' element={<HomePage />} />
					<Route path='/dasturchilar' element={<DevelopersPage />} />
					<Route path='/dasturchilar/:slug' element={<DeveloperDetailPage />} />
					<Route path='/dasturchilar/login' element={<DeveloperPortalPage />} />
					<Route path='/student/login' element={<StudentLoginPage onLogin={handleLogin} />} />
					<Route path='/register' element={<StudentRegisterPage />} />
					<Route path='/admins' element={<AdminLoginPage onLogin={handleLogin} />} />
					<Route path='*' element={<Navigate to='/' replace />} />
				</Routes>
			</>
		)
	}

	if (!meta) {
		return (
			<>
				<LanguageRuntime />
				<ThemeRuntime />
				<div className='loading-screen'>Yuklanmoqda...</div>
			</>
		)
	}

	return (
		<>
			<LanguageRuntime />
			<ThemeRuntime />
			<Routes>
				<Route path='/' element={<HomePage />} />
				<Route path='/aloqa' element={<HomePage />} />
				<Route path='/dasturchilar' element={<DevelopersPage />} />
				<Route path='/dasturchilar/:slug' element={<DeveloperDetailPage />} />
				<Route path='/dasturchilar/login' element={<DeveloperPortalPage />} />
				<Route
					path='/*'
					element={
						<ProtectedApp
							auth={auth}
							meta={meta}
							onLogout={handleLogout}
							onProfileUpdated={handleProfileUpdated}
						/>
					}
				/>
			</Routes>
		</>
	)
}

export default function App() {
	return (
		<BrowserRouter>
			<AppInner />
		</BrowserRouter>
	)
}
