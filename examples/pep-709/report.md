# PEP 709 evaluation: Inlined comprehensions

- Discussion: https://discuss.python.org/t/pep-709-inlined-comprehensions/24240 (39 posts used; posts copied from the PEP and removed: none)
- Decisions extracted: 10; rejected ideas extracted: 7
- Matching: TF-IDF similarity + confirmation by the local model

**Recovered 0 of 1 rejected ideas from the PEP**; reason agrees with the PEP for 0 of 1.

| PEP rejected idea | Recovered as | Similarity | Found | Reason agrees |
|---|---|---|---|---|
| More efficient comprehension calling, without inlining | - | 0.22 | no | - |

## Details

### More efficient comprehension calling, without inlining

PEP says: An alternate approach introduces a new opcode for "calling" a comprehension in streamlined fashion without the need to create a throwaway function object, but still creating a new Python frame. This avoids all of the visible effects listed under Backwards Compatibility, and provides roughly half of the performance benefit (1.5x improvement on the microbenchmark, 4% improvement on comprehensions benchmark in pyperformance.) It also requires adding a new pointer to the _PyInterpreterFrame struct and a new Py_INCREF on each frame construction, meaning (unlike this PEP) it has a (very small) perfo

Not recovered.

