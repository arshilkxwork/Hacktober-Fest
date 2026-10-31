# Adoption of PEP 705

- Status: accepted
- Decision ID: D-814f1a4a
- Sources: https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867
- Participants: alicederyn
- Traceability: 3 of 3 quotes found verbatim in the source

## Decision

PEP 705 was adopted with the changes suggested by the community, including clarifications and improvements to the rationale and documentation.

## Why

The proposal was well-received, with feedback leading to improvements in the PEP. The author addressed the feedback and merged a PR to address the issues raised.

### Evidence

> "PR to address it has now merged."
>
> alicederyn, [post 4](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/4) (verified)

> "`typing.ReadOnly` is now available in typing-extensions 4.9.0-rc1 (thanks @Jelle!)"
>
> alicederyn, [post 5](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/5) (verified)


## Rejected alternatives

### Using `Final[]` instead of `ReadOnly[]`

Rejected because: Final is documented as preventing redefinition in subclasses, which does not fit with the intended use of ReadOnly.

> "The problem is that the Final annotation PEP, PEP-591, only discusses traditional classes, not structural subtypes. The Protocol and TypedDict types are not mentioned at all, though they were introduced in the same version of Python."
>
> alicederyn, [post 7](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/7) (verified)


## Code mentioned in the discussion

- `typing.ReadOnly`
