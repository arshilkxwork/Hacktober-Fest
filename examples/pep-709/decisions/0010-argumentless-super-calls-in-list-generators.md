# Argumentless `super()` calls in list generators

- Status: open
- Decision ID: D-44dc3f74
- Sources: https://discuss.python.org/t/pep-709-inlined-comprehensions/24240
- Participants: ptsl, AlexWaygood, ronaldoussoren
- Traceability: 4 of 4 quotes found verbatim in the source

## Decision

The question of whether argumentless `super()` calls will work inside list generators is still being debated.

## Why

The behavior of argumentless `super()` calls inside list generators is not yet definitively decided.

### Evidence

> "Will argumentless `super()` calls work inside list generators?"
>
> ptsl, [post 37](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/37) (verified)

> "It looks like this does indeed work in a post-PEP-709 world:"
>
> AlexWaygood, [post 38](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/38) (verified)

> "I’m also not sure if the older behaviour, and the same behaviour with generator expressions, is intentional."
>
> ronaldoussoren, [post 39](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/39) (verified)


## Rejected alternatives

### Older behavior and generator expressions

Rejected because: The behavior is not yet decided and is seen as an accident of the implementation.

> "I’m also not sure if the older behaviour, and the same behaviour with generator expressions, is intentional."
>
> ronaldoussoren, [post 39](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/39) (verified)


## Code mentioned in the discussion

- `class B(A)`
- `super().fnc()`
