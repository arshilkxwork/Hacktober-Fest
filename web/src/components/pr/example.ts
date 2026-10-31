import changeDiff from "../../../../examples/pr-check/change.diff?raw";

/**
 * The repository's own PR check example: a change to python/typing_extensions that adds
 * `TypeNarrower = TypeIs`, a name PEP 742's discussion rejected.
 */
export const EXAMPLE_DIFF: string = changeDiff;
export const EXAMPLE_PATH = "examples/pr-check/change.diff";
