# Capture Vision and Roadmap

## Product Thesis
Capture is a focused utility for getting screenshots and other images from an Android phone onto a desktop immediately.

The core job:
- an image exists on the phone
- the user needs it on desktop now
- the transfer should feel instant and effortless

This started from a very real workflow pain while building native apps:
- take screenshot on Android
- send it through WhatsApp or another chat app
- download it on desktop
- drag/copy/paste it into docs, tickets, PRs, or design review

Capture removes that loop.

## Current Product Positioning
Capture is not a broad consumer photo product.
Capture is not a permanent cloud gallery.
Capture is not trying to be a giant startup platform.

The product is:
- a sharp utility
- especially useful for Android developers
- also useful for QA, designers, PMs, and indie builders working on mobile products
- optimized for desk workflows where phone screenshots need to become desktop artifacts quickly

A good framing:
- Instant Android screenshot relay to your desktop.
- A tiny dev utility that beams Android screenshots to your browser in real time.

## Current Focus
The current track should stay tightly focused on:
- screenshots
- images
- immediate phone-to-desktop handoff
- fast review/documentation/testing workflows

We should not deviate yet into a broad ecosystem-sync product until this focused workflow is clearly strong.

## Core Audience
Primary audience:
- Android app developers
- QA engineers testing mobile apps
- designers reviewing mobile UI
- indie hackers building native apps

Secondary audience:
- PMs/founders testing mobile flows
- support or ops users who need mobile screenshots on desktop quickly

## Why People Would Use It
Main reasons:
- native app development loops are faster
- screenshots are available immediately where work is happening
- no self-messaging, no cloud photo digging, no cable, no manual transfer dance
- bug reports, docs, changelogs, and review workflows become smoother

## Existing and Adjacent Use Cases
Strong existing use cases:
- mobile app UI review
- QA bug report capture
- changelog and release note screenshots
- docs/tutorial/blog screenshot collection
- collecting multiple screenshots quickly during feature testing

Adjacent but still aligned use cases:
- share any image from Android to desktop
- send downloaded assets or browser images from phone to desktop
- send photos or mockups to desktop when they are immediately needed in work

## Product Boundary
### In scope now
- automatic screenshot relay
- image-first workflows
- web gallery / desktop inbox
- minimal pairing and device management
- lightweight upload notifications

### Possible later, but not current focus
- share any image to Capture via Android share sheet
- small image editing or redaction features
- download/copy/drag-friendly desktop workflows
- local folder auto-save
- app/source labeling on screenshots
- burst/group handling for many screenshots

### Out of scope for now
- general file sync
- full universal clipboard product
- broad continuity suite
- permanent cloud photo backup
- social/gallery product behaviors
- videos, PDFs, arbitrary documents

## Future Product Direction
The broader long-term direction could become:
- continuity for Android people at a desk
- or Mac-like device continuity for Android workflows

But this is only a future framing, not the current roadmap.

The right sequencing is:
1. win the screenshot/image handoff workflow
2. explore image share flows
3. only later consider broader continuity primitives like links or clipboard

## Branding Direction
Current product name:
- Capture

Domain ideas discussed:
- `capture.rip`
- `captr.ing`

Current leaning from the discussion:
- product/app name can remain `Capture`
- domain can be more stylized if it fits the dev-tool vibe
- `captr.ing` felt stronger than `capture.rip` because it is cleaner and more product-like, while still feeling like a niche utility

## Hosted Mode vs Local Mode
### Current mode
Hosted relay mode is the right current architecture because it gives:
- easy onboarding
- no desktop install
- browser-based access
- easy deployment and sharing
- simpler validation of product value

### Local-only mode
Local-only is possible, but likely requires a desktop companion rather than a browser-only architecture.

#### Browser-only local direct mode
This is technically possible, for example through direct browser-to-phone networking or WebRTC-style approaches, but it is not a good primary architecture because:
- browser tabs are weak receivers
- tabs sleep and throttle
- reconnect and discovery become messy
- multi-device/multi-session behavior gets awkward
- security and networking complexity increases

Conclusion:
- possible, but not recommended as the main path

#### Local desktop companion mode
A serious local mode would likely use:
- a CLI daemon
- a menu bar app
- or another lightweight desktop companion

That local receiver would handle:
- pairing
- websocket/live session coordination
- local storage
- image receipt
- desktop availability even when the browser is not the real server

### Hybrid future
The best future architecture is likely hybrid:
- hosted mode by default
- local/private receiver mode for power users later

Why hybrid is attractive:
- hosted mode is easiest to adopt
- local mode improves privacy and speed
- power users can choose local if they want

## Cost Thinking
Main disadvantages of hosted mode are:
- privacy concerns for some users
- backend/storage/request cost

Current assessment:
- cost is likely manageable for a niche utility because retention is aggressive and we only keep recent screenshots
- the main future cost driver is likely request/read volume, not raw storage

Likely cost drivers:
- Worker/API requests
- R2 object reads for previews and originals
- websocket/Durable Object traffic

Less likely to dominate early:
- retained storage, because screenshots are aggressively cleaned up

Conclusion:
- cost should be watched later if adoption grows
- it is not a reason to derail the current hosted product track now

## Feature Ideas That Stay Grounded
Good next-layer features, while staying true to the current product:
- share any image to Capture
- desktop copy-image flow
- easy drag/drop or paste-ready desktop UX
- save incoming screenshots to a local folder
- lightweight annotation / blur / crop
- app/source labeling
- burst grouping for many screenshots
- markdown or issue-ready export
- keyboard-first desktop controls
- multi-device feed into one workspace

These are grounded because they still answer the same question:
- “How do I use this Android image on desktop immediately?”

## Features to Avoid For Now
These would likely cause product drift:
- generic file sync
- permanent cloud galleries
- full collaboration platform features
- broad system-management features
- videos and arbitrary docs
- trying to become a universal continuity platform too early

## Near-Term Product Philosophy
Short-term product philosophy:
- stay focused
- keep the product useful and obvious
- optimize the screenshot and image transfer loop
- only expand into closely adjacent image workflows

We do not need to optimize for monetization right now.
We do need to optimize for:
- usefulness
- delight
- speed
- reliability
- tightness of the workflow

## Practical Roadmap Direction
### Current phase
- make screenshot and image flow excellent
- improve UI/UX and product feel
- harden reliability and code quality
- keep the deployed system stable

### Next likely product expansions
- share any image into Capture
- copy/download/export ergonomics on desktop
- better organization of recent images
- lightweight editing or redaction

### Later exploration
- local receiver mode
- hybrid hosted/local architecture
- broader Android continuity ideas if the screenshot/image workflow proves itself strongly

## Decision Summary
The important decisions from this discussion:
- stay focused on screenshots and images for now
- do not broaden into “full ecosystem sync” yet
- hosted mode remains the right primary architecture
- local-only is possible later, but likely requires a desktop companion
- hybrid is the most attractive long-term architecture
- Capture remains a strong product name
- a stylized domain like `captr.ing` can fit the dev-utility vibe well
