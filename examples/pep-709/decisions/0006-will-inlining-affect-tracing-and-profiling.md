# Will inlining affect tracing and profiling?

- Status: accepted
- Decision ID: D-afc1f96b
- Sources: https://discuss.python.org/t/pep-709-inlined-comprehensions/24240
- Participants: carljm
- Traceability: 1 of 1 quotes found verbatim in the source

## Decision

Inlining of comprehensions will affect tracing and profiling.

## Why

The PEP and implementation were updated to explicitly state that inlining comprehensions will impact tracing and profiling.

### Evidence

> "I’ve also updated the PEP to mention that tracing/profiling will also be affected; thanks @godlygeek."
>
> carljm, [post 29](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/29) (verified)
