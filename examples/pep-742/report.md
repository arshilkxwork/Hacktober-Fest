# PEP 742 evaluation: Narrowing types with TypeIs

- Discussion: https://discuss.python.org/t/pep-742-narrowing-types-with-typeis/45613 (33 posts used; posts copied from the PEP and removed: none)
- Decisions extracted: 7; distinct rejected ideas extracted: 9
- Matching: the local model picks the same idea among the 10 most similar (TF-IDF); a pick counts only if its similarity is at least 0.2 or the PEP words the model quotes are in the PEP item and share a word with the extracted idea

**Recovered 1 of 3 rejected ideas from the PEP**; the reason agrees with the PEP for 0, the PEP states no reason for 1.

| PEP rejected idea | Recovered as | Similarity | Found | Reason agrees |
|---|---|---|---|---|
| Change the behavior of TypeGuard | - | 0.12 | no | - |
| Do nothing | - | 0.12 | no | - |
| Alternative names | Narrowed | 0.14 | yes | not stated |

## Details

### Change the behavior of TypeGuard

PEP says: PEP 724 previously proposed changing the specified behavior of typing.TypeGuard so that if the return type of the guard is consistent with the input type, the behavior proposed here for TypeIs would apply. This proposal has some important advantages: because it does not require any runtime changes, it requires changes only in type checkers, making it easier for users to take advantage of the new, usually more intuitive behavior. However, this approach has some major problems. Users who have written TypeGuard functions expecting the existing semantics specified in PEP 647 would see subtle and p

Not recovered.

### Do nothing

PEP says: Both this PEP and the alternative proposed in PEP 724 have shortcomings. The latter are discussed above. As for this PEP, it introduces two special forms with very similar semantics, and it potentially creates a long migration path for users currently using TypeGuard who would be better off with different narrowing semantics. One way forward, then, is to do nothing and live with the current limitations of the type system. However, we believe that the limitations of the current TypeGuard, as outlined in the "Motivation" section, are significant enough that it is worthwhile to change the type sy

Not recovered.

### Alternative names

PEP says: This PEP currently proposes the name TypeIs, emphasizing that the special form TypeIs[T] returns whether the argument is of type T, and mirroring TypeScript's syntax. Other names were considered, including in an earlier version of this PEP. Options include: * IsInstance (post by Paul Moore): emphasizes that the new construct behaves similarly to the builtin isinstance. * Narrowed or NarrowedTo: shorter than TypeNarrower but keeps the connection to "type narrowing" (suggested by Eric Traut). * Predicate or TypePredicate: mirrors TypeScript's name for the feature, "type predicates". * StrictType

Recovered: **Narrowed**. While it links to the term 'type narrowing', it was considered less concise than `TypeIs`. (decision D-cd56d653)
PEP words it matches: "Other names were considered, including in an earlier version of this PEP."

