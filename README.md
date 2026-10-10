# RaidNotice

A free, public, static raid announcement site on GitHub Pages. No server-side API, analytics, credentials, private configuration, or exported member records are included. Video players and Tencent documents load from their original platforms.

## Snapshot contract

The frontend reads `data/manifest.json` with a cache-busting query when “刷新已同步快照” is pressed. This only reads published snapshots; it does not request a new capture from a Raspberry Pi.

`schemaVersion` is `1`. `plans` contains `m5`, `m2`, and `h8`. Each plan contains:

- `title`, `sourceUrl`, `revision`, `version`
- `capturedAt`: successful screenshot generation time, not GitHub deployment time
- `sourceSavedAt`: the source plan's save time
- `sourceCheck`: `checkedAt`, `status` (`current`, `update_available`, or `unable_to_check`), and the observed `revision` and `steps` when known
- `steps`: ordered, continuous records starting at `1`; each has `step`, `preview`, and `highResolution`
- Each image record has `path`, exact `bytes`, `width`, `height`, and lowercase `sha256`

Paths are relative to the site root, with **no leading slash**, for example `assets/m5/<immutable-version>/step-1-preview.webp` and `step-1-hd.webp`. They resolve correctly under `/raidnotice/`. A high-resolution file must be at most 1,000,000 bytes. Preserve real screenshot contents, labels, and markers. Do not redraw using AI. Only previews load in the page; high-resolution files are requested through a user click.

## Publishing snapshots

1. Check the public source revision and real step count.
2. Capture every step and check the source again; do not publish an incomplete group or mix revisions.
3. Encode previews and high-resolution WebP files; verify dimensions, readability, bytes, and SHA256.
4. Put all image files in a new immutable version directory. Update the manifest only after all required groups and files are complete. Publish files and manifest in the same ordinary Git commit.
5. Confirm GitHub Pages deployment and actual HTTP image/JSON contents. Preserve the last complete published snapshot when checks, capture, or deployment fail.

An automatic publisher may update only `assets/m5/`, `assets/m2/`, `assets/h8/`, and `data/manifest.json`. It must not change frontend files. The initial dataset has M5 revision 18 (2 steps), M2 revision 8 (3 steps), and H8 revision 13 (7 steps). Snapshot and source-check timestamps are in the manifest and are not claimed as live deployment timestamps.

## Automation status

The initial site is published manually using the owner's existing local GitHub authorization. A dedicated deployment identity for a Raspberry Pi publisher requires separate authorization. No personal token, new PAT, private key, or original Sites signing key belongs in this repository or on the Pi. End-to-end automatic capture and GitHub deployment are not yet verified.
