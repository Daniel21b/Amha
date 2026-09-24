# The Unquiet Horn

Independent Ethiopia-focused reporting, source briefings and analysis. Built as a server-rendered Node application with SQLite and small progressive-enhancement JavaScript. Existing user-edited HTML/CSS/JS files are preserved and are **not** served by the new app.

Name alternatives: **The Public Record**, **Ethiopia in Focus**, **The Accountability Review**, **Horn Ledger**. “The Unquiet Horn” is the working name; naming/trademark availability has not been checked.

## Run

Requires Node 24 or newer (uses built-in `node:sqlite`).

```sh
npm install
cp .env.example .env
npm start
```

Open http://localhost:3000. Use `npm run dev` for server watch mode. No compile step, no SPA bundle, no external database service required. Browser fonts load from Google Fonts; system fallbacks remain usable offline. Only `public/` is served as static files; source files, environment values and the database are inaccessible over HTTP.

## Content and editorial workflow

Edit `app/content.mjs`; the featured long read lives in `app/articles/abiy-record.mjs`. Two original opinion articles by Daniel Asfaw and Yohannes Asfaw examine Abiy’s record and renewed conflict. The long read includes the family account supplied by Daniel, clearly labelled separately from independently sourced claims. Seven supporting pieces are linked source briefings, explainers and editorial commentary. None claims original field investigation. Publication dates describe preparation; source dates and historical reporting periods appear in the pieces. See `docs/abiy-record-editorial-notes.md` for the long read’s sourcing decisions.

Each article has citation IDs on its deck and on every `fact`, `claim` or `quote` block. `npm run check` and application startup reject missing or invalid citations. Structural validation cannot prove that a source supports a claim: that remains an editorial responsibility. Quotes require `originalLanguage`. Use an opinion block only for a clearly labelled editorial judgment, never to bypass factual sourcing. The reader can follow inline citations to the original material.

The `personal` block type requires named article authors and an explicit `attribution`. It displays a personal-account label and provenance note. It must never be presented as independently verified reporting or used to substantiate national statistics.

The UI includes About/Mission, corrections and verification/source protection policies; Opinion is distinct from reporting. Search, categories, regional views, article pages and language URLs are server-rendered and readable without JavaScript.

## Aggregation

The server polls on startup and every 30 minutes (configurable, minimum 5 minutes), with independent publisher errors, 15-second request timeouts, a 3 MB response limit, URL deduplication, Ethiopia filtering, and persistent last-success timestamps. Failed polls preserve existing records. Titles and short publisher excerpts (maximum 28 words/240 characters) are retained, not full articles. Automated categorization is a heuristic, not editorial verification. AllAfrica items retain the original publisher credit when present. GDELT publication times are monitoring timestamps and may differ from original publication times.

Run a single cycle with `npm run aggregate`. Exit code 2 means one or more sources are unavailable or require configuration; successful sources are still saved. To use system cron instead of the built-in timer, set `AGGREGATION_ENABLED=false` and schedule this every 30 minutes in the project directory, with the Node binary on cron's PATH:

```cron
*/30 * * * * cd /absolute/path/to/blogweb && /absolute/path/to/npm run aggregate >> /var/log/civic-ledger-feeds.log 2>&1
```

Use a single poller for the SQLite database. SQLite supports one application instance on persistent disk; do not deploy this unchanged to ephemeral/serverless storage or multiple hosts.

Sources configured:

- **ReliefWeb** uses v2; v1 has been retired. Set a pre-approved `RELIEFWEB_APPNAME` per https://apidoc.reliefweb.int/. It filters reports by Ethiopia. This cannot be enabled using an invented app name.
- **GDELT DOC API** has an Ethiopia query and attribution to each original domain. The endpoint first failed to connect and then returned HTTP 429 during verification; failures are visible, and the job will retry at the next interval.
- **UN OHCHR** accepts `OHCHR_RSS_URL`. A stable current official feed URL could not be verified; the source is explicitly marked as requiring configuration. OHCHR documents syndicated through ReliefWeb can be included when ReliefWeb is configured.
- **Amnesty** and **HRW** general feeds are filtered for Ethiopia. A successful fetch with zero matching items is different from a connection failure. HRW defaults to its public news RSS; a publisher-provided country feed may be configured.
- **Addis Standard** returned HTTP 403 from this environment. No bypass or scraping is attempted. Its syndicated AllAfrica entries remain clearly credited.
- **Ethiopia Insight** and **AllAfrica Ethiopia** successfully supplied live records during verification.

Every feed has an environment override in `.env.example`; publisher URLs may change. Feed status is exposed at `/api/field` and in the reader's source-status disclosure. Imported material is not independently verified. No cached records are disguised as newly fetched news.

## Languages and review

English, Amharic, Afaan Oromo and Tigrinya have `/en/`, `/am/`, `/om/` and `/ti/` routes. The header stores a device language preference, and explicit language URLs take precedence. Noto Sans Ethiopic supports Ge'ez. Machine-translated pages are labelled as awaiting review.

