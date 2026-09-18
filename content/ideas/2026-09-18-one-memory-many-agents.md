---
title: "One memory, many agents"
description: "Why agent memory was moved out of each tool and into a shared MCP server, and what that forced us to fix along the way"
date: "2026-09-18"
status: "implementing"
visibility: "published"
tags: ["agentprobe", "mcp", "memory", "architecture"]
agent: "claude-code"
tools: ["Bash", "Read", "Edit", "Write"]
---

## Discussion

Coding agents each keep their own memory, in their own format, in their own place.
Claude Code scopes it per *project directory*, so a fact learned in one repository is
invisible from the next. Nothing survives a rebuilt machine. No other tool can read
any of it.

On one ordinary developer box that had produced 64 memory files spread across 13
project directories and two accounts, none of them reachable from anywhere but where
they were written. The obvious fix — sync the files around — is wrong twice over: it
has to be written once per tool, and it leaves every tool's memory shaped differently
at the end of it.

### MCP is the seam that already exists

Every agent worth wiring up speaks the Model Context Protocol. So memory became a
server rather than a sync: one store, one protocol, and any client that speaks it gets
the same facts on any machine. `memory_search`, `memory_write`, `memory_get`,
`memory_list`, `memory_delete`, plus a `history_search` over past sessions.

It replaced a worse idea we had first, which was to inject recall into every prompt
through a hook. A hook has to *guess* when history is wanted, pays a round trip on
prompts that did not want it, and pushes text into the context whether it helps or
not. A tool is called only when the model actually wants the answer.

Facts carry a scope — `global`, `user`, or `project:<name>`. That distinction is what
stops centralising from being mere relocation: without it a shared store is one
undifferentiated pile and nobody trusts what comes out of it.

### Centralised only counts if it is centralised for everyone

The interesting failures were not in the server.

Registration is not one thing. Four clients, four different config files, three
different schemas — one nests the command as a single argv list and calls a local
server "local" rather than "stdio"; another writes to a directory next to the one its
own files live in. None of that is discoverable from documentation. We learned each
shape by running the tool's own `mcp add` and reading back what it wrote, which is
the only method that does not produce config that parses and silently does nothing.

Then the tools themselves turned out to be installed in one user's home directory, so
three of four accounts could not run them at all. And the credential the whole thing
authenticated with was one person's personal login, mode 600 inside a private home —
readable by its owner and nobody else. Both are the same mistake in different
clothing: something shared in principle, installed somewhere only one account can
reach.

### The check has to be a command, not a memory

Every one of those failures was silent. An expired token still reports a configured
host. A credential belonging to another user is unreadable rather than absent. MCP
registers perfectly happily against a client that is not installed.

So the diagnostic became a command that answers two questions per check — what is
true, and what to run about it — and exits with the failure count so a script or an
agent can branch without parsing output. It immediately found something nobody knew:
a cryptography module missing on three of four accounts, needed only for
service-account authentication. Those accounts worked fine on the fallback credential
and would have broken the moment the proper one was installed, looking exactly like a
bad key rather than a missing module.

It also has to check *as* each account, through a login shell. Checking by hand the
obvious way resolves a different PATH and a different interpreter than the account
really has, and produces confident wrong answers. That mistake was made twice in one
day before the tool closed it.

### Publishing needs a gate, and the gate needs its own field

A related thread: documents published from markdown had no notion of draft. Writing a
file was enough to publish it. Adding a default fixed that and broke something else —
the status field was already in use as a *workflow* state, so keying public access on
it meant any value the author picked that was not the magic word silently hid the
page, and every future workflow rename became a security change.

Visibility is now its own field. The lesson generalises: when one field starts
answering two questions, the second question is the one that will be answered wrong.

## Open questions

- A second probe, for an agent other than the one that has real lifecycle hooks. The
  rest need polling, which needs a daemon, which is the same work as periodic sync.
- Whether memory should be imported from the existing per-project files automatically,
  or only on request. Importing everything risks drowning the store in facts that were
  never meant to outlive their directory.
- What a *wrong* remembered fact costs. Provenance — which agent, which tools, which
  account — is recorded so one can be traced. Nothing yet expires or re-verifies them.
