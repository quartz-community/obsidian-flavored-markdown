# Changelog

## 1.0.0

### Major Changes

- Stable 1.0 release. All `@quartz-community/*` dependencies now use `^1.0.0` ranges.

  Pre-1.0 caret ranges pinned the minor version (`^0.2.1` means `>=0.2.1 <0.3.0`), so
  published fixes to shared packages could never be resolved by dependents. Moving the
  ecosystem to 1.0 makes caret ranges behave conventionally.

## 0.1.2

### Patch Changes

- f9cf161: Fix nested callout body text leaking into the title when the body contains bold/italic formatting. Previously, inline nodes (e.g., `**bold**`) following a newline in a nested blockquote callout were incorrectly included in the callout title instead of the callout content.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial Quartz community plugin template.

### Changed

- **BREAKING (inherited from `@quartz-community/utils`)**: wikilink targets are now lowercased when slugified (e.g. `[[My Note]]` resolves to `my-note` instead of `My-Note`). This matches Obsidian's case-insensitive link-matching behavior.

### Removed

- **BREAKING**: `disableBrokenWikilinks` option. The broken-link check has been moved to `@quartz-community/crawl-links`, which owns link resolution and can honor its own `markdownLinkResolution` strategy without the two plugins drifting. Users who had `disableBrokenWikilinks: true` under `ObsidianFlavoredMarkdown` must move it to `CrawlLinks`. The new location also covers broken markdown links (e.g. `[text](./nowhere)`), not just wikilinks.
