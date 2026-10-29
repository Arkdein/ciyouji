# Teacher set-up: class progress via Google Form

Students tap **Send to teacher** in the app. Their progress summary lands as one row per submission in a Google Sheet that you own.

1. Sign in to Google with your **school/personal account of choice**, then open <https://script.google.com> → **New project**.
2. Paste the contents of `setup-form.gs` and press **Run** on `setupForm` (approve the permissions prompt).
3. Open the **Execution log**. Copy the JSON block between the `===` line and the next log line.
4. Replace `public/config.json` in this repo with that JSON, commit and push. GitHub Actions redeploys in about a minute.
5. In the app, tap Progress → fill in a test name → Send to teacher. Check that a row appears in the Sheet.

**Notes**

- The script has not been run against a live account by its author. If step 3 prints empty `entries`, tell me and I will adjust.
- The browser cannot read Google's reply, so students see "sent" without proof. A new row in your Sheet is the proof. Students can always fall back to **Print / Save as PDF** or **Copy code**.
- Anyone who has the site URL can see the form ID in `config.json` and submit rows. This is a risk of a public static site. Expect junk rows to be possible; the progress-code checksum catches typos, not forgeries.
- Collect only class and index number. Do not add NRIC, full names or email fields.
