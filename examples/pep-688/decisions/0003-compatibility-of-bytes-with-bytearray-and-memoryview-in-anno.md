# Compatibility of `bytes` with `bytearray` and `memoryview` in annotations

- Status: rejected
- Decision ID: D-82e12ed4
- Sources: https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756
- Participants: Jelle
- Traceability: 2 of 2 quotes found verbatim in the source

## Decision

The implicit conversion between `bytes`, `bytearray`, and `memoryview` in annotations was removed.

## Why

The PEP 688 discussion concluded that the implicit conversion between `bytes`, `bytearray`, and `memoryview` in annotations was not necessary and could be removed to simplify the PEP and make it more useful for typing.

### Evidence

> "I decided to give up on distinguishing mutable vs. immutable buffers for now, especially because Introspection and "mutable XOR shared" semantics for PyBuffer may give us a more robust way to tell them apart in the future. This will make the PEP simpler but still useful for typing. A new version of the PEP just live at PEP 688 – Making the buffer protocol accessible in Python | peps.python.org."
>
> Jelle, [post 12](https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756/12) (verified)


## Rejected alternatives

### Maintaining the implicit conversion

Rejected because: The implicit conversion was deemed unnecessary and would complicate the PEP.

> "I decided to give up on distinguishing mutable vs. immutable buffers for now, especially because Introspection and "mutable XOR shared" semantics for PyBuffer may give us a more robust way to tell them apart in the future. This will make the PEP simpler but still useful for typing."
>
> Jelle, [post 12](https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756/12) (verified)


## Code mentioned in the discussion

- `Track review of `bytes` types · Issue #9006 · python/typeshed · GitHub`
