## DecisionTrail

This change touches code covered by 6 earlier decision(s). Read them before going ahead; every point links to the discussion it came from.

### Adopt the proposal as a whole (ACCEPTED)

Why this came up: changes `TypeIs` in `src/typing_extensions.py`; touches `src/typing_extensions.py`.

**Decision:** The proposal to add a new special form `TypeIs` for user-defined type narrowing functions was accepted.

**Reason:** The community largely favored `TypeIs` over other alternatives, with `IsInstance` as a close second. The name was chosen to align with existing runtime functionality and to avoid confusion with other Python concepts.

**Already tried or rejected:**
- TypeNarrower: The name was chosen to be the default tool for user-defined type narrowing functions, leaving `TypeGuard` for rare cases. ([post 1](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/1))
- TypeCheck: Too confusing with other phrases/vocabulary and idioms commonly used in Python. ([post 7](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/7))
- IsInstance: While `IsInstance` was proposed, it was not widely liked and `TypeIs` was chosen instead. ([post 6](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/6))

> "From all this silence I’m concluding that `TypeIs` has consensus behind it. I will change the PEP to use this name."
> Jelle, [post 4](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/4)

Sources: https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613

### Name of the new special form (ACCEPTED)

Why this came up: changes `TypeIs` in `src/typing_extensions.py`; touches `src/typing_extensions.py`.

**Decision:** The new special form `TypeIs` behaves similarly to `TypeGuard`, but without the backward-incompatible changes proposed in PEP 724.

**Reason:** The name `TypeIs` was chosen due to its clear and concise nature, and it received consensus from the participants. The name `TypeIs` is short and reads well, making it a preferred choice over alternatives like `TypeCheck`, `Narrowed`, `IsInstance`, and `ForceTypeIs`.

**Already tried or rejected:**
- TypeCheck: Not as widely liked as `TypeIs` and was considered too confusing with other uses of “type checking”. ([post 7](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/7))
- Narrowed: While it links to the term 'type narrowing', it was considered less concise than `TypeIs`. ([post 1](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/1))
- IsInstance: While it was considered, it did not gain enough consensus. ([post 6](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/6))
- ForceTypeIs: It was not proposed as a separate name but as a potential variant of `TypeIs`. ([post 15](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/15))
- TypeGuard: The name `TypeGuard` is too specific and could lead people to assume it is the thing they want, while the new form is more general. ([post 33](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/33))
- Other proposed names: Various other names were proposed but ultimately rejected due to their length or specificity. ([post 32](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/32))

> "I will change the PEP to use this name."
> Jelle, [post 4](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/4)

Sources: https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613

### Compatibility with existing TypeGuard (ACCEPTED)

Why this came up: changes `TypeIs` in `src/typing_extensions.py`; touches `src/typing_extensions.py`.

**Decision:** The new TypeNarrower construct is designed to be compatible with existing TypeGuard, with both constructs having the same specification for all aspects not related to type narrowing behavior.

**Reason:** The PEP aims to avoid backwards compatibility issues by creating a new special form and leaving TypeGuard unchanged. The design choice is to make TypeNarrower and TypeGuard behave as similarly as possible, with the PEP recommending that TypeGuard be reserved for rare cases where its behavior is specifically desired.

**Already tried or rejected:**
- TypeCheck: Too easy to confuse with 'type checking' in general. ([post 7](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/7))
- TypeNarrower: Too awkward and jargon-y, and doesn’t clearly look ‘simpler’ than `TypeGuard`. ([post 16](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/16))
- IsInstance: Not the preferred name, and Jelle decided to use TypeIs. ([post 16](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/16))
- Introducing backward incompatibilities: The Typing Council and the Steering Council agreed that the new `TypeIs` special form should not introduce backward incompatibilities with existing code that uses `TypeGuard`. ([post 34](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/34))

> "I believe it is better for TypeGuard and TypeNarrower to behave as similarly as possible."
> Jelle, [post 1](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/1)

Sources: https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613

### Whether to add a ForceTypeIs variant (OPEN)

Why this came up: changes `TypeIs` in `src/typing_extensions.py`; touches `src/typing_extensions.py`.

**Decision:** The discussion did not reach a consensus on adding a `ForceTypeIs` variant.

**Reason:** Some participants suggested adding a `ForceTypeIs` variant to avoid confusion, but others argued that it would be as easy to accidentally use one over the other as it would be to write an incorrect type narrower in the first place.

**Already tried or rejected:**
- ForceTypeIs: Not enough consensus to add it, and it was argued that it would be as easy to accidentally use one over the other as it would be to write an incorrect type narrower in the first place. ([post 14](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/14))

> "Could type checker check if `ForceTypeIs` is redundant over `TypeIs`? In this case a warning could be emitted. It’s probably not that straightforward to implement, though."
> PawelSwiecki, [post 15](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/15)

Sources: https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613

### Name of the Type Narrowing Function (OPEN)

Why this came up: changes `TypeIs` in `src/typing_extensions.py`; touches `src/typing_extensions.py`.

**Decision:** The name `TypeIs` was chosen, but the discussion is still open for alternatives.

**Reason:** The name `TypeIs` was proposed and received the most support, but concerns about its clarity and potential confusion with other Python concepts remain.

**Already tried or rejected:**
- TypeNarrow[er]: Too awkward and jargon-y, and doesn’t clearly look “simpler” than `TypeGuard`. ([post 29](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/29))
- CheckType: Not as strongly supported as `TypeIs`. ([post 30](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/30))
- IsInstance: While popular, it was not the most liked name and concerns about its clarity remained. ([post 17](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/17))

> "I posted a PR to the PEP to clarify that type checkers may infer the more precise intersection type:"
> Jelle, [post 24](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/24)

Sources: https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613

### Adoption of PEP 742 (ACCEPTED)

Why this came up: changes `TypeIs` in `src/typing_extensions.py`.

**Decision:** PEP 742 was adopted and the name `TypeIs` was agreed upon.

**Reason:** The Typing Council voted in favor of PEP 742 in its current form, and the Steering Council accepted the PEP.

> "The Typing Council has voted in favor of PEP 742 in its current form. All TC members support the `TypeIs` name."
> guido, [post 34](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/34)

Sources: https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613
