# Introduce a new Python API for memoryview(..., exporter=self)

- Status: rejected
- Decision ID: D-4c68ed13
- Sources: https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756
- Participants: Jelle
- Traceability: 2 of 2 quotes found verbatim in the source

## Decision

The proposal to introduce a new Python API for `memoryview(..., exporter=self)` was rejected.

## Why

Jelle prefers to avoid introducing new Python APIs if possible, citing the costs associated with documentation, bikeshedding, and reasoning about correctness. The lack of a clear benefit to enforcing this in `__buffer__` was also noted.

### Evidence

> "I’d be open to adding new Python APIs if that’s helpful, but every new Python API has some cost (documentation, bikeshedding over naming/semantics, having to reason about correctness if it’s used in unexpected ways). So I’d prefer to avoid introducing a new Python API if possible."
>
> Jelle, [post 19](https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756/19) (verified)


## Rejected alternatives

### memoryview(..., exporter=self)

Rejected because: Not enforceable in code that directly calls `__buffer__` and introduces unnecessary complexity.

> "Such a requirement wouldn’t be enforceable in code that directly calls `__buffer__` (at least, not without bigger changes to the language)."
>
> Jelle, [post 19](https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756/19) (verified)


## Code mentioned in the discussion

- `memoryview(..., exporter=self)`
