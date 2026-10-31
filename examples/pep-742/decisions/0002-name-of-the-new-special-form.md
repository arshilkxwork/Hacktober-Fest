# Name of the new special form

- Status: accepted
- Decision ID: D-cd56d653
- Sources: https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613
- Participants: Jelle, guido, gandhis1, carljm, emily, PawelSwiecki, xmw
- Traceability: 21 of 21 quotes found verbatim in the source

## Decision

The new special form `TypeIs` behaves similarly to `TypeGuard`, but without the backward-incompatible changes proposed in PEP 724.

## Why

The name `TypeIs` was chosen due to its clear and concise nature, and it received consensus from the participants. The name `TypeIs` is short and reads well, making it a preferred choice over alternatives like `TypeCheck`, `Narrowed`, `IsInstance`, and `ForceTypeIs`.

### Evidence

> "I will change the PEP to use this name."
>
> Jelle, [post 4](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/4) (verified)

> "As long as we’re still voting, I’m still in favor of `TypeCheck`, but I don’t care too much about the color of this bikeshed, and further discussion about what the meaning of “is” is doesn’t feel productive; if `TypeCheck` is rejected, `TypeIs` is my second choice."
>
> guido, [post 7](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/7) (verified)

> "As for the name, I’m going to stick with `TypeIs` unless a consensus for some other name emerges in this thread. Clearly lots of people have various preferences, but I’m not yet seeing any alternative that is as widely liked."
>
> Jelle, [post 16](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/16) (verified)

> "From all this silence I’m concluding that `TypeIs` has consensus behind it. I will change the PEP to use this name."
>
> Jelle, [post 4](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/4) (verified)

> "As for the name, I’m going to stick with `TypeIs` unless a consensus for some other name emerges in this thread."
>
> Jelle, [post 16](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/16) (verified)

> "The Typing Council has voted in favor of PEP 742 in its current form. All TC members support the `TypeIs` name."
>
> guido, [post 34](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/34) (verified)

> "There was considerable bikeshedding on the name of the new special form, but we ultimately landed and agreed on `TypeIs`."
>
> guido, [post 34](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/34) (verified)

> "Given that the current PEP was a deliberate, explicit departure from the original PEP which sought to modify the behavior of `TypeGuard` (which remains my personal preference, despite the community moving in another direction) the concern stands that the name does not clearly convey what the difference is versus `TypeGuard`."
>
> gandhis1, [post 32](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/32) (verified)

> "If we had a time machine, we would avoid the creation of `TypeGuard`, or give it the more-specific niche name instead. But that ship has sailed."
>
> carljm, [post 33](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/33) (verified)

> "The SC has accepted this PEP!"
>
> emily, [post 35](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/35) (verified)


## Rejected alternatives

### TypeCheck

Rejected because: Not as widely liked as `TypeIs` and was considered too confusing with other uses of “type checking”.

> "As long as we’re still voting, I’m still in favor of `TypeCheck`, but I don’t care too much about the color of this bikeshed, and further discussion about what the meaning of “is” is doesn’t feel productive; if `TypeCheck` is rejected, `TypeIs` is my second choice."
>
> guido, [post 7](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/7) (verified)

> "As long as we’re still voting, I’m still in favor of `TypeCheck`, but I don’t care too much about the color of this bikeshed, and further discussion about what the meaning of “is” is doesn’t feel productive."
>
> guido, [post 7](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/7) (verified)


### Narrowed

Rejected because: While it links to the term 'type narrowing', it was considered less concise than `TypeIs`.

> "Narrowed or `NarrowedTo`. Also links to *type narrowing"
>
> Jelle, [post 1](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/1) (verified)

> "My hope is that the PEP’s new construct becomes the default tool used for user-defined type narrowing functions, leaving the existing `TypeGuard` as a more advanced tool used in rare cases."
>
> Jelle, [post 1](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/1) (verified)

> "I understand. I see why `CastIs` is not a good idea. Thank you for the thorough explanation.  Does `TypeIs` name convey the “overriding” behaviour? In this regard `TypeNarrower` (or even `NarrowedTo`, which also was proposed) might be a better name, after all."
>
> PawelSwiecki, [post 13](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/13) (verified)


### IsInstance

Rejected because: While it was considered, it did not gain enough consensus.

> "To me, the name `TypeIs` in `TypeIs[Typ]` reads exactly as if the intention is to guard `type(obj) is Typ` or `type(obj) in <sequence of types>`. Type identity is important for any kind of code doing MRO analysis, so adopting the name `TypeIs` in PEP 742 makes it confusing in this context."
>
> xmw, [post 6](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/6) (verified)


### ForceTypeIs

Rejected because: It was not proposed as a separate name but as a potential variant of `TypeIs`.

> "`TypeIs` – which would make type checker to check the narrowing function’s internal consistency – would be the go-to (“default”) one. Only in cases where type checker cannot understand it the `ForceTypeIs` would be advised – “force” word would help to avoid the confusion, at least it would in my case."
>
> PawelSwiecki, [post 15](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/15) (verified)


### TypeGuard

Rejected because: The name `TypeGuard` is too specific and could lead people to assume it is the thing they want, while the new form is more general.

> "If we attempt to capture the difference in the name, it will lead to an overly-long, overly-specific name, leading people to assume that `TypeGuard` is probably the thing they want, and the very-specifically-named thing is probably for an edge case."
>
> carljm, [post 33](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/33) (verified)

> "There was all round agreement that the new semantics are in most cases better, but a majority of the TC found the backward incompatibility in edge cases unacceptable."
>
> guido, [post 34](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/34) (verified)

> "And the name `TypeGuard` doesn’t help us out by being in any way specific to its behavior, relative to the new form."
>
> carljm, [post 33](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/33) (verified)


### Other proposed names

Rejected because: Various other names were proposed but ultimately rejected due to their length or specificity.

> "the concern stands that the name does not clearly convey what the difference is versus `TypeGuard`."
>
> gandhis1, [post 32](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/32) (verified)


## Code mentioned in the discussion

- `peps.python.org`
- `TypeIs`
