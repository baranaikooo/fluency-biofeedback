/**
 * FLUENCY BIOFEEDBACK - QUESTION BANK, MULTI-VOICE & ROTATION ENGINE
 * Obsahuje bohatú databázu 23+ reálnych situácií, persón s rôznymi hlasmi,
 * inteligentnú rotáciu bez opakovania (LRU) a integráciu Web Speech API s Web Audio.
 */

(function (window) {
  "use strict";

  // ==========================================================================
  // 1. ROZSIAHLA BANKA OTÁZOK A SITUÁCIÍ (6 HLAVNÝCH KATEGÓRIÍ)
  // ==========================================================================
  const QUESTION_BANK = [
    // --- 🛒 KATEGÓRIA: POKLADŇA & NÁKUPY ---
    {
      id: "pokladna_1",
      category: "pokladna",
      categoryLabel: "🛒 Pokladňa / Obchod",
      caller: "Pokladníčka Zuzana",
      avatar: "👩‍💼",
      voiceGender: "female",
      voiceStyle: "fast",
      voicePitch: 1.18,
      voiceRate: 1.1,
      promptText:
        "Tento výrobok mi systém nevie načítať a chýba na ňom cenovka. Viete mi prosím povedať, z ktorého regálu ste ho zobrali a aká tam bola uvedená cena?",
      suggestedResponse: "Zobral som to z regálu pri vchode",
      audioUrl: "./audio/cashier.mp3",
      contextNote: "Reakcia bez kŕča na pokladni pod tlakom radu za tebou",
    },
    {
      id: "pokladna_2",
      category: "pokladna",
      categoryLabel: "🛒 Pokladňa / Obchod",
      caller: "Predavač Martin",
      avatar: "👨‍💼",
      voiceGender: "male",
      voiceStyle: "mid",
      voicePitch: 1.0,
      voiceRate: 1.05,
      promptText: "Máte našu zákaznícku kartičku alebo aplikáciu v mobile?",
      suggestedResponse: "Nemám, ďakujem",
      audioUrl: null,
      contextNote: "Plynulé mäkké N bez zaseknutia jazyka o podnebie",
    },
    {
      id: "pokladna_3",
      category: "pokladna",
      categoryLabel: "🛒 Pokladňa / Obchod",
      caller: "Pokladníčka Zuzana",
      avatar: "👩‍💼",
      voiceGender: "female",
      voiceStyle: "fast",
      voicePitch: 1.18,
      voiceRate: 1.08,
      promptText: "Bloček si prajete vytlačiť, alebo poslať na mail?",
      suggestedResponse: "Áno, poprosím vytlačiť",
      audioUrl: null,
      contextNote: "Mäkký vokálový nábeh na samohláske Á bez glotálneho rázu",
    },
    {
      id: "pokladna_4",
      category: "pokladna",
      categoryLabel: "🛒 Pokladňa / Obchod",
      caller: "Pokladníčka Alena",
      avatar: "👩‍💼",
      voiceGender: "female",
      voiceStyle: "calm",
      voicePitch: 1.05,
      voiceRate: 1.0,
      promptText: "Budete si priať aj papierovú tašku na nákup?",
      suggestedResponse: "Nie, mám vlastnú",
      audioUrl: null,
      contextNote: "Ľahký nábeh slabiky Nie s uvoľnenou sánkou",
    },
    {
      id: "pokladna_5",
      category: "pokladna",
      categoryLabel: "🛒 Pokladňa / Obchod",
      caller: "Predavač Martin",
      avatar: "👨‍💼",
      voiceGender: "male",
      voiceStyle: "mid",
      voicePitch: 1.0,
      voiceRate: 1.05,
      promptText: "Máte to presne, alebo vám mám vydávať z dvadsiatky?",
      suggestedResponse: "Mám to presne, nech sa páči",
      audioUrl: null,
      contextNote: "Využitie nazálnej rezonancie M ako bezpečného mostíka",
    },

    // --- 📦 KATEGÓRIA: KURIÉR & POŠTA ---
    {
      id: "kurier_1",
      category: "kurier",
      categoryLabel: "📦 Kuriér / Zásielka",
      caller: "Kuriér Marek",
      avatar: "👨‍🦱",
      voiceGender: "male",
      voiceStyle: "fast",
      voicePitch: 0.95,
      voiceRate: 1.18,
      isPhone: true,
      promptText:
        "Dobrý deň, tu je kuriér Packeta. Stojím pred vašou bytovkou, ale na bráne nevidím vaše meno a nefunguje zvonček. Viete mi prosím popísať, ktorý je to vchod a na ktorom poschodí vás nájdem?",
      suggestedResponse: "Dobrý deň, je to prvý vchod na druhom poschodí",
      audioUrl: "./audio/courier.mp3",
      contextNote: "Prekonanie obavy z predstavenia sa a povedania svojho mena",
    },
    {
      id: "kurier_2",
      category: "kurier",
      categoryLabel: "📦 Kuriér / Zásielka",
      caller: "Kuriér Marek",
      avatar: "👨‍🦱",
      voiceGender: "male",
      voiceStyle: "fast",
      voicePitch: 0.95,
      voiceRate: 1.15,
      isPhone: true,
      promptText: "Stojím dole pred bránou, viete zbehnúť na prízemie?",
      suggestedResponse: "Áno, už idem dole",
      audioUrl: null,
      contextNote: "Plynulá odpoveď v zhone hovoru bez predčasného zovretia hrdla",
    },
    {
      id: "kurier_3",
      category: "kurier",
      categoryLabel: "📦 Kuriér / Zásielka",
      caller: "Kuriér Igor (DPD)",
      avatar: "📦",
      voiceGender: "male",
      voiceStyle: "deep",
      voicePitch: 0.88,
      voiceRate: 1.05,
      isPhone: true,
      promptText: "Zásielka je na meno Novák. Povedzte mi prosím overovací PIN kód.",
      suggestedResponse: "Kód je štyri osem dva",
      audioUrl: null,
      contextNote: "Tlmenie nárazu na velárnej plozíve K bez barličky Eee",
    },
    {
      id: "kurier_4",
      category: "kurier",
      categoryLabel: "📦 Kuriér / Zásielka",
      caller: "Kuriér Igor (DPD)",
      avatar: "📦",
      voiceGender: "male",
      voiceStyle: "deep",
      voicePitch: 0.88,
      voiceRate: 1.08,
      isPhone: true,
      promptText: "Nezastihol som vás. Môžem vám nechať balík v susednom boxe?",
      suggestedResponse: "Áno, nechajte v boxe, ďakujem",
      audioUrl: null,
      contextNote: "Uvoľnený výdychový prúd pred štartom vety",
    },

    // --- 🩺 KATEGÓRIA: ZDRAVOTNÍCTVO, AMBULANCIA & LEKÁREŇ ---
    {
      id: "lekar_1",
      category: "lekar",
      categoryLabel: "🩺 Lekár / Ambulancia",
      caller: "Dr. Kováč (Všeobecný lekár)",
      avatar: "👨‍⚕️",
      voiceGender: "male",
      voiceStyle: "calm",
      voicePitch: 0.82,
      voiceRate: 0.88,
      isPhone: true,
      promptText: "Dobrý, kvôli čomu ste prišli? A vaše meno poprosím ešte.",
      suggestedResponse: "Dobrý deň, volám sa Peter a prišiel som na kontrolu",
      audioUrl: "./audio/doctor.mp3",
      contextNote: "Pomalý autoritatívny tón lekára – zachovaj svoj vlastný pokoj",
    },
    {
      id: "lekar_2",
      category: "lekar",
      categoryLabel: "🩺 Lekár / Ambulancia",
      caller: "Sestrička Elena",
      avatar: "👩‍⚕️",
      voiceGender: "female",
      voiceStyle: "calm",
      voicePitch: 1.05,
      voiceRate: 0.95,
      isPhone: true,
      promptText: "Prosím, pri telefóne, povedzte mi vaše celé meno a rodné číslo.",
      suggestedResponse: "Peter Novák, volám kvôli termínu",
      audioUrl: null,
      contextNote: "Diktovanie osobných údajov bez zovretia hlasiviek",
    },
    {
      id: "lekar_3",
      category: "lekar",
      categoryLabel: "🩺 Lekár / Ambulancia",
      caller: "Magistra Jana (Lekáreň)",
      avatar: "💊",
      voiceGender: "female",
      voiceStyle: "mid",
      voicePitch: 1.1,
      voiceRate: 1.0,
      promptText: "Dobrý deň v lekárni. Máte elektronický recept, alebo voľnopredajný liek?",
      suggestedResponse: "Mám e-recept na meno Novák",
      audioUrl: null,
      contextNote: "Kontinuálny prechod z M cez samohlásku až po koniec vety",
    },
    {
      id: "lekar_4",
      category: "lekar",
      categoryLabel: "🩺 Lekár / Ambulancia",
      caller: "Dr. Kováč (Lekár)",
      avatar: "👨‍⚕️",
      voiceGender: "male",
      voiceStyle: "calm",
      voicePitch: 0.82,
      voiceRate: 0.9,
      isPhone: true,
      promptText: "Kedy sa u vás tie príznaky objavili prvýkrát?",
      suggestedResponse: "Včera večer po návrate domov",
      audioUrl: null,
      contextNote: "Znelá frikatíva V na začiatku slabiky",
    },

    // --- ☕ KATEGÓRIA: KAVIAREŇ, REŠTAURÁCIA & JEDLO ---
    {
      id: "kaviaren_1",
      category: "kaviaren",
      categoryLabel: "☕ Kaviareň / Objednávka",
      caller: "Baristka Lucia",
      avatar: "👩‍🍳",
      voiceGender: "female",
      voiceStyle: "energetic",
      voicePitch: 1.25,
      voiceRate: 1.08,
      promptText: "Dobrý deň, čo vám môžem dnes ponúknuť na pitie?",
      suggestedResponse: "Jedno espresso a čistú vodu, prosím",
      audioUrl: null,
      contextNote: "Prirodzená objednávka v kaviarni s mäkkým štartom na J",
    },
    {
      id: "kaviaren_2",
      category: "kaviaren",
      categoryLabel: "☕ Kaviareň / Objednávka",
      caller: "Baristka Lucia",
      avatar: "👩‍🍳",
      voiceGender: "female",
      voiceStyle: "energetic",
      voicePitch: 1.25,
      voiceRate: 1.05,
      promptText: "Kávu si prajete s klasickým mliekom, alebo bezlaktózovým?",
      suggestedResponse: "S obyčajným mliekom, ďakujem",
      audioUrl: null,
      contextNote: "Dlhá sykavka S bez predčasného kŕča hlasiviek",
    },
    {
      id: "kaviaren_3",
      category: "kaviaren",
      categoryLabel: "☕ Kaviareň / Objednávka",
      caller: "Čašník Tomáš",
      avatar: "🍽️",
      voiceGender: "male",
      voiceStyle: "mid",
      voicePitch: 0.96,
      voiceRate: 1.02,
      promptText: "Dobrý deň, máte u nás urobenú rezerváciu stola na meno?",
      suggestedResponse: "Áno, rezervácia na meno Novák",
      audioUrl: null,
      contextNote: "Samohláska Á bez glotálneho úderu",
    },
    {
      id: "kaviaren_4",
      category: "kaviaren",
      categoryLabel: "☕ Kaviareň / Objednávka",
      caller: "Čašník Tomáš",
      avatar: "🍽️",
      voiceGender: "male",
      voiceStyle: "mid",
      voicePitch: 0.96,
      voiceRate: 1.0,
      promptText: "Budete platiť dohromady, alebo si účet rozdelíte zvlášť?",
      suggestedResponse: "Spolu a platím kartou",
      audioUrl: null,
      contextNote: "Spojenie sykavky a plozívy S-P-O-L-U",
    },

    // --- 🏛️ KATEGÓRIA: ÚRADY, BANKA & KLIENTSKY SERVIS ---
    {
      id: "urad_1",
      category: "urad",
      categoryLabel: "🏛️ Úrad / Klientske centrum",
      caller: "Úradník JUDr. Molnár",
      avatar: "👔",
      voiceGender: "male",
      voiceStyle: "formal",
      voicePitch: 0.88,
      voiceRate: 0.94,
      isPhone: true,
      promptText: "Klientske centrum, pri telefóne Molnár. V akej záležitosti voláte?",
      suggestedResponse: "Dobrý deň, potrebujem si vybaviť nový pas",
      audioUrl: null,
      contextNote: "Oficiálny rozhovor bez podvedomého strachu z autority",
    },
    {
      id: "urad_2",
      category: "urad",
      categoryLabel: "🏛️ Úrad / Klientske centrum",
      caller: "Pracovníčka banky Martina",
      avatar: "🏦",
      voiceGender: "female",
      voiceStyle: "formal",
      voicePitch: 1.08,
      voiceRate: 0.98,
      isPhone: true,
      promptText: "Z dôvodu bezpečnosti mi prosím nadiktujte vaše trvalé bydlisko.",
      suggestedResponse: "Bratislava, Hlavná ulica sedem",
      audioUrl: null,
      contextNote: "Bratislava – znelé B s ľahkým kontaktom pier",
    },
    {
      id: "urad_3",
      category: "urad",
      categoryLabel: "🏛️ Úrad / Klientske centrum",
      caller: "Úradník JUDr. Molnár",
      avatar: "👔",
      voiceGender: "male",
      voiceStyle: "formal",
      voicePitch: 0.88,
      voiceRate: 0.94,
      isPhone: true,
      promptText: "Prajete si poslať potvrdenie na vašu poštovú adresu alebo email?",
      suggestedResponse: "Na email, prosím",
      audioUrl: null,
      contextNote: "Rýchla jednoznačná voľba bez zbytočného zaváhania",
    },

    // --- 🔧 KATEGÓRIA: AUTOSERVIS & REMESELNÍCI ---
    {
      id: "servis_1",
      category: "servis",
      categoryLabel: "🔧 Autoservis / Dielňa",
      caller: "Miro (Automechanik)",
      avatar: "🔧",
      voiceGender: "male",
      voiceStyle: "rough",
      voicePitch: 0.78,
      voiceRate: 1.02,
      isPhone: true,
      promptText: "Autoservis, prosím? Čo presne sa stalo s vaším autom a kedy ho viete priniesť?",
      suggestedResponse: "Dobrý deň, potrebujem vymeniť brzdy",
      audioUrl: "./audio/automechanik.mp3",
      contextNote: "Zemitý hovor z dielne s hlukom v pozadí",
    },
    {
      id: "servis_2",
      category: "servis",
      categoryLabel: "🔧 Autoservis / Dielňa",
      caller: "Miro (Automechanik)",
      avatar: "🔧",
      voiceGender: "male",
      voiceStyle: "rough",
      voicePitch: 0.78,
      voiceRate: 1.0,
      isPhone: true,
      promptText: "Kedy by vám vyhovovalo pristaviť vozidlo na diagnostiku?",
      suggestedResponse: "V pondelok o ôsmej ráno",
      audioUrl: null,
      contextNote: "Náročný zhluk V-P s uvoľnenou dolnou perou",
    },
    {
      id: "servis_3",
      category: "servis",
      categoryLabel: "🔧 Autoservis / Dielňa",
      caller: "Dispečer Roman (Havarijná služba)",
      avatar: "🚨",
      voiceGender: "male",
      voiceStyle: "phone",
      voicePitch: 0.92,
      voiceRate: 1.1,
      isPhone: true,
      promptText: "Havarijná služba, uveďte presnú adresu, kde sa nachádzate.",
      suggestedResponse: "Šancová ulica číslo dvadsať",
      audioUrl: null,
      contextNote: "Stresová tiesňová situácia – kľúčový je hlboký nádych pred štartom",
    },
  ];

  // ==========================================================================
  // 2. INTELIGENTNÝ ROTÁTOR S HISTÓRIOU (LRU BUFFER)
  // ==========================================================================
  const TRAINING_VOICES = [
  {
    "id": "pokladna_1",
    "category": "pokladna",
    "caller": "Pokladníčka Zuzana",
    "promptText": "Tento výrobok mi systém nevie načítať a chýba na ňom cenovka. Viete mi prosím povedať, z ktorého regálu ste ho zobrali a aká tam bola uvedená cena?",
    "voiceGender": "female",
    "audioUrl": "/audio/scenarios/pokladna_1.mp3"
  },
  {
    "id": "pokladna_2",
    "category": "pokladna",
    "caller": "Predavač Martin",
    "promptText": "Máte našu zákaznícku kartičku alebo aplikáciu v mobile?",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "pokladna_3",
    "category": "pokladna",
    "caller": "Pokladníčka Zuzana",
    "promptText": "Bloček si prajete vytlačiť, alebo poslať na mail?",
    "voiceGender": "female",
    "audioUrl": null
  },
  {
    "id": "pokladna_4",
    "category": "pokladna",
    "caller": "Pokladníčka Alena",
    "promptText": "Budete si priať aj papierovú tašku na nákup?",
    "voiceGender": "female",
    "audioUrl": null
  },
  {
    "id": "pokladna_5",
    "category": "pokladna",
    "caller": "Predavač Martin",
    "promptText": "Máte to presne, alebo vám mám vydávať z dvadsiatky?",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "kurier_1",
    "category": "kurier",
    "caller": "Kuriér Marek",
    "promptText": "Dobrý deň, tu je kuriér Packeta. Stojím pred vašou bytovkou, ale na bráne nevidím vaše meno a nefunguje zvonček. Viete mi prosím popísať, ktorý je to vchod a na ktorom poschodí vás nájdem?",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "kurier_2",
    "category": "kurier",
    "caller": "Kuriér Marek",
    "promptText": "Stojím dole pred bránou, viete zbehnúť na prízemie?",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "kurier_3",
    "category": "kurier",
    "caller": "Kuriér Igor (DPD)",
    "promptText": "Zásielka je na meno Novák. Povedzte mi prosím overovací PIN kód.",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "kurier_4",
    "category": "kurier",
    "caller": "Kuriér Igor (DPD)",
    "promptText": "Nezastihol som vás. Môžem vám nechať balík v susednom boxe?",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "lekar_1",
    "category": "lekar",
    "caller": "Dr. Kováč (Všeobecný lekár)",
    "promptText": "Dobrý, kvôli čomu ste prišli? A vaše meno poprosím ešte.",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "lekar_2",
    "category": "lekar",
    "caller": "Sestrička Elena",
    "promptText": "Prosím, pri telefóne, povedzte mi vaše celé meno a rodné číslo.",
    "voiceGender": "female",
    "audioUrl": null
  },
  {
    "id": "lekar_3",
    "category": "lekar",
    "caller": "Magistra Jana (Lekáreň)",
    "promptText": "Dobrý deň v lekárni. Máte elektronický recept, alebo voľnopredajný liek?",
    "voiceGender": "female",
    "audioUrl": null
  },
  {
    "id": "lekar_4",
    "category": "lekar",
    "caller": "Dr. Kováč (Lekár)",
    "promptText": "Kedy sa u vás tie príznaky objavili prvýkrát?",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "kaviaren_1",
    "category": "kaviaren",
    "caller": "Baristka Lucia",
    "promptText": "Dobrý deň, čo vám môžem dnes ponúknuť na pitie?",
    "voiceGender": "female",
    "audioUrl": null
  },
  {
    "id": "kaviaren_2",
    "category": "kaviaren",
    "caller": "Baristka Lucia",
    "promptText": "Kávu si prajete s klasickým mliekom, alebo bezlaktózovým?",
    "voiceGender": "female",
    "audioUrl": null
  },
  {
    "id": "kaviaren_3",
    "category": "kaviaren",
    "caller": "Čašník Tomáš",
    "promptText": "Dobrý deň, máte u nás urobenú rezerváciu stola na meno?",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "kaviaren_4",
    "category": "kaviaren",
    "caller": "Čašník Tomáš",
    "promptText": "Budete platiť dohromady, alebo si účet rozdelíte zvlášť?",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "urad_1",
    "category": "urad",
    "caller": "Úradník JUDr. Molnár",
    "promptText": "Klientske centrum, pri telefóne Molnár. V akej záležitosti voláte?",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "urad_2",
    "category": "urad",
    "caller": "Pracovníčka banky Martina",
    "promptText": "Z dôvodu bezpečnosti mi prosím nadiktujte vaše trvalé bydlisko.",
    "voiceGender": "female",
    "audioUrl": null
  },
  {
    "id": "urad_3",
    "category": "urad",
    "caller": "Úradník JUDr. Molnár",
    "promptText": "Prajete si poslať potvrdenie na vašu poštovú adresu alebo email?",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "servis_1",
    "category": "servis",
    "caller": "Miro (Automechanik)",
    "promptText": "Autoservis, prosím? Čo presne sa stalo s vaším autom a kedy ho viete priniesť?",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "servis_2",
    "category": "servis",
    "caller": "Miro (Automechanik)",
    "promptText": "Kedy by vám vyhovovalo pristaviť vozidlo na diagnostiku?",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "servis_3",
    "category": "servis",
    "caller": "Dispečer Roman (Havarijná služba)",
    "promptText": "Havarijná služba, uveďte presnú adresu, kde sa nachádzate.",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "boss_1",
    "category": "coach",
    "caller": "Sprievodca tréningom",
    "promptText": "Čaká ťa samohláskový boss tréning. Uvoľni sánku a nechaj hlas začať jemne. Každé slovo povedz vlastným tempom.",
    "voiceGender": "male",
    "audioUrl": "/audio/coach/boss_1.mp3"
  },
  {
    "id": "boss_2",
    "category": "coach",
    "caller": "Sprievodca tréningom",
    "promptText": "Vitaj v rezonančnom boss tréningu. Sústreď sa na plynulé spojenie hlások. Nemusíš sa ponáhľať.",
    "voiceGender": "male",
    "audioUrl": "/audio/coach/boss_2.mp3"
  },
  {
    "id": "boss_3",
    "category": "coach",
    "caller": "Sprievodca tréningom",
    "promptText": "Čaká ťa boss tréning náročných spoluhlások. Uvoľni pery a jazyk. Začni ľahkým kontaktom a plynulo pokračuj.",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "boss_4",
    "category": "coach",
    "caller": "Sprievodca tréningom",
    "promptText": "Teraz si vyskúšaš rozhovor pri pokladni. Vypočuj si otázku a potom odpovedz. Dôležitejší než rýchlosť je pokojný začiatok.",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "boss_5",
    "category": "coach",
    "caller": "Sprievodca tréningom",
    "promptText": "Čaká ťa záverečná simulácia hovoru. Zdvihni telefón, vypočuj si volajúceho a odpovedz. Daj svojim prvým slovám priestor.",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "pokladna_payment",
    "category": "pokladna",
    "caller": "Pokladníčka Zuzana",
    "promptText": "Budete platiť v hotovosti alebo kartou?",
    "suggestedResponse": "Kartou, prosím",
    "voiceGender": "female",
    "audioUrl": "/audio/scenarios/pokladna_payment.mp3"
  },
  {
    "id": "pokladna_goodbye",
    "category": "pokladna",
    "caller": "Pokladníčka Zuzana",
    "promptText": "Ďakujem za nákup, dovidenia.",
    "suggestedResponse": "Dovidenia",
    "voiceGender": "female",
    "audioUrl": null
  },
  {
    "id": "kurier_intro",
    "category": "kurier",
    "caller": "Kuriér Marek",
    "promptText": "Dobrý deň, tu je kuriér. S kým hovorím?",
    "suggestedResponse": "Dobrý deň, pri telefóne",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "kurier_confirm",
    "category": "kurier",
    "caller": "Kuriér Marek",
    "promptText": "Dobrý deň, čakáte dnes zásielku?",
    "suggestedResponse": "Áno, čakám balík, ďakujem",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "lekar_appointment",
    "category": "lekar",
    "caller": "Sestrička Elena",
    "promptText": "Ambulancia, prosím. Povedzte mi vaše meno a s čím vám môžeme pomôcť.",
    "suggestedResponse": "Peter Novák, volám kvôli termínu",
    "voiceGender": "female",
    "audioUrl": null
  },
  {
    "id": "servis_intro",
    "category": "servis",
    "caller": "Miro (Automechanik)",
    "promptText": "Autoservis, pri telefóne Miro. V akej veci voláte?",
    "suggestedResponse": "Dobrý deň, volám ohľadom auta",
    "voiceGender": "male",
    "audioUrl": null
  },
  {
    "id": "hovor_goodbye",
    "category": "urad",
    "caller": "Pracovníčka klientskeho centra",
    "promptText": "To je všetko. Ďakujem za zavolanie a prajem vám pekný deň.",
    "suggestedResponse": "Ďakujem pekne za pomoc, prajem pekný deň",
    "voiceGender": "female",
    "audioUrl": null
  },
  {
    "id": "sos_intro",
    "category": "coach",
    "caller": "Sprievodca tréningom",
    "promptText": "Vitaj v rýchlom drille. Čakajú ťa tri pokusy. Najprv sa nadýchni a potom povedz svoje slovo alebo vetu. Vlastným tempom.",
    "voiceGender": "male",
    "audioUrl": null
  }
];
  for (const clip of TRAINING_VOICES.filter(q => q.category !== 'coach')) {
    const existing = QUESTION_BANK.find(q => q.id === clip.id);
    if (existing) { if (clip.audioUrl) existing.audioUrl = clip.audioUrl; }
    else QUESTION_BANK.push(clip);
  }
  window.TRAINING_VOICES = TRAINING_VOICES;

  class QuestionRotator {
    constructor(bank, historySize = 6) {
      this.bank = bank;
      this.historySize = historySize;
      this.recentIds = [];
      this.activeCategory = "all";
    }

    setCategory(cat) {
      this.activeCategory = cat || "all";
    }

    getAvailableQuestions(cat = this.activeCategory) {
      if (!cat || cat === "all") return this.bank;
      return this.bank.filter((q) => q.category === cat);
    }

    getNext(cat = this.activeCategory) {
      const pool = this.getAvailableQuestions(cat);
      if (!pool.length) return this.bank[0];

      // Vyfiltruj nedávno použité otázky
      let candidates = pool.filter((q) => !this.recentIds.includes(q.id));
      if (!candidates.length) {
        // Ak sú všetky v histórii, zmenši históriu a vyber znova
        this.recentIds = this.recentIds.slice(-2);
        candidates = pool.filter((q) => !this.recentIds.includes(q.id));
        if (!candidates.length) candidates = pool;
      }

      // Náhodný výber z kandidátov
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];

      // Ulož do histórie
      this.recentIds.push(chosen.id);
      if (this.recentIds.length > this.historySize) {
        this.recentIds.shift();
      }

      return chosen;
    }

    getById(id) {
      return this.bank.find((q) => q.id === id) || null;
    }
  }

  // ==========================================================================
  // 3. MULTI-VOICE SYNTHESIS & AUDIO PLAYER ENGINE
  // ==========================================================================
  class FluencyVoiceEngine {
    constructor() {
      this.rotator = new QuestionRotator(QUESTION_BANK, 7);
      this.currentQuestion = this.rotator.getNext("pokladna");
      this.voices = [];
      this.activeAudio = null;
      this.playbackGeneration = 0;
      this.safetyTimer = null;
      this.isSpeaking = false;
      this.preferOriginalMp3 = true; // Použije MP3 ak existuje

      this.initVoices();
    }

    initVoices() {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const load = () => {
          this.voices = window.speechSynthesis.getVoices() || [];
        };
        load();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = load;
        }
      }
    }

    /**
     * Nájde najvhodnejší hlas pre personu (slovenčina > čeština > fallback)
     */
    findBestVoice(gender = "female") {
      if (!this.voices.length) {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          this.voices = window.speechSynthesis.getVoices() || [];
        }
      }

      const skVoices = this.voices.filter((v) => v.lang.startsWith("sk"));
      const csVoices = this.voices.filter((v) => v.lang.startsWith("cs"));

      const isFemale = (v) => {
        const name = (v.name || "").toLowerCase();
        return (
          name.includes("laura") ||
          name.includes("viktoria") ||
          name.includes("zuzana") ||
          name.includes("alena") ||
          name.includes("elena") ||
          name.includes("vlasta") ||
          name.includes("female")
        );
      };

      const isMale = (v) => {
        const name = (v.name || "").toLowerCase();
        return (
          name.includes("filip") ||
          name.includes("lukas") ||
          name.includes("jakub") ||
          name.includes("jan") ||
          name.includes("zdenek") ||
          name.includes("male")
        );
      };

      // 1. Skús slovenský hlas s požadovaným pohlavím
      if (skVoices.length) {
        const match = skVoices.find((v) => (gender === "female" ? isFemale(v) : isMale(v)));
        if (match) return match;
        return skVoices[0];
      }

      // 2. Skús český hlas (znie 99% zrozumiteľne pre Slovákov)
      if (csVoices.length) {
        const match = csVoices.find((v) => (gender === "female" ? isFemale(v) : isMale(v)));
        if (match) return match;
        return csVoices[0];
      }

      // 3. Fallback na akýkoľvek dostupný hlas
      return this.voices[0] || null;
    }

    stop() {
      this.playbackGeneration++;
      clearTimeout(this.safetyTimer);
      if (this.activeAudio) {
        try {
          this.activeAudio.onended = null;
          this.activeAudio.onerror = null;
          this.activeAudio.pause();
          this.activeAudio.currentTime = 0;
        } catch (_) {}
        this.activeAudio = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (_) {}
      }
      this.isSpeaking = false;
    }

    /**
     * Prehrá otázku zadanou personou s jej unikátnym hlasom, tempom a pitchom
     */
    speak(question = this.currentQuestion, onDone = () => {}, forceSynthesis = false) {
      this.stop();
      if (!question) {
        onDone();
        return;
      }

      this.currentQuestion = question;
      if (question.audioVariants?.length) {
        const choice = window.GlideTrainingCore.voiceVariant(question.audioVariants, this.lastSpeaker);
        this.lastSpeaker = choice.speaker;
        question = {...question, audioUrl:choice.url};
      }
      this.isSpeaking = true;

      const generation = this.playbackGeneration;
      let finished = false;
      const finishOnce = () => {
        if (finished || generation !== this.playbackGeneration) return;
        finished = true;
        this.isSpeaking = false;
        this.activeAudio = null;
        onDone();
      };

      // 1. Ak máme reálne MP3 a nie je vynútená syntéza
      if (this.preferOriginalMp3 && question.audioUrl && !forceSynthesis) {
        const audio = new Audio(question.audioUrl);
        this.activeAudio = audio;
        audio.onended = finishOnce;
        let fallbackStarted = false;
        audio.onerror = () => {
          if (generation !== this.playbackGeneration || fallbackStarted) return;
          fallbackStarted = true;
          audio.onended = audio.onerror = null;
          audio.pause();
          // Fallback na syntézu ak MP3 zlyhá
          this.speakWithSynthesis(question, finishOnce);
        };
        audio.play().catch(() => audio.onerror?.());
        return;
      }

      // 2. Syntéza hlasu cez Web Speech API
      this.speakWithSynthesis(question, finishOnce);
    }

    speakWithSynthesis(question, finishOnce) {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        this.safetyTimer = setTimeout(finishOnce, 1200);
        return;
      }

      try {
        window.speechSynthesis.cancel();

        const utter = new SpeechSynthesisUtterance(question.promptText);
        const voice = this.findBestVoice(question.voiceGender);
        if (voice) {
          utter.voice = voice;
          utter.lang = voice.lang || "sk-SK";
        } else {
          utter.lang = "sk-SK";
        }

        utter.pitch = question.voicePitch || (question.voiceGender === "female" ? 1.15 : 0.9);
        utter.rate = question.voiceRate || 1.05;

        // Bezpečnostný timeout proti uviaznutiu v mobilnom Safari/Chrome
        const approxDurationMs = Math.max(1200, (question.promptText.length * 75) / utter.rate);
        const safetyTimer = this.safetyTimer = setTimeout(() => {
          finishOnce();
        }, approxDurationMs + 1000);

        utter.onend = () => {
          clearTimeout(safetyTimer);
          finishOnce();
        };

        utter.onerror = () => {
          clearTimeout(safetyTimer);
          finishOnce();
        };

        window.speechSynthesis.speak(utter);
      } catch (e) {
        console.warn("Speech synthesis error:", e);
        finishOnce();
      }
    }

    /**
     * Vyberie novú otázku s rotáciou a nastaví ju ako aktuálnu
     */
    rotate(category = "all") {
      this.currentQuestion = this.rotator.getNext(category);
      return this.currentQuestion;
    }
  }

  const payment = QUESTION_BANK.find(q => q.id === 'pokladna_payment');
  if (payment) payment.caller = "Pokladňa";
  if (payment) payment.audioVariants = [
    {url:'/audio/scenarios/pokladna_payment.mp3',speaker:'Suzie'},
    {url:'/audio/scenarios/pokladna_payment_jaro.mp3',speaker:'Jaro'}
  ];

  // Vytvorenie globálnej inštancie
  const fluencyVoiceEngine = new FluencyVoiceEngine();

  // Export do window
  window.QUESTION_BANK = QUESTION_BANK;
  window.FluencyVoiceEngine = FluencyVoiceEngine;
  window.fluencyVoice = fluencyVoiceEngine;
})(typeof window !== "undefined" ? window : global);
