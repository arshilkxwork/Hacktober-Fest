# Whether to add a ForceTypeIs variant

- Status: open
- Decision ID: D-0a2e257b
- Sources: https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613
- Participants: PawelSwiecki, Jelle, Daverball
- Traceability: 4 of 4 quotes found verbatim in the source

## Decision

The discussion did not reach a consensus on adding a `ForceTypeIs` variant.

## Why

Some participants suggested adding a `ForceTypeIs` variant to avoid confusion, but others argued that it would be as easy to accidentally use one over the other as it would be to write an incorrect type narrower in the first place.

### Evidence

> "Could type checker check if `ForceTypeIs` is redundant over `TypeIs`? In this case a warning could be emitted. It’s probably not that straightforward to implement, though."
>
> PawelSwiecki, [post 15](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/15) (verified)

> "Could type checkers detect unsound `TypeIs` (and `TypeGuard`) functions? Maybe in a few cases, but I don’t expect this to be possible in general. If type checkers add the ability to detect some unsound narrowing functions, we could mention that in the user-facing documentation later. I certainly don’t want to prohibit type checkers from trying."
>
> Jelle, [post 16](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/16) (verified)

> "With `TypeIs` vs `ForceTypeIs` it becomes just as easy to accidentally use one over the other as it would be to write an incorrect type narrower in the first place, so I don’t think it’s a big enough win personally."
>
> Daverball, [post 14](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/14) (verified)


## Rejected alternatives

### ForceTypeIs

Rejected because: Not enough consensus to add it, and it was argued that it would be as easy to accidentally use one over the other as it would be to write an incorrect type narrower in the first place.

> "With `TypeIs` vs `ForceTypeIs` it becomes just as easy to accidentally use one over the other as it would be to write an incorrect type narrower in the first place, so I don’t think it’s a big enough win personally."
>
> Daverball, [post 14](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/14) (verified)
