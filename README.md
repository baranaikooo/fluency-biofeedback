# 🎙️ Fluency – Evidence-Based Rečový Biofeedback & Asistent

[![Download Android APK](https://img.shields.io/badge/Download_APK-v1.0.0-059669?style=for-the-badge&logo=android&logoColor=white)](https://github.com/baranaikooo/fluency-biofeedback/releases/latest/download/fluency-biofeedback.apk)
[![Live Web App](https://img.shields.io/badge/Live_App-Vercel-38bdf8?style=for-the-badge&logo=vercel&logoColor=white)](https://stutterbiofeedbackantigravity.vercel.app)
[![GitHub Releases](https://img.shields.io/github/v/release/baranaikooo/fluency-biofeedback?style=for-the-badge&color=8b5cf6)](https://github.com/baranaikooo/fluency-biofeedback/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-slate?style=for-the-badge)](LICENSE)

Evidence-based neuroakustický trenažér plynulej reči a osobný rečový asistent navrhnutý pre ľudí s **balbuties (zajakavosťou / koktaním)**. Žiadny vizuálny chaos, žiadne detské gýče ani prázdne teórie. Všetko funguje s objektívnou biometrikou v reálnom čase priamo v zariadení (Edge DSP).

---

## 📲 Stiahnutie mobilnej aplikácie (Android)

Aplikáciu môžeš okamžite stiahnuť a nainštalovať do Android smartfónu:

| Formát | Odkaz na stiahnutie | Popis |
| :--- | :--- | :--- |
| **Android APK** | [**📥 Stiahnuť fluency-biofeedback.apk**](https://github.com/baranaikooo/fluency-biofeedback/releases/latest/download/fluency-biofeedback.apk) | Priamy inštalačný balíček pre Android (~1.02 MB) |
| **Google Play Bundle** | [**📦 Stiahnuť Fluency.Biofeedback.aab**](https://github.com/baranaikooo/fluency-biofeedback/releases/download/v1.0.0/Fluency.Biofeedback.aab) | Produkčný balíček pre Google Play Console |
| **Web / PWA** | [**🌐 Otvoriť v prehliadači**](https://stutterbiofeedbackantigravity.vercel.app) | Funguje na iPhone (iOS), Android aj na PC |

### Postup inštalácie APK na Androide:
1. Klikni na odkaz vyššie a stiahni súbor `fluency-biofeedback.apk`.
2. V upozorneniach alebo v správcovi súborov klikni na stiahnutý súbor.
3. Ak ťa systém vyzve, povoľ *„Inštalovať neznáme aplikácie“* pre daný prehliadač / správcu.
4. Klikni na **Inštalovať** a po dokončení otvor aplikáciu priamo z plochy.
5. Vďaka overenému **Digital Asset Links (`assetlinks.json`)** beží aplikácia 100 % natívne cez celú obrazovku bez adresného riadka.

---

## 🌟 5 Pilierov a Hlavné funkcie

### 1. 🎧 Osobný Rečový Asistent (Choral Speech DAF do ucha)
* **Živý odposluch do slúchadla v reálnom čase:** Navrhnutý na použitie s jedným slúchadlom počas prezentácií, porád, telefonátov či v teréne.
* **Automatický zborový harmonický tón (+2 poltóny):** Integrovaný `WebAudioPitchShifter` automaticky jemne nadvihne tón oneskoreného hlasu, čím simuluje rozhovor s druhou osobou (Choral Effect). Obchádza časovú dysfunkciu bazálnych ganglií a zabraňuje habituácii (zvyknutiu si mozgu na odposluch).
* **Intuitívne ovládanie:** Plynulá regulácia oneskorenia (40 – 140 ms, optimálne 70 ms) a hlasitosti v uchu.

### 2. ⚡ Objektívny DSP Biofeedback (Vocal Rise Time)
* **Žiadne subjektívne hodnotenie:** Aplikácia nenúti používateľa počúvať vlastné zadrhnutia zo záznamu.
* **Akustická analýza v milisekundách:**
  * 🔴 **Tvrdý glotálny ráz** (`VRT < 45 ms`): Kŕč v hrtane a hyperaddukcia hlasiviek.
  * 🟢 **Mäkký nábeh (Gentle Voice Onset)** (`VRT 45–160 ms`): Plynulý začiatok fonácie s uvoľnenými hlasivkami.
  * Dynamická vizualizácia obálky akustického tlaku a haptická odozva (jemná vibrácia 30 ms pri úspechu).

### 3. 🫁 Valsalvov reflex & SOS Dril
* **Mechanická dekompresia sánky:** Okamžité prerušenie nevedomého zovretia hrtanových zvieračov (Valsalva reflex) uvoľnením mandibuly o 2–3 mm a znížením ťahu suprahyoidných svalov pred fonáciou.

### 4. 🔐 Trezor obávaných slov (Desenzibilizácia reality)
* **Tréning osobných spúšťačov:** Každý si môže uložiť vlastné obávané slová (vlastné meno, obľúbená káva, povolanie, slová s náročnými spoluhláskami K, P, T, B).
* **5 stupňov stresovej inokulácie:** Od tichého cvičenia v kľude až po simuláciu sociálneho tlaku s očným kontaktom v kamere a časovým deficitom 550 ms.

### 5. 📊 Evidence-Based Telemetria & Vedecký základ
* **Prieskumník klinických modelov:** Detailne rozpracované modely DIVA & GODIVA (Guenther et al.), Gentle Voice Onset (Webster), Choral Speech Effect (Kalinowski et al.) a Valsalvova hypotéza (Parry) s formálnymi citáciami.
* **Denná séria (Streak) & XP Leveling:** Motivačný systém sledujúci reálny tréningový pokrok.

---

## 🔒 Súkromie & Nulová latencia (Edge Audio)

Všetok signálový výpočet (DSP analýza mikrofónu, oneskorenie DAF a modulácia tónu) beží **100 % lokálne na tvojom zariadení** cez štandard Web Audio API. Žiadny hlasový záznam sa nikdy neposiela na externé cloudové servery.

---

## 🛠️ Vývoj & Spustenie lokálne

Ak si chceš projekt spustiť alebo upraviť lokálne:
```bash
git clone https://github.com/baranaikooo/fluency-biofeedback.git
cd fluency-biofeedback
```
Stačí otvoriť `index.html` v ľubovoľnom modernom prehliadači (Chrome, Edge, Brave, Safari) alebo spustiť lokálny HTTP server:
```bash
npx serve .
```

---

## 📄 Licencia
Tento projekt je poskytovaný ako open-source pod licenciou [MIT](LICENSE).
