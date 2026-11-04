# MindSovereignty synthetic governance demo

This is a static discussion prototype for a proposed Mozilla Foundation Fellowship application naming the Slum & Rural Health Initiative as a potential host. There is no host agreement or endorsement. It uses synthetic participants, requesters and purposes. It collects no health data and makes no actual access-control decisions. The simulated community steward is a placeholder for a process that must be defined with the host and affected people.

## Run and test

From this directory, run `python3 -m http.server 8765`, then open `http://localhost:8765/`. The page uses native JavaScript modules and no external dependencies. Run `node --test policy.test.mjs` to test the decision rules.

## Demonstration scenario

1. Grant Participant A permission for community health research.
2. Leave the community rule approved, check the benefit-agreement box and submit an access request. It is allowed **in the simulation**.
3. Withdraw Participant A's permission and submit the same request again. It is denied; the earlier allowed decision remains visible.
4. Grant permission again, suspend the community rule and retry. It is denied.
5. Try commercial profiling. The example charter blocks it regardless of the other settings.

The audit history is stored in this browser's `localStorage` and can be exported as JSON. Reset clears it. Browser storage is not a trustworthy immutable ledger, and the page does not encrypt records, authenticate a steward, enforce a real community agreement or address downstream model unlearning.

## Public hosting

The [public demo](https://kingnonso.github.io/mindsovereignty-demo/) is hosted from a [separate public repository](https://github.com/KingNonso/mindsovereignty-demo/). Only this prototype folder was published; application worksheets and private interview notes remain out of that repository. The deployed grant → request → withdrawal → denial path passed in a fresh mobile browser on 4 November 2026. Keep the limits above visible when sharing the link.

