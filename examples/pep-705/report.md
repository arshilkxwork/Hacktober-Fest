# PEP 705 evaluation: TypedDict: Read-only items

- Discussion: https://discuss.python.org/t/pep-705-read-only-typeddict-items/37867 (40 posts used; posts copied from the PEP and removed: none)
- Decisions extracted: 7; distinct rejected ideas extracted: 8
- Matching: the local model picks the same idea among the 10 most similar (TF-IDF); a pick counts only if its similarity is at least 0.2 or the PEP words the model quotes are in the PEP item and share a word with the extracted idea

**Recovered 1 of 7 rejected ideas from the PEP**; the reason agrees with the PEP for 1, the PEP states no reason for 0.

| PEP rejected idea | Recovered as | Similarity | Found | Reason agrees |
|---|---|---|---|---|
| A TypedMapping protocol type | - | 0.13 | no | - |
| A higher-order ReadOnly type | - | 0.08 | no | - |
| Calling the type Readonly | - | 0.07 | no | - |
| Reusing the Final annotation | Final | 0.45 | yes | yes |
| A readonly flag | - | 0.11 | no | - |
| Supporting type-checked removal of read-only qualifier via copy and other methods | - | 0.11 | no | - |
| Preventing unspecified keys in TypedDicts | - | 0.08 | no | - |

## Details

### A TypedMapping protocol type

PEP says: An earlier version of this PEP proposed a TypedMapping protocol type, behaving much like a read-only TypedDict but without the constraint that the runtime type be a dict. The behavior described in the current version of this PEP could then be obtained by inheriting a TypedDict from a TypedMapping. This has been set aside for now as more complex, without a strong use-case motivating the additional complexity.

Not recovered.

### A higher-order ReadOnly type

PEP says: A generalized higher-order type could be added that removes mutator methods from its parameter, e.g. ReadOnly[MovieRecord]. For a TypedDict, this would be like adding ReadOnly to every item, including those declared in superclasses. This would naturally want to be defined for a wider set of types than just TypedDict subclasses, and also raises questions about whether and how it applies to nested types. We decided to keep the scope of this PEP narrower.

Not recovered.

### Calling the type Readonly

PEP says: Read-only is generally hyphenated, and it appears to be common convention to put initial caps onto words separated by a dash when converting to CamelCase. This appears consistent with the definition of CamelCase on Wikipedia: CamelCase uppercases the first letter of each word. That said, Python examples or counter-examples, ideally from the core Python libraries, or better explicit guidance on the convention, would be greatly appreciated.

Not recovered.

### Reusing the Final annotation

PEP says: The typing.Final annotation prevents an attribute from being modified, like the proposed ReadOnly qualifier does for TypedDict items. However, it is also documented as preventing redefinition in subclasses too; from PEP 591: The typing.Final type qualifier is used to indicate that a variable or attribute should not be reassigned, redefined, or overridden. This does not fit with the intended use of ReadOnly. Rather than introduce confusion by having Final behave differently in different contexts, we chose to introduce a new qualifier.

Recovered: **Final**. Final is documented as preventing redefinition in subclasses, which does not fit with the intended use of ReadOnly. (decision D-7883be42)
PEP words it matches: "Final is documented as preventing redefinition in subclasses"

### A readonly flag

PEP says: Earlier versions of this PEP introduced a boolean flag that would ensure all items in a TypedDict were read-only:: class Movie(TypedDict, readonly=True): name: str year: NotRequired[int | None] movie: Movie = { "name": "A Clockwork Orange" } movie["year"] = 1971 # Type check error: "year" is read-only However, this led to confusion when inheritance was introduced:: class A(TypedDict): key1: int class B(A, TypedDict, readonly=True): key2: int b: B = { "key1": 1, "key2": 2 } b["key1"] = 4 # Accepted by type checker: "key1" is not read-only It would be reasonable for someone familiar with frozen 

Not recovered.

### Supporting type-checked removal of read-only qualifier via copy and other methods

PEP says: An earlier version of this PEP mandated that code like the following be supported by type-checkers:: class A(TypedDict): x: ReadOnly[int] class B(TypedDict): x: ReadOnly[str] class C(TypedDict): x: int | str def copy_and_modify(a: A) -> C: c: C = copy.copy(a) if not c['x']: c['x'] = "N/A" return c def merge_and_modify(a: A, b: B) -> C: c: C = a | b if not c['x']: c['x'] = "N/A" return c However, there is currently no way to express this in the typeshed, meaning type-checkers would be forced to special-case these functions. There is already a way to code these operations that mypy and pyright d

Not recovered.

### Preventing unspecified keys in TypedDicts

PEP says: Consider the following "type discrimination" code:: class A(TypedDict): foo: int class B(TypedDict): bar: int def get_field(d: A | B) -> int: if "foo" in d: return d["foo"] # !!! else: return d["bar"] This is a common idiom, and other languages like Typescript allow it. Technically, however, this code is unsound: B does not declare foo, but instances of B may still have the key present, and the associated value may be of any type:: class C(TypedDict): foo: str bar: int c: C = { "foo": "hi", "bar" 3 } b: B = c # OK: C is structurally compatible with B v = get_field(b) # Returns a string at runt

Not recovered.

