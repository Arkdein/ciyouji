/**
 * 词游记 – one-click Google Form + Sheet for class progress.
 *
 * HOW TO USE (about 3 minutes, done once, signed in as the teacher):
 *   1. Go to script.google.com → New project → paste this whole file.
 *   2. Press Run ▶ on setupForm. Approve the permission prompt.
 *   3. Open View ▸ Logs (Execution log). Copy the JSON block it prints.
 *   4. Paste that JSON over public/config.json in the repo, commit, push. Done.
 *
 * It creates the Form, links a response Sheet, and works out the hidden
 * "entry.NNN" field IDs the app needs (that is the fiddly part).
 *
 * STATUS: written carefully but NOT run against a live Google account by the
 * author. Run it once yourself and check that a test submission arrives.
 */

// Field keys MUST match src/lib/report.js (formFields) and public/config.json.
var FIELDS = [
  ['name', 'Student name', false],
  ['cls', 'Class', false],
  ['idx', 'Index number', false],
  ['date', 'Date', false],
  ['streak', 'Streak (days)', false],
  ['daysWeek', 'Study days this week', false],
  ['daysTotal', 'Study days in total', false],
  ['acc7', 'Accuracy last 7 days (%)', false],
  ['secure', 'Secure words', false],
  ['reviewing', 'Reviewing words', false],
  ['learning', 'Learning words', false],
  ['unseen', 'Not yet started', false],
  ['lists', 'Per-list secure/total', true],
  ['weak', 'Weakest words', true],
  ['writeStarted', 'Characters started (writing)', false],
  ['writeSecure', 'Characters secure (writing)', false],
  ['writeAcc7', 'Writing accuracy last 7 days (%)', false],
  ['writeWeak', 'Most-missed characters (writing)', true],
  ['xp', 'XP (journey points)', false],
  ['rank', 'Rank', false],
  ['stickers', 'Stickers collected', false],
  ['code', 'Progress code', true]
];

function setupForm() {
  var form = FormApp.create('词游记 – class progress');
  form.setDescription('Submitted automatically from the 词游记 app. Students do not need to open this form.');
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);

  FIELDS.forEach(function (f) {
    var item = f[2] ? form.addParagraphTextItem() : form.addTextItem();
    item.setTitle(f[1]);
  });

  // Response sheet
  var ss = SpreadsheetApp.create('词游记 – class progress (responses)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // Work out entry IDs by building a pre-filled link with a marker in every field.
  var items = form.getItems();
  var resp = form.createResponse();
  items.forEach(function (it, i) {
    var text = (it.getType() === FormApp.ItemType.PARAGRAPH_TEXT) ? it.asParagraphTextItem() : it.asTextItem();
    resp.withItemResponse(text.createResponse('k' + i));
  });
  var url = resp.toPrefilledUrl();
  var entries = {};
  var re = /entry\.(\d+)=k(\d+)/g, m;
  while ((m = re.exec(url)) !== null) {
    entries[FIELDS[Number(m[2])][0]] = m[1];
  }

  var config = {
    formResponseUrl: form.getPublishedUrl().replace(/\/viewform.*$/, '/formResponse'),
    entries: entries
  };

  Logger.log('=== paste this into public/config.json ===\n' + JSON.stringify(config, null, 2));
  Logger.log('Form (edit): ' + form.getEditUrl());
  Logger.log('Responses sheet: ' + ss.getUrl());
}
