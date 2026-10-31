# PEP 698 evaluation: Override Decorator for Static Typing

- Discussion: https://discuss.python.org/t/pep-698-a-typing-override-decorator/20839 (11 posts used; posts copied from the PEP and removed: none)
- Decisions extracted: 3; distinct rejected ideas extracted: 0
- Matching: the local model picks the same idea among the 10 most similar (TF-IDF); a pick counts only if its similarity is at least 0.2 or the PEP words the model quotes are in the PEP item and share a word with the extracted idea

**Recovered 0 of 4 rejected ideas from the PEP**; the reason agrees with the PEP for 0, the PEP states no reason for 0.

| PEP rejected idea | Recovered as | Similarity | Found | Reason agrees |
|---|---|---|---|---|
| Rely on Integrated Development Environments for safety | - | 0.00 | no | - |
| Runtime enforcement | - | 0.00 | no | - |
| Mark a base class to force explicit overrides on subclasses | - | 0.00 | no | - |
| Include the name of the ancestor class being overridden | - | 0.00 | no | - |

## Details

### Rely on Integrated Development Environments for safety

PEP says: Modern Integrated Development Environments (IDEs) often provide the ability to automatically update subclasses when renaming a method. But we view this as insufficient for several reasons: - If a codebase is split into multiple projects, an IDE will not help and the bug appears when upgrading dependencies. Type checkers are a fast way to catch breaking changes in dependencies. - Not all developers use such IDEs. And library maintainers, even if they do use an IDE, should not need to assume pull request authors use the same IDE. We prefer being able to detect problems in continuous integration 

Not recovered.

### Runtime enforcement

PEP says: We considered having @typing.override enforce override safety at runtime, similarly to how @overrides.overrides does today. We rejected this for four reasons: - For users of static type checking, it is not clear this brings any benefits. - There would be at least some performance overhead, leading to projects importing slower with runtime enforcement. We estimate the @overrides.overrides implementation takes around 100 microseconds, which is fast but could still add up to a second or more of extra initialization time in million-plus line codebases, which is exactly where we think @typing.overr

Not recovered.

### Mark a base class to force explicit overrides on subclasses

PEP says: We considered including a class decorator @require_explicit_overrides, which would have provided a way for base classes to declare that all subclasses must use the @override decorator on method overrides. The Overrides library has a mixin class, EnforceExplicitOverrides, which provides similar behavior in runtime checks. We decided against this because we expect owners of large codebases will benefit most from @override, and for these use cases having a strict mode where explicit @override is required (see the Backward Compatibility section) provides more benefits than a way to mark base class

Not recovered.

### Include the name of the ancestor class being overridden

PEP says: We considered allowing the caller of @override to specify a specific ancestor class where the overridden method should be defined: class Parent0: def foo(self) -> int: return 1 class Parent1: def bar(self) -> int: return 1 class Child(Parent0, Parent1): @override(Parent0) # okay, Parent0 defines foo def foo(self) -> int: return 2 @override(Parent0) # type error, Parent0 does not define bar def bar(self) -> int: return 2 This could be useful for code readability because it makes the override structure more explicit for deep inheritance trees. It also might catch bugs by prompting developers to 

Not recovered.

