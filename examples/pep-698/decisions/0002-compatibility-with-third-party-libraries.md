# Compatibility with third-party libraries

- Status: accepted
- Decision ID: D-7c4e87ab
- Sources: https://discuss.python.org/t/pep-698-a-typing-override-decorator/20839
- Participants: AlexWaygood
- Traceability: 1 of 1 quotes found verbatim in the source

## Decision

It was decided that a way to tell type checkers that a third-party library's `override` decorator should act like `@typing.override` is to use a `typing.TYPE_CHECKING` shim.

## Why

The approach was suggested by AlexWaygood and involves using a shim to make the third-party `override` decorator behave like `@typing.override` during type checking, while allowing for custom behavior at runtime.

### Evidence

> "One way of handling this kind of thing is to do a `typing.TYPE_CHECKING` shim, like so:"
>
> AlexWaygood, [post 8](https://discuss.python.org/t/pep-698-a-typing-override-decorator/20839/8) (verified)


## Code mentioned in the discussion

- `a.py`
