# Compatibility with existing type checkers

- Status: accepted
- Decision ID: D-4ffb9cfc
- Sources: https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867
- Participants: alicederyn, Daverball, erictraut
- Traceability: 10 of 10 quotes found verbatim in the source

## Decision

The proposal to support `ReadOnly` in TypedDicts is accepted, and the rationale clarifies the distinction between `Final` and `ReadOnly`.

## Why

The rationale explains that `ReadOnly` should not imply total immutability and that it is intended to restrict the view of the dict, not the underlying data. The discussion also clarifies that `ReadOnly` should not be used in a structural type at all, as it conflicts with the behavior of `Final`.

### Evidence

> "This is not compatible with how we want ReadOnly to behave; the equivalent example should be legal in any type-checker:"
>
> alicederyn, [post 7](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/7) (verified)

> "I hope this has made things clearer and not muddier!"
>
> alicederyn, [post 7](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/7) (verified)

> "Since according to the inheritance rules outlined in PEP 705 we are allowed to override a `ReadOnly` key with a writeable `key` it might be better to call the modifier `Readable` to ensure future consistency, if/when we want to extend the type modifier to work with additional types."
>
> Daverball, [post 12](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/12) (verified)

> "I think `ReadOnly` is the right term to use here and in the future. `Readable` doesn’t convey the right meaning. Let’s stick with `ReadOnly`."
>
> erictraut, [post 17](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/17) (verified)

> "ReadOnly is in typing-extensions and pyright (including the new online playground) if you want to try it."
>
> alicederyn, [post 26](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/26) (verified)


## Rejected alternatives

### Using `Final` for `ReadOnly`

Rejected because: Final is documented as preventing redefinition in subclasses, which does not fit with the intended use of ReadOnly.

> "The problem is that the Final annotation PEP, PEP-591, only discusses traditional classes, not structural subtypes."
>
> alicederyn, [post 7](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/7) (verified)

> "This is not compatible with how we want ReadOnly to behave; the equivalent example should be legal in any type-checker:"
>
> alicederyn, [post 7](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/7) (verified)


### Readable

Rejected because: It does not convey the right meaning and could be confused with `Readable` in the context of `Buffer` protocols.

> "While for a `TypedDict` the distinction between a `Readable` and `ReadOnly` key barely matters, the distinction becomes more important when applied to a `Protocol` and nominal types."
>
> Daverball, [post 12](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/12) (verified)

> "I’m happy to consider this. I’d like to do it on the basis of what is the best name for what you are calling “Readable”, though, not whether there’s a distinction based on TypedDict vs Protocol vs base class."
>
> alicederyn, [post 13](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/13) (verified)

> "These aliases are used consistently across typeshed so I think at least as far as naming goes, this is a well established precedent."
>
> Daverball, [post 14](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/14) (verified)


## Code mentioned in the discussion

- `typing.ReadOnly`
- `ReadOnly`
- `TypedDict`
- `Protocol`
- `nominal types`
