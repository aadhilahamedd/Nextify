import { COMPANY } from '../utils/company';

const ADDRESS = COMPANY.addressLines.join(', ');
const UPDATED = '28 October 2026';
const UPDATED_AR = '٢٨ أكتوبر ٢٠٢٦';

export function getPrivacyContent(lang = 'en') {
  if (lang === 'ar') {
    return {
      kicker: 'قانوني',
      title: 'سياسة الخصوصية',
      updated: `آخر تحديث: ${UPDATED_AR}`,
      intro: `تحترم ${COMPANY.name} خصوصيتكم. توضح هذه السياسة البيانات الشخصية التي نجمعها عند استخدام موقع ${COMPANY.website} أو الحجز أو التواصل معنا، وكيف نستخدمها ونحميها. نعمل من الرياض، المملكة العربية السعودية، وفق نظام حماية البيانات الشخصية.`,
      sections: [
        {
          heading: '1. من نحن',
          paragraphs: [
            `${COMPANY.legalName} شركة نقل وسائق خاص مرخّصة في المملكة العربية السعودية. السجل التجاري ${COMPANY.tga.crNumber}، وترخيص الهيئة العامة للنقل رقم ${COMPANY.tga.licenseNumber} (${COMPANY.tga.licenseType}).`,
            `العنوان: ${ADDRESS}. البريد: ${COMPANY.email}. الهاتف: ${COMPANY.phonePrimary}.`,
          ],
        },
        {
          heading: '2. البيانات التي نجمعها',
          paragraphs: ['قد نجمع الفئات التالية عند استخدام خدماتنا:'],
          list: [
            'بيانات الهوية والتواصل: الاسم الكامل، البريد الإلكتروني، رقم الجوال أو الهاتف.',
            'بيانات الحجز: نوع الخدمة، المركبة، تاريخ ووقت الرحلة، مواقع الاستلام والتوصيل، عدد الركاب، الأمتعة، وطلبات خاصة.',
            'بيانات الدفع: حالة الدفع والمبلغ والعملة ومرجع المعاملة عبر مزود الدفع. لا نخزّن رقم البطاقة الكامل أو رمز CVV على خوادمنا.',
            'بيانات الحساب للإدارة عند تسجيل الدخول (البريد وكلمة المرور المشفّرة حسب النظام).',
            'بيانات الجهاز والاستخدام: عنوان IP تقريبي، نوع المتصفح، الصفحات التي تزورونها، وتفضيل اللغة.',
            'المراسلات: رسائل نموذج التواصل، واتساب، والبريد الإلكتروني.',
          ],
        },
        {
          heading: '3. ملفات تعريف الارتباط والتقنيات المشابهة',
          paragraphs: [
            'نستخدم ملفات تعريف الارتباط والتخزين المحلي في المتصفح لتشغيل الموقع بشكل آمن ولتحسين التجربة. يمكنكم التحكم في ملفات تعريف الارتباط من إعدادات المتصفح. رفض الملفات الضرورية قد يمنع إتمام الحجز أو تسجيل الدخول.',
          ],
          list: [
            'ملفات ضرورية: تُستخدم لتشغيل الصفحات، والحفاظ على جلسة آمنة، وتفضيل اللغة.',
            'ملفات وظيفية: تذكّر اختياراتكم على الجهاز (مثل اللغة).',
            'ملفات تحليلات أو إعلانات (إن فُعّلت): قد تساعدنا على فهم استخدام الموقع أو قياس الحملات، بما في ذلك أدوات Meta مثل بكسل فيسبوك أو إنستغرام عند تشغيل الإعلانات.',
          ],
        },
        {
          heading: '4. كيف نستخدم البيانات',
          paragraphs: ['نستخدم البيانات للأغراض التالية:'],
          list: [
            'تأكيد الحجوزات، إسناد سائق ومركبة، وتتبع حالة الرحلة.',
            'معالجة المدفوعات وإصدار إيصالات أو تأكيدات الحجز.',
            'الرد على الاستفسارات عبر النموذج أو البريد أو واتساب.',
            'تحسين الموقع والأسطول ومستوى الخدمة.',
            'الامتثال للأنظمة السعودية، بما فيها متطلبات النقل والترخيص.',
            'حماية الحسابات ومنع الاحتيال وإساءة الاستخدام.',
          ],
        },
        {
          heading: '5. المشاركة مع أطراف أخرى',
          paragraphs: ['لا نبيع بياناتكم الشخصية. قد نشاركها فقط عند الحاجة مع:'],
          list: [
            'السائقين وفرق العمليات لتنفيذ الرحلة.',
            'مزود الدفع Moyasar لمعالجة البطاقة أو المدفوعات الإلكترونية.',
            'واتساب أو قنوات التواصل التي تختارونها للرد عليكم.',
            'Meta (فيسبوك / إنستغرام / واتساب للأعمال) إذا تواصلتم عبر تلك المنصات أو تفاعلتم مع إعلاناتنا.',
            'الجهات الحكومية عند وجود التزام نظامي.',
            'مزودي استضافة وتقنية يعالجون البيانات وفق تعليماتنا وبما يحفظ أمنها.',
          ],
        },
        {
          heading: '6. أدوات Meta وواتساب',
          paragraphs: [
            'إذا تواصلتم معنا عبر واتساب أو فيسبوك أو إنستغرام، تخضع تلك المحادثات أيضاً لسياسات Meta. قد نستخدم Meta Business Suite لإدارة الصفحات والرسائل والإعلانات. عند تشغيل أدوات قياس من Meta، قد تجمع Meta معرّفات الجهاز أو ملفات تعريف الارتباط وفق سياسة بياناتها.',
            'يمكنكم التحكم في إعلانات Meta من إعدادات فيسبوك أو إنستغرام.',
          ],
        },
        {
          heading: '7. الاحتفاظ بالبيانات',
          paragraphs: [
            'نحتفظ ببيانات الحجز والدفع والرسائل للمدة اللازمة لتنفيذ الخدمة، والمحاسبة، والشكاوى، والالتزامات النظامية في المملكة، ثم نحذفها أو نجهّلها عندما تنتفي الحاجة.',
          ],
        },
        {
          heading: '8. الأمن',
          paragraphs: [
            'نستخدم إجراءات تقنية وتنظيمية مناسبة لحماية البيانات، بما في ذلك النقل عبر اتصال مشفّر حيثما أمكن، وتقييد الوصول للموظفين المصرّح لهم. لا يمكن ضمان أمان الإنترنت بنسبة كاملة.',
          ],
        },
        {
          heading: '9. حقوقكم',
          paragraphs: [
            'وفقاً لنظام حماية البيانات الشخصية في المملكة، يحق لكم طلب الاطلاع على بياناتكم، أو تصحيحها، أو طلب حذفها في الحالات النظامية، أو تقييد المعالجة، والتواصل معنا بشأن شكاوى الخصوصية.',
            `لطلب ذلك راسلونا على ${COMPANY.email} مع إثبات مناسب للهوية حتى نتمكن من التحقق من الطلب.`,
          ],
        },
        {
          heading: '10. الأطفال',
          paragraphs: [
            'خدماتنا موجّهة للبالغين الذين يحجزون النقل. لا نجمع عن علم بيانات أطفال دون 18 عاماً لاستخدام مستقل للموقع. إذا علمنا بوجود بيانات طفل جُمعت دون موافقة ولي الأمر، سنحذفها.',
          ],
        },
        {
          heading: '11. النقل خارج المملكة',
          paragraphs: [
            'قد تُعالَج بعض البيانات لدى مزودي خدمات سحابية أو دفع أو رسائل خارج المملكة عند الحاجة لتشغيل الموقع. نسعى للتعامل مع مزودين يوفرون حماية مناسبة.',
          ],
        },
        {
          heading: '12. التعديلات',
          paragraphs: [
            'قد نحدّث هذه السياسة. يسري الإصدار الجديد من تاريخ «آخر تحديث» أعلاه. استمرار استخدام الموقع بعد التحديث يعني الاطلاع على النسخة الحالية.',
          ],
        },
        {
          heading: '13. التواصل',
          paragraphs: [
            `لأسئلة الخصوصية أو ملفات تعريف الارتباط: ${COMPANY.email} · ${COMPANY.phonePrimary} · ${ADDRESS}.`,
          ],
        },
      ],
    };
  }

  return {
    kicker: 'Legal',
    title: 'Privacy Policy',
    updated: `Last updated: ${UPDATED}`,
    intro: `${COMPANY.name} respects your privacy. This policy explains what personal data we collect when you use ${COMPANY.website}, make a booking, or contact us, and how we use, share, and protect that data. We operate from Riyadh, Kingdom of Saudi Arabia, in line with the Saudi Personal Data Protection Law (PDPL).`,
    sections: [
      {
        heading: '1. Who we are',
        paragraphs: [
          `${COMPANY.legalName} is a licensed private chauffeur and ground-transport business in Saudi Arabia. Commercial Registration ${COMPANY.tga.crNumber}. Transport General Authority licence ${COMPANY.tga.licenseNumber} (${COMPANY.tga.licenseType}).`,
          `Address: ${ADDRESS}. Email: ${COMPANY.email}. Phone: ${COMPANY.phonePrimary}.`,
        ],
      },
      {
        heading: '2. Information we collect',
        paragraphs: ['We may collect the following categories when you use our services:'],
        list: [
          'Identity and contact data: full name, email address, and mobile or telephone number.',
          'Booking data: service type, vehicle, travel date and time, pickup and drop-off locations, passenger and luggage counts, and special requests.',
          'Payment data: payment status, amount, currency, and transaction reference from our payment provider. We do not store full card numbers or CVV on our servers.',
          'Account data for authorised staff who sign in (email and a hashed password as stored by the system).',
          'Device and usage data: approximate IP address, browser type, pages visited, and language preference.',
          'Communications: contact-form messages, WhatsApp messages, and email correspondence.',
        ],
      },
      {
        heading: '3. Cookies and similar technologies',
        paragraphs: [
          'We use cookies and browser storage to run the website securely and to remember settings. You can control cookies in your browser. Blocking strictly necessary cookies may stop login or booking from working.',
        ],
        list: [
          'Strictly necessary cookies: required to load pages, keep a secure session, and store your language choice.',
          'Functional cookies / local storage: remember preferences on your device, such as language.',
          'Analytics or advertising cookies (if enabled): help us understand site use or measure campaigns, including Meta technologies such as the Facebook or Instagram pixel when ads are running.',
        ],
      },
      {
        heading: '4. How we use your information',
        paragraphs: ['We use personal data to:'],
        list: [
          'Confirm bookings, assign a chauffeur and vehicle, and let you track trip status.',
          'Process payments and send booking confirmations.',
          'Answer enquiries sent through the contact form, email, or WhatsApp.',
          'Improve the website, fleet, and service quality.',
          'Meet Saudi legal and licensing requirements for passenger transport.',
          'Protect accounts and prevent fraud or misuse.',
        ],
      },
      {
        heading: '5. Who we share data with',
        paragraphs: ['We do not sell your personal data. We share it only as needed with:'],
        list: [
          'Chauffeurs and operations staff who fulfil the trip.',
          'Moyasar, our payment provider, to process card or electronic payments.',
          'WhatsApp or other channels you choose when you message us.',
          'Meta (Facebook / Instagram / WhatsApp Business) if you contact us on those platforms or interact with our ads.',
          'Government authorities when the law requires it.',
          'Hosting and technology providers that process data on our instructions and keep it secure.',
        ],
      },
      {
        heading: '6. Meta tools and WhatsApp',
        paragraphs: [
          'If you message us on WhatsApp, Facebook, or Instagram, those conversations are also subject to Meta’s policies. We may use Meta Business Suite to manage pages, messages, and ads. If Meta measurement tools are active, Meta may collect device identifiers or cookies under its own data policy.',
          'You can manage Meta ads in your Facebook or Instagram settings.',
        ],
      },
      {
        heading: '7. How long we keep data',
        paragraphs: [
          'We keep booking, payment, and message records for as long as needed to complete the service, keep accounts, handle complaints, and meet Saudi legal duties. We then delete or anonymise the data when it is no longer required.',
        ],
      },
      {
        heading: '8. Security',
        paragraphs: [
          'We use reasonable technical and organisational measures to protect personal data, including encrypted connections where available and access limited to authorised staff. No internet transmission is completely secure.',
        ],
      },
      {
        heading: '9. Your rights',
        paragraphs: [
          'Under the Saudi Personal Data Protection Law you may request access to your data, correction, deletion where the law allows, restriction of processing, and to raise a privacy complaint.',
          `To make a request, email ${COMPANY.email} with enough detail for us to verify your identity.`,
        ],
      },
      {
        heading: '10. Children',
        paragraphs: [
          'Our services are for adults booking transport. We do not knowingly collect personal data from children under 18 for independent use of the site. If we learn that a child’s data was collected without a parent or guardian’s consent, we will delete it.',
        ],
      },
      {
        heading: '11. Transfers outside Saudi Arabia',
        paragraphs: [
          'Some processing (hosting, payments, or messaging) may take place outside Saudi Arabia when needed to run the website. We work with providers that offer appropriate protection.',
        ],
      },
      {
        heading: '12. Changes',
        paragraphs: [
          'We may update this policy. The new version applies from the “Last updated” date above. Continued use of the website after a change means you should read the current version.',
        ],
      },
      {
        heading: '13. Contact',
        paragraphs: [
          `Privacy or cookie questions: ${COMPANY.email} · ${COMPANY.phonePrimary} · ${ADDRESS}.`,
        ],
      },
    ],
  };
}

