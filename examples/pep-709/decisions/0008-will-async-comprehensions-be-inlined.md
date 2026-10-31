# Will async comprehensions be inlined?

- Status: accepted
- Decision ID: D-db97dad6
- Sources: https://discuss.python.org/t/pep-709-inlined-comprehensions/24240
- Participants: carljm
- Traceability: 1 of 1 quotes found verbatim in the source

## Decision

Async comprehensions will be inlined as part of the implementation.

## Why

The implementation automatically inlines async comprehensions without any additional handling, as they are orthogonal to inlining.

### Evidence

> "It does. Async comprehensions are orthogonal to inlining, so it just falls out of the implementation without any additional handling."
>
> carljm, [post 34](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/34) (verified)


## Code mentioned in the discussion

- `async comprehensions`
