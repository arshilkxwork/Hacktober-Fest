# Adopt the proposal as a whole

- Status: accepted
- Decision ID: D-385be424
- Sources: https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867
- Participants: erictraut, beauxq, Jelle, Daverball, alicederyn
- Traceability: 9 of 9 quotes found verbatim in the source

## Decision

The proposal for `ReadOnly` type modifier is limited to `TypedDict` and not extended to other contexts like `Protocol` or `ABC`.

## Why

The discussion concluded that `ReadOnly` is the appropriate term to use for the type modifier, as it better conveys the intended meaning and avoids ambiguity. The community agreed that the proposal should be adopted as is, with the understanding that it may be extended in future PEPs.

### Evidence

> "I think `ReadOnly` is the right term to use here and in the future. `Readable` doesn’t convey the right meaning. Let’s stick with `ReadOnly`."
>
> erictraut, [post 17](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/17) (verified)

> "I would appreciate it if you would consider not limiting it to `TypedDict`."
>
> beauxq, [post 28](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/28) (verified)

> "I think we’re ready."
>
> Jelle, [post 32](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/32) (verified)

> "The PEP already says so; see the last sentence in PEP 705 – TypedDict: Read-only items | peps.python.org."
>
> Jelle, [post 29](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/29) (verified)


## Rejected alternatives

### Readable

Rejected because: It is considered less clear and more ambiguous.

> "I do think the name `ReadOnly` better conveys the promise that this key will never be written to inside a function that uses it, so I understand why it is a more attractive name for the modifier, but it would also be a shame if we reject a future PEP that defines a `Readable` modifier that is distinct from `ReadOnly` based on the fact that this PEP was accepted with `ReadOnly` meaning `Readable`."
>
> Daverball, [post 12](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/12) (verified)

> "I would normally refer to what you’re calling “readonly” as “immutable”, which is a lot clearer of a distinction. I may be missing nuance though?"
>
> alicederyn, [post 15](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/15) (verified)

> "The problem with `Immutable` is that it’s ambiguous, does it mean we create an immutable reference to the value, so the value itself can never be modified (i.e. any attribute or method access that would modify the object’s internal state is forbidden), or does it mean it’s invalid to change where the reference points to? When I hear immutable in the context of Python I think of the former, not the latter."
>
> Daverball, [post 16](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/16) (verified)


### Extending `ReadOnly` to `Protocol` and `ABC`

Rejected because: Too complex and broad for the initial PEP, better to keep it simple and manageable.

> "This is something that I would like outside of `TypedDict`. It would solve this problem that I’ve run into a few times."
>
> beauxq, [post 28](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/28) (verified)

> "I would understand if you want to limit the scope to keep things simple, but if so, it might be worth mentioning that `ReadOnly` could be extended in a future PEP to solve similar problems outside of `TypedDict`."
>
> Jelle, [post 29](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/29) (verified)


## Code mentioned in the discussion

- `ReadOnly[T]`
- `TypedDict`
- `Protocol`
- `ABC`
