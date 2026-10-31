# Distinguishing mutable vs. immutable buffers

- Status: accepted
- Decision ID: D-73342795
- Sources: https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756
- Participants: Jelle
- Traceability: 4 of 4 quotes found verbatim in the source

## Decision

The proposal to distinguish mutable vs. immutable buffers was rejected in favor of simpler typing.

## Why

The discussion concluded that distinguishing mutable vs. immutable buffers was complex and not necessary for the initial implementation. Future work on introspection and 'mutable XOR shared' semantics might provide a better way to differentiate them.

### Evidence

> "I decided to give up on distinguishing mutable vs. immutable buffers for now, especially because Introspection and "mutable XOR shared" semantics for PyBuffer may give us a more robust way to tell them apart in the future."
>
> Jelle, [post 12](https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756/12) (verified)

> "I decided to give up on distinguishing mutable vs. immutable buffers for now, especially because Introspection and "mutable XOR shared" semantics for PyBuffer may give us a more robust way to tell them apart in the future."
>
> Jelle, [post 12](https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756/12) (verified)


## Rejected alternatives

### Distinguishing mutable vs. immutable buffers

Rejected because: Too complex and not necessary for the PEP's primary goal of improving typing support.

> "I decided to give up on distinguishing mutable vs. immutable buffers for now, especially because Introspection and "mutable XOR shared" semantics for PyBuffer may give us a more robust way to tell them apart in the future."
>
> Jelle, [post 12](https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756/12) (verified)

> "especially because Introspection and "mutable XOR shared" semantics for PyBuffer may give us a more robust way to tell them apart in the future."
>
> Jelle, [post 12](https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756/12) (verified)
