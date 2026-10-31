# Name of the qualifier

- Status: accepted
- Decision ID: D-e7f33331
- Sources: https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867
- Participants: Daverball, erictraut, alicederyn, randolf-scholz
- Traceability: 13 of 13 quotes found verbatim in the source

## Decision

The type modifier was named `ReadOnly`.

## Why

The name `ReadOnly` was chosen over `Readable` because it better conveys the promise that the key will never be written to, and there is precedent in the `Buffer` protocol placeholders in typeshed.

### Evidence

> "There is some precedent for the distinction between `Readable` and `ReadOnly` with the `Buffer` protocol placeholders in typeshed, where we have `ReadableBuffer` and `ReadOnlyBuffer`."
>
> Daverball, [post 12](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/12) (verified)

> "I understand why it is a more attractive name for the modifier, but it would also be a shame if we reject a future PEP that defines a `Readable` modifier that is distinct from `ReadOnly` based on the fact that this PEP was accepted with `ReadOnly` meaning `Readable`."
>
> Daverball, [post 12](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/12) (verified)

> "I think `ReadOnly` is the right term to use here and in the future. `Readable` doesn’t convey the right meaning."
>
> erictraut, [post 17](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/17) (verified)

> "ReadOnly is in typing-extensions and pyright (including the new online playground) if you want to try it."
>
> alicederyn, [post 26](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/26) (verified)


## Rejected alternatives

### Readable

Rejected because: To ensure future consistency, if/when we want to extend the type modifier to work with additional types.

> "Since according to the inheritance rules outlined in PEP 705 we are allowed to override a `ReadOnly` key with a writeable `key` it might be better to call the modifier `Readable` to ensure future consistency, if/when we want to extend the type modifier to work with additional types."
>
> Daverball, [post 12](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/12) (verified)

> "I do think the name `ReadOnly` better conveys the promise that this key will never be written to inside a function that uses it, so I understand why it is a more attractive name for the modifier, but it would also be a shame if we reject a future PEP that defines a `Readable` modifier that is distinct from `ReadOnly` based on the fact that this PEP was accepted with `ReadOnly` meaning `Readable`."
>
> Daverball, [post 12](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/12) (verified)

> "I’m happy to consider this. I’d like to do it on the basis of what is the best name for what you are calling “Readable”, though, not whether there’s a distinction based on TypedDict vs Protocol vs base class."
>
> alicederyn, [post 13](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/13) (verified)

> "These aliases are used consistently across typeshed so I think at least as far as naming goes, this is a well established precedent."
>
> Daverball, [post 14](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/14) (verified)

> "it would also be a shame if we reject a future PEP that defines a `Readable` modifier that is distinct from `ReadOnly` based on the fact that this PEP was accepted with `ReadOnly` meaning `Readable`."
>
> Daverball, [post 12](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/12) (verified)

> "I’m not sure there’s a name that is completely unambiguous both from a receiving and giving perspective."
>
> Daverball, [post 14](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/14) (verified)


### Immutable

Rejected because: It is ambiguous and could be interpreted in two different ways.

> "I would normally refer to what you’re calling “readonly” as “immutable”, which is a lot clearer of a distinction. I may be missing nuance though?"
>
> alicederyn, [post 15](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/15) (verified)

> "I had a second look at this, and it seems to me now that in my comment here, it may be more appropriate to translate `foo: ReadOnly[T]` to `__setattr__(self, name: Literal["foo"], val: Never) -> None` instead of `__setattr__(self, name: Literal["foo"], val: T) -> Never`."
>
> randolf-scholz, [post 19](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/19) (verified)

> "The problem with `Immutable` is that it’s ambiguous, does it mean we create an immutable reference to the value, so the value itself can never be modified (i.e. any attribute or method access that would modify the object’s internal state is forbidden), or does it mean it’s invalid to change where the reference points to? When I hear immutable in the context of Python I think of the former, not the latter."
>
> Daverball, [post 16](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/16) (verified)


## Code mentioned in the discussion

- `typing.ReadOnly`
- `ReadOnly[T]`
