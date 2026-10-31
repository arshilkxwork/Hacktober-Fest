# Include a `read_only=True` class argument

- Status: rejected
- Decision ID: D-f213eabc
- Sources: https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867
- Participants: Jelle, alicederyn
- Traceability: 3 of 3 quotes found verbatim in the source

## Decision

The proposal to include a `read_only=True` class argument was rejected.

## Why

The proposal was considered but ultimately rejected due to the lack of symmetry with the feature set available for stating whether keys are required and the desire for a more permissive runtime implementation.

### Evidence

> "I was sad to see that the `readonly=True` class argument is no longer in the PEP. I would personally want to default to declaring TypedDicts as read-only when possible, so I’d like to make that as easy as possible. The current iteration of the PEP would require repeating `ReadOnly[]` on every item, which is verbose."
>
> Jelle, [post 10](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/10) (verified)

> "The other way up I think? But I am happy for this to be left to type-checkers either way."
>
> alicederyn, [post 11](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/11) (verified)


## Rejected alternatives

### Include a `read_only=True` class argument

Rejected because: Lack of symmetry with the feature set for marking keys as required and the desire for a more permissive runtime implementation.

> "I was sad to see that the `readonly=True` class argument is no longer in the PEP. I would personally want to default to declaring TypedDicts as read-only when possible, so I’d like to make that as easy as possible. The current iteration of the PEP would require repeating `ReadOnly[]` on every item, which is verbose."
>
> Jelle, [post 10](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/10) (verified)
