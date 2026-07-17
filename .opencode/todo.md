# Mission: Self-Annotate v1.4.1 — Bug fix, version bump, and cross-browser builds

## M1: Review & Fix Source Code
### T1.1: Explore project structure | agent: Commander
- [x] S1.1.1: Read v1.4 source files (manifest, background, content, popup, whiteboard) | size:S
- [x] S1.1.2: Identify differences from v1.3 stable | size:M
- [x] S1.1.3: Locate all version strings needing update | size:S

### T1.2: Fix critical bug in content.js | agent: Worker
- [x] S1.2.1: Remove orphaned viewport code at line 809 (undefined dx,dy) | size:S
- [x] S1.2.2: Verify fix doesn't break surrounding function | size:S

### T1.3: Update version strings to 1.4.1 | agent: Worker
- [x] S1.3.1: background.js header v1.3 → v1.4.1 | size:S
- [x] S1.3.2: manifest.json version 1.4 → 1.4.1 | size:S
- [x] S1.3.3: popup.html display v1.4 → v1.4.1 | size:S
- [x] S1.3.4: options.html display v1.4 → v1.4.1 | size:S
- [x] S1.3.5: content.js header v1.2 → v1.4.1 | size:S

## M2: Create Cross-Browser Builds
### T2.1: Build Chrome package | agent: Worker
- [x] S2.1.1: Create chrome-v1.4.1 directory with all source files | size:S
- [x] S2.1.2: Write Chrome manifest (service_worker + options_page) | size:S
- [x] S2.1.3: Archive to chrome-packages/self-annotate-v1.4.1-chrome.zip | size:S

### T2.2: Build Firefox package | agent: Worker
- [x] S2.2.1: Create firefox-v1.4.1 directory with all source files | size:S
- [x] S2.2.2: Write Firefox manifest (scripts[] + options_ui + gecko.id) | size:S
- [x] S2.2.3: Archive to firefox-packages/self-annotate-v1.4.1-firefox.zip | size:S

## M3: Verification
### T3.1: Verify bug fix | agent: Reviewer
- [x] S3.1.1: Confirm orphaned viewport code is removed from content.js | size:S
- [x] S3.1.2: Confirm no remaining ReferenceError from undefined dx/dy | size:S

### T3.2: Verify version consistency | agent: Reviewer
- [x] S3.2.1: Check all version strings show 1.4.1 | size:S
- [x] S3.2.2: Check no stale v1.3/v1.4 strings remain in headers | size:S

### T3.3: Verify build packages | agent: Reviewer
- [x] S3.3.1: Verify Chrome ZIP contains correct manifest (service_worker) | size:S
- [x] S3.3.2: Verify Firefox ZIP contains correct manifest (scripts, gecko) | size:S
- [x] S3.3.3: Verify all build files present in both packages | size:S
