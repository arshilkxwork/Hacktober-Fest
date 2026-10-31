# Compatibility with other Python implementations

- Status: open
- Decision ID: D-40816f33
- Sources: https://discuss.python.org/t/pep-709-inlined-comprehensions/24240
- Participants: carljm, Glenn, timfelgentreff
- Traceability: 3 of 3 quotes found verbatim in the source

## Decision

The decision is still open on whether other Python implementations should adapt to the changes in behavior, such as the handling of `UnboundLocalError` vs `NameError`.

## Why

There is debate over whether the changes in behavior, such as the handling of `UnboundLocalError` vs `NameError`, should be considered a change to the language and thus require adaptation by other implementations.

### Evidence

> "user-visible effects beyond just performance (on tracebacks and the output of `locals()`, as described in the PEP), albeit minor ones, it could be considered a change to the language, and other implementations may want to adapt to those effects."
>
> carljm, [post 17](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/17) (verified)


## Rejected alternatives

### No adaptation required

Rejected because: Other implementations may not adapt to the changes in behavior.

> "Does it matter? Isn’t this just internal to the CPython implementation? It"
>
> Glenn, [post 16](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/16) (verified)


### Adaptation by other implementations

Rejected because: Other implementations may want to adapt to the changes in behavior.

> "Since GraalPy tries to not lag behind CPython more than a year or so, we would be affected by this. Even if it might be considered a minor visible effect and/or an implementation detail, it is always surprising (to me) how much of those details end up being relied upon"
>
> timfelgentreff, [post 20](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/20) (verified)
