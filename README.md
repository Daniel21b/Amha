# The Unquiet Horn

Independent Ethiopia-focused opinion, sourced briefings and analysis. The complete public website runs on **GitHub Pages**. Node runs during builds in GitHub Actions; visitors do not need a Node server, database host or second hosting account.

## Preview the published version

Requires Node 24 or newer; the build uses its built-in SQLite module as an in-memory workspace.

```sh
npm ci
npm run build
npm run preview
```

Open http://localhost:4173/en/. The build creates `.site/`; rebuild after editing content. To build without fetching external feeds, use `STATIC_REFRESH_FEEDS=false npm run build`.

The generated website retains the existing typography, responsive layout, nine articles, categories, regional pages, author/about pages, support links, members preview and language controls. Search filters titles and full text in the browser, including translated article text when available. Search URLs can be shared. Articles remain readable without JavaScript; search filtering and correction-draft preparation require it. A direct GitHub issue link is also provided.

Only `.site/` is published. Older root HTML/CSS/JS files, application source, `.env`, the local SQLite database, tests and build cache are excluded from the website upload.

## Publish and refresh on GitHub

Repository: [Daniel21b/Amha](https://github.com/Daniel21b/Amha). In **Settings → Pages**, select **GitHub Actions** as the publishing source. Manage `unquiethorn.com` and HTTPS there too. The workflow reads the configured Pages URL and supports custom domains and GitHub repository subpaths. Local builds can override it with `SITE_URL`.

`.github/workflows/pages.yml` tests, builds and deploys changes to `master`. Its **Run workflow** button starts a manual refresh. Scheduled runs are requested at minutes 17 and 47 each hour. GitHub can delay jobs and disables schedules in public repositories after 60 days without repository activity. Check the [Actions page](https://github.com/Daniel21b/Amha/actions) for failed or disabled runs; a missed run leaves the last deployed website online. See GitHub's [Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

Each build restores a public JSON cache, fetches available sources, generates every route and uploads `.site/`. The cache contains public feed records and translated strings, **never private correction submissions or the local database**. GitHub may evict caches. `data/field-snapshot.json` provides a dated fallback when no cache is available; these records are not represented as newly fetched. Translations may require regeneration after cache eviction.

Generated pages include canonical URLs, Open Graph metadata, a sitemap, robots.txt, direct article URLs and a custom 404 page. Untranslated copies on language routes are excluded from the sitemap and marked `noindex`.

## Translation

The header switches between `/en/`, `/am/`, `/om/` and `/ti/` while keeping the article or search. Whole-page translations are generated **during builds**, covering navigation, articles, source headlines and form labels. Readers load the prepared files immediately. Device language preferences are retained.

To activate all three translated editions, add `GOOGLE_TRANSLATE_API_KEY` under **Settings → Secrets and variables → Actions → Secrets**, then run the publishing workflow. Enable Google Cloud Translation Basic v2 in the Google project and restrict the key to that API. Translation is a metered external API; it is not a second website host and GitHub Pages does not supply translation credits. No Google account, billing or credentials are provisioned by this repository.

Without a key, the site explicitly shows English with an unavailable notice. It does not claim that untranslated pages are translated. Google supports all three target languages ([language list](https://docs.cloud.google.com/translate/docs/languages)). Optional `TRANSLATOR_KEY` and `TRANSLATOR_REGION` secrets support Microsoft for Amharic/Tigrinya; Afaan Oromo requires Google in this implementation.

Only public text is sent for translation. Keys stay in Actions secrets. URLs, form values, original quotations and reviewed strings are protected; provider output is escaped. Generated translations are labelled unreviewed. Translations are cached by source text and language, so changed text is translated again. The default budget is 60,000 new characters per minute. Set the Actions variable `TRANSLATION_CHARACTERS_PER_MINUTE` to adjust it and configure provider-side quotas for a firm spending cap. Initial translation may span multiple scheduled builds when the budget is reached. Failed translations retain the original content with a notice.

## Public corrections

The correction form prepares a [public GitHub issue](https://github.com/Daniel21b/Amha/issues/new) with the article, language, issue type and reader's explanation. The notice explains that a GitHub account is required and that submissions are public. Continuing opens a draft; the reader reviews and submits it on GitHub. No issue is silently created, and the website does not store private submissions. Long drafts can be copied into the linked blank issue form.

Monitor issues, assess the supporting evidence, edit the article, add a dated correction note when appropriate, then push the change. The next deployment publishes it.

## Content and editorial standards

Edit `app/content.mjs`; the featured long read is in `app/articles/abiy-record.mjs`. Founder biographies live in `app/publication.mjs`, and support links/member examples in `app/support.mjs`.

Original opinion by Daniel Asfaw and Yohannes Asfaw is distinct from source briefings. The long read identifies Daniel's family account as personal recollection, not independently verified reporting. `docs/abiy-record-editorial-notes.md` records sourcing decisions.

Factual claims, attributed claims and quotations require valid source IDs. Personal accounts require named authors and attribution; quotations require their original language. `npm run check` validates structure but cannot determine whether a source supports a claim. That remains an editorial responsibility. Do not use opinion labels to bypass sourcing.

The support page links directly to official UNHCR and ICRC donation pages, explains allocation limits and states that direct relief is still being researched. The publication does not collect funds or claim a partnership. Recheck official appeals before promoting them. Members include founders and **explicitly fictional sample profiles**; registration is not open.

## Publisher feeds

Builds request feeds independently, with 15-second timeouts, response-size limits, Ethiopia filtering, deduplication and short attributed excerpts. Failed requests preserve cached records and last-success times; source status is visible to readers. Publisher coverage is not independently verified by this site.

Optional Actions **variables**: `RELIEFWEB_APPNAME` (a pre-approved ReliefWeb app name), `OHCHR_RSS_URL`, `AMNESTY_RSS_URL`, `HRW_RSS_URL`, `ADDIS_STANDARD_RSS_URL`, `ETHIOPIA_INSIGHT_RSS_URL` and `ALLAFRICA_RSS_URL`. GDELT also has an Ethiopia query. Missing configuration and publisher outages are reported separately from successful empty feeds. No access restrictions are bypassed.

## Optional local server

`npm start` and `npm run dev` retain the previous Node application at http://localhost:3000 for local development. Its private correction database and live translation endpoints are separate from the Pages build; none is required to host the public site. `npm run aggregate` refreshes the local database. The older administrative commands (`app/corrections.mjs` and `npm run review-translation`) operate on local SQLite, not the deployed website. Local private correction records are never migrated to GitHub issues.

## Checks

```sh
npm run check
npm test
```

Tests cover editorial structure, feed parsing/failures, translation escaping/cache behavior, the legacy local server, public correction-draft encoding, static routes/assets on custom domains and repository paths, search, translation builds and exclusion of private data. Browser checks should use the static preview when assessing what will be deployed.