The **Translate page** control and header language links translate the whole server-rendered page: menus, article text, author/about pages, source-watch headlines, labels, metadata, and form feedback. URLs remain language-specific. English is the canonical interface; without a configured provider, an explicit unavailable notice accompanies the original content.

**Activate Google Cloud Translation (recommended for all three languages):**

1. Create/select a Google Cloud project with billing and enable the **Cloud Translation API** (Basic v2).
2. Create an API key restricted to the Cloud Translation API. Apply server IP restrictions where practical and set a billing quota appropriate to the publication.
3. Put `GOOGLE_TRANSLATE_API_KEY=your-key` in the local `.env` file or the deployment's secret settings. Never put the key in `public/`, browser JavaScript, git, or a chat message.
4. Restart with `npm start`, then choose a language and click **Translate page**.

Google supports Amharic (`am`), Afaan Oromo (`om`) and Tigrinya (`ti`): https://docs.cloud.google.com/translate/docs/languages. API setup/reference: https://docs.cloud.google.com/translate/docs/reference/rest/v2/translate. Translation is a metered external service. No Google project, billing account, or key is created by this application.

Existing `TRANSLATOR_KEY` and optional `TRANSLATOR_REGION` settings still enable Microsoft as a fallback for Amharic/Tigrinya when no Google key is present. Afaan Oromo uses Google because it was not listed in Microsoft's verified language table. Google takes priority when configured.

Only public server-rendered text is sent to the provider. Search-query text, form values, scripts, original quotations and already translated/reviewed article strings are excluded. The response is inserted as escaped text through an HTML parser; translated output cannot change URLs, forms, attributes unrelated to text, or execute markup. Article names/brand names stay recognizable.

Translations are cached by source text and target language in SQLite, so updates naturally request fresh translations. Concurrent page requests share a serialized cache fill. Requests are batched below provider limits, failures retain original content, and `TRANSLATION_CHARACTERS_PER_MINUTE` caps new text per process (default 60,000). The cache retains up to 20,000 strings. It is a single-instance limiter; configure provider-side quotas for a hard spending limit. When the provider fails, the page is not presented as successfully translated.

The full page is labelled **Machine-translated — not editorially reviewed**. A reviewed article badge refers only to that article's saved translation, not the surrounding automatically translated interface. Quotes include a translation flag and expandable original wording/source. Missing credentials have been tested, and provider requests are covered with mocked responses; actual translation quality and account access must be verified with a real key.

To publish a reviewed version, export the article object from `app/content.mjs` or `translations.data`, translate/review the title, deck and block text in a JSON file while preserving the source identifiers and block types, then run:

```sh
npm run review-translation -- /path/to/reviewed-article.json "Actual reviewer name"
```

The command records reviewer and timestamp. Any change in the original article invalidates the translation cache and its review badge. Review keys, access control and translator credentials belong to the operator. Do not attach a person's reviewer name without their review.

## Corrections

The form saves a real correction to SQLite and returns its reference ID. No email is sent and no sensitive-source dropbox is implied. Readers are advised not to submit confidential details. Rate limiting, size limits, input validation and same-origin checks protect the public endpoint. Production should add reverse-proxy limits and operational monitoring as needed.

```sh
node --env-file-if-exists=.env app/corrections.mjs list
node --env-file-if-exists=.env app/corrections.mjs resolve CORRECTION_ID
```

The editor must monitor this queue. Correct the article and add a dated explanation of material changes before resolving a report. There is no fabricated staffed newsroom or promised response deadline.

## Deploy

This repository is ready for a persistent Node host, not a static-only host. Set `HOST=0.0.0.0`, `SITE_ORIGIN` to the actual HTTPS origin, `DATABASE_PATH` to a persistent private disk path, and run `npm start` behind an HTTPS reverse proxy. Back up the SQLite database. Configure the publisher/translation credentials above and arrange editorial oversight before publishing. No public deployment or external account was created in this task.

## Verification

```sh
npm run check
npm test
```

Tests cover citation enforcement, RSS/Atom/RDF parsing, filtering, deduplication, unsafe input, publisher failures, translation provenance/cache invalidation, HTTP routes and persisted correction submissions. Browser checks cover desktop/mobile layouts, source links, search, article navigation, locale changes and correction submission.

## Community and humanitarian support

The publication is now **The Unquiet Horn**. The active app uses this name in its masthead, page titles, attribution, footer and favicon. Existing database and preference identifiers remain compatible with earlier installations.

`/:language/support` links directly to official UNHCR and ICRC donation pages. `app/support.mjs` records these destinations, their stated allocation limits and the review date. The publication does not collect funds or claim a partnership. The page states that direct relief is still being researched, and distinguishes historical account freezes from more recent suspensions of rights organizations. Recheck appeal details before changing or promoting links.

`/:language/members` introduces the founders and an explicitly fictional profile preview. Registration is not open; sample names and relative dates must not be represented as genuine sign-ups. Any future real public directory requires member consent.

The support and member pages share whole-page translation, navigation and responsive layout with the publication. Founder biographies reflect the information supplied by the authors.
