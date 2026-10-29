# News tab: weekly picks 本周时事

The News tab shows a short list of local news links (联合早报, 8world, CNA 中文 / Straits Times) grouped by the nine themes.
Students only ever see rows you have approved. Nothing from the articles is copied into the app: each card is a title, a one-line
original hook in Chinese and English, and a link to the publisher.

## How it fits together

```
Monday task  ->  Sheet "Pending" tab  ->  you set status = approved  ->  "Live" tab (automatic)  ->  published CSV  ->  app
```

- Google Sheet: `词游记 本周时事 News picks` (tabs: Pending, Live, README).
- `Pending` columns: `week, strand, title, source, published, url, hook_cn, hook_en, status, note`.
- `Live` is a formula that lists only rows whose `status` is `approved`. Do not edit it.
- Only the Live tab is published (File > Share > Publish to web > Live > CSV). The link is `newsFeedUrl` in `public/config.json`.
- The app also refuses any link that is not on zaobao.com.sg, zaobao.com, 8world.com, cna.com.sg, channelnewsasia.com or
  straitstimes.com, so a mistyped URL in the sheet cannot send students elsewhere.

## Your Monday routine (about 5 minutes)

1. Open the sheet, go to `Pending`. New rows from the morning have `status = pending`.
2. Open each link. Check it fits the theme, reads at H1 level, is suitable for students, and opens (the `note` column flags
   anything the task could not verify: page not opened, likely paywall, date unclear).
3. Set `status` to `approved` or `rejected` (dropdown in column I). Edit the title or hooks directly if you want them different.
4. Students see approved rows within a few minutes of the sheet being republished (Google refreshes the published CSV
   automatically; allow up to about 5 minutes). The app keeps the last copy on each phone, so it still shows offline.

To pull a pick back, change its `status` to `pending` or `rejected`.

## Notes

- If a Monday has no approved rows, the tab shows the previous weeks (the app keeps the latest 8 weeks).
- Do not publish the Pending tab or the whole document: that would make unapproved picks public.
- Do not add other publishers' domains to the sheet expecting them to appear; they must also be added to `ALLOWED_HOSTS`
  in `src/lib/newsfeed.js`.
- Paywalled articles (especially some 联合早报 pieces) may ask students to sign in. Prefer picks that open freely, and
  say so in `note` when unsure.
