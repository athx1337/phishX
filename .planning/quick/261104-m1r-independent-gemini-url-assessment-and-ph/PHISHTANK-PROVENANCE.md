# Supplied PhishTank labels and access checks

All forty IDs and URLs were transcribed from the user's supplied listing. The user supplied valid/online labels for thirty-nine rows. Entry 9554436 had incomplete label and status fields, stored as null and excluded from the positive-label denominator. The original URL input is stored only in ignored `.cache/phishtank-user-sample.json`.

The official detail page for entry 9554574 returned HTTP 403 with the title “Just a moment...” through each of `www.phishtank.org`, `phishtank.org` and `www.phishtank.net`. No verified or online status could be extracted. A separate web reader also could not access that detail. These checks do not establish the current record status. The evaluation uses the user's supplied labels. [Official detail page](https://www.phishtank.org/phish_detail.php?phish_id=9554574)

PhishTank's documented downloadable verified-active feed is updated hourly. Anonymous access is limited, and an application key is recommended for automated retrieval. This run evaluated the supplied snapshot locally. The parent investigator separately observed an anonymous API HTTP 403 and a feed redirect ending at HTTP 404. Those parent observations were not independently repeated by this benchmark executor. [Official developer information](https://www.phishtank.org/developer_info.php)

The benchmark ran only local feature extraction and frozen numeric-tree inference. Destination pages, DNS, reputation providers, active browsers and Gemini were outside this benchmark. Label verification dates were absent from the supplied data. Temporal independence and campaign/template separation therefore remain unverified even where exact URL and registrable-domain overlap checks are clear.
