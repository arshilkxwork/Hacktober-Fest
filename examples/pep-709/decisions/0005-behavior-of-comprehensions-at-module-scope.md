# Behavior of comprehensions at module scope

- Status: open
- Decision ID: D-61cbf640
- Sources: https://discuss.python.org/t/pep-709-inlined-comprehensions/24240
- Participants: carljm
- Traceability: 2 of 2 quotes found verbatim in the source

## Decision

The behavior of comprehensions at module scope is still being debated, with suggestions for potential changes.

## Why

There is ongoing discussion about whether comprehensions at module scope should be inlined, which could affect the behavior of `locals`, tracebacks, and `UnboundLocalError`/`NameError`.

### Evidence

> "The paragraph you quoted is saying only that comprehensions at module scope (module top level, outside of a function) will not be inlined. That said, @markshannon has suggested offline an approach that could allow those to also be inlined for better consistency; I’m experimenting with that, and will either update the PEP and implementation to inline those also, or to clarify and strengthen the rationale for not doing it."
>
> carljm, [post 26](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/26) (verified)


## Rejected alternatives

### Not inlining comprehensions at module scope

Rejected because: To maintain consistency with inlining comprehensions inside functions.

> "That said, @markshannon has suggested offline an approach that could allow those to also be inlined for better consistency; I’m experimenting with that, and will either update the PEP and implementation to inline those also, or to clarify and strengthen the rationale for not doing it."
>
> carljm, [post 26](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/26) (verified)


## Code mentioned in the discussion

- `PEP 709: Inlined comprehensions`