export function getTermsContent(lang = 'en') {
  if (lang === 'ar') {
    return {
      kicker: 'قانوني',
      title: 'الشروط والأحكام',
      updated: `آخر تحديث: ${UPDATED_AR}`,
      intro: `تحكم هذه الشروط استخدام موقع ${COMPANY.website} وخدمات السائق الخاص والنقل التي تقدمها ${COMPANY.name}. بالحجز أو استخدام الموقع توافقون على هذه الشروط.`,
      sections: [
        {
          heading: '1. التعريفات',
          paragraphs: [
            `«الشركة» أو «نحن»: ${COMPANY.legalName}، الرياض، المملكة العربية السعودية. «العميل» أو «أنتم»: الشخص الذي يتصفح الموقع أو يقدم حجزاً. «الخدمات»: نقل المطار، النقل داخل المدينة، خدمة السائق، النقل بين المدن، ونقل دول مجلس التعاون حسب التوفر.`,
          ],
        },
        {
          heading: '2. الأهلية',
          paragraphs: [
            'يجب أن يكون عمركم 18 عاماً فأكثر وأن تقدموا بيانات صحيحة عند الحجز. الحجوزات باسم شركات أو جهات يُفترض أن يقدمها مفوض.',
          ],
        },
        {
          heading: '3. الحجوزات والأسعار',
          paragraphs: [
            'الأسعار المعروضة بالريال السعودي وقد يظهر معادل تقريبي بالدولار. السعر النهائي يُحسب عند الحجز حسب نوع الخدمة والمركبة والمدة أو المسافة والوجهة.',
            'بعض الرحلات تتطلب عرض سعر مخصص (مثل تجاوز 20 كم في النقل داخل المدينة، أو وجهات معيّنة، أو مركبات بلا سعر ثابت). العرض المخصص لا يُعد مؤكداً إلا بعد موافقتنا الكتابية أو عبر النظام.',
            'تأكيد الحجز يعتمد على توفر المركبة والسائق ونجاح الدفع عند طلبه.',
          ],
        },
        {
          heading: '4. الدفع',
          paragraphs: [
            'تُعالَج المدفوعات الإلكترونية عبر Moyasar أو الطرق التي نعلنها. قد نطلب عربوناً أو دفعاً كاملاً قبل الرحلة. تبقى تفاصيل البطاقة لدى مزود الدفع وفق معاييره الأمنية.',
          ],
        },
        {
          heading: '5. الإلغاء والتعديل والاسترداد',
          paragraphs: [
            'يمكن طلب التعديل أو الإلغاء عبر الموقع أو البريد أو واتساب. قد تُطبَّق رسوم إذا أُلغي الحجز في وقت قريب من موعد الانطلاق أو إذا لم يحضر العميل دون إبلاغ.',
            'الاسترداد عند عدم الرضا يُدرس حسب الحالة ووفق سياسة الضمان المعلنة على الموقع، ولا يشمل الإساءة للمركبة أو مخالفة هذه الشروط.',
          ],
        },
        {
          heading: '6. التزامات العميل',
          paragraphs: [
            'تقديم بيانات صحيحة لجهة الاستلام والرحلة. الالتزام بالوقت المتفق عليه. معاملة السائق والمركبة باحترام. عدم نقل مواد ممنوعة. عدم تجاوز عدد الركاب المسموح للمركبة.',
          ],
        },
        {
          heading: '7. الخدمة والمركبات',
          paragraphs: [
            'نسعى لتوفير المركبة المتفق عليها. عند تعذر ذلك لأسباب تشغيلية أو سلامة قد نوفر بديلاً مناسباً أو نلغي مع معالجة المبلغ المدفوع.',
            'السائقون محترفون والمركبات مؤمّنة ضمن التغطية المعتادة. الخدمة ليست سيارة للإيجار دون سائق.',
          ],
        },
        {
          heading: '8. المسؤولية',
          paragraphs: [
            'لا نتحمل تأخيرات ناتجة عن حركة المرور أو الأحوال الجوية أو قرارات أمنية أو ظروف خارجة عن إرادتنا المعقولة. لا نتحمل أغراضكم الشخصية داخل المركبة إلا في حدود ما يفرضه النظام.',
            'لا تتجاوز مسؤوليتنا تجاه أي مطالبة ناشئة عن حجز قيمة المبلغ المدفوع لذلك الحجز، ما لم يوجب النظام خلاف ذلك.',
          ],
        },
        {
          heading: '9. الملكية الفكرية',
          paragraphs: [
            'اسم Nextify والشعار والصور والنصوص على الموقع ملك للشركة أو مرخّصة لها. لا يجوز نسخها لأغراض تجارية دون إذن.',
          ],
        },
        {
          heading: '10. الروابط وأطراف ثالثة',
          paragraphs: [
            'قد يحتوي الموقع على روابط أو أدوات دفع أو رسائل لأطراف ثالثة. سياساتهم مستقلة ولسنا مسؤولين عن محتواهم.',
          ],
        },
        {
          heading: '11. القانون والاختصاص',
          paragraphs: [
            'تخضع هذه الشروط لأنظمة المملكة العربية السعودية. تختص محاكم الرياض بالنظر في النزاعات ما لم يوجب النظام اختصاصاً آخر.',
          ],
        },
        {
          heading: '12. التواصل',
          paragraphs: [
            `للاستفسار عن هذه الشروط: ${COMPANY.email} · ${COMPANY.phonePrimary} · ${ADDRESS}.`,
          ],
        },
      ],
    };
  }

  return {
    kicker: 'Legal',
    title: 'Terms and Conditions',
    updated: `Last updated: ${UPDATED}`,
    intro: `These terms govern use of ${COMPANY.website} and the chauffeur and ground-transport services provided by ${COMPANY.name}. By booking or using the website you agree to these terms.`,
    sections: [
      {
        heading: '1. Definitions',
        paragraphs: [
          `“Company”, “we”, or “us” means ${COMPANY.legalName}, Riyadh, Kingdom of Saudi Arabia. “Customer” or “you” means anyone who browses the site or submits a booking. “Services” means airport transfer, city transfer, chauffeur service, intercity transfer, and GCC transfer as offered.`,
        ],
      },
      {
        heading: '2. Eligibility',
        paragraphs: [
          'You must be 18 or older and give accurate details when you book. Bookings made for a company or organisation are treated as placed by an authorised person.',
        ],
      },
      {
        heading: '3. Bookings and prices',
        paragraphs: [
          'Prices are shown in Saudi Riyal. An approximate US dollar figure may also appear. The final fare is calculated at booking from the service type, vehicle, duration or distance, and destination.',
          'Some trips need a custom quote (for example city trips over 20 KM, certain destinations, or vehicles without a published rate). A custom quote is not confirmed until we accept it in writing or through the booking system.',
          'A booking is confirmed only when a vehicle and chauffeur are available and any required payment succeeds.',
        ],
      },
      {
        heading: '4. Payment',
        paragraphs: [
          'Electronic payments are processed by Moyasar or another method we publish. We may ask for a deposit or full payment before the trip. Card details are handled by the payment provider under its security standards. We do not store full card numbers on our servers.',
        ],
      },
      {
        heading: '5. Cancellation, changes, and refunds',
        paragraphs: [
          'Ask for a change or cancellation through the website, email, or WhatsApp. Fees may apply if you cancel close to pickup time or if the guest does not appear without notice.',
          'Any satisfaction refund is reviewed case by case under the guarantee described on the website and does not apply where the vehicle is misused or these terms are broken.',
        ],
      },
      {
        heading: '6. Your responsibilities',
        paragraphs: [
          'Provide accurate pickup and trip details. Be ready at the agreed time. Treat the chauffeur and vehicle with care. Do not carry prohibited items. Do not exceed the vehicle’s passenger limit.',
        ],
      },
      {
        heading: '7. Vehicles and chauffeurs',
        paragraphs: [
          'We aim to provide the vehicle you booked. If that is not possible for operational or safety reasons we may offer a suitable alternative or cancel and handle any amount already paid.',
          'Chauffeurs are professional drivers. Vehicles are insured under our usual cover. This is a chauffeur service, not a self-drive rental.',
        ],
      },
      {
        heading: '8. Liability',
        paragraphs: [
          'We are not responsible for delays caused by traffic, weather, security measures, or other events beyond our reasonable control. We are not responsible for personal belongings left in a vehicle except as Saudi law requires.',
          'Our liability for a claim arising from a booking is limited to the amount paid for that booking, unless Saudi law says otherwise.',
        ],
      },
      {
        heading: '9. Intellectual property',
        paragraphs: [
          'The Nextify name, logo, photos, and website text belong to us or our licensors. Do not copy them for commercial use without permission.',
        ],
      },
      {
        heading: '10. Third-party services',
        paragraphs: [
          'The site may include payment, messaging, or other third-party tools. Their terms and privacy policies apply to those services. We are not responsible for their content.',
        ],
      },
      {
        heading: '11. Governing law',
        paragraphs: [
          'These terms are governed by the laws of the Kingdom of Saudi Arabia. Courts in Riyadh have jurisdiction, unless the law requires another venue.',
        ],
      },
      {
        heading: '12. Contact',
        paragraphs: [
          `Questions about these terms: ${COMPANY.email} · ${COMPANY.phonePrimary} · ${ADDRESS}.`,
        ],
      },
    ],
  };
}
