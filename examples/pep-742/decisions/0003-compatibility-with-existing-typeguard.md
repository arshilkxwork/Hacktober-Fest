# Compatibility with existing TypeGuard

- Status: accepted
- Decision ID: D-c88ad407
- Sources: https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613
- Participants: Jelle, h-vetinari, guido, gandhis1, davidfstr, carljm
- Traceability: 13 of 13 quotes found verbatim in the source

## Decision

The new TypeNarrower construct is designed to be compatible with existing TypeGuard, with both constructs having the same specification for all aspects not related to type narrowing behavior.

## Why

The PEP aims to avoid backwards compatibility issues by creating a new special form and leaving TypeGuard unchanged. The design choice is to make TypeNarrower and TypeGuard behave as similarly as possible, with the PEP recommending that TypeGuard be reserved for rare cases where its behavior is specifically desired.

### Evidence

> "I believe it is better for TypeGuard and TypeNarrower to behave as similarly as possible."
>
> Jelle, [post 1](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/1) (verified)

> "I’m going to stick with TypeIs unless a consensus for some other name emerges in this thread. Clearly lots of people have various preferences, but I’m not yet seeing any alternative that is as widely liked."
>
> Jelle, [post 16](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/16) (verified)

> "I think it’s highly desirable to name this after existing runtime functionality to that effect;"
>
> h-vetinari, [post 21](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/21) (verified)

> "However, the Typing Council can recommend an alternative name instead."
>
> Jelle, [post 25](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/25) (verified)

> "There was considerable bikeshedding on the name of the new special form, but we ultimately landed and agreed on `TypeIs`."
>
> guido, [post 34](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/34) (verified)

> "Given that the current PEP was a deliberate, explicit departure from the original PEP which sought to modify the behavior of `TypeGuard` (which remains my personal preference, despite the community moving in another direction) the concern stands that the name does not clearly convey what the difference is versus `TypeGuard`."
>
> gandhis1, [post 32](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/32) (verified)

> "Details of the breaking edge cases are in PEP 724’s Backwards Compatibility section."
>
> guido, [post 34](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/34) (verified)


## Rejected alternatives

### TypeCheck

Rejected because: Too easy to confuse with 'type checking' in general.

> "As long as we’re still voting, I’m still in favor of TypeCheck, but I don’t care too much about the color of this bikeshed, and further discussion about what the meaning of “is” is doesn’t feel productive."
>
> guido, [post 7](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/7) (verified)

> "I’d hesitate to use `TypeCheck` as the name. I agree with Jelle’s comment that it’s too easy to confuse with “type checking” in general."
>
> davidfstr, [post 18](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/18) (verified)


### TypeNarrower

Rejected because: Too awkward and jargon-y, and doesn’t clearly look ‘simpler’ than `TypeGuard`.

> "I’m going to stick with TypeIs unless a consensus for some other name emerges in this thread. Clearly lots of people have various preferences, but I’m not yet seeing any alternative that is as widely liked."
>
> Jelle, [post 16](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/16) (verified)

> "I don’t find the objections raised against `TypeIs` strongly persuasive. In my experience, it is very common when discussing Python types to say something like “the type of `x` is `int`,” where the obvious meaning is the same as `x: int`, that is “x is an instance of `int` or a subtype.” I’ve never seen this wording lead someone to believe that the type of `x` must be exactly int; a concept that isn’t even representable in Python type annotations."
>
> carljm, [post 29](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/29) (verified)


### IsInstance

Rejected because: Not the preferred name, and Jelle decided to use TypeIs.

> "I’m going to stick with TypeIs unless a consensus for some other name emerges in this thread. Clearly lots of people have various preferences, but I’m not yet seeing any alternative that is as widely liked."
>
> Jelle, [post 16](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/16) (verified)


### Introducing backward incompatibilities

Rejected because: The Typing Council and the Steering Council agreed that the new `TypeIs` special form should not introduce backward incompatibilities with existing code that uses `TypeGuard`.

> "All TC members support the `TypeIs` name."
>
> guido, [post 34](https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613/34) (verified)


## Code mentioned in the discussion

- `TypeIs`
- `TypeGuard`
- `isinstance(x, str)`
- `TypeIs[str]`
