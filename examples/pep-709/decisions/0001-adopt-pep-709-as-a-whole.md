# Adopt PEP 709 as a whole

- Status: accepted
- Decision ID: D-726bfcfd
- Sources: https://discuss.python.org/t/pep-709-inlined-comprehensions/24240
- Participants: tjreedy, carljm, ruro, thomas
- Traceability: 4 of 5 quotes found verbatim in the source

## Decision

PEP 709 was adopted as a whole, with the intention to inline comprehensions occurring inside functions where fast-locals are used, and to handle generator expressions as a follow-up.

## Why

The proposal was well-received by the community, with no significant objections raised. The author, Carljm, addressed concerns and updated the PEP accordingly.

### Evidence

> "I was never a fan of the nested functions, so this looks good to me. I’ll leave it to others to consider the cost versus the benefit of the proposed change."
>
> tjreedy, [post 3](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/3) (verified)

> "Thanks for bringing up generator expressions; I will add some text to the PEP about them. The intent is not to change them at all in this PEP. In general they are more difficult to inline, because the generator may escape, and if so it needs to be a real resumable generator function."
>
> carljm, [post 5](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/5) (verified)

> "Doesn’t matter? Isn’t this just internal to the CPython implementation?"
>
> Glenn, [post 16](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/16) (NOT FOUND in source, check manually)

> "So if I understand it correctly, the behaviour of `locals`, tracebacks and `UnboundLocalError`/`NameError` will change depending on whether `bar` has any references to `x`?"
>
> ruro, [post 25](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/25) (verified)

> "The Steering Council has decided to accept this PEP for 3.12, provided the implementation can be finished and submitted by May 22 (and preferably sooner :)."
>
> thomas, [post 36](https://discuss.python.org/t/pep-709-inlined-comprehensions/24240/36) (verified)
