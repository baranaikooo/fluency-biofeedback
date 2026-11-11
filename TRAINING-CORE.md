# Training core: odborné ciele, technické pravidlá a hranice

Modul `web/public/engine/training-core.js` je lokálne jadro aplikácie; nepridáva server, telemetrické odosielanie ani zber nahrávok. Rozhranie zachováva svety, bossov, krátke drilly a odmeny. Formuláre a akustické prehľady sú nepovinné.

| Pravidlo | Odborný podklad | Implementácia a hranica tvrdenia |
| --- | --- | --- |
| Úspech zahŕňa účasť v komunikácii | ASHA ICF: účasť, námaha, prirodzenosť, obmedzenie vyhýbania | Rovnaká odmena za zachytený alebo používateľom potvrdený pokus. Presných 30 XP je herné nastavenie, nie vedecký výsledok. |
| Rôzne komunikačné situácie | ASHA ICF: generalizácia naprieč situáciami | Svety, osobné výzvy a viacerí hovoriaci. Striedanie hlasov je dizajnová hypotéza; účinnosť tohto mechanizmu v Glide nie je overená. |
| Individuálna voľba techník | Brignell et al. 2020: rozdielne výsledky a udržanie efektu programov pre dospelých | Technika, časový cieľ a prekvapivé zvonenie sú voliteľné. Jednotlivé cvičenia nenahrádzajú skúmaný kompletný program. |
| Signál nie je diagnóza | Konsenzus hodnotenia: viacrozmerné hodnotenie vrátane skúsenosti hovoriaceho | Kontrola kvality a zachytenia hlasu; žiadna automatická diagnóza kŕča či zmeny mozgových dráh. |

## Technické parametre nie sú klinické prahy

Kontrola hlasu používa 40 ms periodicity pri slovách a 200 ms pri voľnej odpovedi spolu s existujúcimi prahmi hlasitosti a kontrolou clippingu. Sú to nevalidované inžinierske heuristiky, ktoré môžu mylne prijať iný zvuk alebo odmietnuť reč. Netvrdíme, že identifikujú obsah, balbutizmus alebo mieru plynulosti. Meranie latencie je od signálu GO v zariadení a nie je klinickou reakčnou skúškou.

## Overovanie a ďalší vývoj

Automatické testy kontrolujú správanie softvéru (ticho, clipping, neplatné údaje, odmeny, opt-in, rotáciu), nie liečebný účinok. Pred tvrdením o diagnostickej presnosti treba nezávislé označenie nahrávok odborníkmi, oddelenie tréningových a testovacích dát podľa hovoriaceho, slovenské dáta, rôzne mikrofóny a meranie falošne pozitívnych/negatívnych výsledkov. Pred tvrdením o účinnosti Glide treba klinické vyhodnotenie. Žiadne takéto overenie zatiaľ nebolo vykonané.

Zdroje:
- ASHA: https://www.asha.org/practice-portal/clinical-topics/fluency-disorders/treatment-goals-for-fluency-disorders-in-the-context-of-the-who-icf-framework/
- Brignell et al. 2020: https://pubmed.ncbi.nlm.nih.gov/32438123/
- Consensus Guidelines for Assessment: https://pmc.ncbi.nlm.nih.gov/articles/PMC9132036/
