# Behavior changes for name collisions

- Status: accepted
- Decision ID: D-5bf630fc
- Sources: https://discuss.python.org/t/pep-709-inlined-comprehensions/24240
- Participants: carljm
- Traceability: 3 of 3 quotes found verbatim in the source

## Decision

The behavior for name collisions does not change, as the implementation already handles scope correctly.

## Why

The implementation in the compiler already pushes and pops scope information for the variable when entering/leaving the comprehension, ensuring that semantics are maintained.

### Evidence

> "The semantics don’t change for these cases, but only because the implementation in the compiler also does a push/pop of its internal scope data, such that e.g. the variable is still treated as a global (`LOAD_GLOBAL` is used) in the outer scope, and treated as a local only in the inner scope."
>
> carljm, [post 11](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/11) (verified)

> "The support for globals that I mentioned above already kicks in the same for this case (because it’s exactly the same case as far as the compiler is concerned; the only difference is whether that name exists in module globals at runtime.)"
>
> carljm, [post 13](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/13) (verified)


## Rejected alternatives

### Changing the behavior to reflect the scope changes

Rejected because: Would introduce unnecessary complexity and change the behavior of existing code.

> "I debated whether to include these details (and similar ones regarding edge cases with cells) in the PEP. On the one hand, including all these details could reassure an observant reader of the PEP, such as yourself, that the necessary cases have been considered (and tested in the implementation) and semantics won’t change. On the other hand, I thought the purpose of the PEP was to evaluate the behavior changes it does cause, which means that implementation details involved in avoiding behavior changes in other edge cases might be an unnecessary distraction."
>
> carljm, [post 11](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/11) (verified)


## Code mentioned in the discussion

- `PEP 709: Inlined comprehensions`
