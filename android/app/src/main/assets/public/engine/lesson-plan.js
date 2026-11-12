/* Product lesson lengths, not prescribed therapy dosage. */
(function (root) {
  "use strict";
  const extras = {
    1.1: ["Adresa", "Okno", "Obed", "Ananás"],
    1.2: ["Ivana", "Eva", "Inak", "Európa"],
    1.3: ["Ucho", "Úloha", "Utorok", "Účet"],
    1.4: ["Adam", "Eva", "Urban", "Olívia"],
    1.5: ["Ostrov", "Album", "Úloha", "Inak"],
    2.1: ["Meno", "Nákup", "Malina", "Nina"],
    2.2: ["Víkend", "Záhrada", "Vlak", "Zajtra"],
    2.3: ["Leto", "Robot", "Ráno", "Les"],
    2.4: ["Banka", "Dvere", "Garáž", "Darček"],
    2.5: ["Batožina", "Vlak", "Múzeum", "Dolina"],
    3.1: ["Polievka", "Telefón", "Pondelok", "Tanier"],
    3.2: ["Kino", "Chata", "Kniha", "Chladnička"],
    3.3: ["Šálka", "Streda", "Cukor", "Sused"],
    3.4: ["Včera", "Stretnutie", "Ktorý", "Prsteň"],
    3.5: ["Kancelária", "Prednáška", "Čaj", "Tlačivo"],
  };
  const phrases = {
    Auto: "Auto je pred domom.",
    Otec: "Otec príde zajtra.",
    Áno: "Áno, ďakujem.",
    Oko: "Oko a ucho.",
    Isto: "Isto, môžeme ísť.",
    Echo: "Echo sa ozýva.",
    Iba: "Iba jednu, prosím.",
    Ešte: "Ešte chvíľu počkám.",
    Ulica: "Ulica je neďaleko.",
    Úrad: "Úrad je dnes otvorený.",
    Ôsmy: "Ôsmy deň v mesiaci.",
    Úsmev: "Úsmev mi pomohol.",
    Alain: "Alain príde neskôr.",
    Andrea: "Andrea je pri telefóne.",
    Oliver: "Oliver čaká vonku.",
    Igor: "Igor mi zavolal.",
    Autobus: "Autobus ide o chvíľu.",
    Inštitút: "Inštitút je v centre.",
    Ekonomika: "Ekonomika ma zaujíma.",
    Úspešný: "Úspešný začiatok dňa.",
    Mama: "Mama je doma.",
    Noviny: "Noviny sú na stole.",
    Mesto: "Mesto je dnes pokojné.",
    Noc: "Noc bola tichá.",
    Voda: "Voda je na stole.",
    Zima: "Zima sa blíži.",
    Včera: "Včera som bol vonku.",
    Zelená: "Zelená taška je moja.",
    Lampa: "Lampa je pri okne.",
    Ruka: "Ruka je uvoľnená.",
    Krk: "Krk a ramená.",
    Vlk: "Vlk žije v lese.",
    Brat: "Brat príde večer.",
    Dom: "Dom je za rohom.",
    Gombík: "Gombík je modrý.",
    Dobrý: "Dobrý deň prajem.",
    Bratislava: "Bratislava je naše hlavné mesto.",
    Vynikajúci: "Vynikajúci nápad.",
    Medicína: "Medicína ma zaujíma.",
    Dovolenka: "Dovolenka sa blíži.",
    Pivo: "Pivo si neprosím.",
    Topánka: "Topánka je pri dverách.",
    Peter: "Peter je pri telefóne.",
    Ticho: "Ticho mi teraz vyhovuje.",
    Káva: "Káva s mliekom, prosím.",
    Chlieb: "Chlieb si vezmem so sebou.",
    Kľúč: "Kľúč je vo vrecku.",
    Chlapec: "Chlapec čaká na autobus.",
    Škola: "Škola je blízko.",
    Stôl: "Stôl je pri okne.",
    Spolu: "Spolu to prejdeme.",
    Cesta: "Cesta vedie cez park.",
    Štvrtok: "Štvrtok o tretej mi vyhovuje.",
    Kto: "Kto je pri telefóne?",
    Pstruh: "Pstruh je na jedálnom lístku.",
    Vstup: "Vstup je z druhej strany.",
    Knižnica: "Knižnica je dnes otvorená.",
    Prezident: "Prezident je na návšteve.",
    Trenčín: "Trenčín je môj cieľ.",
    Čokoláda: "Čokoláda s orechmi, prosím.",
  };
  const prompts = {
    pokladna: [
      "Prajete si bloček vložiť do tašky?",
      "Chcete nákup rozdeliť do dvoch tašiek?",
      "Tieto jablká ste si už odvážili?",
      "Môžete mi prosím podať posledný výrobok?",
      "Máte záujem aj o darčekové balenie?",
      "Platobný terminál sa práve načítava. Môžete chvíľu počkať?",
      "Tento výrobok máme aj vo väčšom balení. Máte oň záujem?",
      "Chcete tieto fľaše nechať mimo tašky?",
      "Budete potrebovať pomoc s odnesením nákupu?",
      "Je to všetko, čo si dnes prajete?",
      "Našli ste v predajni všetko, čo ste hľadali?",
      "Prajete si túto položku z nákupu odobrať?",
    ],
    kurier: [
      "Vyhovuje vám doručenie dnes popoludní?",
      "Môžete mi prosím povedať číslo domu?",
      "Je pri vašom dome miesto na zaparkovanie?",
      "Mám balík odovzdať vám alebo inej osobe?",
      "Môžete prísť ku vchodu približne o päť minút?",
      "Na ktorom poschodí vás nájdem?",
      "Ktoré meno mám hľadať na zvončeku?",
      "Mám použiť hlavný alebo bočný vchod?",
      "Prajete si zásielku presmerovať na výdajné miesto?",
      "Je v poriadku, ak vám pred príchodom ešte zavolám?",
      "Balík je trochu ťažší. Potrebujete ho priniesť k dverám?",
      "Doručenie môžeme presunúť na zajtra. Vyhovuje vám to?",
    ],
    lekar: [
      "Vyhovuje vám termín ráno alebo popoludní?",
      "Ide o prvú návštevu našej ambulancie?",
      "Ktorý deň budúci týždeň vám vyhovuje?",
      "Chcete termín zmeniť alebo zrušiť?",
      "Môžete prísť o desať minút skôr?",
      "Prajete si potvrdenie termínu správou?",
      "Viete nám prosím povedať dôvod telefonátu?",
      "Máte so sebou kartičku poistenca?",
      "Mám vám vysvetliť, kde sa ambulancia nachádza?",
      "Chcete sa na niečo opýtať pred návštevou?",
      "Vyhovoval by vám náhradný termín v piatok?",
      "Môžete chvíľu zostať na linke?",
    ],
    servis: [
      "Akú značku auta máte?",
      "Kedy by ste vedeli auto priviezť?",
      "Chcete sa objednať na kontrolu alebo opravu?",
      "Kedy ste si problém všimli prvýkrát?",
      "Počujete ten zvuk aj pri pomalej jazde?",
      "Máme vám po kontrole najprv zavolať?",
      "Vyhovuje vám prevzatie auta zajtra?",
      "Prajete si pred opravou cenový odhad?",
      "Potrebujete vysvetliť cestu do nášho servisu?",
      "Máte ešte nejakú požiadavku k objednávke?",
      "Viete nám stručne opísať, s čím potrebujete pomôcť?",
      "Máme vás kontaktovať telefonicky alebo správou?",
    ],
  };
  prompts.pokladna.push(
    "Prajete si skontrolovať cenu tejto položky?",
    "Máte záujem o menšiu tašku?",
    "Prajete si tieto veci zabaliť osobitne?",
    "Môžem vám ešte s niečím pomôcť?",
  );
  prompts.kurier.push(
    "Mám vás po príchode prezvoniť?",
    "Viete ma nasmerovať od najbližšej križovatky?",
    "Je pri vašom vchode brána s kódom?",
    "Ktorý čas vám na doručenie najviac vyhovuje?",
  );
  prompts.lekar.push(
    "Prajete si overiť čas už dohodnutej návštevy?",
    "Môžeme vám ponúknuť miesto uvoľnené na zajtra?",
    "Potrebujete bezbariérový vstup?",
    "Prajete si ešte niečo doplniť k objednávke?",
  );
  prompts.servis.push(
    "Chcete pri prevzatí auta vysvetliť vykonané práce?",
    "Prajete si rezervovať aj sezónne prezutie?",
    "Bude auto privážať majiteľ alebo niekto iný?",
    "Máte na nás ešte nejakú otázku?",
  );
  function questions() {
    return Object.entries(prompts).flatMap(([category, lines]) =>
      lines.map((promptText, i) => ({
        id: `practice_${category}_${i}`,
        category,
        caller: {
          pokladna: "Predajňa",
          kurier: "Kuriér",
          lekar: "Ambulancia",
          servis: "Autoservis",
        }[category],
        promptText,
        voiceGender: i % 2 ? "male" : "female",
        audioUrl: null,
      })),
    );
  }
  phrases["Úspešný"] = "Úspešný deň sa začína.";
  function isBoss(level) {
    return level.isBoss === true || /^Boss\b/i.test(level.title || "");
  }
  const ROUND_NAMES = ["Rozohriatie", "Hlavná výzva", "Vlastnými slovami"];
  function build(level, bank = [], random = Math.random) {
    const boss = isBoss(level);
    const counts = boss ? [3, 8, 5] : [3, 6, 3];
    const tasks = [];
    const isScene = ["guillotine", "ambush"].includes(level.mode);
    const base = [...level.words];
    const vocabulary = root.GlideVocabulary?.forSeeds(base) || [];
    const candidates = [...new Set([...vocabulary, ...(extras[level.id] || [])])]
      .filter(word => !base.some(seed => seed.toLocaleLowerCase("sk") === word.toLocaleLowerCase("sk")));
    const start = isScene || !candidates.length ? 0 : Math.floor(random() * candidates.length) % candidates.length;
    const expanded = [...candidates.slice(start), ...candidates.slice(0, start)];
    const pool = [...base, ...expanded];
    let scene = [];
    if (isScene) {
      const category = level.ambushCategory || "all";
      const candidates = [...bank, ...questions()].filter(
        (q) => q.category !== "coach" && (category === "all" || q.category === category),
      );
      const unique = [...new Map(candidates.map((q) => [q.promptText, q])).values()];
      const sorted = unique.sort((a, b) => a.promptText.length - b.promptText.length);
      const easy = sorted.slice(0, Math.min(6, sorted.length));
      const rest = sorted.slice(easy.length);
      const roll = random();
      const offset = easy.length
        ? Math.floor(Math.max(0, Math.min(0.9999, Number.isFinite(roll) ? roll : 0)) * easy.length)
        : 0;
      scene = [...easy.slice(offset), ...easy.slice(0, offset), ...rest];
    }
    let cursor = 0;
    counts.forEach((count, round) => {
      for (let i = 0; i < count; i++) {
        let task;
        if (isScene) {
          const q = scene[cursor % scene.length];
          if (!q) throw Error("No scenario content");
          task = {
            word: "Odpovedz vlastnými slovami",
            questionId: q.id,
            mode: level.mode,
            freeReply: true,
            kind: "scenario",
          };
        } else if (round === 2) {
          const word = base[i % base.length];
          const styles = [
            `Použi slovo „${word}“ vo vlastnej vete.`,
            `Povedz vlastnú otázku so slovom „${word}“.`,
            `Povedz, čo ti pripomína slovo „${word}“.`,
            `Použi slovo „${word}“ v krátkom príbehu.`,
            `Povedz, kde sa môžeš stretnúť so slovom „${word}“.`,
          ];
          task = {
            word: styles[i % styles.length],
            mode: "standard",
            freeReply: true,
            kind: "sentence",
          };
        } else if (round === 1 && i % 2 === 1) {
          const word = base[Math.floor(i / 2) % base.length];
          task = {
            word: phrases[word] || `${word}, prosím.`,
            mode: "standard",
            freeReply: false,
            kind: "phrase",
          };
        } else {
          const index = round === 0 ? i : counts[0] + Math.floor(i / 2);
          task = {
            word: pool[index % pool.length],
            mode: "standard",
            freeReply: false,
            kind: "word",
          };
        }
        tasks.push({
          ...task,
          id: `${level.id}-full-${cursor++}`,
          round,
          attempts: 0,
        });
      }
    });
    return {
      version: 1,
      levelId: level.id,
      size: "full",
      tasks,
      roundNames: ROUND_NAMES.slice(),
      counts,
    };
  }
  const api = { build, questions, isBoss, roundNames: ROUND_NAMES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GlideLessonPlan = api;
})(typeof window !== "undefined" ? window : globalThis);
