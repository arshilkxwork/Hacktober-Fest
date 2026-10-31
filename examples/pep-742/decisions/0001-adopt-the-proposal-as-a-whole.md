# Adopt the proposal as a whole

- Status: accepted
- Decision ID: D-6cc1785a
- Sources: https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613
- Participants: Jelle, carljm, guido, beauxq, Bullseye5995, xmw, FelixFourcolor
- Traceability: 11 of 11 quotes found verbatim in the source

## Decision

The proposal to add a new special form `TypeIs` for user-defined type narrowing functions was accepted.

## Why

The community largely favored `TypeIs` over other alternatives, with `IsInstance` as a close second. The name was chosen to align with existing runtime functionality and to avoid confusion with other Python concepts.

### Evidence

> "From all this silence I’m concluding that `TypeIs` has consensus behind it. I will change the PEP to use this name."
>
> Jelle, [post 4](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/4) (verified)

> "As for the name, I’m going to stick with `TypeIs` unless a consensus for some other name emerges in this thread."
>
> Jelle, [post 16](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/16) (verified)

> "I posted a PR to the PEP to clarify that type checkers may infer the more precise intersection type:"
>
> Jelle, [post 24](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/24) (verified)

> "I just asked the Typing Council for a decision. Perhaps the biggest sticking point remains the name, but none of the other proposed names seem clearly better to me, and @carljm’s comment approving of `TypeIs` is still the most liked comment in the thread, so I’m keeping `TypeIs`."
>
> Jelle, [post 25](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/25) (verified)


## Rejected alternatives

### TypeNarrower

Rejected because: The name was chosen to be the default tool for user-defined type narrowing functions, leaving `TypeGuard` for rare cases.

> "My hope is that the PEP’s new construct becomes the default tool used for user-defined type narrowing functions, leaving the existing `TypeGuard` as a more advanced tool used in rare cases."
>
> Jelle, [post 1](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/1) (verified)

> "do object to `TypeNarrow(er)` – I think it is too awkward and jargon-y, and doesn’t clearly look “simpler” than `TypeGuard`."
>
> carljm, [post 29](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/29) (verified)


### TypeCheck

Rejected because: Too confusing with other phrases/vocabulary and idioms commonly used in Python.

> "As long as we’re still voting, I’m still in favor of `TypeCheck`, but I don’t care too much about the color of this bikeshed, and further discussion about what the meaning of “is” is doesn’t feel productive; if `TypeCheck` is rejected, `TypeIs` is my second choice."
>
> guido, [post 7](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/7) (verified)

> "I don’t like that being interpreted as a vote for `TypeIs`."
>
> beauxq, [post 28](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/28) (verified)

> "One I hadn’t seen suggested before (but alludes Guido’s preference for `TypeCheck`) — is `CheckType`"
>
> Bullseye5995, [post 30](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/30) (verified)


### IsInstance

Rejected because: While `IsInstance` was proposed, it was not widely liked and `TypeIs` was chosen instead.

> "To me, the name `TypeIs` in `TypeIs[Typ]` reads exactly as if the intention is to guard `type(obj) is Typ` or `type(obj) in <sequence of types>`. Type identity is important for any kind of code doing MRO analysis, so adopting the name `TypeIs` in PEP 742 makes it confusing in this context."
>
> xmw, [post 6](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/6) (verified)

> "I prefer `IsInstance`, but I can just write `from typing import TypeIs as IsInstance` so the name is not a big deal."
>
> FelixFourcolor, [post 17](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/17) (verified)


## Code mentioned in the discussion

- `TypeIs[Typ]`
- `IsInstance[str]`
- `TypeGuard[int]`
