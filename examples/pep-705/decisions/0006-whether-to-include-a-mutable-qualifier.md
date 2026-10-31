# Whether to include a `Mutable[]` qualifier

- Status: open
- Decision ID: D-d3424c4a
- Sources: https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867
- Participants: Jelle
- Traceability: 2 of 2 quotes found verbatim in the source

## Decision

The discussion is ongoing about whether to include a `Mutable[]` qualifier for marking individual keys as mutable in a read-only `TypedDict`.

## Why

The discussion centers around the need for symmetry in the feature set available for stating whether keys are required and the potential for a `Mutable[]` qualifier to provide more flexibility.

### Evidence

> "For more flexibility, we could add a `read_only=True` class argument and a `Mutable[]` qualifier to mark individual keys as mutable in a TypedDict that defaults to read-only."
>
> Jelle, [post 10](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/10) (verified)


## Rejected alternatives

### No `Mutable[]` qualifier

Rejected because: The current iteration of the PEP would require repeating `ReadOnly[]` on every item, which is verbose.

> "I was sad to see that the `readonly=True` class argument is no longer in the PEP. I would personally want to default to declaring TypedDicts as read-only when possible, so I’d like to make that as easy as possible. The current iteration of the PEP would require repeating `ReadOnly[]` on every item, which is verbose."
>
> Jelle, [post 10](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/10) (verified)
