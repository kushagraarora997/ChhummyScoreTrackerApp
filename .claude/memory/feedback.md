---
name: feedback
description: Mistakes made and patterns to never repeat
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 01c096f0-686f-473d-9d93-bc36fc517e67
---

**Rule: TODO.md pehle, implement baad mein.**
Why: Kush wants to decide what to work on. Implementing without approval wastes effort and breaks trust.
How to apply: Any new task — note it in TODO.md. Ask for go-ahead before touching code.

**Rule: Brainstorming session mein code mat likho.**
Why: Kush explicitly said "code me kuch bhi change mat kario bhot marunga" during brainstorm sessions.
How to apply: If user signals discussion mode (no explicit "karo" / "fix it" / "implement"), stay read-only.

**Rule: No browser dialogs — ever.**
Why: `window.prompt()` and `window.alert()` are explicitly banned. Two places in code still use them (PlayerSetup addQuick, LiveGame custom score + validation). These are known bugs to fix.
How to apply: Every UI interaction must use custom styled modals. Never suggest or write browser-native dialogs.

**Rule: No fluff in responses.**
Why: Kush said "faltu words use nai karne hai". He reads efficiently.
How to apply: Answer first, context after. No "Great question!", no trailing summaries of what you just did.

**Rule: Plans before code — always.**
Why: "Kuchh bhi kaam karne se pehle plan mujhse discuss hoga hi hoga."
How to apply: Write the plan, wait for "haan karo" or equivalent. Do NOT start implementing while explaining the plan.

**Rule: Surgical changes only.**
Why: Kush explicitly said "unless the current architecture cannot support it, always make surgical changes." No unnecessary refactors, no collateral cleanup, no expanding scope beyond what the task requires.
How to apply: Touch the minimum number of files and lines needed. If a bug is in one function, fix that function — don't restructure the file around it.

**Rule: Always respond in English.**
Why: Kush explicitly said "ALWAYS TALK IN ENGLISH, I AM NOT YOUR YAAR." Prior responses used Hinglish — that was wrong.
How to apply: All responses in English. No Hindi/Hinglish words, no casual bro-speak. Professional but efficient.

**Rule: Test before claiming something works.**
Why: The player name bug was documented as "cosmetic" but Playwright testing revealed it breaks the entire round flow. Untested assumptions about severity are dangerous.
How to apply: When fixing bugs or building features, run the Playwright test suite to verify. Don't mark something done without a test confirmation.

**Rule: Maintain test reports in .claude/TEST_REPORTS/.**
Why: Kush asked for a scored test report file. One batch of testing = one report entry with a self-assessed score.
How to apply: After every test run, write a report to `.claude/TEST_REPORTS/batch-{N}-{date}.md` and update the score in that file. Kush judges the score.

**Rule: "Skip silently" means zero output — no confirmation message.**
Why: The stop hook says "if nothing new was learned, skip silently." Outputting "Skipping — nothing new to save." counts as a turn-end, re-triggers the hook, and creates an infinite loop.
How to apply: When there is nothing to save to memory, produce no output at all. Not even one word.

**Rule: Even within an approved task, implement-first is still wrong.**
Why: Kush said "Don't repeat your mistakes!" when I fixed the share card flexbox bug without explicit approval, even though fixing the share card was in the original session task list. The approval covers the outcome, not every intermediate implementation decision.
How to apply: When discovering a sub-bug or root cause mid-task, describe the finding and proposed fix first. Wait for acknowledgement before touching code. "The task is approved" ≠ "every micro-decision within it is approved."

**Rule: Always respond in formal English — never Hindi.**
Why: User explicitly corrected Hindi response mid-session with "I have asked you to only reply in English formally, Why hindi?"
How to apply: All assistant replies must be in formal English. App UI strings (e.g. "Yeh naam pehle se hai!") may remain in Hindi as they are product copy, not assistant communication.
