(function (root) {
  "use strict";
  const groups = {
    a: "adresár akcia aktovka album aliancia ambícia ambulancia ananás anketa anténa apríl archív atlét atrament autobus avokádo azalka",
    á: "átrium ária áno",
    b: "bageta balíček balón banán batoh bazalka bežec bicykel bielizeň blaho blato blúzka bodka bochník brána broskyňa brúsenie budova",
    c: "cedidlo cement cenovka centrum cesta cestopis cieľ ciferník citrón cnosť cudzinec cukráreň cvikla cvičenie cyklista",
    č: "čakanie čiapka čiara čítanka čítačka čln členok človek čokoláda črepník čučoriedka čulý červená čerstvý čistič",
    d: "dážď dáždnik darček debna deň diaľka dielňa divadlo dohoda doklad domov dopravca doručenie dvor drevo družstvo druhý",
    ď: "ďaleko ďasno ďateľ ďakujem",
    e: "električka elektrina energia encyklopédia erb erózia eskalátor etapa etiketa etuda evidencia exkurzia expres egreš",
    f: "farba fazuľa február festival figúrka filter fľaša fontána fotograf frajer fráza frekvencia fujavica funkcia futbal",
    g: "galéria garáž gauč gaštan geometria gesto gitara glóbus gombík gorila granát grep groš guľa guma gumák",
    h: "had háčik hádanka hala harmanček havran hebký helma hlava hmla hniezdo hodina hojdačka holub hra hrad hrebeň hudba",
    ch: "chalupa charakter chata chodba chodec chodník chlieb chladnička chobot chôdza chov chrbtica chrúst chuť chvála chvíľa",
    i: "ihla ihrisko ikona ilustrácia imitácia index informácia inkaso inšpirácia interiér internet inzerát iskra istota izba",
    j: "jablko jahňa jahoda jama jar jarmok jazda jazero jazyk jedáleň jedľa jeleň jesenný ježko jogurt jún",
    k: "kabát kachle kalendár kaluž kamienok kanvica kapusta karamel karta kefa kladivo klas klebetník klenot klinček kniha koláč komín kopček koruna kosť kotol kôš krajina kreslo kruh kvet",
    l: "labuť lampa lampáš lano lasica lastovička lavica lekáreň lekcia les letisko lietadlo limonáda lipa lis lístok lopata lúka",
    ľ: "ľad ľalia ľadovec ľahký ľan ľavý ľudský ľudovo ľutovať",
    m: "mačka maják malina mandľa mapa maslo mašľa med medveď melón meradlo mesiac miestnosť minca miska most mrak mravec mrkva múka",
    n: "nádoba nádrž náhrada nápad náradie nástupište nedeľa nehoda netopier nevädza niť noha nos noviny núdza nožnice",
    o: "obal obálka obed oblak oblička obloha obchod obruč obraz oceán ocot odbočka odkaz odmena ohník okuliare omáčka opasok oslava ovocie",
    ô: "ôsmy ôsma ôsme",
    p: "papier papuča párik parník pečivo perina pierko píšťalka plachta plán plavba pletivo plot podlaha pohár polievka ponuka pohľadnica prechod príbeh príbor prsteň pstruh",
    r: "radar ráfik rak raketa rameno rampa raňajky recept remienok reťaz rieka robota rohož rolka rožok ruža ruksak ryba rým",
    s: "sad sada saláma sapún sedadlo sekera seno sieť sídlo silo skala skica sklo sklad slávik slivka slovo smrek sneh socha sokol stan strom sud svetlo syr",
    š: "šach šál šálka šatka šaty šek šiška škatuľa škola škorec škorica šnúrka šofér šošovica špajza špageta šperk špička špongia štvrtok",
    t: "tabuľa tábor tanec tanier taška tehla telefón televízor tepelný terasa termín termoska tesár tieň tlačidlo tlieskanie topánka torta trasa tráva trh truhlica",
    ť: "ťah ťava ťažisko ťažký ťuknutie",
    u: "učebnica ucho uhlie ukážka ukazovák ulica umenie univerzita upratovanie utierka uterák uvoľnenie uzáver uzol",
    ú: "účet údolie údržba úloha úrad úsmev úsek útulok úvod úžitok",
    v: "vankúš váha vanilka varenie váza vedro veža vidlička vietor vila vínko višňa vlak vlna voda vodopád vozík vrabec vrecia vrtuľa východ",
    z: "zábradlie záhrada záclona zákruta záloha zápisník zásielka zátka zbor zebra zem zemiak zima zips zlato zmrzlina znak zvon zvonček",
    ž: "žaba žací žaluď žart žehlička železo žemľa žeriav žetón žihľava žila žinenka žirafa žito žliabok žralok žrebec župan",
  };

  const bank = Object.fromEntries(
    Object.entries(groups).map(([key, value]) => [key, value.split(" ")]),
  );
  const all = [...new Set(Object.values(bank).flat())].sort((a, b) => a.localeCompare(b, "sk"));
  function initial(word) {
    const lower = word.toLocaleLowerCase("sk");
    return lower.startsWith("ch") ? "ch" : lower[0];
  }
  function forSeeds(words) {
    return [...new Set(words.flatMap((word) => bank[initial(word)] || []))];
  }
  const api = { all, forSeeds };
  root.GlideVocabulary = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  const input = document.getElementById("wordInput");
  const trigger = document.createElement("button");
  trigger.id = "vocabularyOpen";
  trigger.type = "button";
  trigger.className = "practice-button";
  trigger.textContent = "Slová";
  document.querySelector(".sandbox-input-heading")?.append(trigger);

  const dialog = document.createElement("dialog");
  dialog.id = "vocabularyDialog";
  dialog.className = "lesson-round-dialog conversation-dialog";
  dialog.setAttribute("aria-labelledby", "vocabularyTitle");
  dialog.innerHTML = `
    <button type="button" class="conversation-close" aria-label="Zavrieť">✕</button>
    <h2 id="vocabularyTitle">Slová na tréning</h2>
    <label for="vocabularySearch">Vyhľadať slovo</label>
    <input id="vocabularySearch" type="search" placeholder="Napríklad káva" autocomplete="off">
    <details class="vocabulary-add"><summary>Pridať vlastné slovo</summary><div id="vocabularyAddForm"></div></details>
    <p id="vocabularyCount" role="status"></p>
    <div id="vocabularyWords" class="vocabulary-words"></div>
    <button id="vocabularyNext" type="button" class="lesson-quiet-action">Ďalšie slová</button>
  `;
  document.body.append(dialog);
  const savedCard = document.getElementById("fearedWordsCard");
  const addForm = savedCard?.querySelector(".vault-add-form");
  if (addForm) dialog.querySelector("#vocabularyAddForm").append(addForm);
  const randomButton = savedCard?.querySelector("#vaultRandomChallengeBtn");
  if (randomButton) dialog.querySelector("#vocabularyAddForm").append(randomButton);
  if (savedCard) savedCard.hidden = true;
  const search = document.getElementById("vocabularySearch");
  const list = document.getElementById("vocabularyWords");
  const count = document.getElementById("vocabularyCount");
  const next = document.getElementById("vocabularyNext");
  let offset = 0;
  const pageSize = 28;
  const fold = (text) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("sk");
  const identity = (text) => text.trim().toLocaleLowerCase("sk");
  function render() {
    const query = fold(search.value.trim());
    const saved = window.duoState?.loadVaultWords() || [];
    const savedNames = new Set(saved.map((item) => identity(item.word)));
    const words = [
      ...saved.map((item) => ({ word: item.word, saved: item })),
      ...all.filter((word) => !savedNames.has(identity(word))).map((word) => ({ word })),
    ];
    const matches = words.filter((item) => fold(item.word).includes(query));
    if (offset >= matches.length) offset = 0;
    list.replaceChildren();
    for (const item of matches.slice(offset, offset + pageSize)) {
      const row = document.createElement("div");
      row.className = "vocabulary-word-row";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "vocabulary-word";
      button.textContent = item.word;
      button.onclick = () => {
        input.value = item.word;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        dialog.close();
        input.focus();
      };
      row.append(button);
      if (item.saved) {
        const status = document.createElement("span");
        status.className = "vocabulary-saved-status";
        status.textContent = item.saved.isMastered ? "Precvičené" : (item.saved.successes || 0) + "/3 pokusy";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "vocabulary-remove";
        remove.textContent = "✕";
        remove.setAttribute("aria-label", "Odstrániť uložené slovo " + item.word);
        remove.onclick = () => {
          window.duoLesson?.deleteVaultWord(item.saved.id);
          render();
        };
        row.append(status, remove);
      }
      list.append(row);
    }
    count.textContent = matches.length
      ? (offset + 1) + "–" + Math.min(offset + pageSize, matches.length) + " z " + matches.length + " slov"
      : "Žiadne slovo nezodpovedá vyhľadávaniu.";
    next.hidden = matches.length <= pageSize;
    next.onclick = () => {
      offset = offset + pageSize < matches.length ? offset + pageSize : 0;
      render();
    };
  }
  trigger.onclick = () => {
    search.value = "";
    offset = 0;
    render();
    dialog.showModal();
    search.focus();
  };
  search.oninput = () => {
    offset = 0;
    render();
  };
  const vaultList = document.getElementById("vaultList");
  if (vaultList) new MutationObserver(() => { if (dialog.open) render(); }).observe(vaultList, { childList: true });
  dialog.querySelector(".conversation-close").onclick = () => dialog.close();
})(typeof window !== "undefined" ? window : globalThis);
