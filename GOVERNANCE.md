# Project governance

LedgerJack is currently a small project led by its founding maintainer. This
document describes, honestly, how decisions are made today and how that is
intended to evolve.

## Current model (single maintainer)

- The founding maintainer is the **benevolent dedicated maintainer (BDM)**: they
  review and merge changes, set the roadmap, and make the final call on scope.
- Anyone may open issues and pull requests. Substantive discussion happens in the
  open on the GitHub issue tracker so the reasoning is visible and archived.
- Decisions are guided by the project's **non-negotiable principles** (see
  `CONTRIBUTING.md`): private by default, offline-first, honest figures,
  human-in-the-loop, and — deliberately — **the app holds no tax rates and gives
  no tax advice; it organises, it does not calculate tax**.

## How changes are decided

- **Routine changes** (bug fixes, tests, docs, small features) are reviewed and
  merged by the maintainer.
- **Security-sensitive changes** (the crypto vault, key handling, backups, the
  HMRC relay) get extra scrutiny and must not weaken the "the server cannot read
  your data" property.
- **Principle-affecting changes** (anything that would send readable financial
  data off-device, add a tax calculation, or post data without human review) are
  a high bar and will usually be declined, with the reasoning recorded in the
  issue.

## Bus factor and succession

A single-maintainer project is a real risk, and we don't hide it. Mitigations in
progress:

- All decisions, rationale and history are public in git and the issue tracker,
  so another maintainer could pick the project up.
- The codebase is deliberately small and scoped so it can be understood and
  maintained by one person — this is a design goal, not an accident.
- As the project grows we intend to add co-maintainers with commit rights and
  move to a lightweight consensus model among them.

## Code of conduct

Participation is governed by `CODE_OF_CONDUCT.md`. Reports of unacceptable
behaviour are handled by the maintainer.

## Security reporting

See `SECURITY.md` for how to report a vulnerability privately.
