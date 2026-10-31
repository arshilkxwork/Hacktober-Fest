# PEP 688 evaluation: Making the buffer protocol accessible in Python

- Discussion: https://discuss.python.org/t/pep-688-take-2-making-the-buffer-protocol-accessible-in-python/19756 (19 posts used; posts copied from the PEP and removed: none)
- Decisions extracted: 5; distinct rejected ideas extracted: 7
- Matching: the local model picks the same idea among the 10 most similar (TF-IDF); a pick counts only if its similarity is at least 0.2 or the PEP words the model quotes are in the PEP item and share a word with the extracted idea

**Recovered 1 of 3 rejected ideas from the PEP**; the reason agrees with the PEP for 1, the PEP states no reason for 0.

| PEP rejected idea | Recovered as | Similarity | Found | Reason agrees |
|---|---|---|---|---|
| types.Buffer | - | 0.11 | no | - |
| Keep bytearray compatible with bytes | - | 0.26 | no | - |
| Distinguish between mutable and immutable buffers | Distinguishing mutable vs. immutable buffers | 0.38 | yes | yes |

## Details

### types.Buffer

PEP says: An earlier version of this PEP proposed adding a new types.Buffer type with an __instancecheck__ implemented in C so that isinstance() checks can be used to check whether a type implements the buffer protocol. This avoids the complexity of exposing the full buffer protocol to Python code, while still allowing the type system to check for the buffer protocol. However, that approach does not compose well with the rest of the type system, because types.Buffer would be a nominal type, not a structural one. For example, there would be no way to represent "an object that supports both the buffer pro

Not recovered.

### Keep bytearray compatible with bytes

PEP says: It has been suggested to remove the special case where memoryview is always compatible with bytes, but keep it for bytearray, because the two types have very similar interfaces. However, several standard library functions (e.g., re.compile, socket.getaddrinfo, and most functions accepting path-like arguments) accept bytes but not bytearray. In most codebases, bytearray is also not a very common type. We prefer to have users spell out accepted types explicitly (or use Protocol from PEP 544 if only a specific set of methods is required). This aspect of the proposal was specifically discussed on 

Not recovered.

### Distinguish between mutable and immutable buffers

PEP says: The most frequently used distinction within buffer types is whether or not the buffer is mutable. Some functions accept only mutable buffers (e.g., bytearray, some memoryview objects), others accept all buffers. An earlier version of this PEP proposed using the presence of the bf_releasebuffer slot to determine whether a buffer type is mutable. This rule holds for most standard library buffer types, but the relationship between mutability and the presence of this slot is not absolute. For example, numpy arrays are mutable but do not have this slot. The current buffer protocol does not provide 

Recovered: **Distinguishing mutable vs. immutable buffers**. Too complex and not necessary for the PEP's primary goal of improving typing support. (decision D-73342795)
PEP words it matches: "Distinguish between mutable and immutable buffers"

