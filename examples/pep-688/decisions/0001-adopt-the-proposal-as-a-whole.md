# Adopt the proposal as a whole

- Status: accepted
- Decision ID: D-58f7e7ff
- Sources: https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756
- Participants: Jelle
- Traceability: 2 of 2 quotes found verbatim in the source

## Decision

The proposal to make the buffer protocol accessible in Python was accepted, with the decision to drop the distinction between mutable and immutable buffers.

## Why

The discussion concluded that distinguishing mutable vs. immutable buffers was not necessary, and the PEP was simplified for the sake of clarity and usefulness in typing.

### Evidence

> "I decided to give up on distinguishing mutable vs. immutable buffers for now, especially because Introspection and "mutable XOR shared" semantics for PyBuffer may give us a more robust way to tell them apart in the future. This will make the PEP simpler but still useful for typing."
>
> Jelle, [post 12](https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756/12) (verified)


## Rejected alternatives

### Distinguishing mutable vs. immutable buffers

Rejected because: Not necessary for the sake of simplicity and usefulness in typing.

> "I decided to give up on distinguishing mutable vs. immutable buffers for now, especially because Introspection and "mutable XOR shared" semantics for PyBuffer may give us a more robust way to tell them apart in the future."
>
> Jelle, [post 12](https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756/12) (verified)
