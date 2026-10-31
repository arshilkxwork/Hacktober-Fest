# When to call `__release_buffer__`

- Status: open
- Decision ID: D-07f2dc58
- Sources: https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756
- Participants: encukou, Jelle
- Traceability: 8 of 8 quotes found verbatim in the source

## Decision

The decision is still open on when to call `__release_buffer__` and whether it should be called manually or handled by the memoryview.

## Why

The participants are discussing the necessity and feasibility of enforcing the call to `__release_buffer__` through `memoryview(..., exporter=self)` to avoid potential issues with manual buffer management.

### Evidence

> "Currently it’s not clear to me when to call `__release_buffer__` vs. when a wrapper or memoryview does it for you: e.g. the PEP says “It is also possible to call `__release_buffer__` on a C class that implements `bf_releasebuffer`” – when should you do it, and what happens if you should do it but don’t (and vice versa)?"
>
> encukou, [post 15](https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756/15) (verified)

> "FWIW, when I get time I want to check if the following would be a better (simpler/safer) approach:"
>
> encukou, [post 16](https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756/16) (verified)

> "You should call it when you want to release a memoryview you got from a call to `__buffer__`. It’s probably going to be very rarely necessary, because you can just do `with obj.__buffer__(flags)` and the memoryview’s `__exit__` method will call the buffer for you."
>
> Jelle, [post 17](https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756/17) (verified)

> "It won’t:"
>
> encukou, [post 18](https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756/18) (verified)

> "If you call `__buffer__` directly, you’re on your own. I see this as similar to the context manager protocol: `__enter__` and `__exit__` should be called in pairs, but if you call `__enter__` directly and don’t call `__exit__`, the runtime isn’t going to call it for you."
>
> Jelle, [post 19](https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756/19) (verified)

> "It won’t: ``` >>> class Foo: ...     def __buffer__(self, flags): ...         print('__buffer__ called') ...         return memoryview(b"
>
> encukou, [post 18](https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756/18) (verified)


## Rejected alternatives

### Enforcing `memoryview(..., exporter=self)`

Rejected because: It would not be enforceable in code that directly calls `__buffer__`.

> "Such a requirement wouldn’t be enforceable in code that directly calls `__buffer__` (at least, not without bigger changes to the language)."
>
> Jelle, [post 19](https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756/19) (verified)


### Calling `__release_buffer__` manually

Rejected because: It is rarely necessary, and the runtime will release the buffer when the memoryview is GCed.

> "You should call it when you want to release a memoryview you got from a call to `__buffer__`. It’s probably going to be very rarely necessary, because you can just do `with obj.__buffer__(flags)` and the memoryview’s `__exit__` method will call the buffer for you."
>
> Jelle, [post 17](https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756/17) (verified)


## Code mentioned in the discussion

- `memoryview`
- `__buffer__`
- `__release_buffer__`
- `arraymodule.c`
- `Foo`
