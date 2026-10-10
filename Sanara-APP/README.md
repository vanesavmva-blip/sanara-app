# SANARA AI Tool — Kids Digital Product Creator

A simple web app that follows the SANARA Kids Digital Product Creator instructions:
**Choose → Answer → Copy → Create in Canva → Finish → Sell.**

## How to open it
Double-click `index.html` to open it in Chrome or Edge. You don't need to install anything.
(Optional: run `serve.ps1` with PowerShell, then visit http://localhost:5173.)

## What's inside
- **Create**: the guided 6-stage system. Choose your product, set it up, then get the content, Canva AI prompts, Canva build guide and selling kit.
- **Ideas**: 40 age-based product ideas from Knowledge File 2. Start any of them with one tap.
- **Prompt Builder**: turns a simple idea into a professional Canva prompt. It also includes **Prompt Repair**.
- **My Projects**: saves your projects automatically in this browser.
- **How It Works**: the 7 steps, the quick commands and the credit-saving rules.

## More choices (mix & match)
- **Character library:** 37 original characters (kids, animals, magical, robots/vehicles, dinosaurs). Use the **Character Mixer** chips to swap the hair, eyes, clothes, shoes, accessories or personality, or press 🎲 Random mix.
- **Story Mixer:** mix up to 3 story types (16 to choose from) and up to 2 lessons (10 to choose from), and add up to 2 friends. You can also pick a twist, a mood, an ending and 8–24 pages. Most of these choices also take your own typed answer or a 🎲 Surprise me. Friends show up in two-character scenes.
- **Workbooks and activity books:** mix several skills or activity types in one book.
- **27 themes:** each one has its own colors, setting and up to 17 objects.
- **🔄 Make a new version** (Stage 3 and 4): mixes up the objects, scenes, puzzles and math so no two products look the same.
- **Built-in story writer (`story.js`):** every storybook gets complete page-by-page story text inside the app, so no ChatGPT is needed. The text uses the character, friends, setting, story idea, twist, lessons, mood and ending, and its length matches the child's age (from 1 short sentence for ages 2–4 up to a short paragraph for ages 10–12). Customers can edit any page in Stage 3, tap **🔄 New wording** for a fresh version, or copy the whole story. The text also appears in the Stage 5 exact layout.
- **Stage 5 → 📐 Exact layout:** for every page, this lists each element with the exact text, letters or numbers to type, the picture to use, and the font, size, color and position (X, Y, W, H). A wireframe picture of the page sits beside the list.
- **Stage 5:** gives step-by-step Canva instructions for every page, with exact sizes and positions. It also has a Canva setup checklist and export steps. **How It Works** has a Canva basics cheat sheet.

## "Open in ChatGPT" buttons
- These buttons appear in Stage 3 (writing and fresh ideas), Stage 4 (prompt variations), Stage 6 (unique listing) and the Prompt Builder.
- They open ChatGPT using the **customer's own account**, free or Plus. The brief is sent automatically and also copied to the clipboard.
- This costs you nothing.
- To send customers to your SANARA GPT instead of regular ChatGPT, put its link in `settings.js` (`SANARA_GPT_URL`).

## Customer logins (access codes)
- Every customer gets their own personal code, for example `SANARA-ABCD-EFGH-JKMN`. The app stays locked until they enter it.
- Your own owner code is in `OWNER-ACCESS-CODE.txt`. **Keep that file private and never upload it.**
- **☁️ Automatic saving (Google Sheets), recommended:** set this up once from **👑 Owner → Turn on automatic saving**. Your customer list then lives in a private Google Sheet in your account. Every new login, turn-off or new code works for customers instantly, with no Save button and no files to replace or upload. The script for the sheet is in `cloud.js` (`SHEETS_SCRIPT`), and your Web app link goes in `settings.js` (`SANARA_CLOUD_URL`). Customers from the old `access-codes.js` move over with one click.
- **👑 Owner menu:** log in with your owner code and a **👑 Owner** button appears. Customers never see it.
  - **Create a customer login:** type the name, plus an optional email and end date, then tap **Create login code**. You get the code and a ready-to-send welcome message.
  - **Manage customers:** turn a customer off or on, change their end date, give them a new code (if theirs was lost or shared), or delete them. You can also search the list.
  - **💾 Save customer list:** in Chrome or Edge, pick your `access-codes.js` file to save straight into it. Other browsers download a new `access-codes.js` for you to put in the SANARA App folder. Then tap **Reload app**. If your app is online, also upload the new `access-codes.js` to your website.
  - Codes you create are remembered only on your device, so you can copy them again. The file keeps only scrambled fingerprints.
- To add your app's web address to the welcome message, put it in `settings.js` (`SANARA_APP_URL`).
- After 5 wrong tries the login locks for 60 seconds.
- Each customer's projects are saved separately, even when people share a computer.
- Projects stay on the device where they were made. To move them, go to **My Projects**, tap **Download backup**, then on the other device log in with the same code and tap **Restore backup**.
- **Note:** this is a simple lock that runs in the browser. It keeps out normal users, but a tech-savvy person could get around it. For stronger security later, switch to a real login service such as Supabase or Memberstack.
- **When you put the app online,** upload every file **except** `OWNER-ACCESS-CODE.txt` and `serve.ps1`.

## Files
- `index.html`: the page
- `styles.css`: the Sanara brand colors and fonts
- `data.js` and `library.js`: knowledge data (ages, styles, themes, ideas, characters and the story mixer)
- `story.js`: the built-in story writer
- `app.js`: the app logic, the prompt engine and the Canva layout guide
- `auth.js`, `access-codes.js`, `cloud.js` and `owner.js`: logins, Google Sheets saving and the 👑 Owner menu
- `settings.js`: your SANARA GPT link and app web address
- `sanara-logo.webp`: the logo
