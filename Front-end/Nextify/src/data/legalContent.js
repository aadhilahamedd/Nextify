import { COMPANY } from '../utils/company';

const LEGAL_ENTITY = 'NEXTIFY BUSINESS SERVICE';
const BRAND = 'NEXTIFY LIMO';
const ADDRESS = COMPANY.addressLines.join(', ');
const URLS = {
  home: 'https://www.nextifylimo.com',
  privacy: 'https://www.nextifylimo.com/privacy-policy',
  terms: 'https://www.nextifylimo.com/terms-and-conditions',
  contact: 'https://www.nextifylimo.com/contact',
  guarantee: 'https://www.nextifylimo.com/#guarantee',
};
const UPDATED = '28 October 2026';
const UPDATED_AR = '٢٨ أكتوبر ٢٠٢٦';

export { URLS, LEGAL_ENTITY, BRAND };

export function getPrivacyContent(lang = 'en') {
  if (lang === 'ar') {
    return {
      kicker: 'قانوني',
      title: 'سياسة الخصوصية',
      updated: `آخر تحديث: ${UPDATED_AR}`,
      intro: `توضح هذه السياسة البيانات الشخصية التي تجمعها ${LEGAL_ENTITY} عند استخدام موقع ${BRAND} (${URLS.home}) أو عند الحجز أو التواصل معنا، وكيف نستخدم تلك البيانات. نعمل من الرياض، المملكة العربية السعودية. تنطبق أنظمة المملكة المتعلقة بالبيانات الشخصية، بما فيها نظام حماية البيانات الشخصية، على هذه المعالجة. هذه الصفحة ليست إقراراً باعتماد أو شهادة امتثال رسمية.`,
      sections: [
        {
          heading: '1. هوية الشركة',
          paragraphs: [
            `الكيان القانوني: ${LEGAL_ENTITY}. العلامة التجارية لخدمات النقل والسائق الخاص: ${BRAND}.`,
            `السجل التجاري: ${COMPANY.tga.crNumber}. ترخيص الهيئة العامة للنقل: ${COMPANY.tga.licenseNumber} (${COMPANY.tga.licenseType}).`,
            `العنوان: ${ADDRESS}. البريد: ${COMPANY.email}. الهاتف: ${COMPANY.phonePrimary}.`,
            `الصفحات العامة: سياسة الخصوصية ${URLS.privacy} · الشروط والأحكام ${URLS.terms} · تواصل معنا ${URLS.contact}.`,
          ],
        },
        {
          heading: '2. البيانات التي نجمعها',
          paragraphs: [
            'نجمع البيانات التي تقدمونها عبر الموقع أو التي تنشأ عن تنفيذ الخدمة. لا نضيف أنواعاً من البيانات غير المستخدمة في التشغيل الحالي.',
          ],
          list: [
            'بيانات التواصل: الاسم الكامل، البريد الإلكتروني، رقم الجوال أو الهاتف.',
            'بيانات الحجز: نوع الخدمة، فئة أو اسم المركبة، تاريخ ووقت السفر، موقع الاستلام، الوجهة أو موقع الخدمة، المطار عند الاقتضاء، رقم الرحلة إن أدخلتموه، عدد الركاب، الأمتعة، المدة أو المسافة التقديرية، وطلبات خاصة.',
            'بيانات تتبع الحجز: رقم الحجز مع البريد أو الجوال للتحقق من الطلب.',
            'نموذج التواصل: الاسم، البريد، الهاتف، الموضوع، ونص الرسالة.',
            'بيانات الدفع المرتبطة بالحجز: المبلغ، العملة، حالة الدفع، ومرجع المعاملة من Moyasar. لا نخزّن رقم البطاقة الكامل أو رمز CVV على خوادمنا. تُدخل بيانات البطاقة لدى Moyasar.',
            'حسابات الموظفين المصرّح لهم: البريد ورمز الدخول المحفوظ في النظام بعد تسجيل الدخول.',
            'تفضيل اللغة على جهازكم (يُحفظ محلياً في المتصفح).',
            'محتوى الرسائل إذا تواصلتم معنا عبر واتساب أو البريد أو النموذج.',
          ],
        },
        {
          heading: '3. ملفات تعريف الارتباط والتخزين المحلي',
          paragraphs: [
            'الموقع يستخدم تخزين المتصفح لتشغيل الصفحات وليس لدينا حالياً أداة تحليلات منفصلة أو بكسل إعلانات من Meta مثبتاً في الشيفرة. يمكنكم مسح بيانات الموقع من إعدادات المتصفح.',
          ],
          list: [
            'ضروري/وظيفي: تفضيل اللغة، وجلسة تسجيل دخول الموظفين (رمز الدخول وبيانات المستخدم المحلية).',
            'قد يُحفظ مسودة رسائل التواصل على الجهاز إذا تعذر الإرسال إلى الخادم.',
            'لا نثبت ملفات تحليلات أو إعلانات من أطراف ثالثة في الموقع ما لم نضفها لاحقاً ونحدّث هذه السياسة.',
          ],
        },
        {
          heading: '4. لماذا نستخدم البيانات',
          paragraphs: ['نستخدم البيانات فقط للأغراض المرتبطة بالخدمة:'],
          list: [
            'استلام طلب الحجز وحساب السعر المعروض أو طلب عرض مخصص.',
            'تأكيد التوفر وإتمام الحجز بعد الدفع عند الحاجة.',
            'تقديم خدمة السائق والتواصل بشأن الموعد والاستلام.',
            'معالجة الدفع عبر Moyasar وربط حالة الدفع بالحجز.',
            'الرد على الاستفسارات عبر النموذج أو البريد أو واتساب.',
            'تمكين تتبع الحجز ودعم العملاء.',
            'تشغيل حسابات الإدارة وحماية الموقع من إساءة الاستخدام.',
          ],
        },
        {
          heading: '5. الدفع عبر Moyasar',
          paragraphs: [
            'المدفوعات الإلكترونية على الموقع تُعالَج عبر Moyasar. نتلقى من Moyasar حالة العملية ومرجعاً للمعاملة والمبلغ والعملة وربطها برقم الحجز.',
            'لا ندّعي امتثال PCI أو شهادات أمنية غير موثّقة هنا. أمن بيانات البطاقة يتم وفق إجراءات Moyasar عند إدخالها في نموذج الدفع الخاص بهم.',
          ],
        },
        {
          heading: '6. واتساب',
          paragraphs: [
            'يحتوي الموقع على روابط واتساب (مثل wa.me) لبدء محادثة معنا. إذا راسلتمونا، نستلم رقمكم ومحتوى الرسالة.',
            'إذا كانت رسائل واتساب للأعمال مفعّلة، قد تُعالَج الرسائل الواردة لمتابعة الحجز وإرسال حالة الطلب والرد. واتساب خدمة تقدّمها Meta. لا نشفّر رسائل واتساب من جانب الشركة. تخضع المحادثة أيضاً لشروط واتساب وسياسة بيانات Meta.',
          ],
        },
        {
          heading: '7. المشاركة مع أطراف أخرى',
          paragraphs: ['لا نبيع بياناتكم. نشارك ما يلزم فقط مع:'],
          list: [
            'السائقين وفرق التشغيل لتنفيذ الرحلة.',
            'Moyasar لمعالجة الدفع.',
            'واتساب / Meta إذا اخترتم التواصل عبر واتساب أو منصات Meta.',
            'مزودو الاستضافة وقاعدة البيانات اللازمة لتشغيل الموقع.',
            'الجهات الرسمية عند وجود التزام نظامي.',
          ],
        },
        {
          heading: '8. الاحتفاظ بالبيانات',
          paragraphs: [
            'نحتفظ بسجلات الحجز والدفع والرسائل طالما كانت لازمة لتنفيذ الخدمة والمحاسبة والتعامل مع الطلبات والالتزامات النظامية، ثم نحذفها أو نجهّلها عندما تنتفي الحاجة.',
            'لا ننشر في هذه الصفحة مدة احتفاظ رقمية ثابتة لكل نوع من البيانات. إن رغبتم بمدة محددة يرجى طلبها عبر البريد أدناه.',
          ],
        },
        {
          heading: '9. حقوق الخصوصية والتواصل',
          paragraphs: [
            'لأن النشاط في المملكة العربية السعودية، يمكنكم طلب الاستفسار عن بياناتكم أو الوصول إليها أو تصحيحها أو حذفها حيث يجيز نظام حماية البيانات الشخصية ذلك، عبر البريد الحالي للشركة وليس عبر عنوان خصوصية منفصل.',
            `البريد: ${COMPANY.email}. الهاتف: ${COMPANY.phonePrimary}. العنوان: ${ADDRESS}. صفحة التواصل: ${URLS.contact}.`,
            'لا ندّعي في هذه السياسة الحصول على شهادة امتثال نظامية.',
          ],
        },
        {
          heading: '10. الأطفال والتعديلات',
          paragraphs: [
            'الخدمة موجّهة لمن يبلغ 18 عاماً فأكثر عند الحجز. إذا علمنا بجمع بيانات طفل دون موافقة ولي الأمر سنحذفها.',
            'قد نحدّث هذه السياسة. يسري النص من تاريخ آخر تحديث أعلاه.',
          ],
        },
      ],
    };
  }

  return {
    kicker: 'Legal',
    title: 'Privacy Policy',
    updated: `Last updated: ${UPDATED}`,
    intro: `This policy explains the personal data ${LEGAL_ENTITY} collects when you use the ${BRAND} website (${URLS.home}), make a booking, or contact us, and how that data is used. We operate from Riyadh, Kingdom of Saudi Arabia. Saudi personal-data rules apply to this processing, including the Personal Data Protection Law (PDPL). This page is not a claim of certification or guaranteed legal compliance.`,
    sections: [
      {
        heading: '1. Company identity',
        paragraphs: [
          `Legal company: ${LEGAL_ENTITY}. Transportation brand: ${BRAND}.`,
          `Commercial Registration: ${COMPANY.tga.crNumber}. Transport General Authority licence: ${COMPANY.tga.licenseNumber} (${COMPANY.tga.licenseType}).`,
          `Address: ${ADDRESS}. Email: ${COMPANY.email}. Phone: ${COMPANY.phonePrimary}.`,
          `Public pages: Privacy Policy ${URLS.privacy} · Terms and Conditions ${URLS.terms} · Contact ${URLS.contact}.`,
        ],
      },
      {
        heading: '2. Information we collect',
        paragraphs: [
          'We collect information you submit on the website or that is created when we fulfil a booking. We do not describe collection practices that the current application does not use.',
        ],
        list: [
          'Contact details: full name, email address, and mobile or telephone number.',
          'Booking details: service type, vehicle category or name, travel date and time, pickup location, destination or service location, airport when relevant, flight number if you enter one, passenger count, luggage, duration or estimated distance, and special requests.',
          'Booking-tracking details: booking number plus email or mobile so we can find your reservation.',
          'Contact-form details: name, email, phone, subject, and message.',
          'Payment records linked to a booking: amount, currency, payment status, and the Moyasar transaction reference. We do not store full card numbers or CVV on our servers. Card details are entered on Moyasar’s payment form.',
          'Staff login details for authorised administrators (email and a stored sign-in credential).',
          'Language preference stored in your browser.',
          'Message content if you contact us by WhatsApp, email, or the contact form.',
        ],
      },
      {
        heading: '3. Cookies and local storage',
        paragraphs: [
          'The website uses browser storage to run pages. The current site code does not include a separate analytics product or a Meta advertising pixel. You can clear site data in your browser settings.',
        ],
        list: [
          'Necessary / functional: language preference and staff login session (token and local user record).',
          'A contact-message draft may be stored on your device if sending to the server fails.',
          'We do not currently set third-party analytics or advertising cookies. If that changes, this policy will be updated.',
        ],
      },
      {
        heading: '4. Why we use information',
        paragraphs: ['We use personal data only for purposes tied to the service:'],
        list: [
          'Receive a booking request and calculate a published rate or request a custom quote.',
          'Confirm availability and complete a booking after any required payment.',
          'Provide the chauffeur service and communicate about pickup time and location.',
          'Process payment through Moyasar and match payment status to the booking.',
          'Answer enquiries sent through the contact form, email, or WhatsApp.',
          'Let you track a booking and provide customer support.',
          'Operate administrator accounts and protect the site from misuse.',
        ],
      },
      {
        heading: '5. Payment information (Moyasar)',
        paragraphs: [
          'Electronic payments on the website are processed by Moyasar. We receive payment status, a transaction reference, amount, currency, and the related booking number.',
          'We do not claim PCI certification or other security certifications on this page. Card data is handled in Moyasar’s checkout when you pay.',
        ],
      },
      {
          heading: '6. WhatsApp',
          paragraphs: [
            'The website includes WhatsApp links (for example wa.me) so you can start a conversation. If you message us, we receive your WhatsApp number and the content you send.',
            'If WhatsApp Business messaging is enabled, inbound messages may also be processed to continue a booking, send status updates, and reply. WhatsApp is provided by Meta. Nextify does not encrypt WhatsApp messages. The conversation is also subject to WhatsApp’s terms and Meta’s data policy.',
          ],
      },
      {
        heading: '7. Who we share data with',
        paragraphs: ['We do not sell your personal data. We share it only as needed with:'],
        list: [
          'Chauffeurs and operations staff who carry out the trip.',
          'Moyasar, to process the payment.',
          'WhatsApp / Meta if you choose to contact us on WhatsApp or other Meta products.',
          'Hosting and database providers required to run the website.',
          'Authorities when Saudi law requires it.',
        ],
      },
      {
        heading: '8. How long we keep data',
        paragraphs: [
          'We keep booking, payment, and message records for as long as needed to complete the service, keep accounts, handle requests, and meet legal duties, then delete or anonymise them when they are no longer required.',
          'This page does not publish a fixed retention period for each data type. If you need a specific period, ask us using the email below.',
        ],
      },
      {
        heading: '9. Privacy requests and contact',
        paragraphs: [
          'Because we operate in Saudi Arabia, you may ask about your data, request access, correction, or deletion where the Personal Data Protection Law allows, using the company’s existing contact details. We do not maintain a separate privacy-only email address.',
          `Email: ${COMPANY.email}. Phone: ${COMPANY.phonePrimary}. Address: ${ADDRESS}. Contact page: ${URLS.contact}.`,
          'This policy does not claim a formal compliance certificate.',
        ],
      },
      {
        heading: '10. Children and updates',
        paragraphs: [
          'Bookings are intended for people aged 18 or over. If we learn that a child’s data was collected without a parent or guardian’s consent, we will delete it.',
          'We may update this policy. The text applies from the last-updated date above.',
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
      intro: `تحكم هذه الشروط استخدام موقع ${BRAND} (${URLS.home}) وخدمات النقل والسائق الخاص التي تقدّمها ${LEGAL_ENTITY} تحت العلامة ${BRAND}. باستخدام الموقع أو تقديم حجز توافقون على هذه الشروط. سياسة الخصوصية: ${URLS.privacy}.`,
      sections: [
        {
          heading: '1. التعريفات وهوية الشركة',
          paragraphs: [
            `الكيان القانوني («الشركة» أو «نحن»): ${LEGAL_ENTITY}، الرياض، المملكة العربية السعودية. العلامة التجارية للخدمة: ${BRAND}.`,
            `السجل التجاري ${COMPANY.tga.crNumber}. ترخيص الهيئة العامة للنقل ${COMPANY.tga.licenseNumber} (${COMPANY.tga.licenseType}).`,
            `العنوان: ${ADDRESS}. البريد: ${COMPANY.email}. الهاتف: ${COMPANY.phonePrimary}. صفحة التواصل: ${URLS.contact}.`,
            '«العميل» أو «أنتم»: من يستخدم الموقع أو يقدّم حجزاً. «الخدمات»: نقل المطار، النقل داخل المدينة، خدمة السائق، النقل بين المدن، ونقل دول مجلس التعاون حسب التوفر.',
          ],
        },
        {
          heading: '2. الأهلية',
          paragraphs: [
            'يجب أن يكون عمركم 18 عاماً فأكثر وأن تقدّموا بيانات صحيحة. الحجوزات باسم جهة يُفترض أن يقدّمها مفوّض.',
          ],
        },
        {
          heading: '3. طلب الحجز والتأكيد والأسعار',
          paragraphs: [
            'تقديم النموذج على الموقع يُعد طلب حجز وليس تأكيداً تلقائياً لتوفر مركبة وسائق.',
            'يُحسب السعر المعروض حسب نوع الخدمة والمركبة والمدة أو المسافة والوجهة، بالريال السعودي، وقد يظهر معادل تقريبي بالدولار.',
            'إذا لم يكن هناك سعر ثابت، يُطلب عرض مخصص. العرض المخصص لا يُعد مؤكداً إلا بعد موافقتنا عبر النظام أو كتابة.',
            'يتأكد الحجز عند توفر المركبة والسائق ونجاح أي دفع مطلوب. يمكن تتبع الحجز المؤكد عبر صفحة تتبع الحجز.',
          ],
        },
        {
          heading: '4. الدفع',
          paragraphs: [
            'تُعالَج المدفوعات الإلكترونية عبر Moyasar. نتلقى حالة العملية ومرجعها ومبلغها. تُدخل بيانات البطاقة لدى Moyasar ولا نخزّن رقم البطاقة الكامل على خوادمنا.',
            'قد يُطلب دفع قبل الرحلة حسب نوع الحجز. لا نضمن نجاح كل عملية دفع؛ النتيجة تعتمد على Moyasar والبنك المصدر.',
          ],
        },
        {
          heading: '5. الإلغاء والتعديل والاسترداد',
          paragraphs: [
            'يمكن طلب التعديل أو الإلغاء عبر الموقع أو البريد أو واتساب.',
            `ينشر الموقع ضمان رضا على الصفحة الرئيسية (${URLS.guarantee}): إذا لم تكونوا راضين عن الرحلة، يُذكر استرداد كامل وفق ذلك النص. لا ينطبق الضمان عند إساءة استخدام المركبة أو مخالفة هذه الشروط.`,
            'لا تحدد هذه الصفحة مبلغ رسوم إلغاء ثابتاً. أي رسوم إلغاء أو عدم حضور تُبلغ عند الحجز أو عند طلب التغيير إن وُجدت.',
          ],
        },
        {
          heading: '6. التزامات العميل',
          paragraphs: [
            'تقديم بيانات استلام ورحلة صحيحة، والحضور في الوقت المتفق عليه، واحترام السائق والمركبة، وعدم نقل الممنوعات، وعدم تجاوز عدد الركاب المسموح.',
          ],
        },
        {
          heading: '7. المركبات والسائقون',
          paragraphs: [
            'نسعى لتوفير المركبة المتفق عليها. إن تعذر ذلك لأسباب تشغيل أو سلامة قد نعرض بديلاً مناسباً أو نلغي ونتعامل مع المبلغ المدفوع.',
            'الخدمة بسائق محترف وليست تأجير مركبة بدون سائق. المركبات مؤمّنة ضمن التغطية المعتادة المعلنة على الموقع.',
          ],
        },
        {
          heading: '8. المسؤولية',
          paragraphs: [
            'لا نتحمل تأخير حركة المرور أو الطقس أو الإجراءات الأمنية أو ظروفاً خارجة عن السيطرة المعقولة. الأغراض الشخصية داخل المركبة تبقى مسؤوليتكم إلا حيث يوجب النظام خلاف ذلك.',
            'ما لم يوجب نظام المملكة خلاف ذلك، لا تتجاوز مسؤوليتنا تجاه مطالبة ناشئة عن حجز المبلغ المدفوع لذلك الحجز.',
          ],
        },
        {
          heading: '9. الملكية الفكرية وأطراف ثالثة',
          paragraphs: [
            `اسم ${BRAND} والشعار والصور والنصوص على الموقع تخص ${LEGAL_ENTITY} أو مرخّصيها. لا تُنسخ لأغراض تجارية دون إذن.`,
            'قد يستخدم الموقع Moyasar وواتساب وروابط خارجية. شروط تلك الأطراف مستقلة.',
          ],
        },
        {
          heading: '10. القانون والتواصل',
          paragraphs: [
            'تخضع هذه الشروط لأنظمة المملكة العربية السعودية، وتختص محاكم الرياض ما لم يوجب النظام اختصاصاً آخر.',
            `للاستفسار: ${COMPANY.email} · ${COMPANY.phonePrimary} · ${ADDRESS} · ${URLS.contact}. سياسة الخصوصية: ${URLS.privacy}.`,
          ],
        },
      ],
    };
  }

  return {
    kicker: 'Legal',
    title: 'Terms and Conditions',
    updated: `Last updated: ${UPDATED}`,
    intro: `These terms govern use of the ${BRAND} website (${URLS.home}) and the chauffeur and ground-transport services offered by ${LEGAL_ENTITY} under the ${BRAND} brand. By using the website or submitting a booking you agree to these terms. Privacy Policy: ${URLS.privacy}.`,
    sections: [
      {
        heading: '1. Definitions and company identity',
        paragraphs: [
          `Legal company (“Company”, “we”, or “us”): ${LEGAL_ENTITY}, Riyadh, Kingdom of Saudi Arabia. Service brand: ${BRAND}.`,
          `Commercial Registration ${COMPANY.tga.crNumber}. Transport General Authority licence ${COMPANY.tga.licenseNumber} (${COMPANY.tga.licenseType}).`,
          `Address: ${ADDRESS}. Email: ${COMPANY.email}. Phone: ${COMPANY.phonePrimary}. Contact page: ${URLS.contact}.`,
          '“Customer” or “you” means anyone who uses the website or submits a booking. “Services” means airport transfer, city transfer, chauffeur service, intercity transfer, and GCC transfer as offered.',
        ],
      },
      {
        heading: '2. Eligibility',
        paragraphs: [
          'You must be 18 or older and give accurate details. Bookings made for an organisation are treated as placed by an authorised person.',
        ],
      },
      {
        heading: '3. Booking requests, confirmation, and prices',
        paragraphs: [
          'Submitting the booking form is a booking request. It does not automatically confirm that a vehicle and chauffeur are available.',
          'A published fare is calculated from the service type, vehicle, duration or distance, and destination, in Saudi Riyal. An approximate US dollar figure may also appear.',
          'If there is no published rate, a custom quote is required. A custom quote is not confirmed until we accept it in the booking system or in writing.',
          'A booking is confirmed when a vehicle and chauffeur are available and any required payment succeeds. Confirmed bookings can be checked on the track-booking page.',
        ],
      },
      {
        heading: '4. Payment',
        paragraphs: [
          'Electronic payments are processed by Moyasar. We receive payment status, a transaction reference, and the amount. Card details are entered on Moyasar’s form. We do not store full card numbers on our servers.',
          'Payment may be required before the trip, depending on the booking. We do not guarantee that every payment attempt will succeed; the result depends on Moyasar and the issuing bank.',
        ],
      },
      {
        heading: '5. Cancellation, changes, and refunds',
        paragraphs: [
          'Ask for a change or cancellation through the website, email, or WhatsApp.',
          `The homepage publishes a satisfaction guarantee (${URLS.guarantee}): if you are not happy with the drive, a full refund is described there. That guarantee does not apply where the vehicle is misused or these terms are broken.`,
          'These terms do not set a fixed cancellation-fee amount. Any cancellation or no-show charge, if applied, will be stated when you book or when you request a change.',
        ],
      },
      {
        heading: '6. Your responsibilities',
        paragraphs: [
          'Give accurate pickup and trip details, be ready at the agreed time, treat the chauffeur and vehicle with care, do not carry prohibited items, and do not exceed the vehicle’s passenger limit.',
        ],
      },
      {
        heading: '7. Vehicles and chauffeurs',
        paragraphs: [
          'We aim to provide the vehicle you booked. If that is not possible for operational or safety reasons we may offer a suitable alternative or cancel and handle any amount already paid.',
          'This is a chauffeur service, not a self-drive rental. Vehicles are insured under the cover described on the website.',
        ],
      },
      {
        heading: '8. Liability',
        paragraphs: [
          'We are not responsible for delays caused by traffic, weather, security measures, or other events beyond our reasonable control. Personal belongings left in a vehicle remain your responsibility except where Saudi law requires otherwise.',
          'Unless Saudi law requires otherwise, our liability for a claim arising from a booking is limited to the amount paid for that booking.',
        ],
      },
      {
        heading: '9. Intellectual property and third parties',
        paragraphs: [
          `The ${BRAND} name, logo, photos, and website text belong to ${LEGAL_ENTITY} or its licensors. Do not copy them for commercial use without permission.`,
          'The site uses Moyasar, WhatsApp links, and may include other external tools. Those providers’ terms apply to their services.',
        ],
      },
      {
        heading: '10. Governing law and contact',
        paragraphs: [
          'These terms are governed by the laws of the Kingdom of Saudi Arabia. Courts in Riyadh have jurisdiction unless the law requires another venue.',
          `Questions: ${COMPANY.email} · ${COMPANY.phonePrimary} · ${ADDRESS} · ${URLS.contact}. Privacy Policy: ${URLS.privacy}.`,
        ],
      },
    ],
  };
}
