# Name of the Type Narrowing Function

- Status: open
- Decision ID: D-3850841b
- Sources: https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613
- Participants: Jelle, beauxq, carljm, Bullseye5995, xmw, FelixFourcolor, alicederyn
- Traceability: 10 of 10 quotes found verbatim in the source

## Decision

The name `TypeIs` was chosen, but the discussion is still open for alternatives.

## Why

The name `TypeIs` was proposed and received the most support, but concerns about its clarity and potential confusion with other Python concepts remain.

### Evidence

> "I posted a PR to the PEP to clarify that type checkers may infer the more precise intersection type:"
>
> Jelle, [post 24](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/24) (verified)

> "I just asked the Typing Council for a decision. Perhaps the biggest sticking point remains the name, but none of the other proposed names seem clearly better to me, and @carljm’s comment approving of `TypeIs` is still the most liked comment in the thread, so I’m keeping `TypeIs`."
>
> Jelle, [post 25](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/25) (verified)

> "As one of the people that clicked like on that comment, I don’t like that being interpreted as a vote for `TypeIs`."
>
> beauxq, [post 28](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/28) (verified)

> "I do object to `TypeNarrow(er)` – I think it is too awkward and jargon-y, and doesn’t clearly look “simpler” than `TypeGuard`."
>
> carljm, [post 29](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/29) (verified)

> "One I hadn’t seen suggested before (but alludes Guido’s preference for `TypeCheck`) — is `CheckType`"
>
> Bullseye5995, [post 30](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/30) (verified)

> "I’ve never seen this wording lead someone to believe that the type of `x` must be exactly int; a concept that isn’t even representable in Python type annotations."
>
> xmw, [post 31](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/31) (verified)


## Rejected alternatives

### TypeNarrow[er]

Rejected because: Too awkward and jargon-y, and doesn’t clearly look “simpler” than `TypeGuard`.

> "I do object to `TypeNarrow(er)` – I think it is too awkward and jargon-y, and doesn’t clearly look “simpler” than `TypeGuard`."
>
> carljm, [post 29](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/29) (verified)


### CheckType

Rejected because: Not as strongly supported as `TypeIs`.

> "One I hadn’t seen suggested before (but alludes Guido’s preference for `TypeCheck`) — is `CheckType`"
>
> Bullseye5995, [post 30](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/30) (verified)


### IsInstance

Rejected because: While popular, it was not the most liked name and concerns about its clarity remained.

> "I prefer `IsInstance`, but I can just write `from typing import TypeIs as IsInstance` so the name is not a big deal."
>
> FelixFourcolor, [post 17](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/17) (verified)

> "This leans me mildly towards `TypeIs`."
>
> alicederyn, [post 19](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/19) (verified)


## Code this decision applies to

- `src/typing_extensions.py:2329` `TypeIs` (found via identifier named in discussion)
- `src/typing_extensions.py:2276` `TypeGuard` (found via identifier named in discussion)
