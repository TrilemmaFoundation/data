# Usability testing protocol

Use this protocol for 5–8 moderated sessions after the product upgrade ships.
Sessions are comparable only if they use the same tasks, prompts, and notes.

## Setup

- Recruit people who could build a small data product, including at least two beginners.
- Use a production or production-like static build at data.trilemma.foundation.
- Do not create accounts.
- Record observations, not personal data. Do not capture secrets, API keys, or emails from search.

## Tasks

Ask each participant to complete these tasks in order, thinking aloud:

1. **Choose a dataset for a stated product.** Prompt: “You want a local weather alert for one U.S. city. Pick a starting dataset and say why.”
2. **Reach runnable code.** Prompt: “Get from the catalog to an example you could run, including any notebook path.”
3. **Interpret output.** Prompt: “What would a useful first result look like, and what limitation would change a product decision?”
4. **Compare alternatives.** Prompt: “Open a second candidate from related datasets or a build path and say which you would actually start with.”
5. **Submit a correction.** Prompt: “If the guide were wrong, how would you tell us?”

## Observation fields

Capture the same fields for every session:

- Task id and whether it succeeded without help, with help, or failed
- Starting URL and ending URL
- Time to first confident dataset choice
- Whether the participant used a build path, search, filters, or the table
- Whether they opened a guide, Colab notebook, official source, or contribution studio
- Confusion, trust objections, and abandoned clicks
- Exact quote for the main blocker, if any

## Success measures

A session supports the current design when:

- Task 1 succeeds without the moderator naming a dataset
- Task 2 reaches Python or a notebook without a dead end
- Task 3 names a limitation already present on the guide
- Task 4 names a second candidate from related datasets or a build path
- Task 5 finds the GitHub issue path from the guide or footer

Compare sessions by task success counts, not by preference scores alone.
Report recurring blockers before adding new catalog features.
