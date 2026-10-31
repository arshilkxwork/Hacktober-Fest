# PEP 709 evaluation: Inlined comprehensions

- Discussion: https://discuss.python.org/t/pep-709-inlined-comprehensions/24240 (39 posts used; posts copied from the PEP and removed: none)
- Decisions extracted: 10; distinct rejected ideas extracted: 6
- Matching: the local model picks the same idea among the 10 most similar (TF-IDF); a pick counts only if its similarity is at least 0.2, the PEP item names it, or the PEP words the model quotes are in the item and share a specific word with it

**Recovered 0 of 1 rejected ideas from the PEP**; the reason agrees with the PEP for 0, the PEP states no reason for 0.

| PEP rejected idea | Recovered as | Similarity | Found | Reason agrees |
|---|---|---|---|---|
| More efficient comprehension calling, without inlining | - | 0.21 | no | - |

## Details

### More efficient comprehension calling, without inlining

PEP says: An alternate approach introduces a new opcode for "calling" a comprehension in streamlined fashion without the need to create a throwaway function object, but still creating a new Python frame. This avoids all of the visible effects listed under Backwards Compatibility, and provides roughly half of the performance benefit (1.5x improvement on the microbenchmark, 4% improvement on comprehensions benchmark in pyperformance.) It also requires adding a new pointer to the _PyInterpreterFrame struct and a new Py_INCREF on each frame construction, meaning (unlike this PEP) it has a (very small) perfo

Not recovered.

