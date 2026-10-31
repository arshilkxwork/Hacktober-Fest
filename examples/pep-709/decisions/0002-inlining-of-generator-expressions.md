# Inlining of generator expressions

- Status: open
- Decision ID: D-17804155
- Sources: https://discuss.python.org/t/pep-709-inlined-comprehensions/24240
- Participants: oscarbenjamin, carljm, thomas, Rosuav, Glenn, timfelgentreff
- Traceability: 14 of 14 quotes found verbatim in the source

## Decision

The decision is still open on whether to inline generator expressions.

## Why

There is ongoing discussion about the feasibility and benefits of inlining generator expressions, given their potential for optimization and the associated costs.

### Evidence

> "I have a question about generator expressions which are not mentioned in the PEP. I guess it’s probably more difficult but there could perhaps be greater potential for optimisation if a locally used generator expression did not need to have an actual generator function with associated per-yield frame-switching cost."
>
> oscarbenjamin, [post 4](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/4) (verified)

> "The intent is not to change them at all in this PEP. In general they are more difficult to inline, because the generator may escape, and if so it needs to be a real resumable generator function. But you’re right that in many cases where we know the generator does not escape (e.g. something like `tuple(x for x in lst)`) we can avoid generator overhead. If PEP 709 is merged, the most straightforward approach would be to convert such comprehensions at compile time to (inlined) list comprehensions, and then e.g. introduce a fast path for list-to-tuple conversion."
>
> carljm, [post 5](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/5) (verified)

> "I pushed an update to the PEP which addresses this. I realized that although the reference implementation doesn’t inline any generator expressions, the PEP should be clear that this is planned as a likely follow-up."
>
> carljm, [post 6](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/6) (verified)

> "What about other name collisions between the loop variable and other variables accessible in the function? For example, calling builtin functions:   ``` def f(lst):     x = SomeClass([dir for dir in lst])     # Calling the builtin dir()     return dir(x) ```  or referencing global variables:   ``` result = 1 def f(lst):     results = [calculate(result) for result in lst]     if results[0] != result:         ... ```  The change from NameError to UnboundLocalError suggests the semantics would change in these cases, as well."
>
> thomas, [post 10](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/10) (verified)

> "Great observation, I was wondering if someone would ask this  The semantics don’t change for these cases, but only because the implementation in the compiler also does a push/pop of its internal scope data, such that e.g. the variable is still treated as a global (`LOAD_GLOBAL` is used) in the outer scope, and treated as a local only in the inner scope."
>
> carljm, [post 11](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/11) (verified)

> "A PEP is supposed to encapsulate discussion around the idea, so yes, since it came up in the discussion it should probably be mentioned in the PEP"
>
> thomas, [post 12](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/12) (verified)

> "I’ll add these details to the PEP."
>
> carljm, [post 13](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/13) (verified)

> "That’s a curious quirk. I think I like it, but it effectively does mean that Python has sub-function scope built into the library. Do other implementations than CPython have views on this?"
>
> Rosuav, [post 14](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/14) (verified)

> "Yes; really just into the bytecode compiler. “Sub-function scope” is a reasonably good name for what this PEP introduces."
>
> carljm, [post 15](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/15) (verified)

> "Does it matter? Isn’t this just internal to the CPython implementation?"
>
> Glenn, [post 16](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/16) (verified)

> "user-visible effects beyond just performance (on tracebacks and the output of `locals()`, as described in the PEP), albeit minor ones, it could be considered a change to the language, and other implementations may want to adapt to those effects."
>
> carljm, [post 17](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/17) (verified)

> "Since GraalPy tries to not lag behind CPython more than a year or so, we would be affected by this. Even if it might be considered a minor visible effect and/or an implementation detail, it is always surprising (to me) how much of those details end up being relied upon"
>
> timfelgentreff, [post 20](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/20) (verified)


## Rejected alternatives

### Inline generator expressions

Rejected because: More difficult to implement and may introduce edge cases, especially with global and cell variables.

> "In general they are more difficult to inline, because the generator may escape, and if so it needs to be a real resumable generator function."
>
> carljm, [post 5](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/5) (verified)

> "I pushed an update to the PEP which addresses this. I realized that although the reference implementation doesn’t inline any generator expressions, the PEP should be clear that this is planned as a likely follow-up."
>
> carljm, [post 6](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/6) (verified)


## Code mentioned in the discussion

- `tuple(x for x in lst)`
- `calculate(result) for result in lst`
