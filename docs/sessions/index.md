# Sessions

Session history has moved to the **AgentContext dashboard**.

[:octicons-arrow-right-24: Open the dashboard](https://agentcontext-sessions.web.app){ .md-button .md-button--primary }

## What changed

These pages used to hold one markdown file per day, written by a capture script.
That script was retired and replaced by [AgentProbe](https://github.com/ThanuMahee12/AgentProbe),
which writes session history to Firestore instead:

| | Markdown notes | Dashboard |
|---|---|---|
| Storage | one file per day, per machine | Firestore |
| Search | browser find-in-page | across previews, commands and file paths |
| Commands | listed as tool names | every invocation, with success or failure |
| Files | not recorded | every read, write and edit — with content |
| Access | public site | sign-in required |

## The old notes

All 119 historical notes were imported into Firestore before the markdown was
removed, and verified byte-identical. They are in the `notes` collection, keyed
by date and searchable alongside current sessions — nothing was lost.

They remain in this repository's git history as well.
