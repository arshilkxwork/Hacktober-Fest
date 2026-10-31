# Behavior of `ReadOnly`

- Status: accepted
- Decision ID: D-7883be42
- Sources: https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867
- Participants: alicederyn
- Traceability: 3 of 3 quotes found verbatim in the source

## Decision

ReadOnly keys in TypedDicts are read-only in the sense that they cannot be modified through the structural subtype, but not immutable in the sense that the underlying dictionary can still be modified.

## Why

The rationale is that ReadOnly should prevent redefinition in structural subtypes, but not prevent the underlying dictionary from being modified. This is to ensure that the type checker can enforce the read-only constraint without making the runtime implementation overly restrictive.

### Evidence

> "This does not mean the items are immutable: a reference to the underlying dictionary could still exist with a different but compatible type in which those items have mutator operations."
>
> alicederyn, [post 9](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/9) (verified)

> "This could be used, for instance, to update the item in a concurrent thread."
>
> alicederyn, [post 9](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/9) (verified)


## Rejected alternatives

### Final

Rejected because: Final is documented as preventing redefinition in subclasses, which does not fit with the intended use of ReadOnly.

> "“[Final] is documented as preventing redefinition in subclasses […] This does not fit with the intended use of `ReadOnly`”."
>
> alicederyn, [post 7](https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867/7) (verified)


## Code mentioned in the discussion

- `typing.ReadOnly`
