"""Command line interface: fetch, extract, export, check-pr, eval-pep, serve."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import List, Optional

from . import pep_eval, prcheck, sources, store
from .extract import extract_thread
from .identity import IdentityResolver
from .linking import link_decision, tracked_files
from .llm import DEFAULT_HOST, DEFAULT_MODEL, LLMError, OllamaBackend, ReplayBackend


def _log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def _backend(args: argparse.Namespace):
    if args.replay:
        return ReplayBackend(args.replay, model=args.model)
    return OllamaBackend(model=args.model, host=args.host, num_ctx=args.num_ctx, record=args.record)


def _model_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("--model", default=os.environ.get("DECISIONTRAIL_MODEL", DEFAULT_MODEL), help="Ollama model tag")
    p.add_argument("--host", default=os.environ.get("OLLAMA_HOST", DEFAULT_HOST), help="Ollama server URL")
    p.add_argument("--num-ctx", type=int, default=8192, help="context window passed to Ollama")
    g = p.add_mutually_exclusive_group()
    g.add_argument("--record", help="save every model response to this JSON file")
    g.add_argument("--replay", help="answer from a recording instead of calling the model")


def cmd_fetch(args: argparse.Namespace) -> int:
    thread = sources.load_thread(args.source)
    sources.save_thread(thread, args.output)
    _log(f"Saved {len(thread.posts)} posts from {thread.url} to {args.output}")
    return 0


def cmd_extract(args: argparse.Namespace) -> int:
    backend = _backend(args)
    identities = IdentityResolver.from_file(args.aliases)
    files = tracked_files(args.repo) if args.repo else None
    found = []
    for spec in args.sources:
        thread = sources.load_thread(spec)
        _log(f"Loaded {len(thread.posts)} posts: {thread.title}")
        decisions = extract_thread(thread, backend, identities, progress=_log)
        if args.repo:
            for d in decisions:
                d.links = link_decision(d, thread, args.repo, files)
        found.extend(decisions)
        ok = sum(d.verified for d in decisions)
        _log(f"  {len(decisions)} decisions, {ok} with at least one quote verified in the source")
    if not args.keep_unverified:
        dropped = [d for d in found if not d.verified]
        found = [d for d in found if d.verified]
        if dropped:
            _log(f"Dropped {len(dropped)} decision(s) with no quote found in the source (use --keep-unverified to keep them)")
    decisions = store.upsert(store.load(args.store), found)
    store.save(args.store, decisions, backend.model)
    _log(f"Wrote {len(decisions)} decisions to {args.store}")
    if args.export:
        store.export_markdown(decisions, args.export)
        _log(f"Wrote decision records to {args.export}/")
    return 0


def cmd_export(args: argparse.Namespace) -> int:
    decisions = store.load(args.store)
    paths = store.export_markdown(decisions, args.out)
    _log(f"Wrote {len(paths)} decision records to {args.out}/")
    return 0


def cmd_check_pr(args: argparse.Namespace) -> int:
    decisions = store.load(args.store)
    if args.diff:
        diff = Path(args.diff).read_text(encoding="utf-8")
    else:
        diff = prcheck.diff_between(args.repo, args.base, args.head)
    changes = prcheck.parse_diff(diff)
    matches = prcheck.match_decisions(decisions, changes, repo=args.repo if not args.no_repo else None)
    report = prcheck.render_report(matches)
    if args.output:
        Path(args.output).write_text(report, encoding="utf-8")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as fh:
            fh.write(report)
    print(report)
    return 0


def cmd_eval_pep(args: argparse.Namespace) -> int:
    rst = pep_eval.fetch_pep(args.pep) if not args.pep_file else Path(args.pep_file).read_text(encoding="utf-8")
    expected = pep_eval.rejected_ideas(rst)
    title = pep_eval.pep_header(rst, "Title") or ""
    spec = args.thread or pep_eval.pep_header(rst, "Discussions-To")
    if not spec:
        _log("The PEP has no Discussions-To header; pass --thread")
        return 2
    thread = sources.load_thread(spec)
    thread, dropped = pep_eval.drop_leaked_posts(thread, rst)
    _log(f"PEP {args.pep}: {len(expected)} rejected ideas; discussion has {len(thread.posts)} posts ({len(dropped)} PEP copies removed)")
    backend = _backend(args)
    decisions = extract_thread(thread, backend, progress=_log)
    results = pep_eval.evaluate(expected, decisions, judge=backend if args.judge else None)
    report = pep_eval.render_report(args.pep, title, thread, dropped, decisions, results, args.judge)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "report.md").write_text(report, encoding="utf-8")
    store.save(str(out / "decisions.json"), decisions, backend.model)
    store.export_markdown(decisions, str(out / "decisions"))
    print(report)
    return 0


def cmd_serve(args: argparse.Namespace) -> int:
    from . import server

    app = server.App(
        store_path=args.store,
        examples_dir=args.examples,
        web_dir=args.web,
        model=args.model,
        ollama_host=args.host,
        num_ctx=args.num_ctx,
    )
    httpd = server.make_server(app, args.host_bind, args.port, verbose=args.verbose)
    host = f"[{args.host_bind}]" if ":" in args.host_bind else args.host_bind
    print(f"DecisionTrail is running at http://{host}:{httpd.server_address[1]}/ (Ctrl+C to stop)", flush=True)
    if not args.web or not Path(args.web, "index.html").is_file():
        _log("The web app is not built; run `npm run build` in web/ or use the Vite dev server")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
        app.close()
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="decisiontrail", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("fetch", help="download a discussion to a local JSON file")
    p.add_argument("source", help="GitHub issue/PR URL, owner/repo#N, or Discourse topic URL")
    p.add_argument("-o", "--output", required=True)
    p.set_defaults(func=cmd_fetch)

    p = sub.add_parser("extract", help="extract decisions from one or more discussions")
    p.add_argument("sources", nargs="+", help="discussion URLs or thread JSON files")
    p.add_argument("--store", default=".decisiontrail/decisions.json", help="decision store to update")
    p.add_argument("--repo", help="local git checkout to link decisions to")
    p.add_argument("--aliases", help="JSON file mapping platform handles to one person")
    p.add_argument("--export", help="also write Markdown decision records to this directory")
    p.add_argument("--keep-unverified", action="store_true", help="keep decisions with no verified quote")
    _model_args(p)
    p.set_defaults(func=cmd_extract)

    p = sub.add_parser("export", help="write Markdown decision records from the store")
    p.add_argument("--store", default=".decisiontrail/decisions.json")
    p.add_argument("--out", required=True)
    p.set_defaults(func=cmd_export)

    p = sub.add_parser("check-pr", help="list past decisions about the code a change touches")
    p.add_argument("--store", default=".decisiontrail/decisions.json")
    p.add_argument("--repo", default=".")
    p.add_argument("--no-repo", action="store_true", help="match on stored paths only, without reading the repo")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--base", help="base ref, e.g. origin/main")
    g.add_argument("--diff", help="a unified diff file instead of a git range")
    p.add_argument("--head", default="HEAD")
    p.add_argument("--output", help="also write the report to this file")
    p.set_defaults(func=cmd_check_pr)

    p = sub.add_parser("eval-pep", help="recover a PEP's rejected ideas from its discussion")
    p.add_argument("pep", type=int)
    p.add_argument("--pep-file", help="read the PEP source from a file instead of GitHub")
    p.add_argument("--thread", help="discussion to use instead of the PEP's Discussions-To link")
    p.add_argument("--judge", action="store_true", help="confirm matches with the local model")
    p.add_argument("--out", required=True, help="directory for report.md, decisions.json and records")
    _model_args(p)
    p.set_defaults(func=cmd_eval_pep)

    from .server import default_dir

    p = sub.add_parser("serve", help="run the web app and its API")
    p.add_argument("--port", type=int, default=8765)
    p.add_argument("--host-bind", default="127.0.0.1", help="address to listen on")
    p.add_argument("--store", default=".decisiontrail/decisions.json", help="decision store that analyses update")
    p.add_argument("--examples", default=default_dir("examples"), help="directory of example outputs to show")
    p.add_argument("--web", default=default_dir("web", "dist"), help="built frontend to serve")
    p.add_argument("--verbose", action="store_true", help="log every request")
    p.add_argument("--model", default=os.environ.get("DECISIONTRAIL_MODEL", DEFAULT_MODEL), help="Ollama model tag")
    p.add_argument("--host", default=os.environ.get("OLLAMA_HOST", DEFAULT_HOST), help="Ollama server URL")
    p.add_argument("--num-ctx", type=int, default=8192, help="context window passed to Ollama")
    p.set_defaults(func=cmd_serve)
    return parser


def main(argv: Optional[List[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return args.func(args)
    except (LLMError, ValueError, OSError) as exc:
        _log(f"error: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
