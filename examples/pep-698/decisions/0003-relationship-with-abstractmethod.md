# Relationship with @abstractmethod

- Status: accepted
- Decision ID: D-e5729a25
- Sources: https://discuss.python.org/t/pep-698-a-typing-override-decorator/20839
- Participants: a-reich
- Traceability: 1 of 1 quotes found verbatim in the source

## Decision

The PEP recommends type checkers support a strict mode where all method overrides must be marked with the decorator, whether abstract or not.

## Why

The PEP recommends this to ensure consistency and clarity in method overriding, regardless of whether the method is abstract or not.

### Evidence

> "I’m not sure there is much need for special treatment of abstract methods. The PEP recommends type checkers support a strict mode where all method overrides must be marked with the decorator, whether abstract or not."
>
> a-reich, [post 10](https://discuss.python.org/t/pep-698-a-typing-override-decorator/20839/10) (verified)
