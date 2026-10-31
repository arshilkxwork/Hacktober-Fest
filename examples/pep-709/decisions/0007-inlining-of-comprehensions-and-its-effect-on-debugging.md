# Inlining of comprehensions and its effect on debugging

- Status: accepted
- Decision ID: D-fab555b9
- Sources: https://discuss.python.org/t/pep-709-inlined-comprehensions/24240
- Participants: carljm
- Traceability: 3 of 3 quotes found verbatim in the source

## Decision

Inlining of comprehensions will not affect the debugger's ability to track the value of outer variables during comprehension execution.

## Why

Inlining comprehensions will not change the behavior of the debugger in terms of tracking the value of outer variables. The outer value of `x` will be stored on the stack while the comprehension is executing, and the debugger will not be able to query this value during comprehension execution.

### Evidence

> "Yes, that should be the behavior."
>
> carljm, [post 31](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/31) (verified)

> "No, I don’t think this is feasible. In your example, the outer value of `x` will be stored only on the (interpreter’s value) stack while the comprehension is executing, and it’s likely not reasonable to expect pdb to figure out where on the stack it is and go look for it (not to mention that inspecting arbitrary stack locations isn’t part of the frame API exposed to Python, and also that it’s not clear what pdb command would even make sense for this operation.)"
>
> carljm, [post 31](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/31) (verified)


## Rejected alternatives

### Allowing the debugger to query the value of outer variables during comprehension execution

Rejected because: Not feasible due to the way the interpreter manages stack frames and the limitations of the debugger API.

> "No, I don’t think this is feasible. In your example, the outer value of `x` will be stored only on the (interpreter’s value) stack while the comprehension is executing, and it’s likely not reasonable to expect pdb to figure out where on the stack it is and go look for it (not to mention that inspecting arbitrary stack locations isn’t part of the frame API exposed to Python, and also that it’s not clear what pdb command would even make sense for this operation.)"
>
> carljm, [post 31](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/31) (verified)


## Code mentioned in the discussion

- `script.py`
