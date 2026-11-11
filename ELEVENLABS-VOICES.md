# Slovenské tréningové hlasy

ElevenLabs nahrávky sú pribalené k aplikácii a fungujú bez pripojenia:
- boss_1: úvod prvého boss tréningu (Ondro)
- pokladna_payment: otázka o platbe (Suzie)

Zvyšných 34 textov používa dočasne syntézu hlasu zariadenia. Generovanie ďalších nahrávok blokovala vyťažená služba; nie sú označené ako dokončené. Presný stav a texty sú v web/public/audio/voice-manifest.json. Vlastné slová používateľa sa neposielajú ElevenLabs.

Úvod sa spúšťa raz na tréning až po kalibrácii. Meraný pokus začne po skončení hlasu. Vypnutie hlasových otázok preskočí aj úvod. Odchod z tréningu zruší prehrávanie aj nadväzujúce callbacky. Otázky kampane zodpovedajú požadovanej odpovedi.
