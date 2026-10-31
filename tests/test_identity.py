from decisiontrail.identity import IdentityResolver


def test_same_handle_across_platforms():
    ids = IdentityResolver()
    assert ids.canonical("github", "Jelle-Zijlstra") == "Jelle-Zijlstra"
    assert ids.canonical("discourse:discuss.python.org", "jellezijlstra") == "Jelle-Zijlstra"


def test_same_full_name_across_platforms():
    ids = IdentityResolver()
    first = ids.canonical("discourse:x", "carljm", "Carl Meyer")
    assert ids.canonical("github", "carl-m-other", "Carl Meyer") == first


def test_single_word_names_are_not_merged():
    ids = IdentityResolver()
    ids.canonical("discourse:x", "alice1", "Alice")
    assert ids.canonical("github", "alice2", "Alice") == "alice2"


def test_alias_file_wins():
    ids = IdentityResolver({"github:gvanrossum": "Guido van Rossum", "guido": "Guido van Rossum"})
    assert ids.canonical("github", "gvanrossum") == "Guido van Rossum"
    assert ids.canonical("discourse:x", "guido") == "Guido van Rossum"
