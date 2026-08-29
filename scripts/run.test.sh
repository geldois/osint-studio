#!/usr/bin/env bash
set -euo pipefail

failures=0
start_dir="$(pwd)"

assert_eq() {
  local expected="$1" actual="$2" label="$3"
  if [ "$expected" != "$actual" ]; then
    echo "FAIL: $label — expected [$expected], got [$actual]"
    failures=$((failures + 1))
  fi
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
run_script="$script_dir/run"

new_repo() {
  unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_OBJECT_DIRECTORY \
    GIT_ALTERNATE_OBJECT_DIRECTORIES GIT_CEILING_DIRECTORIES
  local dir
  dir="$(mktemp -d -t osint-studio-run-test-XXXXXX)"
  cd "$dir"
  git init -q
  git config user.email t@t.com
  git config user.name t
  echo 'echo seed' >seed.sh
  git add seed.sh
  git commit -qm seed
}

fake_shfmt_mise() {
  # shellcheck disable=SC2329
  mise() {
    if [ "$1" = "exec" ] && [ "$2" = "--" ] && [ "$3" = "shfmt" ] && [ "$4" = "-w" ]; then
      shift 4
      local f
      for f in "$@"; do
        printf 'echo "fixed"\n' >"$f"
      done
    fi
    return 0
  }
}

test_staged_file_survives_fix_fully_staged() {
  new_repo
  printf 'echo hi\n' >a.sh
  git add a.sh

  # shellcheck disable=SC1090
  source "$run_script"
  fake_shfmt_mise
  # shellcheck disable=SC2329
  run_check() { return 0; }

  run_precommit >/dev/null

  assert_eq 'echo "fixed"' "$(git show :a.sh)" "staged content after fix"
  assert_eq "" "$(git diff -- a.sh)" "no unstaged diff after fix"
}

test_failed_check_unstages_a_rewritten_staged_file() {
  new_repo
  printf 'echo hi\n' >a.sh
  git add a.sh

  # shellcheck disable=SC1090
  source "$run_script"
  fake_shfmt_mise
  # shellcheck disable=SC2329
  run_check() { return 1; }

  run_precommit >/dev/null || true

  assert_eq "" "$(git diff --cached --name-only)" "nothing staged after a failed gate"
  assert_eq 'echo "fixed"' "$(cat a.sh)" "the fix output stays in the worktree"
}

test_unstaged_rewrite_stays_unstaged() {
  new_repo

  # shellcheck disable=SC1090
  source "$run_script"
  fake_shfmt_mise
  # shellcheck disable=SC2329
  run_check() { return 0; }

  run_precommit >/dev/null

  assert_eq "" "$(git diff --cached --name-only)" "nothing newly staged"
  assert_eq 'echo "fixed"' "$(cat seed.sh)" "the untracked-stage file was still rewritten on disk"
}

test_precommit_skips_check_when_tree_unchanged() {
  new_repo

  # shellcheck disable=SC1090
  source "$run_script"
  calls_file="$(mktemp)"
  # shellcheck disable=SC2329
  run_check() {
    echo called >>"$calls_file"
    return 0
  }

  run_precommit >/dev/null
  run_precommit >/dev/null

  assert_eq "1" "$(wc -l <"$calls_file" | tr -d ' ')" \
    "check runs exactly once across two unchanged commits"
  rm -f "$calls_file"
}

test_staged_file_survives_fix_fully_staged
test_failed_check_unstages_a_rewritten_staged_file
test_unstaged_rewrite_stays_unstaged
test_precommit_skips_check_when_tree_unchanged

cd "$start_dir"

if [ "$failures" -eq 0 ]; then
  echo "run.test.sh: ok"
else
  echo "run.test.sh: $failures failure(s)"
  exit 1
fi
